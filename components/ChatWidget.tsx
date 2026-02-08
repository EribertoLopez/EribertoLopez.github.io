// components/ChatWidget.tsx
import React, { useState, useRef, useEffect } from "react";
import ChatButton from "./ChatButton";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import styles from "./ChatWidget.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! 👋 I'm Eriberto's AI assistant. Ask me about his experience, skills, or projects!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (userMessage: string) => {
    setError(null);
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: newMessages.slice(1), // Skip the greeting
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.response },
      ]);
    } catch (err) {
      setError("Sorry, I couldn't process that. Please try again.");
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {isOpen && (
        <div className={styles.chatPanel} role="dialog" aria-label="Chat with AI assistant">
          <div className={styles.chatHeader}>
            <h3 className={styles.headerTitle}>💬 Chat with AI</h3>
            <button
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className={styles.messagesContainer}>
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} />
            ))}
            {isLoading && (
              <div className={`${styles.message} ${styles.assistantMessage}`}>
                <div className={styles.messageBubble}>
                  <span className={styles.typingIndicator}>
                    <span>●</span><span>●</span><span>●</span>
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className={styles.errorMessage}>{error}</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      )}

      <ChatButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
    </div>
  );
}
