/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  images: { unoptimized: true },
  // Static export for S3/CloudFront deployment
  // API routes (pages/api/*) are excluded automatically in static export.
  // In production, ChatWidget uses NEXT_PUBLIC_CHAT_API_URL (API Gateway).
  // In local dev, run `npm run dev` (not `next export`) to use /api/chat.
  output: "export",
};

module.exports = nextConfig;
