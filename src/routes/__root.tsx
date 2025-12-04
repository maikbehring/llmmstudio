import {
	LayoutCard,
	NotificationProvider,
} from "@mittwald/flow-remote-react-components";
import RemoteRoot from "@mittwald/flow-remote-react-components/RemoteRoot";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";

// Highlight.js CSS für Code-Syntax-Highlighting
const highlightStyles = `
.hljs {
  display: block;
  overflow-x: auto;
  padding: 0.5em;
  background: #1e1e1e;
  color: #d4d4d4;
}
.hljs-comment, .hljs-quote { color: #6a9955; }
.hljs-variable, .hljs-template-variable, .hljs-tag, .hljs-name, .hljs-selector-id, .hljs-selector-class, .hljs-regexp, .hljs-deletion { color: #f48771; }
.hljs-number, .hljs-built_in, .hljs-builtin-name, .hljs-literal, .hljs-type, .hljs-params, .hljs-meta, .hljs-link { color: #b5cea8; }
.hljs-attribute { color: #9cdcfe; }
.hljs-string, .hljs-symbol, .hljs-bullet, .hljs-addition { color: #ce9178; }
.hljs-title, .hljs-section { color: #dcdcaa; }
.hljs-keyword, .hljs-selector-tag { color: #569cd6; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }
`;

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "mittwald GPT",
			},
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<RemoteRoot>
				<NotificationProvider>
					<LayoutCard>
						<Outlet />
					</LayoutCard>
				</NotificationProvider>
			</RemoteRoot>
		</RootDocument>
	);
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<style dangerouslySetInnerHTML={{ __html: highlightStyles }} />
			</head>
			<body>
				{children}
				<Scripts />
				{typeof window !== "undefined" && process.env.NODE_ENV === "development" && (
					<>
						<TanStackRouterDevtools position="bottom-right" />
						<ReactQueryDevtools buttonPosition="bottom-left" />
					</>
				)}
			</body>
		</html>
	);
}
