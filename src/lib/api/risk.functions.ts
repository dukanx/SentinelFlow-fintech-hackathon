import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { EXCHANGE_HOT_WALLET } from "../config";
import type { ZkCleanFundsProof } from "../zk-proof";

export type RiskRunnerVerdict = "MATCH" | "REVIEW" | "NO MATCH";

export interface RiskRunnerResult {
  checked_wallet: string;
  verdict: RiskRunnerVerdict;
  hops_detected: number | null;
  execution_time_ms: number;
  risk_score: number;
  deposit_amount: number;
  risk_sources: string[];
  explanation: string;
  risk_factors: Array<{ type: string; text: string }>;
  audit_note: string;
  signal_breakdown: {
    hops_to_sanctioned: number;
    mixer_in_path: boolean;
    mixer_label?: string | null;
    exposed_volume_sol: number;
    hops_traced: number;
    sanction_label?: string | null;
  };
  transaction_graph: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: { label: string; address?: string };
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      label?: string;
      className?: string;
      type?: string;
    }>;
  };
  screen_request?: {
    sender_wallet: string;
    recipient_wallet: string;
    amount: number;
    token: string;
  };
  identity_link?: {
    linked_wallet: string;
    confidence: number;
    inherited_risk_score: number;
    linked_wallet_hops_to_blocked: number;
    status: string;
    evidence: string[];
  };
  quarantine?: {
    blocked_source: string;
    quarantined_amount_sol: number;
    tx_signature: string;
    reason: string;
  };
  behavioral_alert?: {
    type: "velocity_structuring";
    tx_count: number;
    window_hours: number;
    avg_amount_sol: number;
    pattern: "peel_chain" | "structuring";
  };
  zk_proof?: ZkCleanFundsProof;
}

const RISK_API_BASE_URL = process.env.RISK_API_BASE_URL ?? "http://127.0.0.1:8000";

export const getRiskDeposits = createServerFn({ method: "GET" }).handler(async () => {
  const response = await fetch(`${RISK_API_BASE_URL}/api/risk/deposits`);
  if (!response.ok) {
    throw new Error(`Risk API error: ${response.status}`);
  }
  return (await response.json()) as RiskRunnerResult[];
});

export const screenWallet = createServerFn({ method: "POST" })
  .validator(z.object({ wallet: z.string().min(1) }))
  .handler(async ({ data }) => {
    const response = await fetch(`${RISK_API_BASE_URL}/api/risk/screen`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: data.wallet }),
    });
    if (!response.ok) {
      throw new Error(`Risk API error: ${response.status}`);
    }
    return (await response.json()) as RiskRunnerResult;
  });

export const screenTransfer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sender_wallet: z.string().min(1),
      recipient_wallet: z.string().min(1),
      amount: z.number().positive(),
      token: z.string().min(1),
      scenario: z.enum(["zk_clean", "zk_tainted"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const response = await fetch(`${RISK_API_BASE_URL}/api/risk/screen-transfer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Risk API error: ${response.status}`);
    }
    return (await response.json()) as RiskRunnerResult;
  });

export const getExchangeHotWallet = createServerFn({ method: "GET" }).handler(async () => ({
  address: EXCHANGE_HOT_WALLET,
}));
