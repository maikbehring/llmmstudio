import { getConfig, getSessionToken } from "@mittwald/ext-bridge/browser";
import { verify } from "@mittwald/ext-bridge/node";
import { createMiddleware } from "@tanstack/react-start";

export const verifyAccessToInstance = createMiddleware({
	type: "function",
	validateClient: true,
})
	.client(async ({ next, data }) => {
		try {
			console.log("=== CLIENT MIDDLEWARE ===");
			console.log("Client data:", JSON.stringify(data, null, 2));
			
			const sessionToken = await getSessionToken();
			const config = await getConfig();

			// Daten werden automatisch durchgereicht, nur sendContext hinzufügen
			return next({
				sendContext: {
					sessionToken,
					projectId: config.projectId,
				},
			});
		} catch (error) {
			console.error("Error in client middleware:", error);
			throw new Error("Failed to get session token or config");
		}
	})
	.server(async ({ next, context, data }) => {
		try {
			console.log("=== SERVER MIDDLEWARE ===");
			console.log("Server data:", JSON.stringify(data, null, 2));
			console.log("Server context:", JSON.stringify(context, null, 2));
			
			if (!context.sessionToken) {
				console.error("Missing session token in context");
				throw new Error("Not authorized: No session token provided");
			}

			console.log("Verifying session token...");
			const res = await verify(context.sessionToken);
			console.log("Verification successful:", {
				extensionInstanceId: res.extensionInstanceId,
				extensionId: res.extensionId,
				userId: res.userId,
				contextId: res.contextId,
			});

			// Daten werden automatisch durchgereicht - nur context hinzufügen
			return next({
				context: {
					extensionInstanceId: res.extensionInstanceId,
					extensionId: res.extensionId,
					userId: res.userId,
					contextId: res.contextId,
					projectId: context.projectId,
				},
			});
		} catch (error) {
			console.error("Error in server middleware:", error);
			if (error instanceof Error) {
				console.error("Error message:", error.message);
				console.error("Error stack:", error.stack);
				throw error;
			}
			throw new Error("Authentication failed");
		}
	});
