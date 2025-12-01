import {
	Button,
	Heading,
	Text,
	Content,
	TextArea,
} from "@mittwald/flow-remote-react-components";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { sendChatMessage } from "~/server/functions/sendChatMessage";

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
	const [selectedModel, setSelectedModel] = useState<string>("gpt-oss-120b");
	const [showModelDropdown, setShowModelDropdown] = useState(false);

		const chatMutation = useMutation({
		mutationFn: async (userMessage: string) => {
			try {
				const payload = {
					message: userMessage,
					model: selectedModel,
					conversationHistory: messages,
				};
				console.log("Calling sendChatMessage with payload:", payload);
				// Try direct call instead of .call()
				const result = await sendChatMessage(payload);
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
		<Content>
			<Heading>mittwald GPT</Heading>
			
			<Content>
				<Content>
					<Text>
						Powered by mittwald - entwickelt und gehostet in Espelkamp, 
						wo sowohl das mStudio als auch die leistungsstarken LLM-Modelle 
						betrieben werden. Die malerische Kleinstadt im Herzen Ostwestfalens 
						ist Heimat unserer innovativen Cloud-Infrastruktur.
					</Text>
				</Content>
			</Content>

			<Content>
				<Content>
					<Text>Modell auswählen:</Text>
				</Content>
				<Content>
					<Button
						onPress={() => setShowModelDropdown(!showModelDropdown)}
					>
						{AVAILABLE_MODELS.find(m => m.id === selectedModel)?.label || selectedModel} ▼
					</Button>
					{showModelDropdown && (
						<Content>
							{AVAILABLE_MODELS.map((model) => (
								<Button
									key={model.id}
									onPress={() => {
										setSelectedModel(model.id);
										setShowModelDropdown(false);
									}}
								>
									{selectedModel === model.id ? "✓ " : ""}{model.label}
								</Button>
							))}
						</Content>
					)}
				</Content>
			</Content>

			<Content>
				<Content>
					{messages.length === 0 && (
						<Text>Starte eine Unterhaltung mit dem AI-Assistenten!</Text>
					)}
				</Content>

				{messages.map((msg, index) => (
					<Content key={index}>
						<Content>
							<Text>
								{msg.role === "user" ? "Du" : "AI"}: {msg.content || "(leer)"}
							</Text>
						</Content>
					</Content>
				))}

				{chatMutation.isPending && (
					<Content>
						<Text>AI: Denkt nach...</Text>
					</Content>
				)}
			</Content>

			<Content>
				<Content>
					<TextArea
						defaultValue={textareaValue || input}
						onKeyDown={(e) => {
							handleKeyPress(e);
						}}
						onInput={(e: any) => {
							// Try to get value from event
							const value = e?.target?.value ?? e?.detail?.value ?? e?.value ?? textareaValue;
							if (value && value !== textareaValue) {
								setTextareaValue(value);
							}
						}}
						placeholder="Schreibe eine Nachricht..."
						rows={3}
					/>
				</Content>

				<Content>
					<Button
						onPress={handleSubmit}
						isDisabled={chatMutation.isPending || !(textareaValue || input).trim()}
					>
						{chatMutation.isPending ? "Wird gesendet..." : "Senden"}
					</Button>
				</Content>

				{chatMutation.isError && (
					<Content>
						<Content>
							<Text>
								Fehler beim Senden der Nachricht:{" "}
								{chatMutation.error instanceof Error
									? chatMutation.error.message
									: String(chatMutation.error)}
							</Text>
							{chatMutation.error instanceof Error && chatMutation.error.stack && (
								<Text>
									Details: {chatMutation.error.stack.split("\n")[0]}
								</Text>
							)}
						</Content>
					</Content>
				)}

				{messages.length > 0 && (
					<Content>
						<Button
							onPress={() => setMessages([])}
							isDisabled={chatMutation.isPending}
						>
							Chat zurücksetzen
						</Button>
					</Content>
				)}
			</Content>
		</Content>
	);
}
