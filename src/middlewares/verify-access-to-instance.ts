import { getConfig, getSessionToken } from "@mittwald/ext-bridge/browser";
import { verify } from "@mittwald/ext-bridge/node";
import { createMiddleware } from "@tanstack/react-start";

export const verifyAccessToInstance = createMiddleware({
	type: "function",
	validateClient: true,
})
	.client(async ({ next }) => {
		try {
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
	.server(async ({ next, context }) => {
		try {
			if (!context.sessionToken) {
				throw new Error("Not authorized: No session token provided");
			}

			const res = await verify(context.sessionToken);

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
				throw error;
			}
			throw new Error("Authentication failed");
		}
	});
