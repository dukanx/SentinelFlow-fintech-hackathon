import type { Deposit } from "@/lib/mock-data";
import { VerdictBadge } from "./VerdictBadge";
import { truncateAddress, formatTime } from "@/lib/format";
import { RiskMiniBar, scoreColorClass } from "./RiskMiniBar";
import { AnalystAvatar } from "./AnalystAvatar";
import { ChevronRight } from "lucide-react";

interface Props {
  deposits: Deposit[];
  onOpen: (d: Deposit) => void;
  emptyLabel?: string;
}

export function DepositTable({ deposits, onOpen, emptyLabel = "No deposits." }: Props) {
  if (deposits.length === 0) {
    return (
      <div className="rounded-xl border bg-surface p-12 text-center text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="rounded-xl border bg-surface overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b">
          <tr className="text-left">
            <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider">Sender address</th>
            <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider">Amount</th>
            <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider">Received</th>
            <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider">Risk score</th>
            <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider">Analyst</th>
            <th className="px-5 py-3 font-medium text-[11px] uppercase tracking-wider">Status</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {deposits.map((d) => {
            const dot =
              d.verdict === "CLEARED"
                ? "bg-verdict-cleared"
                : d.verdict === "REVIEW"
                  ? "bg-verdict-review"
                  : "bg-verdict-blocked";
            return (
              <tr
                key={d.id}
                onClick={() => onOpen(d)}
                className="border-t cursor-pointer transition-colors hover:bg-surface-2"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`size-2 rounded-full ${dot}`} />
                    <div>
                      <div className="font-mono">{truncateAddress(d.sender)}</div>
                      <div className="text-[11px] text-muted-foreground font-mono uppercase">
                        {d.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="font-mono font-medium">
                    {d.amount} <span className="text-muted-foreground">{d.token}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{formatTime(d.receivedAt)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono font-semibold text-base w-6 ${scoreColorClass(d.riskScore)}`}
                    >
                      {d.riskScore}
                    </span>
                    <RiskMiniBar score={d.riskScore} width={120} />
                  </div>
                </td>
                <td className="px-5 py-3">
                  <AnalystAvatar analystId={d.assigneeId} />
                </td>
                <td className="px-5 py-3">
                  <VerdictBadge verdict={d.verdict} />
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  <ChevronRight className="size-4" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
