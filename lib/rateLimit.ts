// lib/rateLimit.ts — Simple in-memory rate limiter
import { pipelineConfig } from "./config";

const requestTimestamps = new Map<string, number[]>();

/**
 * Check if an IP is rate limited. Returns true if over limit.
 */
export function isRateLimited(ip: string): boolean {
  const { windowMs, maxRequests } = pipelineConfig.rateLimit;
  const now = Date.now();
  const timestamps = (requestTimestamps.get(ip) || []).filter(
    (t) => t > now - windowMs
  );
  timestamps.push(now);
  requestTimestamps.set(ip, timestamps);
  return timestamps.length > maxRequests;
}

/**
 * Get remaining requests for an IP.
 */
export function getRemainingRequests(ip: string): number {
  const { windowMs, maxRequests } = pipelineConfig.rateLimit;
  const now = Date.now();
  const timestamps = (requestTimestamps.get(ip) || []).filter(
    (t) => t > now - windowMs
  );
  return Math.max(0, maxRequests - timestamps.length);
}
