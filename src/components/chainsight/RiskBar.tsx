import { BLOCK_THRESHOLD, REVIEW_THRESHOLD } from "@/lib/config";

export function RiskBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="w-full">
      <div className="relative h-3 w-full rounded-full overflow-hidden border">
        <div
          className="absolute inset-y-0 left-0 bg-verdict-cleared-soft"
          style={{ width: `${REVIEW_THRESHOLD}%` }}
        />
        <div
          className="absolute inset-y-0 bg-verdict-review-soft"
          style={{
            left: `${REVIEW_THRESHOLD}%`,
            width: `${BLOCK_THRESHOLD - REVIEW_THRESHOLD}%`,
          }}
        />
        <div
          className="absolute inset-y-0 bg-verdict-blocked-soft"
          style={{ left: `${BLOCK_THRESHOLD}%`, right: 0 }}
        />
        {/* threshold lines */}
        <div
          className="absolute inset-y-0 w-px bg-foreground/30"
          style={{ left: `${REVIEW_THRESHOLD}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-foreground/30"
          style={{ left: `${BLOCK_THRESHOLD}%` }}
        />
        {/* marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full border-2 border-foreground bg-background"
          style={{ left: `calc(${clamped}% - 8px)` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-mono text-muted-foreground">
        <span>0</span>
        <span style={{ marginLeft: `calc(${REVIEW_THRESHOLD}% - 18px)` }}>
          {REVIEW_THRESHOLD} review
        </span>
        <span>
          {BLOCK_THRESHOLD} block
        </span>
        <span>100</span>
      </div>
    </div>
  );
}
