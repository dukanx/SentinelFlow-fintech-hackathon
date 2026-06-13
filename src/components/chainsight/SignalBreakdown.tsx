import { Layers, AlertTriangle, Coins, GitBranch } from "lucide-react";
import type { Deposit } from "@/lib/mock-data";

export function SignalBreakdown({ deposit }: { deposit: Deposit }) {
  const s = deposit.signals;
  const items = [
    {
      icon: GitBranch,
      label: "Distance to nearest sanctioned",
      value:
        s.hopsToSanctioned >= 99
          ? "None within trace"
          : `${s.hopsToSanctioned} hop${s.hopsToSanctioned === 1 ? "" : "s"}`,
      tone: s.hopsToSanctioned === 0 ? "blocked" : s.hopsToSanctioned <= 3 ? "review" : "cleared",
    },
    {
      icon: AlertTriangle,
      label: "Mixer in path",
      value: s.mixerInPath ? (s.mixerLabel ?? "Yes") : "No",
      tone: s.mixerInPath ? "review" : "cleared",
    },
    {
      icon: Coins,
      label: "Exposed volume",
      value: s.exposedVolume,
      tone: "muted",
    },
    {
      icon: Layers,
      label: "Hops traced",
      value: String(s.hopsTraced),
      tone: "muted",
    },
  ] as const;

  return (
    <div className="rounded-lg border bg-surface divide-y">
      {items.map((it) => {
        const Icon = it.icon;
        const toneClass =
          it.tone === "blocked"
            ? "text-verdict-blocked"
            : it.tone === "review"
              ? "text-verdict-review"
              : it.tone === "cleared"
                ? "text-verdict-cleared"
                : "text-foreground";
        return (
          <div key={it.label} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Icon className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{it.label}</span>
            </div>
            <span className={`text-sm font-mono ${toneClass}`}>{it.value}</span>
          </div>
        );
      })}
    </div>
  );
}
