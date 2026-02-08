// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { generateChatResponse } from "@/lib/ai";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await generateChatResponse(message, history);

    return res.status(200).json({ response });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({ error: "Failed to generate response" });
  }
}
