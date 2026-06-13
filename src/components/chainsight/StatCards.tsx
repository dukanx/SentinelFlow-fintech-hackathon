import { ShieldCheck } from "lucide-react";
import type { Deposit } from "@/lib/mock-data";

interface Props {
  deposits: Deposit[];
}

export function StatCards({ deposits }: Props) {
  const today = deposits.length;
  const needsReview = deposits.filter((d) => d.verdict === "REVIEW").length;
  const blocked = deposits.filter((d) => d.verdict === "BLOCKED").length;
  const cleared = deposits.filter((d) => d.verdict === "CLEARED").length;

  const stats = [
    { label: "Deposits today", value: today, accent: "text-foreground" },
    { label: "Needs review", value: needsReview, accent: "text-verdict-review" },
    { label: "Blocked", value: blocked, accent: "text-verdict-blocked" },
    { label: "Accepted", value: cleared, accent: "text-verdict-cleared" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border bg-surface px-5 py-4 flex items-center justify-between"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <div className={`mt-1 text-3xl font-mono font-medium ${s.accent}`}>
              {s.value}
            </div>
          </div>
          {s.label === "Deposits today" && (
            <ShieldCheck className="size-5 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}
