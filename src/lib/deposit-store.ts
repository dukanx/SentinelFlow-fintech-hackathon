import { useSyncExternalStore } from "react";
import { deposits as seedDeposits, type Deposit, type Verdict } from "./mock-data";
import {
  getRiskDeposits,
  screenTransfer,
  type RiskRunnerResult,
  type RiskRunnerVerdict,
} from "./api/risk.functions";

let state: Deposit[] = [...seedDeposits];
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let hydratedFromBackend = false;
let pendingLocalAdds: Deposit[] = [];

// Announcements: deposits that just landed (e.g. a wallet-initiated send) and
// should pop a "new case" notification the next time the dashboard is viewed.
let announcements: Deposit[] = [];
const announcementListeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function emitAnnouncements() {
  for (const l of announcementListeners) l();
}

export const depositStore = {
  getAll(): Deposit[] {
    return state;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  add(d: Deposit, opts?: { announce?: boolean }) {
    if (!hydratedFromBackend) {
      pendingLocalAdds = [d, ...pendingLocalAdds];
    }
    state = [d, ...state];
    if (opts?.announce) {
      announcements = [...announcements, d];
      emitAnnouncements();
    }
    emit();
  },
  replaceAll(deposits: Deposit[]) {
    state = deposits;
    emit();
  },
  getAnnouncements(): Deposit[] {
    return announcements;
  },
  subscribeAnnouncements(fn: () => void) {
    announcementListeners.add(fn);
    return () => announcementListeners.delete(fn);
  },
  dismissAnnouncement(id: string) {
    announcements = announcements.filter((a) => a.id !== id);
    emitAnnouncements();
  },
};

export function useDeposits(): Deposit[] {
  return useSyncExternalStore(depositStore.subscribe, depositStore.getAll, depositStore.getAll);
}

export function useDepositAnnouncements(): Deposit[] {
  return useSyncExternalStore(
    depositStore.subscribeAnnouncements,
    depositStore.getAnnouncements,
    depositStore.getAnnouncements,
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

function columnFor(result: RiskRunnerResult): Deposit["initialColumn"] {
  if (result.verdict !== "REVIEW") return undefined;
  return result.identity_link ? "awaiting" : "pending";
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
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        label: displayLabel(node.data.label, node.data.address),
        // Keep the FULL address — the graph truncates only for the compact
        // in-node label, while the hover card shows the whole thing.
        address: node.data.address ?? "",
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
  const hopsToSanctioned = result.signal_breakdown.hops_to_sanctioned;

  return {
    id: `risk-${String(index + 1).padStart(3, "0")}`,
    sender: result.checked_wallet,
    amount: result.quarantine
      ? String(result.quarantine.quarantined_amount_sol)
      : result.deposit_amount.toFixed(result.deposit_amount < 1 ? 4 : 2),
    token: "SOL",
    receivedAt: new Date(Date.now() - index * 1000 * 60 * 11).toISOString(),
    riskScore: result.risk_score,
    verdict: uiVerdict,
    directHit: result.verdict === "MATCH",
    factors: result.risk_factors,
    auditNote: result.audit_note,
    signals: {
      hopsToSanctioned,
      mixerInPath: result.signal_breakdown.mixer_in_path,
      mixerLabel: result.signal_breakdown.mixer_label ?? undefined,
      exposedVolume: `${result.signal_breakdown.exposed_volume_sol.toFixed(4)} SOL`,
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
    // Deterministic demo outcome: a borderline 75 score lands in REVIEW
    // (between the 35 review and 85 block thresholds).
    riskScore: 75,
    verdict: "REVIEW",
    initialColumn: "pending",
    assigneeId: "mr",
    factors: [
      {
        type: "policy",
        text: `Outbound send to ${opts.recipient} submitted for screening before the off-ramp.`,
      },
      ...mapped.factors,
    ],
    auditNote: `Wallet-initiated send of ${opts.amount} ${opts.token.toUpperCase()} to ${opts.recipient}. ${mapped.auditNote}`,
    signals: {
      ...mapped.signals,
      exposedVolume: `${mapped.signals.exposedVolume} · request ${opts.amount} ${opts.token.toUpperCase()}`,
    },
    graph,
  };
}
