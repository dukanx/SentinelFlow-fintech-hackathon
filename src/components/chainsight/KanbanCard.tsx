import { AlertTriangle, ArrowRight, Waypoints } from "lucide-react";
import type { Deposit, KanbanColumn } from "@/lib/mock-data";
import { truncateAddress } from "@/lib/format";
import { AnalystAvatar } from "./AnalystAvatar";
import { RiskMiniBar, scoreColorClass } from "./RiskMiniBar";
import { CountUp } from "./CountUp";

interface Props {
  deposit: Deposit;
  onOpen: (d: Deposit) => void;
  onAdvance?: (d: Deposit) => void;
  advanceLabel?: string;
  column: KanbanColumn;
  index?: number;
}

export function KanbanCard({ deposit, onOpen, onAdvance, advanceLabel, column, index = 0 }: Props) {
  const d = deposit;
  return (
    <div
      onClick={() => onOpen(d)}
      style={{ animationDelay: `${index * 50}ms` }}
      className="group animate-float-in cursor-pointer rounded-lg border bg-surface p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-foreground/20"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">{truncateAddress(d.sender)}</span>
        <CountUp
          value={d.riskScore}
          className={`font-mono text-sm font-semibold tabular-nums ${scoreColorClass(d.riskScore)}`}
        />
      </div>

      <div className="mt-1 font-mono text-base">
        {d.amount} <span className="text-muted-foreground text-sm">{d.token}</span>
      </div>

      <div className="mt-3">
        <RiskMiniBar score={d.riskScore} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">
          <Waypoints className="size-3.5" />
          {d.signals.hopsToSanctioned} hop{d.signals.hopsToSanctioned === 1 ? "" : "s"}
        </span>
        {d.signals.mixerInPath && (
          <span className="inline-flex items-center gap-1 rounded-full bg-verdict-review-soft/70 px-2 py-0.5 text-verdict-review font-medium">
            <AlertTriangle className="size-3.5" />
            Mixer
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-2">
          <AnalystAvatar analystId={d.assigneeId} size="sm" />
          <span className="text-xs text-muted-foreground font-mono uppercase">{d.id}</span>
        </div>
        {onAdvance && advanceLabel && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(d);
            }}
            className="inline-flex items-center gap-1 rounded-md border bg-surface-2 px-2 py-1 text-[11px] font-medium transition-all hover:bg-accent hover:gap-1.5"
          >
            {advanceLabel}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      <div className="sr-only">{column}</div>
    </div>
  );
}
