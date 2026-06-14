import { Layers, Inbox, Ban, CheckCircle2, type LucideIcon } from "lucide-react";
import type { Deposit } from "@/lib/mock-data";
import { CountUp } from "./CountUp";

interface Props {
  deposits: Deposit[];
}

interface Stat {
  label: string;
  value: number;
  accent: string;
  iconWrap: string;
  icon: LucideIcon;
}

export function StatCards({ deposits }: Props) {
  const today = deposits.length;
  const needsReview = deposits.filter((d) => d.verdict === "REVIEW").length;
  const blocked = deposits.filter((d) => d.verdict === "BLOCKED").length;
  const cleared = deposits.filter((d) => d.verdict === "CLEARED").length;

  const stats: Stat[] = [
    {
      label: "Deposits today",
      value: today,
      accent: "text-foreground",
      iconWrap: "bg-primary/10 text-primary",
      icon: Layers,
    },
    {
      label: "Needs review",
      value: needsReview,
      accent: "text-verdict-review",
      iconWrap: "bg-verdict-review-soft text-verdict-review",
      icon: Inbox,
    },
    {
      label: "Blocked",
      value: blocked,
      accent: "text-verdict-blocked",
      iconWrap: "bg-verdict-blocked-soft text-verdict-blocked",
      icon: Ban,
    },
    {
      label: "Accepted",
      value: cleared,
      accent: "text-verdict-cleared",
      iconWrap: "bg-verdict-cleared-soft text-verdict-cleared",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="animate-float-in rounded-xl border bg-surface px-5 py-4 flex items-center justify-between shadow-sm hover:shadow-md hover:border-foreground/15 transition-all"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div className={`mt-1 text-3xl font-mono font-semibold tabular-nums ${s.accent}`}>
                <CountUp value={s.value} />
              </div>
            </div>
            <span className={`grid place-items-center size-10 rounded-xl ${s.iconWrap}`}>
              <Icon className="size-5" />
            </span>
          </div>
        );
      })}
    </div>
  );
}
