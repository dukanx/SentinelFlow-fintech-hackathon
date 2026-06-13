import type { Deposit } from "@/lib/mock-data";
import { VerdictBadge } from "./VerdictBadge";
import { truncateAddress, formatTime } from "@/lib/format";

interface Props {
  deposits: Deposit[];
  onOpen: (d: Deposit) => void;
  emptyLabel?: string;
}

export function DepositTable({ deposits, onOpen, emptyLabel = "No deposits." }: Props) {
  if (deposits.length === 0) {
    return (
      <div className="rounded-lg border bg-surface p-12 text-center text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-surface overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-muted-foreground">
          <tr className="text-left">
            <th className="px-5 py-3 font-medium text-xs uppercase tracking-wider">Sender</th>
            <th className="px-5 py-3 font-medium text-xs uppercase tracking-wider">Amount</th>
            <th className="px-5 py-3 font-medium text-xs uppercase tracking-wider">Received</th>
            <th className="px-5 py-3 font-medium text-xs uppercase tracking-wider">Risk</th>
            <th className="px-5 py-3 font-medium text-xs uppercase tracking-wider">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {deposits.map((d) => {
            const clickable = d.verdict === "REVIEW";
            return (
              <tr
                key={d.id}
                onClick={() => onOpen(d)}
                className={`border-t transition-colors hover:bg-surface-2 ${
                  clickable ? "cursor-pointer" : "cursor-pointer"
                }`}
              >
                <td className="px-5 py-3 font-mono">{truncateAddress(d.sender)}</td>
                <td className="px-5 py-3 font-mono">
                  {d.amount} <span className="text-muted-foreground">{d.token}</span>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{formatTime(d.receivedAt)}</td>
                <td className="px-5 py-3 font-mono">{d.riskScore}</td>
                <td className="px-5 py-3">
                  <VerdictBadge verdict={d.verdict} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
