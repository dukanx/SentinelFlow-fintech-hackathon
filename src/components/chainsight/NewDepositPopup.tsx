import { X, BellRing, ArrowRight } from "lucide-react";
import type { Deposit } from "@/lib/mock-data";
import { VerdictBadge } from "./VerdictBadge";
import { RiskBar } from "./RiskBar";
import { CopyAddress } from "./CopyAddress";

interface Props {
  deposit: Deposit;
  onReview: () => void;
  onDismiss: () => void;
}

/**
 * Toast-style popup shown on the dashboard when a freshly screened deposit
 * lands (e.g. a wallet-initiated send). It just announces the outcome and
 * offers a jump into the case.
 */
export function NewDepositPopup({ deposit, onReview, onDismiss }: Props) {
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-background/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-surface shadow-2xl p-6 relative animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDismiss}
          className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="size-10 shrink-0 grid place-items-center rounded-full bg-verdict-review-soft text-verdict-review">
            <BellRing className="size-5" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              New deposit screened
            </div>
            <h2 className="text-base font-medium">Proposed for additional review</h2>
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-surface-2/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Case {deposit.id.toUpperCase()}
            </span>
            <VerdictBadge verdict={deposit.verdict} size="md" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-mono">
              {deposit.amount} <span className="text-muted-foreground">{deposit.token}</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground shrink-0">Sender</span>
            <CopyAddress
              address={deposit.sender}
              truncate
              head={6}
              tail={6}
              className="text-xs text-muted-foreground"
            />
          </div>

          <RiskBar score={deposit.riskScore} />
        </div>

        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
          This deposit scored in the review band — funds are held pending analyst sign-off before
          they reach the exchange balance.
        </p>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={onDismiss}
            className="inline-flex items-center gap-2 rounded-md border bg-surface px-3.5 py-2 text-sm transition-all hover:bg-accent"
          >
            Dismiss
          </button>
          <button
            onClick={onReview}
            className="inline-flex items-center gap-2 rounded-md border border-verdict-review/40 bg-verdict-review-soft/60 text-verdict-review px-3.5 py-2 text-sm font-medium transition-all hover:bg-verdict-review-soft hover:-translate-y-0.5"
          >
            Review case
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
