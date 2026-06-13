import { ANALYSTS } from "@/lib/config";

interface Props {
  analystId?: string;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
}

export function AnalystAvatar({ analystId, size = "sm", showName = false }: Props) {
  if (!analystId) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-grid place-items-center rounded-full size-6 border border-dashed border-border text-[10px]">
          ?
        </span>
        {showName && <span>Unassigned</span>}
      </span>
    );
  }
  const a = ANALYSTS[analystId];
  if (!a) return null;
  const sz =
    size === "md" ? "size-8 text-xs" : size === "xs" ? "size-5 text-[9px]" : "size-6 text-[10px]";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        title={`${a.name} — ${a.role}`}
        className={`inline-grid place-items-center rounded-full font-semibold ${a.avatarBg} ${a.avatarText} ${sz}`}
      >
        {a.initials}
      </span>
      {showName && (
        <span className="text-xs">
          <span className="font-medium">{a.name}</span>
        </span>
      )}
    </span>
  );
}
