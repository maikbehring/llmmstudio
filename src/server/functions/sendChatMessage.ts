import { createServerFn } from "@tanstack/react-start";
import { verifyAccessToInstance } from "~/middlewares/verify-access-to-instance";
import { env } from "~/env";
import { z } from "zod";

const chatMessageSchema = z.object({
	message: z.string().min(1),
	model: z.string().optional(),
	conversationHistory: z
		.array(
			z.object({
				role: z.enum(["user", "assistant"]),
				content: z.string(),
			}),
		)
		.optional(),
});

export const sendChatMessage = createServerFn({ method: "POST" })
	// Remove middleware completely to test
	// .middleware([verifyAccessToInstance])
	.handler(async (data: unknown) => {
		try {
			console.log("=== HANDLER CALLED ===");
			console.log("Data received:", JSON.stringify(data, null, 2));
			console.log("Data type:", typeof data);
			console.log("Data is null:", data === null);
			console.log("Data is undefined:", data === undefined);
			
			// Ignore calls without data (e.g., from Hot Reload or automatic triggers)
			if (!data || typeof data !== "object" || data === null) {
				console.log("Ignoring call without data (likely Hot Reload or automatic trigger)");
				return { message: "", usage: null };
			}

			const dataWithMessage = data as { message?: unknown; [key: string]: unknown };
			if (!dataWithMessage.message || typeof dataWithMessage.message !== "string") {
				console.log("Ignoring call without message field");
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
			console.error("=== ERROR in sendChatMessage ===");
			console.error("Error type:", error?.constructor?.name);
			console.error("Error message:", error instanceof Error ? error.message : String(error));
			console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
			console.error("Full error:", error);
			
			if (error instanceof z.ZodError) {
				const errorMsg = `Validation error: ${error.errors.map(e => e.message).join(", ")}`;
				console.error("ZodError details:", error.errors);
				throw new Error(errorMsg);
			}
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(`Unknown error: ${String(error)}`);
		}
	});

