import { Layers, AlertTriangle, Coins, GitBranch } from "lucide-react";
import type { Deposit } from "@/lib/mock-data";

export function SignalBreakdown({ deposit }: { deposit: Deposit }) {
  const s = deposit.signals;
  const items = [
    {
      icon: GitBranch,
      label: "Distance to sanctioned",
      value:
        s.hopsToSanctioned >= 99
          ? "None within trace"
          : `${s.hopsToSanctioned} hops`,
      tone: s.hopsToSanctioned === 0 ? "blocked" : s.hopsToSanctioned <= 3 ? "review" : "cleared",
    },
    {
      icon: AlertTriangle,
      label: "Mixer in path",
      value: s.mixerInPath ? `Yes · ${s.mixerLabel ?? "Known mixer"}` : "No",
      tone: s.mixerInPath ? "blocked" : "cleared",
    },
    {
      icon: Coins,
      label: "Total exposed volume",
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
    <div className="rounded-xl border bg-surface overflow-hidden">
      <div className="px-5 py-3 border-b">
        <h3 className="text-sm font-medium">Signal breakdown</h3>
      </div>
      <div className="divide-y">
        {items.map((it) => {
          const Icon = it.icon;
          const toneClass =
            it.tone === "blocked"
              ? "text-[oklch(0.55_0.22_25)]"
              : it.tone === "review"
                ? "text-[oklch(0.58_0.18_55)]"
                : it.tone === "cleared"
                  ? "text-[oklch(0.45_0.16_152)]"
                  : "text-foreground";
          return (
            <div key={it.label} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-2.5">
                <Icon className="size-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{it.label}</span>
              </div>
              <span className={`text-sm font-medium ${toneClass}`}>{it.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
