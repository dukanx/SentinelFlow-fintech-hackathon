import {
  X,
  Ban,
  FileText,
  CheckCircle2,
  BookOpen,
  Waypoints,
  Shuffle,
  Coins,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Info,
  Zap,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Deposit, KanbanColumn } from "@/lib/mock-data";
import { TransactionFlow } from "./TransactionFlow";
import { SignalBreakdown } from "./SignalBreakdown";
import { RiskBar } from "./RiskBar";
import { VerdictBadge } from "./VerdictBadge";
import { AnalystAvatar } from "./AnalystAvatar";
import { ActionDialog, type ActionKind } from "./ActionDialog";
import { CopyAddress } from "./CopyAddress";
import { DocumentsPanel } from "./DocumentsPanel";
import { SarDraftPanel } from "./SarDraftPanel";
import { ZkProofPanel } from "./ZkProofPanel";
import { truncateAddress, formatDateTime, formatRelative, nowHHMM } from "@/lib/format";
import { EXCHANGE_HOT_WALLET, EXCHANGE_NAME } from "@/lib/config";
import { auditLog } from "@/lib/audit-log";
import type { EddState } from "@/lib/edd";

const FACTOR_ICON: Record<string, LucideIcon> = {
  match: Ban,
  hops: Waypoints,
  mixer: Shuffle,
  obfuscation: EyeOff,
  velocity: Zap,
  exposed: Coins,
  identity: Fingerprint,
  quarantine: ShieldAlert,
  clean: ShieldCheck,
  policy: Scale,
};

interface Props {
  deposit: Deposit;
  column?: KanbanColumn;
  edd?: EddState;
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
  edd,
  auditNote,
  onAuditNoteChange,
  onClose,
  onBlock,
  onAccept,
  onRequestEdd,
  onMarkDocs,
}: Props) {
  const [note, setNote] = useState(auditNote);
  const [pending, setPending] = useState<ActionKind | null>(null);
  const [showSar, setShowSar] = useState(false);
  const [sarDecision, setSarDecision] = useState<"BLOCKED" | "ACCEPTED" | undefined>();

  useEffect(() => setNote(auditNote), [auditNote, deposit.id]);

  const isReview = deposit.verdict === "REVIEW";
  const isTerminal = !isReview;
  const canGenerateSar = deposit.verdict === "BLOCKED" || deposit.directHit;

  function appendAction(label: string) {
    const stamp = `Action: ${label} — ${nowHHMM()}`;
    const next = note.trim() ? `${note.trim()}\n${stamp}` : stamp;
    setNote(next);
    onAuditNoteChange(next);
  }

  const shortSender = truncateAddress(deposit.sender, 6, 6);

  function confirmAction() {
    if (!pending) return;
    if (pending === "block") {
      appendAction("Block deposit");
      onBlock(deposit);
      setSarDecision("BLOCKED");
      setShowSar(true);
      auditLog.append("SAR_DRAFT_GENERATED", `SAR draft opened after block on ${deposit.id.toUpperCase()}.`, {
        caseId: deposit.id,
        wallet: deposit.sender,
      });
      toast.error("Deposit blocked", {
        description: `${deposit.id.toUpperCase()} · ${shortSender}`,
      });
      setPending(null);
      return;
    } else if (pending === "accept") {
      appendAction("Accept deposit");
      onAccept(deposit);
      toast.success("Deposit accepted", {
        description: `${deposit.id.toUpperCase()} · ${shortSender}`,
      });
    } else if (pending === "request") {
      appendAction("Request EDD");
      onRequestEdd(deposit);
      toast.info("EDD requested", {
        description: `${deposit.id.toUpperCase()} moved to Awaiting documents`,
      });
    }
    setPending(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="max-w-7xl mx-auto px-6 py-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
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

        {/* Deposit summary — separate cards */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field
            label="Sender"
            value={<CopyAddress address={deposit.sender} className="text-sm" />}
          />
          <Field
            label="Amount"
            value={
              <span>
                {deposit.amount} <span className="text-muted-foreground">{deposit.token}</span>
              </span>
            }
            mono
          />
          <Field
            label="Destination"
            value={EXCHANGE_NAME}
            valueSub={
              <CopyAddress
                address={EXCHANGE_HOT_WALLET}
                className="text-[11px] text-muted-foreground"
              />
            }
          />
          <Field
            label="Received"
            value={formatRelative(deposit.receivedAt)}
            sub={formatDateTime(deposit.receivedAt)}
          />
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

        {/* zk-STARK clean-funds proof — only for private (shielded) deposits */}
        {deposit.zkProof && (
          <div className="mt-4">
            <ZkProofPanel proof={deposit.zkProof} caseId={deposit.id} />
          </div>
        )}

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
              <ul className="space-y-2.5 text-sm leading-relaxed text-foreground/85">
                {deposit.factors.map((f, i) => {
                  const Icon = FACTOR_ICON[f.type] ?? Info;
                  return (
                    <li key={i} className="flex gap-2.5">
                      <Icon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <span>{f.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div>
            <SignalBreakdown deposit={deposit} />
          </div>
        </div>

        {/* EDD document collection — only while a case is in the EDD flow */}
        {isReview && (column === "awaiting" || column === "ready") && (
          <div className="mt-4">
            <DocumentsPanel deposit={deposit} column={column} edd={edd} />
          </div>
        )}

        {/* Audit note + actions */}
        <div className="mt-4 rounded-lg border bg-surface p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Audit note
            </h2>
            <span className="text-xs text-muted-foreground">
              {isTerminal
                ? "Locked — terminal verdict, note is read-only."
                : "Pre-filled from verdict reasoning. Editable."}
            </span>
          </div>
          <textarea
            value={note}
            readOnly={isTerminal}
            onChange={(e) => {
              if (isTerminal) return;
              setNote(e.target.value);
              onAuditNoteChange(e.target.value);
            }}
            rows={4}
            className={`w-full rounded-md border px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none resize-y ${
              isTerminal
                ? "bg-muted/40 text-muted-foreground cursor-not-allowed"
                : "bg-background/40 focus:ring-2 focus:ring-ring"
            }`}
          />

          {isReview && (
            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              {column === "awaiting" && (
                <button
                  onClick={() => {
                    appendAction("Documents received");
                    onMarkDocs(deposit);
                    toast.success("Documents received", {
                      description: `${deposit.id.toUpperCase()} ready for re-review`,
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-md border bg-surface-2 px-3.5 py-2 text-sm transition-all hover:bg-accent hover:-translate-y-0.5"
                >
                  <FileText className="size-4" />
                  Mark documents received
                </button>
              )}
              {(column === undefined || column === "pending") && (
                <button
                  onClick={() => setPending("request")}
                  className="inline-flex items-center gap-2 rounded-md border bg-surface-2 px-3.5 py-2 text-sm transition-all hover:bg-accent hover:-translate-y-0.5"
                >
                  <FileText className="size-4" />
                  Request EDD
                </button>
              )}
              <button
                onClick={() => setPending("block")}
                className="inline-flex items-center gap-2 rounded-md border border-verdict-blocked/40 bg-verdict-blocked-soft/60 text-verdict-blocked px-3.5 py-2 text-sm font-medium transition-all hover:bg-verdict-blocked-soft hover:-translate-y-0.5"
              >
                <Ban className="size-4" />
                Block deposit
              </button>
              <button
                onClick={() => setPending("accept")}
                className="inline-flex items-center gap-2 rounded-md border border-verdict-cleared/40 bg-verdict-cleared-soft/60 text-verdict-cleared px-3.5 py-2 text-sm font-medium transition-all hover:bg-verdict-cleared-soft hover:-translate-y-0.5"
              >
                <CheckCircle2 className="size-4" />
                Accept deposit
              </button>
            </div>
          )}

          {isTerminal && (
            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              {canGenerateSar && (
                <button
                  type="button"
                  onClick={() => {
                    setSarDecision(deposit.verdict === "BLOCKED" ? "BLOCKED" : undefined);
                    setShowSar(true);
                    auditLog.append(
                      "SAR_DRAFT_GENERATED",
                      `Generated SAR draft for ${deposit.id.toUpperCase()}.`,
                      { caseId: deposit.id, wallet: deposit.sender },
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-md border bg-surface-2 px-3.5 py-2 text-sm transition-all hover:bg-accent"
                >
                  <FileText className="size-4" />
                  Generate SAR draft
                </button>
              )}
              <div className="w-full text-xs text-muted-foreground text-right">
                Terminal verdict — no further action available.
              </div>
            </div>
          )}
        </div>

        <div className="h-10" />
      </div>

      {pending && (
        <ActionDialog
          kind={pending}
          deposit={deposit}
          onConfirm={confirmAction}
          onClose={() => setPending(null)}
        />
      )}

      {showSar && (
        <SarDraftPanel
          deposit={deposit}
          analystDecision={sarDecision}
          onClose={() => {
            setShowSar(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  sub,
  valueSub,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  valueSub?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-surface p-4 hover:border-foreground/20 transition-colors">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className={`mt-1.5 text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
      {valueSub && <div className="mt-1">{valueSub}</div>}
      {sub && (
        <div className="text-[11px] font-mono text-muted-foreground mt-1 truncate">{sub}</div>
      )}
    </div>
  );
}

// The backend pre-fills the audit note from the same data as the risk factors,
// so the note and "Why this verdict" always agree.
export function defaultNoteFor(d: Deposit) {
  return d.auditNote;
}
