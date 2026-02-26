// components/ChatWidget.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import ChatButton from "./ChatButton";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import styles from "./ChatWidget.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "chat-widget-messages";
const MAX_HISTORY = 20; // Sliding window for API calls
const MAX_MESSAGE_LENGTH = 2000;

// Chat API URL — uses API Gateway in production, local Next.js API route in dev
const CHAT_API_BASE = process.env.NEXT_PUBLIC_CHAT_API_URL || "";
const CHAT_API_URL = CHAT_API_BASE ? `${CHAT_API_BASE}/chat` : "/api/chat";

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveMessages(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {}
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
  const pendingRef = useRef(false); // Debounce guard

  // Load persisted messages on mount
  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) {
      setMessages(stored);
    }
  }, []);

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 1) {
      saveMessages(messages);
    }
  }, [messages]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSend = useCallback(async (userMessage: string) => {
    // Debounce: prevent double-submit
    if (pendingRef.current) return;

    // Client-side length validation
    if (userMessage.length > MAX_MESSAGE_LENGTH) {
      setError(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
      return;
    }

    pendingRef.current = true;
    setError(null);

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Sliding window: only send last MAX_HISTORY messages to API
      const historyToSend = newMessages.slice(1).slice(-MAX_HISTORY);

      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: historyToSend,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get response");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (err: any) {
      setError(err.message || "Sorry, I couldn't process that. Please try again.");
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
      pendingRef.current = false;
    }
  }, [messages]);

  const handleClearHistory = () => {
    const initial: Message[] = [
      {
        role: "assistant",
        content:
          "Hi! 👋 I'm Eriberto's AI assistant. Ask me about his experience, skills, or projects!",
      },
    ];
    setMessages(initial);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className={styles.container}>
      {isOpen && (
        <div className={styles.chatPanel} role="dialog" aria-label="Chat with AI assistant">
          <div className={styles.chatHeader}>
            <h3 className={styles.headerTitle}>💬 Chat with AI</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className={styles.closeButton}
                onClick={handleClearHistory}
                aria-label="Clear chat history"
                title="Clear history"
              >
                🗑
              </button>
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
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

          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
            maxLength={MAX_MESSAGE_LENGTH}
          />
        </div>
      )}

      <ChatButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
    </div>
  );
}
