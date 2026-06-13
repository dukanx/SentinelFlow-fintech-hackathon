import { X, Ban, FileText, CheckCircle2, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import type { Deposit, KanbanColumn } from "@/lib/mock-data";
import { TransactionFlow } from "./TransactionFlow";
import { SignalBreakdown } from "./SignalBreakdown";
import { RiskBar } from "./RiskBar";
import { VerdictBadge } from "./VerdictBadge";
import { AnalystAvatar } from "./AnalystAvatar";
import { truncateAddress, formatDateTime, nowHHMM } from "@/lib/format";
import { EXCHANGE_HOT_WALLET, EXCHANGE_NAME } from "@/lib/config";
import { buildDefaultAuditNote } from "@/lib/verdict";

interface Props {
  deposit: Deposit;
  column?: KanbanColumn;
  auditNote: string;
  onAuditNoteChange: (note: string) => void;
  onClose: () => void;
  onBlock: (d: Deposit) => void;
  onAccept: (d: Deposit) => void;
  onRequestEdd: (d: Deposit) => void;
  onMarkDocs: (d: Deposit) => void;
}

export function CaseDetail({
  deposit,
  column,
  auditNote,
  onAuditNoteChange,
  onClose,
  onBlock,
  onAccept,
  onRequestEdd,
  onMarkDocs,
}: Props) {
  const [note, setNote] = useState(auditNote);

  useEffect(() => setNote(auditNote), [auditNote, deposit.id]);

  const isReview = deposit.verdict === "REVIEW";
  const isTerminal = !isReview;

  function appendAction(label: string) {
    const stamp = `Action: ${label} — ${nowHHMM()}`;
    const next = note.trim() ? `${note.trim()}\n${stamp}` : stamp;
    setNote(next);
    onAuditNoteChange(next);
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md border bg-surface size-9 hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Case {deposit.id.toUpperCase()}
              </div>
              <h1 className="text-xl font-medium">Deposit review</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {deposit.assigneeId && (
              <div className="hidden md:flex items-center gap-2 rounded-md border bg-surface px-3 py-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Assigned
                </span>
                <AnalystAvatar analystId={deposit.assigneeId} size="sm" showName />
              </div>
            )}
            <VerdictBadge verdict={deposit.verdict} size="md" />
          </div>
        </div>

        {/* Deposit summary */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 rounded-lg border bg-surface p-5">
          <Field label="Sender" value={truncateAddress(deposit.sender, 8, 6)} mono />
          <Field
            label="Amount"
            value={
              <span>
                {deposit.amount}{" "}
                <span className="text-muted-foreground">{deposit.token}</span>
              </span>
            }
            mono
          />
          <Field label="Destination" value={EXCHANGE_NAME} sub={EXCHANGE_HOT_WALLET} />
          <Field label="Received" value={formatDateTime(deposit.receivedAt)} />
        </div>

        {/* Risk score + bar */}
        <div className="mt-4">
          <RiskBar score={deposit.riskScore} />
        </div>

        {/* Graph */}
        <div className="mt-4">
          {deposit.graph ? (
            <TransactionFlow nodes={deposit.graph.nodes} edges={deposit.graph.edges} />
          ) : (
            <div className="rounded-xl border bg-surface p-10 text-center text-muted-foreground text-sm">
              No upstream sanctions exposure detected. Graph not generated.
            </div>
          )}
        </div>

        {/* Why + signals */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative rounded-xl border bg-surface p-5 overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ background: "oklch(0.62 0.18 55)" }}
            />
            <div className="pl-2">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="size-4 text-[oklch(0.55_0.18_55)]" />
                <h2 className="text-sm font-medium">Why this verdict</h2>
              </div>
              <div className="space-y-2.5 text-sm leading-relaxed text-foreground/85">
                {deposit.reasons.map((r, i) => (
                  <p key={i}>{r}</p>
                ))}
              </div>
            </div>
          </div>

          <div>
            <SignalBreakdown deposit={deposit} />
          </div>

        </div>

        {/* Audit note + actions */}
        <div className="mt-4 rounded-lg border bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Audit note
            </h2>
            <span className="text-xs text-muted-foreground">
              Pre-filled from verdict reasoning. Editable.
            </span>
          </div>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              onAuditNoteChange(e.target.value);
            }}
            rows={4}
            className="w-full rounded-md border bg-background/40 px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />

          {isReview && (
            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              {column === "awaiting" && (
                <button
                  onClick={() => {
                    appendAction("Documents received");
                    onMarkDocs(deposit);
                  }}
                  className="inline-flex items-center gap-2 rounded-md border bg-surface-2 px-3.5 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <FileText className="size-4" />
                  Mark documents received
                </button>
              )}
              {column !== "awaiting" && (
                <button
                  onClick={() => {
                    appendAction("Request EDD");
                    onRequestEdd(deposit);
                  }}
                  className="inline-flex items-center gap-2 rounded-md border bg-surface-2 px-3.5 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <FileText className="size-4" />
                  Request EDD
                </button>
              )}
              <button
                onClick={() => {
                  appendAction("Block deposit");
                  onBlock(deposit);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-verdict-blocked/40 bg-verdict-blocked-soft/60 text-verdict-blocked px-3.5 py-2 text-sm hover:bg-verdict-blocked-soft transition-colors"
              >
                <Ban className="size-4" />
                Block deposit
              </button>
              <button
                onClick={() => {
                  appendAction("Accept deposit");
                  onAccept(deposit);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-verdict-cleared/40 bg-verdict-cleared-soft/60 text-verdict-cleared px-3.5 py-2 text-sm hover:bg-verdict-cleared-soft transition-colors"
              >
                <CheckCircle2 className="size-4" />
                Accept deposit
              </button>
            </div>
          )}

          {isTerminal && (
            <div className="mt-4 text-xs text-muted-foreground text-right">
              Terminal verdict — no further action available.
            </div>
          )}
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  sub,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
      {sub && <div className="text-xs font-mono text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

// Helper exported so the parent can compute initial note for a case
export function defaultNoteFor(d: Deposit) {
  return buildDefaultAuditNote(d);
}
