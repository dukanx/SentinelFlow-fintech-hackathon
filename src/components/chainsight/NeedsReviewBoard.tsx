import type { Deposit, KanbanColumn } from "@/lib/mock-data";
import { KanbanCard } from "./KanbanCard";

interface Props {
  cases: Deposit[];
  columnOf: (id: string) => KanbanColumn;
  onOpen: (d: Deposit) => void;
  onRequestEdd: (d: Deposit) => void;
  onMarkDocs: (d: Deposit) => void;
}

const COLUMNS: { id: KanbanColumn; title: string; subtitle: string }[] = [
  { id: "pending", title: "Pending review", subtitle: "Flagged — awaiting analyst" },
  { id: "awaiting", title: "Awaiting documents", subtitle: "EDD requested" },
  { id: "ready", title: "Ready for re-review", subtitle: "Documents received" },
];

export function NeedsReviewBoard({ cases, columnOf, onOpen, onRequestEdd, onMarkDocs }: Props) {
  const grouped: Record<KanbanColumn, Deposit[]> = {
    pending: [],
    awaiting: [],
    ready: [],
  };
  for (const c of cases) grouped[columnOf(c.id)].push(c);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <div key={col.id} className="flex flex-col rounded-lg border bg-background/40">
          <div className="flex items-baseline justify-between px-4 py-3 border-b">
            <div>
              <div className="text-sm font-medium">{col.title}</div>
              <div className="text-xs text-muted-foreground">{col.subtitle}</div>
            </div>
            <span className="font-mono text-sm text-muted-foreground">
              {grouped[col.id].length}
            </span>
          </div>
          <div className="flex flex-col gap-3 p-3 min-h-[200px]">
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
