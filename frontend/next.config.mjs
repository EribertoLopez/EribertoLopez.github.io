/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  // Explicitly inline env vars into the client bundle.
  // Required for static export (output: "export") where process.env isn't available at runtime.
  env: {
    NEXT_PUBLIC_CHAT_API_URL: process.env.NEXT_PUBLIC_CHAT_API_URL || "https://grtne76mp9.execute-api.us-east-1.amazonaws.com",
  },
  // Static export for S3/CloudFront deployment (production builds only).
  // In local dev, API routes (pages/api/*) are available at /api/chat.
  // In production, ChatWidget uses NEXT_PUBLIC_CHAT_API_URL (API Gateway).
  ...(process.env.NODE_ENV === "production" && { output: "export" }),
};
export default nextConfig;
