import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { verifyAccessToInstance } from "~/middlewares/verify-access-to-instance";
import { env } from "~/env";
import { z } from "zod";

// Whitelist of allowed models to prevent injection attacks
// Models are validated via z.enum below
const chatMessageSchema = z.object({
	message: z.string().min(1).max(10000), // Limit message length
	model: z.enum(["gpt-oss-120b", "Mistral-Small-3.2-24B-Instruct", "Qwen3-Coder-30B-Instruct"]).optional(),
	conversationHistory: z
		.array(
			z.object({
				role: z.enum(["user", "assistant"]),
				content: z.string().max(10000), // Limit history message length
			}),
		)
		.max(50) // Limit conversation history length
		.optional(),
});

export const sendChatMessage = createServerFn({ method: "POST" })
	.inputValidator(zodValidator(chatMessageSchema))
	.middleware([verifyAccessToInstance])
	.handler(async ({ data, context }) => {
		try {
			console.log("=== HANDLER CALLED ===");
			console.log("Data received:", JSON.stringify(data, null, 2));
			console.log("Context received:", JSON.stringify(context, null, 2));
			
			// Data is already validated and typed by inputValidator
			// No need to parse or validate again - it's already done!
			const validatedData = data as z.infer<typeof chatMessageSchema>;

			// Build messages array for OpenAI
			const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
				{
					role: "system",
					content: "You are a helpful assistant.",
				},
			];

			// Add conversation history if provided
			if (validatedData.conversationHistory) {
				messages.push(...validatedData.conversationHistory);
			}

			// Add current message
			messages.push({
				role: "user",
				content: validatedData.message,
			});

			// Call LLM API
			const apiUrl = env.LLM_API_URL || "https://llm.aihosting.mittwald.de/v1";
			const model = validatedData.model || "gpt-oss-120b";

			const response = await fetch(`${apiUrl}/chat/completions`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${env.OPENAI_API_KEY}`,
				},
				body: JSON.stringify({
					model,
					messages,
					temperature: 0.7,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error?.message || `OpenAI API error: ${response.statusText}`,
				);
			}

			const responseData = await response.json();
			
			console.log("LLM API response:", JSON.stringify(responseData, null, 2));
			
			const aiMessage = responseData.choices[0]?.message?.content || "No response from AI";
			console.log("Extracted AI message:", aiMessage);

			return {
				message: aiMessage,
				usage: responseData.usage,
			};
		} catch (error) {
			// Log errors securely without exposing sensitive data
			if (error instanceof z.ZodError) {
				const errorMsg = `Validation error: ${error.errors.map(e => e.message).join(", ")}`;
				console.error("Validation error in sendChatMessage:", errorMsg);
				throw new Error(errorMsg);
			}
			if (error instanceof Error) {
				// Only log error message, not stack trace in production
				console.error("Error in sendChatMessage:", error.message);
				throw error;
			}
			console.error("Unknown error in sendChatMessage");
			throw new Error("An error occurred while processing your message");
		}
	});

