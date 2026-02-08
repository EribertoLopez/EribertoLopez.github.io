// components/ChatMessage.tsx
import React from "react";
import ReactMarkdown from "react-markdown";
import styles from "./ChatWidget.module.css";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div
      className={`${styles.message} ${role === "user" ? styles.userMessage : styles.assistantMessage}`}
    >
      <div className={styles.messageBubble}>
        {role === "assistant" ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
