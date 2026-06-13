import { useSyncExternalStore } from "react";
import { deposits as seedDeposits, makeGraph, type Deposit } from "./mock-data";
import { KNOWN_LABELS } from "./config";

let state: Deposit[] = [...seedDeposits];
const listeners = new Set<() => void>();

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
    state = [d, ...state];
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

// Build a synthetic deposit from a "wallet send" — always flagged for review
// with a mixer in the path so it visibly lands in the dashboard.
export function createWalletDeposit(opts: {
  sender: string;
  amount: string;
  token: string;
  recipient: string;
}): Deposit {
  const id = `dep-w-${Math.random().toString(36).slice(2, 7)}`;
  const score = 74;
  return {
    id,
    sender: opts.sender,
    amount: opts.amount,
    token: opts.token,
    receivedAt: new Date().toISOString(),
    riskScore: score,
    verdict: "REVIEW",
    directHit: false,
    initialColumn: "pending",
    assigneeId: "mr",
    reasons: [
      `Funds reached this sender 2 hops after leaving an OFAC-sanctioned address.`,
      `Path includes ${KNOWN_LABELS.tornado}, used to obscure origin.`,
      `Originated from the demo wallet — flagged automatically for analyst review.`,
    ],
    signals: {
      hopsToSanctioned: 2,
      mixerInPath: true,
      mixerLabel: KNOWN_LABELS.tornado,
      exposedVolume: `${opts.amount} ${opts.token} (~85%)`,
      hopsTraced: 6,
      sanctionLabel: KNOWN_LABELS.ofacLazarus,
    },
    graph: makeGraph({
      sender: opts.sender,
      hops: [
        { id: `ofac-${id}`, label: KNOWN_LABELS.ofacLazarus, kind: "sanctioned", amount: `${opts.amount} ${opts.token}` },
        { id: `mix-${id}`, label: KNOWN_LABELS.tornado, kind: "mixer", amount: `${opts.amount} ${opts.token}` },
        { id: `hop-${id}`, label: "Demo wallet", kind: "intermediary", amount: `${opts.amount} ${opts.token}` },
      ],
      endpointFlow: `${opts.amount} ${opts.token}`,
    }),
  };
}
