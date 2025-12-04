import {
	Button,
	Heading,
	Text,
	Content,
	TextArea,
	ActionGroup,
	Flex,
	Section,
	MessageThread,
	Message,
	Avatar,
	Initials,
	Header,
	Align,
	Select,
	Label,
	Option,
} from "@mittwald/flow-remote-react-components";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { sendChatMessage } from "~/server/functions/sendChatMessage";
import { MessageContent } from "~/components/MessageContent";

export const Route = createFileRoute("/")({
	component: ChatComponent,
});

interface Message {
	role: "user" | "assistant";
	content: string;
}

const AVAILABLE_MODELS = [
	{ id: "gpt-oss-120b", label: "GPT OSS 120B" },
	{ id: "Mistral-Small-3.2-24B-Instruct", label: "Mistral Small 3.2 24B" },
	{ id: "Qwen3-Coder-30B-Instruct", label: "Qwen3 Coder 30B" },
] as const;

function ChatComponent() {
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [textareaValue, setTextareaValue] = useState("");
	const [selectedModel, setSelectedModel] = useState<"gpt-oss-120b" | "Mistral-Small-3.2-24B-Instruct" | "Qwen3-Coder-30B-Instruct">("gpt-oss-120b");

	const chatMutation = useMutation({
			mutationFn: async (userMessage: string) => {
				try {
					const payload = {
						message: userMessage,
						model: selectedModel,
						conversationHistory: messages,
					};
					console.log("Calling sendChatMessage with payload:", payload);
					const result = await sendChatMessage({ data: payload });
					console.log("sendChatMessage result:", result);
					return result;
				} catch (error) {
					console.error("Error calling sendChatMessage:", error);
					throw error;
				}
			},
		onSuccess: (data, userMessage) => {
			console.log("Mutation success - received data:", data);
			console.log("User message:", userMessage);
			console.log("AI response:", data.message);
			
			if (!data || !data.message) {
				console.error("No message in response data:", data);
				return;
			}
			
			setMessages((prev) => [
				...prev,
				{ role: "user", content: userMessage },
				{ role: "assistant", content: data.message },
			]);
			setInput("");
			setTextareaValue("");
		},
		onError: (error) => {
			console.error("Chat mutation error:", error);
		},
	});

	const scrollToBottom = () => {
		// Find the chat container element and scroll to bottom
		if (typeof window !== "undefined") {
			const container = document.querySelector('[data-chat-container]') as HTMLElement;
			if (container) {
				container.scrollTo({
					top: container.scrollHeight,
					behavior: "smooth",
				});
			}
		}
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages, chatMutation.isPending]);

	const handleSubmit = () => {
		const valueToSubmit = textareaValue || input;
		const trimmedInput = valueToSubmit.trim();
		
		if (!trimmedInput || chatMutation.isPending) {
			return;
		}

		setInput(trimmedInput);
		chatMutation.mutate(trimmedInput);
		setTextareaValue("");
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		// Track input by building string from key presses
		if (e.key === "Backspace") {
			setTextareaValue((prev) => prev.slice(0, -1));
		} else if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			const valueToSubmit = textareaValue.trim();
			if (valueToSubmit) {
				setInput(valueToSubmit);
				chatMutation.mutate(valueToSubmit);
				setTextareaValue("");
			}
		} else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			// Single character (but not modifier keys)
			setTextareaValue((prev) => prev + e.key);
		}
	};

	return (
		<Content
			style={{
				display: "flex",
				flexDirection: "column",
				height: "100vh",
				maxHeight: "100vh",
				overflow: "hidden",
			}}
		>
			{/* Header */}
			<Section
				style={{
					flexShrink: 0,
					borderBottom: "1px solid var(--color-neutral-200)",
					padding: "1rem",
				}}
			>
				<Flex gap="m" style={{ alignItems: "center", justifyContent: "space-between" }}>
					<Heading level={2} style={{ margin: 0 }}>
						mittwald GPT
					</Heading>
					<Select
						selectedKey={selectedModel}
						onSelectionChange={(key) => {
							if (key && typeof key === "string") {
								setSelectedModel(key as typeof selectedModel);
							}
						}}
					>
						<Label>Modell</Label>
						{AVAILABLE_MODELS.map((model) => (
							<Option key={model.id}>
								{model.label}
							</Option>
						))}
					</Select>
				</Flex>
			</Section>

			{/* Scrollable Chat Area */}
			<Content
				data-chat-container
				style={{
					flex: 1,
					overflowY: "auto",
					overflowX: "hidden",
					padding: "1rem",
					display: "flex",
					flexDirection: "column",
				}}
			>
				{messages.length === 0 && (
					<Content
						style={{
							flex: 1,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexDirection: "column",
							gap: "1rem",
						}}
					>
						<Heading level={1}>Willkommen bei mittwald GPT</Heading>
						<Text style={{ textAlign: "center", maxWidth: "600px", color: "var(--color-neutral-600)" }}>
							Powered by mittwald - entwickelt und gehostet in Espelkamp, 
							wo sowohl das mStudio als auch die leistungsstarken LLM-Modelle 
							betrieben werden.
						</Text>
					</Content>
				)}

				{messages.length > 0 && (
					<MessageThread>
						{messages.map((msg, index) => (
							<Message
								key={index}
								type={msg.role === "user" ? "sender" : "responder"}
							>
								<Header>
									<Align>
										<Avatar>
											<Initials>
												{msg.role === "user" ? "Du" : "AI"}
											</Initials>
										</Avatar>
										<Text style={{ fontWeight: "bold" }}>
											{msg.role === "user" ? "Du" : "mittwald GPT"}
										</Text>
									</Align>
								</Header>
								<Content>
									<MessageContent content={msg.content || "(leer)"} role={msg.role} />
								</Content>
							</Message>
						))}

						{chatMutation.isPending && (
							<Message type="responder">
								<Header>
									<Align>
										<Avatar>
											<Initials>AI</Initials>
										</Avatar>
										<Text style={{ fontWeight: "bold" }}>
											mittwald GPT
										</Text>
									</Align>
								</Header>
								<Content>
									<Text style={{ fontStyle: "italic", color: "var(--color-neutral-600)" }}>
										Denkt nach...
									</Text>
								</Content>
							</Message>
						)}
					</MessageThread>
				)}
			</Content>

			{/* Fixed Input Area */}
			<Section
				style={{
					flexShrink: 0,
					borderTop: "1px solid var(--color-neutral-200)",
					padding: "1rem",
					backgroundColor: "var(--color-neutral-0)",
				}}
			>
				{chatMutation.isError && (
					<Content
						style={{
							marginBottom: "1rem",
							padding: "0.75rem",
							backgroundColor: "var(--color-danger-50)",
							borderRadius: "0.5rem",
							border: "1px solid var(--color-danger-200)",
						}}
					>
						<Text style={{ color: "var(--color-danger-700)", fontSize: "0.875rem" }}>
							Fehler: {chatMutation.error instanceof Error
								? chatMutation.error.message
								: String(chatMutation.error)}
						</Text>
					</Content>
				)}

				<Content style={{ marginBottom: "1rem" }}>
					<TextArea
						defaultValue={textareaValue || input}
						onKeyDown={(e) => {
							handleKeyPress(e);
						}}
						onInput={(e: any) => {
							const value = e?.target?.value ?? e?.detail?.value ?? e?.value ?? textareaValue;
							if (value && value !== textareaValue) {
								setTextareaValue(value);
							}
						}}
						placeholder="Schreibe eine Nachricht..."
						rows={4}
						style={{
							width: "100%",
							resize: "none",
						}}
					/>
				</Content>

				<Flex gap="s" style={{ justifyContent: "space-between", alignItems: "center" }}>
					<Text style={{ fontSize: "0.75rem", color: "var(--color-neutral-500)" }}>
						{chatMutation.isPending ? "Antwort wird generiert..." : "Enter zum Senden, Shift+Enter für neue Zeile"}
					</Text>
					<ActionGroup>
						<Button
							color="primary"
							onPress={handleSubmit}
							isDisabled={chatMutation.isPending || !(textareaValue || input).trim()}
						>
							{chatMutation.isPending ? "Wird gesendet..." : "Senden"}
						</Button>
						{messages.length > 0 && (
							<Button
								color="secondary"
								variant="soft"
								onPress={() => setMessages([])}
								isDisabled={chatMutation.isPending}
							>
								Zurücksetzen
							</Button>
						)}
					</ActionGroup>
				</Flex>
			</Section>
		</Content>
	);
}
