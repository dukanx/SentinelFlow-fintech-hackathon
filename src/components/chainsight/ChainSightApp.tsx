import { useMemo, useState } from "react";
import { ShieldCheck, Inbox, Ban, CheckCircle2, ListTree, ChevronUp } from "lucide-react";
import { deposits as seedDeposits } from "@/lib/mock-data";
import type { Deposit, KanbanColumn, Verdict } from "@/lib/mock-data";
import { CURRENT_ANALYST } from "@/lib/config";
import { StatCards } from "./StatCards";
import { NeedsReviewBoard } from "./NeedsReviewBoard";
import { DepositTable } from "./DepositTable";
import { CaseDetail, defaultNoteFor } from "./CaseDetail";

type NavId = "review" | "blocked" | "cleared" | "all";

const NAV: { id: NavId; label: string; icon: typeof Inbox }[] = [
  { id: "review", label: "Needs Review", icon: Inbox },
  { id: "blocked", label: "Blocked", icon: Ban },
  { id: "cleared", label: "Cleared", icon: CheckCircle2 },
  { id: "all", label: "All", icon: ListTree },
];

export function ChainSightApp() {
  const [nav, setNav] = useState<NavId>("review");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Verdict overrides per case (after Block/Accept)
  const [overrides, setOverrides] = useState<Record<string, Verdict>>({});
  // Kanban columns for REVIEW cases (only meaningful if verdict still REVIEW)
  const [columns, setColumns] = useState<Record<string, KanbanColumn>>(() => {
    const init: Record<string, KanbanColumn> = {};
    for (const d of seedDeposits) {
      if (d.verdict === "REVIEW" && d.initialColumn) init[d.id] = d.initialColumn;
    }
    return init;
  });
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const d of seedDeposits) init[d.id] = defaultNoteFor(d);
    return init;
  });

  // Apply overrides
  const allDeposits: Deposit[] = useMemo(
    () =>
      seedDeposits.map((d) =>
        overrides[d.id] ? { ...d, verdict: overrides[d.id] } : d,
      ),
    [overrides],
  );

  const reviewCases = allDeposits.filter((d) => d.verdict === "REVIEW");
  const blockedDeposits = allDeposits.filter((d) => d.verdict === "BLOCKED");
  const clearedDeposits = allDeposits.filter((d) => d.verdict === "CLEARED");

  const selected = selectedId ? allDeposits.find((d) => d.id === selectedId) ?? null : null;

  function columnOf(id: string): KanbanColumn {
    return columns[id] ?? "pending";
  }

  function moveCard(id: string, col: KanbanColumn) {
    setColumns((c) => ({ ...c, [id]: col }));
  }

  function handleRequestEdd(d: Deposit) {
    moveCard(d.id, "awaiting");
  }
  function handleMarkDocs(d: Deposit) {
    moveCard(d.id, "ready");
  }
  function handleBlock(d: Deposit) {
    setOverrides((o) => ({ ...o, [d.id]: "BLOCKED" }));
    setSelectedId(null);
  }
  function handleAccept(d: Deposit) {
    setOverrides((o) => ({ ...o, [d.id]: "CLEARED" }));
    setSelectedId(null);
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="size-8 rounded-md bg-primary/15 grid place-items-center">
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">ChainSight</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              Deposit Screening
            </div>
          </div>
        </div>

        <nav className="flex flex-col p-2 gap-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = nav === item.id;
            const count =
              item.id === "review"
                ? reviewCases.length
                : item.id === "blocked"
                  ? blockedDeposits.length
                  : item.id === "cleared"
                    ? clearedDeposits.length
                    : allDeposits.length;
            return (
              <button
                key={item.id}
                onClick={() => setNav(item.id)}
                className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                <span className="font-mono text-xs text-sidebar-foreground/60">
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-sidebar-border">
          <div className="px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
              Policy
            </div>
            <div className="text-xs text-sidebar-foreground/70 mt-1 leading-relaxed">
              Fixed thresholds. Direct OFAC hits auto-reject.
            </div>
          </div>
          <div className="border-t border-sidebar-border p-3">
            <button className="w-full flex items-center gap-3 rounded-md px-2 py-2 hover:bg-sidebar-accent transition-colors text-left">
              <span
                className={`inline-grid place-items-center rounded-full size-9 font-semibold text-xs ${CURRENT_ANALYST.avatarBg} ${CURRENT_ANALYST.avatarText}`}
              >
                {CURRENT_ANALYST.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{CURRENT_ANALYST.name}</div>
                <div className="text-[11px] text-sidebar-foreground/60 truncate">
                  {CURRENT_ANALYST.role}
                </div>
              </div>
              <ChevronUp className="size-4 text-sidebar-foreground/40" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="border-b px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight">
              {NAV.find((n) => n.id === nav)?.label}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {nav === "review"
                ? "Flagged deposits awaiting analyst action."
                : nav === "blocked"
                  ? "Deposits rejected — direct sanctions hits or analyst-blocked."
                  : nav === "cleared"
                    ? "Deposits accepted — auto-cleared or analyst-approved."
                    : "All incoming deposits screened in the last 24 hours."}
            </p>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            policy v2.4 · trace depth 6
          </div>
        </header>

        <div className="px-6 py-6 space-y-6">
          <StatCards deposits={allDeposits} />

          {nav === "review" && (
            <NeedsReviewBoard
              cases={reviewCases}
              columnOf={columnOf}
              onOpen={(d) => setSelectedId(d.id)}
              onRequestEdd={handleRequestEdd}
              onMarkDocs={handleMarkDocs}
            />
          )}

          {nav === "blocked" && (
            <DepositTable
              deposits={blockedDeposits}
              onOpen={(d) => setSelectedId(d.id)}
              emptyLabel="No blocked deposits."
            />
          )}

          {nav === "cleared" && (
            <DepositTable
              deposits={clearedDeposits}
              onOpen={(d) => setSelectedId(d.id)}
              emptyLabel="No cleared deposits."
            />
          )}

          {nav === "all" && (
            <DepositTable deposits={allDeposits} onOpen={(d) => setSelectedId(d.id)} />
          )}
        </div>
      </main>

      {selected && (
        <CaseDetail
          deposit={selected}
          column={columns[selected.id]}
          auditNote={notes[selected.id] ?? ""}
          onAuditNoteChange={(n) =>
            setNotes((s) => ({ ...s, [selected.id]: n }))
          }
          onClose={() => setSelectedId(null)}
          onBlock={handleBlock}
          onAccept={handleAccept}
          onRequestEdd={handleRequestEdd}
          onMarkDocs={handleMarkDocs}
        />
      )}
    </div>
  );
}
