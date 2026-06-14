import type { Deposit } from "./mock-data";
import { CURRENT_ANALYST, INSTITUTION_NAME } from "./config";
import { formatDateTime } from "./format";

export type FilingType = "SAR" | "STR";

export interface SarDraftInput {
  deposit: Deposit;
  filingType: FilingType;
  analystDecision?: "BLOCKED" | "ACCEPTED";
}

export function estimateTaintPercent(deposit: Deposit): number {
  if (deposit.directHit) return 100;
  if (deposit.behavioralAlert?.type === "velocity_structuring") return 65;
  if (deposit.signals.mixerInPath) return Math.min(95, 70 + deposit.signals.hopsToSanctioned * 5);
  const hops = deposit.signals.hopsToSanctioned;
  if (hops >= 99) return 0;
  return Math.max(40, 100 - hops * 15);
}

function transactionRefs(deposit: Deposit): string[] {
  const refs: string[] = [];
  if (deposit.graph?.edges.length) {
    for (const edge of deposit.graph.edges.slice(0, 6)) {
      refs.push(
        `- ${edge.source.slice(0, 8)}… → ${edge.target.slice(0, 8)}… | ${edge.label ?? "transfer"}`,
      );
    }
  }
  if (refs.length === 0) {
    refs.push(`- Subject wallet: ${deposit.sender}`);
    refs.push(`- Screening timestamp: ${formatDateTime(deposit.receivedAt)}`);
  }
  return refs;
}

export function generateSarDraft(input: SarDraftInput): string {
  const { deposit, filingType, analystDecision } = input;
  const taint = estimateTaintPercent(deposit);
  const refs = transactionRefs(deposit);
  const header =
    filingType === "SAR"
      ? "SUSPICIOUS ACTIVITY REPORT (SAR) — DRAFT"
      : "SUSPICIOUS TRANSACTION REPORT (STR) — DRAFT";
  const authority = filingType === "SAR" ? "FinCEN (BSA E-Filing — demo template)" : "FIU / national authority (generic template)";

  const velocityBlock = deposit.behavioralAlert
    ? `\nBehavioral KYT: ${deposit.behavioralAlert.tx_count} micro-transactions in ${deposit.behavioralAlert.window_hours} hour(s) (avg ${deposit.behavioralAlert.avg_amount_sol.toFixed(4)} SOL) — suspected ${deposit.behavioralAlert.pattern.replace("_", " ")}.`
    : "";

  const mixerBlock = deposit.signals.mixerInPath
    ? `\nObfuscation: funds routed through ${deposit.signals.mixerLabel ?? "a known mixer"} prior to the deposit attempt.`
    : "";

  return `${header}
${"=".repeat(72)}
DRAFT — NOT FILED | Demo template only | ${authority}
Generated: ${formatDateTime(new Date().toISOString())}
Prepared by: ${CURRENT_ANALYST.name}, ${INSTITUTION_NAME}

PART I — SUBJECT / INSTITUTION
  Institution: ${INSTITUTION_NAME}
  Subject wallet: ${deposit.sender}
  Case reference: ${deposit.id.toUpperCase()}
  Activity date: ${formatDateTime(deposit.receivedAt)}

PART II — SUSPICIOUS ACTIVITY SUMMARY
  Asset: ${deposit.token}
  Amount: ${deposit.amount} ${deposit.token}
  Direction: Inbound deposit to exchange hot wallet
  Risk score: ${deposit.riskScore}/100
  Verdict: ${deposit.verdict}
  Estimated taint exposure: ~${taint.toFixed(1)}% of traced value

PART III — NARRATIVE
On ${formatDateTime(deposit.receivedAt)}, subject wallet ${deposit.sender.slice(0, 8)}… attempted a deposit of ${deposit.amount} ${deposit.token} to ${INSTITUTION_NAME}. Automated screening flagged the activity for compliance review.

On-chain analysis traced ${deposit.signals.hopsTraced} hops. Nearest sanctioned exposure: ${deposit.signals.hopsToSanctioned >= 99 ? "none within trace window" : `${deposit.signals.hopsToSanctioned} hop(s)`}${deposit.signals.sanctionLabel ? ` (${deposit.signals.sanctionLabel})` : ""}. Exposed volume: ${deposit.signals.exposedVolume}.${mixerBlock}${velocityBlock}

Key findings:
${deposit.factors.map((f) => `  • ${f.text}`).join("\n")}

Transaction references (on-chain):
${refs.join("\n")}

Analyst disposition: ${analystDecision ?? deposit.verdict}
Audit note excerpt: ${deposit.auditNote.slice(0, 400)}${deposit.auditNote.length > 400 ? "…" : ""}

PART IV — CERTIFICATION (placeholder)
  Filing institution: ${INSTITUTION_NAME}
  Contact: Compliance Department
  Status: PENDING REVIEW — do not submit without legal/compliance sign-off

END OF DRAFT
`;
}
