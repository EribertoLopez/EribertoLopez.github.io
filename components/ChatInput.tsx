// components/ChatInput.tsx
import React, { useState } from "react";
import styles from "./ChatWidget.module.css";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  maxLength?: number;
}

export default function ChatInput({ onSend, disabled, maxLength = 2000 }: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setInput("");
    }
  };

  return (
    <form className={styles.inputForm} onSubmit={handleSubmit}>
      <input
        className={styles.inputField}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask me anything..."
        disabled={disabled}
        maxLength={maxLength}
        aria-label="Chat message input"
      />
      <button
        className={styles.sendButton}
        type="submit"
        disabled={disabled || !input.trim()}
        aria-label="Send message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
}
