import { createServerFn } from "@tanstack/react-start";
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
	.middleware([verifyAccessToInstance])
	.handler(async (data: unknown) => {
		try {
			// Ignore calls without data (e.g., from Hot Reload or automatic triggers)
			if (!data || typeof data !== "object" || data === null) {
				return { message: "", usage: null };
			}

			const dataWithMessage = data as { message?: unknown; [key: string]: unknown };
			if (!dataWithMessage.message || typeof dataWithMessage.message !== "string") {
				return { message: "", usage: null };
			}

			// Zod-Validierung für vollständige Validierung
			const validatedData = chatMessageSchema.parse(data);

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

			return {
				message: responseData.choices[0]?.message?.content || "No response from AI",
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

