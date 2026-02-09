// pages/api/chat.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { generateChatResponse, generateChatResponseStream } from "@/lib/ai";
import { isRateLimited, getRemainingRequests } from "@/lib/rateLimit";
import { pipelineConfig } from "@/lib/config";
import { ChatError } from "@/lib/errors";

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: "Too many requests. Please try again later.",
      retryAfterMs: pipelineConfig.rateLimit.windowMs,
    });
  }

  try {
    const { message, history = [], stream = false } = req.body;

    // Input validation
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required and must be a string" });
    }

    if (message.length > pipelineConfig.chat.maxMessageLength) {
      return res.status(400).json({
        error: `Message too long (max ${pipelineConfig.chat.maxMessageLength} chars)`,
      });
    }

    if (!Array.isArray(history)) {
      return res.status(400).json({ error: "History must be an array" });
    }

    if (history.length > pipelineConfig.chat.maxHistoryLength) {
      return res.status(400).json({
        error: `Conversation too long (max ${pipelineConfig.chat.maxHistoryLength} messages)`,
      });
    }

    // Streaming response
    if (stream) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      await generateChatResponseStream(message, history, (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      });

      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // Non-streaming response
    const response = await generateChatResponse(message, history);
    return res.status(200).json({
      response,
      remaining: getRemainingRequests(ip),
    });
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof ChatError) {
      return res.status(503).json({ error: error.message });
    }

    return res.status(500).json({ error: "Failed to generate response" });
  }
}
