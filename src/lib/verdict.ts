import type { Verdict } from "./mock-data";
import { BLOCK_THRESHOLD, REVIEW_THRESHOLD } from "./config";

export function scoreToVerdict(score: number, directHit: boolean): Verdict {
  if (directHit || score >= BLOCK_THRESHOLD) return "BLOCKED";
  if (score >= REVIEW_THRESHOLD) return "REVIEW";
  return "CLEARED";
}
