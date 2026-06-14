import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Inbox, Ban, CheckCircle2, ListTree, ChevronUp } from "lucide-react";
import type { Deposit, KanbanColumn, Verdict } from "@/lib/mock-data";
import {
  depositStore,
  loadRiskDeposits,
  useDeposits,
  useDepositAnnouncements,
} from "@/lib/deposit-store";
import { CURRENT_ANALYST } from "@/lib/config";
import { newEddRequest, type EddState } from "@/lib/edd";
import { Toaster } from "@/components/ui/sonner";
import { StatCards } from "./StatCards";
import { NeedsReviewBoard } from "./NeedsReviewBoard";
import { DepositTable } from "./DepositTable";
import { CaseDetail, defaultNoteFor } from "./CaseDetail";
import { NewDepositPopup } from "./NewDepositPopup";

type NavId = "review" | "blocked" | "cleared" | "all";

const NAV: { id: NavId; label: string; icon: typeof Inbox }[] = [
  { id: "review", label: "Needs Review", icon: Inbox },
  { id: "blocked", label: "Blocked", icon: Ban },
  { id: "cleared", label: "Accepted", icon: CheckCircle2 },
  { id: "all", label: "All", icon: ListTree },
];

export function ChainSightApp() {
  const [nav, setNav] = useState<NavId>("review");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const seedDeposits = useDeposits();
  // Freshly screened deposits (e.g. a wallet-initiated send) waiting to be announced.
  const announcements = useDepositAnnouncements();
  const announced = announcements[0] ?? null;

  // Verdict overrides per case (after Block/Accept)
  const [overrides, setOverrides] = useState<Record<string, Verdict>>({});
  // Kanban columns for REVIEW cases (only meaningful if verdict still REVIEW)
  const [columns, setColumns] = useState<Record<string, KanbanColumn>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  // Enhanced-due-diligence record per case (RFI sent, deadline, docs received)
  const [edd, setEdd] = useState<Record<string, EddState>>({});

  useEffect(() => {
    void loadRiskDeposits();
  }, []);

  // Apply overrides + seed columns/notes for newly added deposits
  const allDeposits: Deposit[] = useMemo(() => {
    const next = seedDeposits.map((d) =>
      overrides[d.id] ? { ...d, verdict: overrides[d.id] } : d,
    );
    // lazily seed columns/notes for any new ids
    const reviewIds = seedDeposits.filter((d) => d.verdict === "REVIEW").map((d) => d.id);
    for (const d of seedDeposits) {
      if (d.verdict === "REVIEW" && !columns[d.id]) {
        const rank = reviewIds.indexOf(d.id);
        // First three flagged cases seed "Pending"; the rest seed "Awaiting documents".
        columns[d.id] = rank >= 0 && rank < 3 ? "pending" : "awaiting";
      }
      // Cases seeded directly into "Awaiting" already have an RFI out — seed its EDD record.
      if (columns[d.id] === "awaiting" && !edd[d.id]) {
        edd[d.id] = newEddRequest();
      }
      if (notes[d.id] === undefined) {
        notes[d.id] = defaultNoteFor(d);
      }
    }
    return next;
  }, [seedDeposits, overrides, columns, notes, edd]);

  const reviewCases = allDeposits.filter((d) => d.verdict === "REVIEW");
  const blockedDeposits = allDeposits.filter((d) => d.verdict === "BLOCKED");
  const clearedDeposits = allDeposits.filter((d) => d.verdict === "CLEARED");

  const selected = selectedId ? (allDeposits.find((d) => d.id === selectedId) ?? null) : null;

  function columnOf(id: string): KanbanColumn {
    return columns[id] ?? "pending";
  }

  function moveCard(id: string, col: KanbanColumn) {
    setColumns((c) => ({ ...c, [id]: col }));
  }

  function handleRequestEdd(d: Deposit) {
    // Send the RFI: stamp the request + 14-day deadline, then move to awaiting.
    setEdd((e) => ({ ...e, [d.id]: e[d.id] ?? newEddRequest() }));
    moveCard(d.id, "awaiting");
  }
  function handleMarkDocs(d: Deposit) {
    // Documents arrived: stamp receivedAt so the panel can show the upload time.
    setEdd((e) => {
      const base = e[d.id] ?? newEddRequest();
      return { ...e, [d.id]: { ...base, receivedAt: new Date().toISOString() } };
    });
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
      <aside className="hidden md:flex flex-col w-60 shrink-0 sticky top-0 h-screen overflow-y-auto bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
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
                className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-all ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                <span
                  className={`font-mono text-xs rounded-full px-1.5 ${
                    active
                      ? "bg-sidebar/70 text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-1">
          <div className="rounded-lg border bg-sidebar-accent/40 px-3 py-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-verdict-cleared opacity-60 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-verdict-cleared" />
              </span>
              Live screening
            </div>
            <div className="mt-1.5 text-[11px] text-sidebar-foreground/60 leading-relaxed">
              Deposits screened against the on-chain risk graph in real time.
            </div>
          </div>
        </div>

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
        <div className="px-6 py-6 space-y-5">
          <StatCards deposits={allDeposits} />

          {/* Section title — sits below the totals */}
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
                    ? "Deposits accepted — auto-accepted or analyst-approved."
                    : "All incoming deposits screened in the last 24 hours."}
            </p>
          </div>

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
              emptyLabel="No accepted deposits."
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
          edd={edd[selected.id]}
          auditNote={notes[selected.id] ?? ""}
          onAuditNoteChange={(n) => setNotes((s) => ({ ...s, [selected.id]: n }))}
          onClose={() => setSelectedId(null)}
          onBlock={handleBlock}
          onAccept={handleAccept}
          onRequestEdd={handleRequestEdd}
          onMarkDocs={handleMarkDocs}
        />
      )}

      {announced && !selected && (
        <NewDepositPopup
          deposit={announced}
          onReview={() => {
            setNav("review");
            setSelectedId(announced.id);
            depositStore.dismissAnnouncement(announced.id);
          }}
          onDismiss={() => depositStore.dismissAnnouncement(announced.id)}
        />
      )}

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
