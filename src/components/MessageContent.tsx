import { Content, Text, Heading } from "@mittwald/flow-remote-react-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

interface MessageContentProps {
	content: string;
	role: "user" | "assistant";
}

export function MessageContent({ content, role }: MessageContentProps) {
	if (role === "user") {
		return (
			<Content>
				<Text>{content}</Text>
			</Content>
		);
	}

	const components: Components = {
		p: ({ children }) => (
			<Content>
				<Text>{children}</Text>
			</Content>
		),
		h1: ({ children }) => (
			<Content>
				<Heading level={1}>{children}</Heading>
			</Content>
		),
		h2: ({ children }) => (
			<Content>
				<Heading level={2}>{children}</Heading>
			</Content>
		),
		h3: ({ children }) => (
			<Content>
				<Heading level={3}>{children}</Heading>
			</Content>
		),
		code: ({ className, children }) => {
			const match = /language-(\w+)/.exec(className || "");
			const isInline = !match;
			
			if (isInline) {
				return (
					<Text
						style={{
							backgroundColor: "var(--color-neutral-100)",
							padding: "0.125rem 0.25rem",
							borderRadius: "0.25rem",
							fontFamily: "monospace",
							fontSize: "0.875em",
						}}
					>
						{String(children).replace(/\n$/, "")}
					</Text>
				);
			}
			
			return (
				<Content
					style={{
						backgroundColor: "#1e1e1e",
						border: "1px solid var(--color-neutral-200)",
						borderRadius: "0.5rem",
						padding: "1rem",
						margin: "0.5rem 0",
						overflowX: "auto",
					}}
				>
					<pre
						style={{
							margin: 0,
							fontFamily: "monospace",
							fontSize: "0.875rem",
							lineHeight: "1.5",
							color: "#d4d4d4",
						}}
					>
						<code className={className}>
							{String(children).replace(/\n$/, "")}
						</code>
					</pre>
				</Content>
			);
		},
		ul: ({ children }) => (
			<Content
				style={{
					margin: "0.5rem 0",
					paddingLeft: "1.5rem",
				}}
			>
				<ul style={{ margin: 0, padding: 0 }}>{children}</ul>
			</Content>
		),
		ol: ({ children }) => (
			<Content
				style={{
					margin: "0.5rem 0",
					paddingLeft: "1.5rem",
				}}
			>
				<ol style={{ margin: 0, padding: 0 }}>{children}</ol>
			</Content>
		),
		li: ({ children }) => (
			<li style={{ margin: "0.25rem 0", listStyle: "disc" }}>
				<Text>{children}</Text>
			</li>
		),
		blockquote: ({ children }) => (
			<Content
				style={{
					borderLeft: "4px solid var(--color-neutral-300)",
					paddingLeft: "1rem",
					margin: "0.5rem 0",
					fontStyle: "italic",
					color: "var(--color-neutral-600)",
				}}
			>
				{children}
			</Content>
		),
		a: ({ href, children }) => (
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer"
				style={{
					color: "var(--color-primary-600)",
					textDecoration: "underline",
				}}
			>
				{children}
			</a>
		),
		table: () => {
			// Flow Remote Components don't support table elements
			// Render as a simple text block instead
			return (
				<Content
					style={{
						margin: "0.5rem 0",
						padding: "0.5rem",
						backgroundColor: "var(--color-neutral-50)",
						borderRadius: "0.25rem",
						border: "1px solid var(--color-neutral-200)",
					}}
				>
					<Text style={{ fontFamily: "monospace", fontSize: "0.875em" }}>
						[Table content - please format as text]
					</Text>
				</Content>
			);
		},
		thead: () => null,
		tbody: () => null,
		tr: () => null,
		th: () => null,
		td: () => null,
		hr: () => (
			<Content
				style={{
					margin: "1rem 0",
					border: "none",
					borderTop: "1px solid var(--color-neutral-200)",
				}}
			/>
		),
	};

	return (
		<Content>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeHighlight]}
				components={components}
			>
				{content}
			</ReactMarkdown>
		</Content>
	);
}

