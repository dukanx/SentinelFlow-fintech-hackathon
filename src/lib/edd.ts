import type { Deposit } from "./mock-data";

export interface RequestedDoc {
  id: string;
  label: string;
}

export interface ReceivedDoc {
  name: string;
  kind: string;
  sizeKb: number;
}

export interface EddState {
  requestedAt: string; // ISO — when the RFI was sent
  dueAt: string; // ISO — customer deadline
  receivedAt?: string; // ISO — when documents arrived
}

const DUE_DAYS = 14;

export function newEddRequest(now: Date = new Date()): EddState {
  const due = new Date(now.getTime() + DUE_DAYS * 24 * 60 * 60 * 1000);
  return { requestedAt: now.toISOString(), dueAt: due.toISOString() };
}

/**
 * The RFI checklist — what the customer is asked to provide. Varies by case
 * type so a mixer-tainted case asks for a mixer explanation, etc.
 */
export function requestedDocuments(d: Deposit): RequestedDoc[] {
  const docs: RequestedDoc[] = [
    { id: "sof", label: "Source-of-funds statement" },
    { id: "kyc", label: "Government ID (KYC refresh)" },
  ];

  if (d.signals.mixerInPath) {
    docs.push({
      id: "mixer",
      label: `Written explanation of ${d.signals.mixerLabel ?? "mixer"} exposure`,
    });
  } else {
    docs.push({ id: "counterparty", label: "Counterparty & transaction explanation" });
  }

  const exposed = parseFloat(d.signals.exposedVolume);
  if (Number.isFinite(exposed) && exposed >= 3) {
    docs.push({ id: "bank", label: "Bank / exchange withdrawal records" });
  }

  return docs;
}

const FILE_FOR: Record<string, { name: string; kind: string }> = {
  sof: { name: "source-of-funds.pdf", kind: "PDF" },
  kyc: { name: "passport-scan.jpg", kind: "Image" },
  mixer: { name: "mixer-usage-explanation.pdf", kind: "PDF" },
  counterparty: { name: "counterparty-explanation.pdf", kind: "PDF" },
  bank: { name: "exchange-withdrawals.csv", kind: "CSV" },
};

function deterministicKb(seed: string, min = 90, max = 2600): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min));
}

/** The mock files the customer "uploaded", one per requested item. */
export function receivedDocuments(d: Deposit): ReceivedDoc[] {
  return requestedDocuments(d).map((r) => {
    const f = FILE_FOR[r.id] ?? { name: `${r.id}.pdf`, kind: "PDF" };
    return { name: f.name, kind: f.kind, sizeKb: deterministicKb(d.id + r.id) };
  });
}

export function dueLabel(dueAt: string): { text: string; overdue: boolean } {
  const diff = new Date(dueAt).getTime() - Date.now();
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  if (diff <= 0) return { text: "Overdue", overdue: true };
  if (days === 0) return { text: "Due today", overdue: false };
  return { text: `Due in ${days} day${days === 1 ? "" : "s"}`, overdue: false };
}
