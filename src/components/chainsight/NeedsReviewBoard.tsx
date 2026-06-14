import { Inbox, Hourglass, FileCheck, type LucideIcon } from "lucide-react";
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
  icon: LucideIcon;
  iconWrap: string;
}

const COLUMNS: ColMeta[] = [
  {
    id: "pending",
    title: "Pending review",
    subtitle: "Flagged — awaiting analyst",
    icon: Inbox,
    iconWrap: "bg-col-pending/12 text-col-pending",
  },
  {
    id: "awaiting",
    title: "Awaiting documents",
    subtitle: "EDD requested",
    icon: Hourglass,
    iconWrap: "bg-col-awaiting/12 text-col-awaiting",
  },
  {
    id: "ready",
    title: "Ready for re-review",
    subtitle: "Documents received",
    icon: FileCheck,
    iconWrap: "bg-col-ready/12 text-col-ready",
  },
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
      {COLUMNS.map((col, colIndex) => {
        const Icon = col.icon;
        const items = grouped[col.id];
        return (
          <div
            key={col.id}
            style={{ animationDelay: `${colIndex * 80}ms` }}
            className="animate-float-in flex flex-col rounded-xl border bg-surface overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2.5">
                <span className={`grid place-items-center size-8 rounded-lg ${col.iconWrap}`}>
                  <Icon className="size-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold">{col.title}</div>
                  <div className="text-xs text-muted-foreground">{col.subtitle}</div>
                </div>
              </div>
              <span className="font-mono text-xs font-medium rounded-full px-2 py-0.5 bg-surface-2 text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 p-3 min-h-55 bg-surface-2/30">
              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground/60">
                  <Icon className="size-7 opacity-50" />
                  <span className="text-xs">No cases</span>
                </div>
              )}
              {items.map((d, i) => (
                <KanbanCard
                  key={d.id}
                  deposit={d}
                  index={i}
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
                      ? "Mark received"
                      : col.id === "pending"
                        ? "Request EDD"
                        : undefined
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
