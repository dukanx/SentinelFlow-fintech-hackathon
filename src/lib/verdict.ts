import type { Verdict, Deposit } from "./mock-data";
import { BLOCK_THRESHOLD, REVIEW_THRESHOLD } from "./config";

export function scoreToVerdict(score: number, directHit: boolean): Verdict {
  if (directHit || score >= BLOCK_THRESHOLD) return "BLOCKED";
  if (score >= REVIEW_THRESHOLD) return "REVIEW";
  return "CLEARED";
}

export function buildDefaultAuditNote(d: Deposit): string {
  if (d.verdict === "BLOCKED") {
    return `Flagged: sender address appears on the ${d.signals.sanctionLabel ?? "OFAC SDN"} list. Direct sanctions hit — auto-rejected per policy.`;
  }
  if (d.verdict === "REVIEW") {
    const parts: string[] = [];
    parts.push(
      `Flagged: funds reached sender ${d.signals.hopsToSanctioned} hop${d.signals.hopsToSanctioned === 1 ? "" : "s"} after a ${d.signals.sanctionLabel ?? "sanctioned"} address.`
    );
    if (d.signals.mixerInPath) {
      parts.push(`Path includes ${d.signals.mixerLabel ?? "a known mixer"}, used to obscure origin.`);
    }
    parts.push(`Exposed volume: ${d.signals.exposedVolume}. Recommend analyst review.`);
    return parts.join(" ");
  }
  return "No sanctions exposure detected within traced hops. Auto-cleared.";
}
