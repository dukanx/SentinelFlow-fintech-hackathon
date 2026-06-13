import { AlertTriangle, ArrowRight } from "lucide-react";
import type { Deposit, KanbanColumn } from "@/lib/mock-data";
import { truncateAddress } from "@/lib/format";

interface Props {
  deposit: Deposit;
  onOpen: (d: Deposit) => void;
  onAdvance?: (d: Deposit) => void;
  advanceLabel?: string;
  column: KanbanColumn;
}

function riskChipClass(score: number) {
  if (score >= 85) return "bg-verdict-blocked-soft text-verdict-blocked";
  if (score >= 35) return "bg-verdict-review-soft text-verdict-review";
  return "bg-verdict-cleared-soft text-verdict-cleared";
}

export function KanbanCard({ deposit, onOpen, onAdvance, advanceLabel, column }: Props) {
  const d = deposit;
  return (
    <div
      onClick={() => onOpen(d)}
      className="group cursor-pointer rounded-lg border bg-surface p-4 hover:border-foreground/30 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">{truncateAddress(d.sender)}</span>
        <span
          className={`text-[10px] font-mono uppercase rounded px-1.5 py-0.5 ${riskChipClass(
            d.riskScore,
          )}`}
        >
          {d.riskScore}
        </span>
      </div>

      <div className="mt-2 font-mono text-base">
        {d.amount} <span className="text-muted-foreground text-sm">{d.token}</span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          {d.signals.hopsToSanctioned} hop{d.signals.hopsToSanctioned === 1 ? "" : "s"} to sanctioned
        </span>
        {d.signals.mixerInPath && (
          <span className="inline-flex items-center gap-1 text-verdict-review">
            <AlertTriangle className="size-3.5" />
            Mixer
          </span>
        )}
      </div>

      {onAdvance && advanceLabel && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdvance(d);
          }}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md border bg-surface-2 px-2 py-1.5 text-xs hover:bg-accent transition-colors"
        >
          {advanceLabel}
          <ArrowRight className="size-3.5" />
        </button>
      )}

      <div className="sr-only">{column}</div>
    </div>
  );
}
