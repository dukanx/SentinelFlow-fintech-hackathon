import { AlertTriangle, ArrowRight } from "lucide-react";
import type { Deposit, KanbanColumn } from "@/lib/mock-data";
import { truncateAddress } from "@/lib/format";
import { AnalystAvatar } from "./AnalystAvatar";
import { RiskMiniBar, scoreColorClass } from "./RiskMiniBar";

interface Props {
  deposit: Deposit;
  onOpen: (d: Deposit) => void;
  onAdvance?: (d: Deposit) => void;
  advanceLabel?: string;
  column: KanbanColumn;
}

export function KanbanCard({ deposit, onOpen, onAdvance, advanceLabel, column }: Props) {
  const d = deposit;
  return (
    <div
      onClick={() => onOpen(d)}
      className="group cursor-pointer rounded-lg border bg-surface p-4 shadow-sm hover:shadow-md hover:border-foreground/20 transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">{truncateAddress(d.sender)}</span>
        <span className={`font-mono text-sm font-semibold ${scoreColorClass(d.riskScore)}`}>
          {d.riskScore}
        </span>
      </div>

      <div className="mt-1 font-mono text-base">
        {d.amount} <span className="text-muted-foreground text-sm">{d.token}</span>
      </div>

      <div className="mt-3">
        <RiskMiniBar score={d.riskScore} />
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          {d.signals.hopsToSanctioned} hop{d.signals.hopsToSanctioned === 1 ? "" : "s"} to sanctioned
        </span>
        {d.signals.mixerInPath && (
          <span className="inline-flex items-center gap-1 text-verdict-review font-medium">
            <AlertTriangle className="size-3.5" />
            Mixer
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          <AnalystAvatar analystId={d.assigneeId} size="sm" />
          <span className="text-xs text-muted-foreground font-mono uppercase">
            {d.id}
          </span>
        </div>
        {onAdvance && advanceLabel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(d);
            }}
            className="inline-flex items-center gap-1 rounded-md border bg-surface-2 px-2 py-1 text-[11px] hover:bg-accent transition-colors"
          >
            {advanceLabel}
            <ArrowRight className="size-3" />
          </button>
        )}
      </div>

      <div className="sr-only">{column}</div>
    </div>
  );
}
