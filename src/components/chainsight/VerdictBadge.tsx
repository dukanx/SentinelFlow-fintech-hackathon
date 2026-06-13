import type { Verdict } from "@/lib/mock-data";

const styles: Record<Verdict, string> = {
  CLEARED: "bg-verdict-cleared-soft text-verdict-cleared border-verdict-cleared/30",
  REVIEW: "bg-verdict-review-soft text-verdict-review border-verdict-review/30",
  BLOCKED: "bg-verdict-blocked-soft text-verdict-blocked border-verdict-blocked/40",
};

const labels: Record<Verdict, string> = {
  CLEARED: "Accepted",
  REVIEW: "Review",
  BLOCKED: "Blocked",
};

export function VerdictBadge({ verdict, size = "sm" }: { verdict: Verdict; size?: "sm" | "md" }) {
  const sz = size === "md" ? "text-xs px-2.5 py-1" : "text-[11px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium uppercase tracking-wide ${styles[verdict]} ${sz}`}
    >
      <span className={`mr-1.5 inline-block size-1.5 rounded-full bg-current`} />
      {labels[verdict]}
    </span>
  );
}
