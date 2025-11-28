import { getConfig, getSessionToken } from "@mittwald/ext-bridge/browser";
import { verify } from "@mittwald/ext-bridge/node";
import { createMiddleware } from "@tanstack/react-start";

export const verifyAccessToInstance = createMiddleware({
	type: "function",
	validateClient: true,
})
	.client(async ({ next }) => {
		const sessionToken = await getSessionToken();
		const config = await getConfig();

		// Daten werden automatisch durchgereicht, nur sendContext hinzufügen
		return next({
			sendContext: {
				sessionToken,
				projectId: config.projectId,
			},
		});
	})
	.server(async ({ next, context }) => {
		if (!context.sessionToken) {
			throw new Error("Not authorized");
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
	});
