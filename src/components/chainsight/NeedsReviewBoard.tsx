import type { Deposit, KanbanColumn } from "@/lib/mock-data";
import { KanbanCard } from "./KanbanCard";

interface Props {
  cases: Deposit[];
  columnOf: (id: string) => KanbanColumn;
  onOpen: (d: Deposit) => void;
  onRequestEdd: (d: Deposit) => void;
  onMarkDocs: (d: Deposit) => void;
}

interface ColMeta {
  id: KanbanColumn;
  title: string;
  subtitle: string;
  /* tailwind color classes built from CSS tokens */
  accentBar: string;
  headerBg: string;
  countText: string;
  countBg: string;
  dot: string;
}

const COLUMNS: ColMeta[] = [
  {
    id: "pending",
    title: "Pending review",
    subtitle: "Flagged — awaiting analyst",
    accentBar: "bg-col-pending",
    headerBg: "bg-col-pending-soft/60",
    countText: "text-col-pending",
    countBg: "bg-col-pending/15",
    dot: "bg-col-pending",
  },
  {
    id: "awaiting",
    title: "Awaiting documents",
    subtitle: "EDD requested",
    accentBar: "bg-col-awaiting",
    headerBg: "bg-col-awaiting-soft/60",
    countText: "text-col-awaiting",
    countBg: "bg-col-awaiting/15",
    dot: "bg-col-awaiting",
  },
  {
    id: "ready",
    title: "Ready for re-review",
    subtitle: "Documents received",
    accentBar: "bg-col-ready",
    headerBg: "bg-col-ready-soft/60",
    countText: "text-col-ready",
    countBg: "bg-col-ready/15",
    dot: "bg-col-ready",
  },
];

export function NeedsReviewBoard({
  cases,
  columnOf,
  onOpen,
  onRequestEdd,
  onMarkDocs,
}: Props) {
  const grouped: Record<KanbanColumn, Deposit[]> = {
    pending: [],
    awaiting: [],
    ready: [],
  };
  for (const c of cases) grouped[columnOf(c.id)].push(c);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          className="flex flex-col rounded-xl border bg-surface overflow-hidden"
        >
          <div className={`h-1 w-full ${col.accentBar}`} />
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${col.headerBg}`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`inline-block size-2 rounded-full ${col.dot}`} />
              <div>
                <div className="text-sm font-semibold">{col.title}</div>
                <div className="text-xs text-muted-foreground">{col.subtitle}</div>
              </div>
            </div>
            <span
              className={`font-mono text-xs font-semibold rounded-full px-2 py-0.5 ${col.countBg} ${col.countText}`}
            >
              {grouped[col.id].length}
            </span>
          </div>
          <div className="flex flex-col gap-3 p-3 min-h-[200px] bg-surface-2/40">
            {grouped[col.id].length === 0 && (
              <div className="text-xs text-muted-foreground/70 text-center py-8">
                No cases
              </div>
            )}
            {grouped[col.id].map((d) => (
              <KanbanCard
                key={d.id}
                deposit={d}
                column={col.id}
                onOpen={onOpen}
                onAdvance={
                  col.id === "awaiting"
                    ? onMarkDocs
                    : col.id === "pending"
                      ? onRequestEdd
                      : undefined
                }
                advanceLabel={
                  col.id === "awaiting"
                    ? "Mark documents received"
                    : col.id === "pending"
                      ? "Request EDD"
                      : undefined
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
