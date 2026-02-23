// pages/api/health.ts — Health check endpoint
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const checks: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    anthropicKey: process.env.ANTHROPIC_API_KEY ? "configured" : "missing",
    supabaseUrl: process.env.SUPABASE_URL ? "configured" : "missing",
    embeddingProvider: process.env.EMBEDDING_PROVIDER || "ollama",
  };

  const healthy = checks.anthropicKey === "configured" && checks.supabaseUrl === "configured";

  return res.status(healthy ? 200 : 503).json(checks);
}
