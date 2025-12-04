import {
	Button,
	Heading,
	Text,
	Content,
	TextArea,
	ActionGroup,
	Flex,
	Section,
	ColumnLayout,
} from "@mittwald/flow-remote-react-components";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
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
	const [showModelDropdown, setShowModelDropdown] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

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
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
					<Flex gap="s" style={{ alignItems: "center" }}>
						<Text style={{ fontSize: "0.875rem", color: "var(--color-neutral-600)" }}>
							Modell:
						</Text>
						<Button
							variant="soft"
							onPress={() => setShowModelDropdown(!showModelDropdown)}
						>
							{AVAILABLE_MODELS.find(m => m.id === selectedModel)?.label || selectedModel} ▼
						</Button>
						{showModelDropdown && (
							<Content
								style={{
									position: "absolute",
									top: "100%",
									right: 0,
									marginTop: "0.5rem",
									backgroundColor: "var(--color-neutral-0)",
									border: "1px solid var(--color-neutral-200)",
									borderRadius: "0.5rem",
									padding: "0.5rem",
									boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
									zIndex: 1000,
								}}
							>
								<ColumnLayout rowGap="s">
									{AVAILABLE_MODELS.map((model) => (
										<Button
											key={model.id}
											variant={selectedModel === model.id ? "solid" : "soft"}
											onPress={() => {
												setSelectedModel(model.id);
												setShowModelDropdown(false);
											}}
										>
											{selectedModel === model.id ? "✓ " : ""}{model.label}
										</Button>
									))}
								</ColumnLayout>
							</Content>
						)}
					</Flex>
				</Flex>
			</Section>

			{/* Scrollable Chat Area */}
			<Content
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

				<ColumnLayout rowGap="l">
					{messages.map((msg, index) => (
						<Content
							key={index}
							style={{
								display: "flex",
								gap: "1rem",
								padding: "1.5rem",
								backgroundColor: msg.role === "user" ? "transparent" : "var(--color-neutral-50)",
								borderRadius: "0.5rem",
							}}
						>
							<Content
								style={{
									flexShrink: 0,
									width: "32px",
									height: "32px",
									borderRadius: "50%",
									backgroundColor:
										msg.role === "user"
											? "var(--color-primary-600)"
											: "var(--color-neutral-400)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "var(--color-neutral-0)",
									fontWeight: "bold",
									fontSize: "0.875rem",
								}}
							>
								{msg.role === "user" ? "U" : "AI"}
							</Content>
							<Content style={{ flex: 1, minWidth: 0 }}>
								<Text
									style={{
										fontWeight: "600",
										marginBottom: "0.5rem",
										color: "var(--color-neutral-700)",
										fontSize: "0.875rem",
									}}
								>
									{msg.role === "user" ? "Du" : "mittwald GPT"}
								</Text>
								<MessageContent content={msg.content || "(leer)"} role={msg.role} />
							</Content>
						</Content>
					))}

					{chatMutation.isPending && (
						<Content
							style={{
								display: "flex",
								gap: "1rem",
								padding: "1.5rem",
								backgroundColor: "var(--color-neutral-50)",
								borderRadius: "0.5rem",
							}}
						>
							<Content
								style={{
									flexShrink: 0,
									width: "32px",
									height: "32px",
									borderRadius: "50%",
									backgroundColor: "var(--color-neutral-400)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "var(--color-neutral-0)",
									fontWeight: "bold",
									fontSize: "0.875rem",
								}}
							>
								AI
							</Content>
							<Content style={{ flex: 1 }}>
								<Text style={{ fontStyle: "italic", color: "var(--color-neutral-600)" }}>
									Denkt nach...
								</Text>
							</Content>
						</Content>
					)}
				</ColumnLayout>
				<div ref={messagesEndRef} />
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
