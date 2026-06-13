import type { Node, Edge } from "@xyflow/react";
import { EXCHANGE_HOT_WALLET, KNOWN_LABELS } from "./config";

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

export interface Deposit {
  id: string;
  sender: string;
  amount: string;
  token: string;
  receivedAt: string; // ISO
  riskScore: number; // 0..100
  verdict: Verdict;
  directHit: boolean;
  reasons: string[]; // 2-3 sentences for "Why this verdict"
  signals: DepositSignals;
  graph?: DepositGraph;
  // Initial kanban column for REVIEW verdicts
  initialColumn?: KanbanColumn;
  // Analyst id (key into ANALYSTS) assigned to this case
  assigneeId?: string;
}

// ---- helpers to build graphs ----
const NODE_W = 200;
const NODE_H = 64;
function col(i: number) {
  return { x: i * (NODE_W + 80), y: 0 };
}

export function makeGraph(opts: {
  sender: string;
  hops: { id: string; label: string; kind: GraphNodeKind; amount: string }[];
  endpointFlow: string; // amount into exchange
}): DepositGraph {
  const chain = [...opts.hops];
  const senderIdx = chain.length;
  const exchangeIdx = senderIdx + 1;

  // Detect mixer for adding a sibling "Unattributed wallet" inflow
  const mixerIdx = chain.findIndex((h) => h.kind === "mixer");
  const hasSideWallet = mixerIdx > 0; // need a column 0 to place wallet below

  const nodes: Node[] = chain.map((h, i) => ({
    id: h.id,
    type: h.kind,
    position: { ...col(i), y: 0 },
    data: { label: h.label, address: h.id },
    width: NODE_W,
    height: NODE_H,
  }));

  if (hasSideWallet) {
    // Place wallet at column (mixerIdx - 1) lower row to feed into mixer
    nodes.push({
      id: `wallet-side-${opts.sender.slice(2, 6)}`,
      type: "wallet",
      position: { ...col(mixerIdx - 1), y: 120 },
      data: { label: "Unattributed", address: "0x88c1a4f9d2e7b3c5a6e8f1d2…4e2a" },
      width: NODE_W,
      height: NODE_H,
    });
  }

  nodes.push({
    id: "sender",
    type: "sender",
    position: { ...col(senderIdx), y: 0 },
    data: { label: "Sender", address: opts.sender },
    width: NODE_W,
    height: NODE_H,
  });

  nodes.push({
    id: "exchange",
    type: "exchange",
    position: { ...col(exchangeIdx), y: 0 },
    data: { label: "Your hot wallet", address: EXCHANGE_HOT_WALLET },
    width: NODE_W,
    height: NODE_H,
  });

  const edges: Edge[] = [];
  for (let i = 0; i < chain.length; i++) {
    const from = chain[i].id;
    const to = i + 1 < chain.length ? chain[i + 1].id : "sender";
    const danger = chain[i].kind === "sanctioned" || chain[i].kind === "mixer";
    edges.push({
      id: `e-${from}-${to}`,
      source: from,
      target: to,
      label: chain[i].amount,
      className: danger ? "edge-danger" : "edge-tainted",
      type: "smoothstep",
    });
  }
  if (hasSideWallet) {
    const wid = `wallet-side-${opts.sender.slice(2, 6)}`;
    edges.push({
      id: `e-${wid}-mixer`,
      source: wid,
      target: chain[mixerIdx].id,
      label: "3.30 ETH",
      className: "edge-clean",
      type: "smoothstep",
    });
  }
  edges.push({
    id: "e-sender-exchange",
    source: "sender",
    target: "exchange",
    label: opts.endpointFlow,
    className: "edge-tainted-faded",
    type: "smoothstep",
  });

  return { nodes, edges };
}

// ---- Deposits ----
export const deposits: Deposit[] = [
  // BLOCKED — direct OFAC hit
  {
    id: "dep-001",
    sender: "0x9f2c1a4b8e7d3f5a6c9b0d1e2f3a4b5c6d7e8a71b",
    amount: "12.40",
    token: "ETH",
    receivedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    riskScore: 99,
    verdict: "BLOCKED",
    directHit: true,
    assigneeId: "mr",
    reasons: [
      "Sender address is itself listed on the OFAC SDN list, attributed to the Lazarus Group.",
      "Policy requires automatic rejection of any deposit from a directly sanctioned address.",
    ],
    signals: {
      hopsToSanctioned: 0,
      mixerInPath: false,
      exposedVolume: "12.40 ETH (100%)",
      hopsTraced: 4,
      sanctionLabel: KNOWN_LABELS.ofacLazarus,
    },
    graph: makeGraph({
      sender: "0x9f2c1a4b8e7d3f5a6c9b0d1e2f3a4b5c6d7e8a71b",
      hops: [],
      endpointFlow: "12.40 ETH",
    }),
  },

  // REVIEW — with mixer, pending
  {
    id: "dep-002",
    sender: "0x3a8b91c4d2e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
    amount: "4.20",
    token: "ETH",
    receivedAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    riskScore: 78,
    verdict: "REVIEW",
    directHit: false,
    initialColumn: "pending",
    assigneeId: "mr",
    reasons: [
      "Funds reached this sender 2 hops after leaving an OFAC-sanctioned Lazarus Group address.",
      "The path includes a transfer through Tornado Cash, a known mixer used to obscure origin.",
      "Exposed volume from the sanctioned source represents the majority of the incoming deposit.",
    ],
    signals: {
      hopsToSanctioned: 2,
      mixerInPath: true,
      mixerLabel: KNOWN_LABELS.tornado,
      exposedVolume: "3.80 ETH (~90%)",
      hopsTraced: 6,
      sanctionLabel: KNOWN_LABELS.ofacLazarus,
    },
    graph: makeGraph({
      sender: "0x3a8b91c4d2e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
      hops: [
        { id: "ofac-lz-1", label: KNOWN_LABELS.ofacLazarus, kind: "sanctioned", amount: "12.0 ETH" },
        { id: "mixer-tc", label: KNOWN_LABELS.tornado, kind: "mixer", amount: "10.5 ETH" },
        { id: "hop-a", label: "Unknown wallet", kind: "intermediary", amount: "4.4 ETH" },
      ],
      endpointFlow: "4.20 ETH",
    }),
  },

  // REVIEW — proximity only (no mixer), pending
  {
    id: "dep-003",
    sender: "0x7c4e9a2b1d5f3e6a8b9c0d1e2f3a4b5c6d7e8f90",
    amount: "850.00",
    token: "USDC",
    receivedAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
    riskScore: 58,
    verdict: "REVIEW",
    directHit: false,
    initialColumn: "pending",
    assigneeId: "jk",
    reasons: [
      "Sender received funds 3 hops downstream from a sanctioned exchange (Garantex).",
      "No mixer detected in the path; exposure share is moderate but above policy threshold.",
    ],
    signals: {
      hopsToSanctioned: 3,
      mixerInPath: false,
      exposedVolume: "420 USDC (~49%)",
      hopsTraced: 6,
      sanctionLabel: KNOWN_LABELS.sanctionedExchange,
    },
    graph: makeGraph({
      sender: "0x7c4e9a2b1d5f3e6a8b9c0d1e2f3a4b5c6d7e8f90",
      hops: [
        { id: "ofac-gx", label: KNOWN_LABELS.sanctionedExchange, kind: "sanctioned", amount: "5,000 USDC" },
        { id: "hop-b1", label: "Unknown wallet", kind: "intermediary", amount: "1,800 USDC" },
        { id: "hop-b2", label: "Unknown wallet", kind: "intermediary", amount: "900 USDC" },
      ],
      endpointFlow: "850 USDC",
    }),
  },

  // REVIEW — awaiting documents
  {
    id: "dep-004",
    sender: "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
    amount: "1.95",
    token: "BTC",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    riskScore: 71,
    verdict: "REVIEW",
    directHit: false,
    initialColumn: "awaiting",
    assigneeId: "ap",
    reasons: [
      "Sender is 2 hops from an OFAC-sanctioned address with significant exposed volume.",
      "EDD requested 3 hours ago — awaiting source-of-funds documentation from depositor.",
    ],
    signals: {
      hopsToSanctioned: 2,
      mixerInPath: false,
      exposedVolume: "1.40 BTC (~72%)",
      hopsTraced: 5,
      sanctionLabel: KNOWN_LABELS.ofacSdn,
    },
    graph: makeGraph({
      sender: "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
      hops: [
        { id: "ofac-sdn", label: KNOWN_LABELS.ofacSdn, kind: "sanctioned", amount: "3.5 BTC" },
        { id: "hop-c1", label: "Unknown wallet", kind: "intermediary", amount: "2.1 BTC" },
      ],
      endpointFlow: "1.95 BTC",
    }),
  },

  // REVIEW — ready for re-review (docs in)
  {
    id: "dep-005",
    sender: "0x8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e",
    amount: "9.10",
    token: "ETH",
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    riskScore: 64,
    verdict: "REVIEW",
    directHit: false,
    initialColumn: "ready",
    assigneeId: "sc",
    reasons: [
      "Funds reached sender 3 hops from a sanctioned exchange via Tornado Cash mixer.",
      "Depositor has submitted source-of-funds documentation; analyst must re-review.",
    ],
    signals: {
      hopsToSanctioned: 3,
      mixerInPath: true,
      mixerLabel: KNOWN_LABELS.tornado,
      exposedVolume: "6.30 ETH (~69%)",
      hopsTraced: 6,
      sanctionLabel: KNOWN_LABELS.sanctionedExchange,
    },
    graph: makeGraph({
      sender: "0x8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e",
      hops: [
        { id: "ofac-gx2", label: KNOWN_LABELS.sanctionedExchange, kind: "sanctioned", amount: "20.0 ETH" },
        { id: "mixer-tc2", label: KNOWN_LABELS.tornado, kind: "mixer", amount: "16.0 ETH" },
        { id: "hop-d1", label: "Unknown wallet", kind: "intermediary", amount: "9.5 ETH" },
      ],
      endpointFlow: "9.10 ETH",
    }),
  },

  // CLEARED
  {
    id: "dep-006",
    sender: "0x2c8b9a1d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a80",
    amount: "0.85",
    token: "ETH",
    receivedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    riskScore: 6,
    verdict: "CLEARED",
    directHit: false,
    reasons: ["No sanctions exposure detected within 6 hops. Sender appears to be a standard self-custody wallet."],
    signals: {
      hopsToSanctioned: 99,
      mixerInPath: false,
      exposedVolume: "0",
      hopsTraced: 6,
    },
  },
  {
    id: "dep-007",
    sender: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
    amount: "2,500.00",
    token: "USDT",
    receivedAt: new Date(Date.now() - 1000 * 60 * 33).toISOString(),
    riskScore: 12,
    verdict: "CLEARED",
    directHit: false,
    reasons: ["Sender funded from a major regulated exchange. No sanctions linkage in traced history."],
    signals: { hopsToSanctioned: 99, mixerInPath: false, exposedVolume: "0", hopsTraced: 6 },
  },
  {
    id: "dep-008",
    sender: "0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f50",
    amount: "0.32",
    token: "BTC",
    receivedAt: new Date(Date.now() - 1000 * 60 * 51).toISOString(),
    riskScore: 18,
    verdict: "CLEARED",
    directHit: false,
    reasons: ["Sender path traced 6 hops, all to neutral or labeled-clean counterparties."],
    signals: { hopsToSanctioned: 99, mixerInPath: false, exposedVolume: "0", hopsTraced: 6 },
  },
];
