import type { Node, Edge } from "@xyflow/react";

export type Verdict = "CLEARED" | "REVIEW" | "BLOCKED";
export type KanbanColumn = "pending" | "awaiting" | "ready";

export type GraphNodeKind = "sender" | "intermediary" | "mixer" | "sanctioned" | "exchange" | "wallet";

export interface DepositSignals {
  hopsToSanctioned: number;
  mixerInPath: boolean;
  mixerLabel?: string;
  exposedVolume: string;
  hopsTraced: number;
  sanctionLabel?: string;
}

export interface DepositGraph {
  nodes: Node[];
  edges: Edge[];
}

export type RiskFactorType =
  | "match"
  | "hops"
  | "mixer"
  | "exposed"
  | "identity"
  | "quarantine"
  | "clean"
  | "policy";

export interface RiskFactor {
  type: RiskFactorType | string;
  text: string;
}

export interface Deposit {
  id: string;
  sender: string;
  amount: string;
  token: string;
  receivedAt: string; // ISO
  riskScore: number; // 0..100
  verdict: Verdict;
  directHit: boolean;
  factors: RiskFactor[]; // structured "Why this verdict" items (from backend)
  auditNote: string; // pre-filled audit note (from backend, same source as factors)
  signals: DepositSignals;
  graph?: DepositGraph;
  // Initial kanban column for REVIEW verdicts
  initialColumn?: KanbanColumn;
  // Analyst id (key into ANALYSTS) assigned to this case
  assigneeId?: string;
}

// ---- Deposits ----
// Deposits are sourced from the Python risk backend at runtime (see
// loadRiskDeposits in deposit-store.ts). The seed is intentionally empty so
// the dashboard reflects live backend data rather than hardcoded cases.
export const deposits: Deposit[] = [];
