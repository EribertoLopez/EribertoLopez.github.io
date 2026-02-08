// lib/ai.ts
import Anthropic from "@anthropic-ai/sdk";
import { embedText } from "./embeddings";
import { searchSimilar } from "./vectorStore";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * The system prompt tells Claude how to behave.
 */
function buildSystemPrompt(relevantChunks: string[]): string {
  return `You are an AI assistant on Eriberto Lopez's personal portfolio website. 
Your job is to answer questions about his professional background, skills, experience, and accomplishments.

IMPORTANT RULES:
1. ONLY use information from the documents provided below
2. If you don't know something, say "I don't have that information in my documents"
3. Be warm, professional, and concise (2-4 sentences unless more detail is requested)
4. If someone asks how to contact him, mention the contact page or scheduling a call
5. NEVER make up information not in the documents

DOCUMENTS:
---
${relevantChunks.join("\n\n---\n\n")}
---

Answer the user's question based on the documents above.`;
}

/**
 * Main function to generate a chat response.
 */
export async function generateChatResponse(
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  // Step 1: Find relevant document chunks
  const queryEmbedding = await embedText(userMessage);
  const relevantDocs = await searchSimilar(queryEmbedding, 5);
  const relevantChunks = relevantDocs.map((doc) => doc.text);

  // Step 2: Build the prompt
  const systemPrompt = buildSystemPrompt(relevantChunks);

  // Step 3: Call Claude
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...conversationHistory,
      { role: "user", content: userMessage },
    ],
  });

  // Step 4: Extract the text response
  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text || "I'm sorry, I couldn't generate a response.";
}
