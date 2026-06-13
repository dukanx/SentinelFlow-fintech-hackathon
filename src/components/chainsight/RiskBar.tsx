import { BLOCK_THRESHOLD, REVIEW_THRESHOLD } from "@/lib/config";

export function RiskBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const reviewW = REVIEW_THRESHOLD;
  const blockW = BLOCK_THRESHOLD - REVIEW_THRESHOLD;
  const dangerW = 100 - BLOCK_THRESHOLD;
  return (
    <div className="w-full">
      <div className="relative h-3 w-full">
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          <div className="bg-verdict-cleared" style={{ width: `${reviewW}%` }} />
          <div className="w-0.5 bg-background" />
          <div className="bg-verdict-review" style={{ width: `${blockW}%` }} />
          <div className="w-0.5 bg-background" />
          <div className="bg-verdict-blocked" style={{ width: `${dangerW}%` }} />
        </div>
        {/* marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full border-2 border-foreground bg-background shadow"
          style={{ left: `calc(${clamped}% - 8px)` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-mono text-muted-foreground">
        <span>0</span>
        <span style={{ marginLeft: `calc(${REVIEW_THRESHOLD}% - 40px)` }}>
          {REVIEW_THRESHOLD} review
        </span>
        <span>{BLOCK_THRESHOLD} block</span>
        <span>100</span>
      </div>
    </div>
  );
}
