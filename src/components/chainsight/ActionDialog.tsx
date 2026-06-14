import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Ban, CheckCircle2, FileText, X } from "lucide-react";
import type { Deposit } from "@/lib/mock-data";
import { truncateAddress } from "@/lib/format";
import { scoreColorClass } from "./RiskMiniBar";

export type ActionKind = "block" | "accept" | "request";

interface ActionConfig {
  icon: typeof Ban;
  title: string;
  description: string;
  confirmLabel: string;
  iconWrap: string;
  confirmBtn: string;
}

const CONFIG: Record<ActionKind, ActionConfig> = {
  block: {
    icon: Ban,
    title: "Block this deposit?",
    description:
      "The deposit will be rejected at the off-ramp and the verdict becomes terminal. This is recorded in the audit trail.",
    confirmLabel: "Block deposit",
    iconWrap: "bg-verdict-blocked-soft text-verdict-blocked",
    confirmBtn:
      "bg-verdict-blocked text-verdict-blocked-foreground hover:brightness-110 focus-visible:ring-verdict-blocked/40",
  },
  accept: {
    icon: CheckCircle2,
    title: "Accept this deposit?",
    description:
      "The deposit will be cleared and credited. The verdict becomes terminal and is recorded in the audit trail.",
    confirmLabel: "Accept deposit",
    iconWrap: "bg-verdict-cleared-soft text-verdict-cleared",
    confirmBtn:
      "bg-verdict-cleared text-verdict-cleared-foreground hover:brightness-110 focus-visible:ring-verdict-cleared/40",
  },
  request: {
    icon: FileText,
    title: "Request enhanced due diligence?",
    description:
      "The case moves to “Awaiting documents”. The sender is asked for source-of-funds evidence before a final decision.",
    confirmLabel: "Request EDD",
    iconWrap: "bg-col-awaiting-soft text-col-awaiting",
    confirmBtn:
      "bg-col-awaiting text-white hover:brightness-110 focus-visible:ring-col-awaiting/40",
  },
};

interface Props {
  kind: ActionKind;
  deposit: Deposit;
  onConfirm: () => void;
  onClose: () => void;
}

export function ActionDialog({ kind, deposit, onConfirm, onClose }: Props) {
  const c = CONFIG[kind];
  const Icon = c.icon;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") onConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onConfirm]);

  const dialog = (
    <div
      className="fixed inset-0 z-60 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-surface shadow-2xl animate-pop-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <span className={`grid place-items-center size-12 rounded-xl shrink-0 ${c.iconWrap}`}>
              <Icon className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">{c.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{c.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Case summary */}
          <div className="mt-5 rounded-xl border bg-surface-2/60 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {deposit.id.toUpperCase()}
              </div>
              <div className="font-mono text-sm truncate">{truncateAddress(deposit.sender, 8, 6)}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-sm font-medium">
                {deposit.amount} <span className="text-muted-foreground">{deposit.token}</span>
              </div>
              <div className={`font-mono text-xs font-semibold ${scoreColorClass(deposit.riskScore)}`}>
                risk {deposit.riskScore}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-surface-2/40 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border bg-surface px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 ${c.confirmBtn}`}
          >
            <Icon className="size-4" />
            {c.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}
