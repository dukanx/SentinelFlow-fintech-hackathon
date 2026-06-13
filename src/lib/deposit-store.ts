import { useSyncExternalStore } from "react";
import { deposits as seedDeposits, type Deposit, type Verdict } from "./mock-data";
import { getRiskDeposits, screenTransfer, type RiskRunnerResult, type RiskRunnerVerdict } from "./api/risk.functions";

let state: Deposit[] = [...seedDeposits];
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let hydratedFromBackend = false;
let pendingLocalAdds: Deposit[] = [];

function emit() {
  for (const l of listeners) l();
}

export const depositStore = {
  getAll(): Deposit[] {
    return state;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  add(d: Deposit) {
    if (!hydratedFromBackend) {
      pendingLocalAdds = [d, ...pendingLocalAdds];
    }
    state = [d, ...state];
    emit();
  },
  replaceAll(deposits: Deposit[]) {
    state = deposits;
    emit();
  },
};

export function useDeposits(): Deposit[] {
  return useSyncExternalStore(
    depositStore.subscribe,
    depositStore.getAll,
    depositStore.getAll,
  );
}

export function loadRiskDeposits(): Promise<void> {
  if (!loadPromise) {
    loadPromise = getRiskDeposits()
      .then((results) => {
        const deposits = results.map(mapRiskResultToDeposit);
        if (deposits.length > 0) {
          hydratedFromBackend = true;
          depositStore.replaceAll([...pendingLocalAdds, ...deposits]);
          pendingLocalAdds = [];
        }
      })
      .catch((error) => {
        console.warn("Risk backend unavailable; using mock deposits.", error);
      });
  }
  return loadPromise;
}

function mapVerdict(verdict: RiskRunnerVerdict): Verdict {
  if (verdict === "MATCH") return "BLOCKED";
  if (verdict === "REVIEW") return "REVIEW";
  return "CLEARED";
}

function scoreFor(result: RiskRunnerResult): number {
  if (result.verdict === "MATCH") return 99;
  if (result.quarantine) return 14;
  if (result.identity_link) return Math.round(result.identity_link.inherited_risk_score);
  if (result.verdict === "REVIEW") {
    const sb = result.signal_breakdown;
    const hops = result.hops_detected ?? sb.hops_to_sanctioned ?? 3;
    // Closer to the sanctioned source = higher; a mixer and larger exposed
    // volume push it up further. Yields a spread of distinct scores per case.
    let score = 84 - (hops - 1) * 9;
    if (sb.mixer_in_path) score += 7;
    score += Math.min(8, Math.round(sb.exposed_volume_sol));
    return Math.max(40, Math.min(96, score));
  }
  return 6;
}

function columnFor(result: RiskRunnerResult): Deposit["initialColumn"] {
  if (result.verdict !== "REVIEW") return undefined;
  return result.identity_link ? "awaiting" : "pending";
}

function reasonsFor(result: RiskRunnerResult): string[] {
  if (result.verdict === "MATCH") {
    return [
      "Screened sender wallet is directly matched to a blocked source in backend risk graph.",
      "Direct deterministic matches are rejected automatically at the off-ramp.",
    ];
  }

  if (result.identity_link) {
    return [
      `Wallet is behaviorally linked to a tainted wallet with ${(result.identity_link.confidence * 100).toFixed(1)}% confidence.`,
      `Evidence: ${result.identity_link.evidence.join("; ")}.`,
      "Identity links are probabilistic, so the case is routed to analyst review instead of auto-blocking.",
    ];
  }

  if (result.verdict === "REVIEW") {
    return [
      `Reverse graph traversal found a blocked source ${result.hops_detected ?? "within configured"} hops upstream.`,
      "Funds moved through intermediary wallets before reaching the off-ramp wallet.",
      "Policy requires analyst review for non-direct taint within the configured hop window.",
    ];
  }

  if (result.quarantine) {
    return [
      "Wallet received a tiny unsolicited inbound transfer from a blocked source.",
      "No outbound movement was detected, so the exposure is quarantined rather than used to flag the whole wallet.",
      "This protects users from dusting or taint-poisoning attacks.",
    ];
  }

  return ["No blocked source or risky identity link was detected within the configured graph search."];
}

function graphFor(result: RiskRunnerResult): Deposit["graph"] {
  const displayAddress = (address?: string) => {
    if (!address) return "";
    if (address.length <= 18) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const displayLabel = (label: string, address?: string) => {
    const raw = label.trim();
    if (!raw || raw === "Unknown wallet" || raw === "synthetic_wallet") {
      return displayAddress(address) || "Wallet";
    }
    return raw;
  };

  return {
    nodes: result.transaction_graph.nodes.map((node) => ({
      id: node.id,
      type: node.type as any,
      position: node.position,
      data: {
        ...node.data,
        label: displayLabel(node.data.label, node.data.address),
        address: displayAddress(node.data.address),
      },
    })),
    edges: result.transaction_graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      className: edge.className,
      type: edge.type ?? "smoothstep",
    })),
  };
}

function mapRiskResultToDeposit(result: RiskRunnerResult, index: number): Deposit {
  const uiVerdict = mapVerdict(result.verdict);
  const hopsToSanctioned =
    result.signal_breakdown.hops_to_sanctioned;

  return {
    id: `risk-${String(index + 1).padStart(3, "0")}`,
    sender: result.checked_wallet,
    amount: result.quarantine
      ? String(result.quarantine.quarantined_amount_sol)
      : result.deposit_amount.toFixed(result.deposit_amount < 1 ? 4 : 2),
    token: "ETH",
    receivedAt: new Date(Date.now() - index * 1000 * 60 * 11).toISOString(),
    riskScore: scoreFor(result),
    verdict: uiVerdict,
    directHit: result.verdict === "MATCH",
    reasons: reasonsFor(result),
    signals: {
      hopsToSanctioned,
      mixerInPath: result.signal_breakdown.mixer_in_path,
      mixerLabel: result.signal_breakdown.mixer_label ?? undefined,
      exposedVolume: `${result.signal_breakdown.exposed_volume_sol.toFixed(4)} ETH`,
      hopsTraced: result.signal_breakdown.hops_traced,
      sanctionLabel: result.signal_breakdown.sanction_label ?? undefined,
    },
    graph: graphFor(result),
    initialColumn: columnFor(result),
    assigneeId: uiVerdict === "REVIEW" ? "mr" : undefined,
  };
}

export async function createWalletDepositFromBackend(opts: {
  sender: string;
  amount: string;
  token: string;
  recipient: string;
}): Promise<Deposit> {
  const parsedAmount = Number.parseFloat(opts.amount);
  const result = await screenTransfer({
    data: {
      sender_wallet: opts.sender,
      recipient_wallet: opts.recipient,
      amount: Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0.1,
      token: opts.token.toUpperCase(),
    },
  });
  const mapped = mapRiskResultToDeposit(result, state.length + 1);
  const id = `dep-w-${Math.random().toString(36).slice(2, 7)}`;

  const graph = mapped.graph
    ? {
        ...mapped.graph,
        nodes: mapped.graph.nodes.map((node) => {
          if (node.id !== "sender") return node;
          const data = (node.data ?? {}) as Record<string, unknown>;
          return {
            ...node,
            data: {
              ...data,
              address: opts.sender,
            },
          };
        }),
      }
    : mapped.graph;

  return {
    ...mapped,
    id,
    sender: opts.sender,
    amount: opts.amount,
    token: opts.token.toUpperCase(),
    receivedAt: new Date().toISOString(),
    verdict: "REVIEW",
    initialColumn: "pending",
    assigneeId: "mr",
    reasons: [`Wallet send to ${opts.recipient} triggered backend screening.`, ...mapped.reasons],
    signals: {
      ...mapped.signals,
      exposedVolume: `${mapped.signals.exposedVolume} · request ${opts.amount} ${opts.token.toUpperCase()}`,
    },
    graph,
  };
}
