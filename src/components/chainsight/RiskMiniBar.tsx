import { BLOCK_THRESHOLD, REVIEW_THRESHOLD } from "@/lib/config";

interface Props {
  score: number;
  width?: number; // px
  showMarker?: boolean;
}

/**
 * Compact segmented risk bar — green / amber / red zones with a marker
 * positioned at the score. Used inline in tables and rows.
 */
export function RiskMiniBar({ score, width = 110, showMarker = true }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const reviewW = REVIEW_THRESHOLD; // 0..REVIEW
  const blockW = BLOCK_THRESHOLD - REVIEW_THRESHOLD; // REVIEW..BLOCK
  const dangerW = 100 - BLOCK_THRESHOLD;

  return (
    <div className="relative" style={{ width }}>
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-verdict-cleared"
          style={{ width: `${reviewW}%` }}
        />
        <div className="w-px bg-background" />
        <div
          className="bg-verdict-review"
          style={{ width: `${blockW}%` }}
        />
        <div className="w-px bg-background" />
        <div
          className="bg-verdict-blocked"
          style={{ width: `${dangerW}%` }}
        />
      </div>
      {showMarker && (
        <div
          className="absolute -top-0.5 h-3 w-0.5 rounded-full bg-foreground"
          style={{ left: `calc(${clamped}% - 1px)` }}
        />
      )}
    </div>
  );
}

export function scoreColorClass(score: number) {
  if (score >= BLOCK_THRESHOLD) return "text-verdict-blocked";
  if (score >= REVIEW_THRESHOLD) return "text-verdict-review";
  return "text-verdict-cleared";
}
