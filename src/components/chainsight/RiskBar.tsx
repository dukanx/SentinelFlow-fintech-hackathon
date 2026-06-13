import { BLOCK_THRESHOLD, REVIEW_THRESHOLD } from "@/lib/config";

interface Props {
  score: number;
}

export function RiskBar({ score }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone =
    clamped >= BLOCK_THRESHOLD
      ? "text-[oklch(0.55_0.22_25)]"
      : clamped >= REVIEW_THRESHOLD
        ? "text-[oklch(0.58_0.18_55)]"
        : "text-[oklch(0.52_0.16_152)]";

  return (
    <div className="rounded-xl border bg-surface px-6 py-5 flex items-center gap-8">
      {/* Score on the left */}
      <div className="flex items-baseline gap-2 shrink-0">
        <div
          className={`text-[56px] leading-none font-semibold tabular-nums ${tone}`}
          style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", letterSpacing: "-0.02em" }}
        >
          {clamped}
        </div>
        <div className="text-xs text-muted-foreground flex flex-col leading-tight">
          <span className="font-mono">/ 100</span>
          <span className="mt-1 uppercase tracking-wider text-[10px]">risk score</span>
        </div>
      </div>

      {/* Bar on the right */}
      <div className="flex-1 min-w-0">
        <div className="relative h-2.5 w-full rounded-full overflow-hidden">
          {/* Continuous gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.62 0.17 152) 0%, oklch(0.65 0.17 152) 38%, oklch(0.78 0.17 80) 50%, oklch(0.74 0.17 60) 78%, oklch(0.65 0.22 25) 100%)",
            }}
          />
          {/* Threshold dividers */}
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground/50"
            style={{ left: `${REVIEW_THRESHOLD}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground/50"
            style={{ left: `${BLOCK_THRESHOLD}%` }}
          />
        </div>

        {/* Marker triangle under bar */}
        <div className="relative h-2">
          <div
            className="absolute -top-px"
            style={{ left: `calc(${clamped}% - 5px)` }}
          >
            <svg width="10" height="8" viewBox="0 0 10 8">
              <path d="M5 0 L10 8 L0 8 Z" fill="oklch(0.22 0.02 255)" />
            </svg>
          </div>
        </div>

        {/* Scale labels */}
        <div className="relative mt-0.5 h-4 text-[11px] font-mono text-muted-foreground">
          <span className="absolute left-0">0</span>
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${REVIEW_THRESHOLD}%` }}
          >
            review {REVIEW_THRESHOLD}
          </span>
          <span
            className="absolute -translate-x-1/2"
            style={{ left: `${BLOCK_THRESHOLD}%` }}
          >
            block {BLOCK_THRESHOLD}
          </span>
          <span className="absolute right-0">100</span>
        </div>
      </div>
    </div>
  );
}
