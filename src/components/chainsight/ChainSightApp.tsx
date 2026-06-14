import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck,
  Inbox,
  Ban,
  CheckCircle2,
  ListTree,
  ChevronUp,
  LayoutDashboard,
  ScrollText,
} from "lucide-react";
import type { Deposit, KanbanColumn, Verdict } from "@/lib/mock-data";
import {
  depositStore,
  loadRiskDeposits,
  useDeposits,
  useDepositAnnouncements,
} from "@/lib/deposit-store";
import { auditLog, useAuditLog } from "@/lib/audit-log";
import { newEddRequest, type EddState } from "@/lib/edd";
import { Toaster } from "@/components/ui/sonner";
import { StatCards } from "./StatCards";
import { NeedsReviewBoard } from "./NeedsReviewBoard";
import { DepositTable } from "./DepositTable";
import { CaseDetail, defaultNoteFor } from "./CaseDetail";
import { NewDepositPopup } from "./NewDepositPopup";
import { CommandCenter } from "./CommandCenter";
import { AuditLogPanel } from "./AuditLogPanel";
import { BackendStatusBar } from "./BackendStatusBar";
import { CURRENT_ANALYST } from "@/lib/config";

type NavId = "overview" | "review" | "blocked" | "cleared" | "all" | "audit";

const NAV: { id: NavId; label: string; icon: typeof Inbox }[] = [
  { id: "overview", label: "Command Center", icon: LayoutDashboard },
  { id: "review", label: "Needs Review", icon: Inbox },
  { id: "blocked", label: "Blocked", icon: Ban },
  { id: "cleared", label: "Accepted", icon: CheckCircle2 },
  { id: "all", label: "All", icon: ListTree },
  { id: "audit", label: "Audit Log", icon: ScrollText },
];

export function ChainSightApp() {
  const [nav, setNav] = useState<NavId>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const seedDeposits = useDeposits();
  const auditEntries = useAuditLog();
  const announcements = useDepositAnnouncements();
  const announced = announcements[0] ?? null;
  const noteEditTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [overrides, setOverrides] = useState<Record<string, Verdict>>({});
  const [columns, setColumns] = useState<Record<string, KanbanColumn>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [edd, setEdd] = useState<Record<string, EddState>>({});

  useEffect(() => {
    void loadRiskDeposits();
  }, []);

  useEffect(() => {
    if (seedDeposits.length === 0) return;

    const reviewIds = seedDeposits.filter((d) => d.verdict === "REVIEW").map((d) => d.id);

    setColumns((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const d of seedDeposits) {
        if (d.verdict !== "REVIEW" || next[d.id]) continue;
        const rank = reviewIds.indexOf(d.id);
        next[d.id] = d.initialColumn ?? (rank >= 0 && rank < 3 ? "pending" : "awaiting");
        changed = true;
      }
      return changed ? next : prev;
    });

    setNotes((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const d of seedDeposits) {
        if (next[d.id] === undefined) {
          next[d.id] = defaultNoteFor(d);
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setEdd((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const d of seedDeposits) {
        if (d.verdict !== "REVIEW") continue;
        const rank = reviewIds.indexOf(d.id);
        const col = d.initialColumn ?? (rank >= 0 && rank < 3 ? "pending" : "awaiting");
        if (col === "awaiting" && !next[d.id]) {
          next[d.id] = newEddRequest();
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [seedDeposits]);

  const allDeposits: Deposit[] = useMemo(() => {
    return seedDeposits.map((d) =>
      overrides[d.id] ? { ...d, verdict: overrides[d.id] } : d,
    );
  }, [seedDeposits, overrides]);

  const reviewCases = allDeposits.filter((d) => d.verdict === "REVIEW");
  const blockedDeposits = allDeposits.filter((d) => d.verdict === "BLOCKED");
  const clearedDeposits = allDeposits.filter((d) => d.verdict === "CLEARED");

  const selected = selectedId ? (allDeposits.find((d) => d.id === selectedId) ?? null) : null;

  function openCase(id: string, fromNav?: NavId) {
    setSelectedId(id);
    if (fromNav) setNav(fromNav);
    const d = allDeposits.find((x) => x.id === id);
    if (d) {
      auditLog.append("CASE_OPENED", `${CURRENT_ANALYST.name} opened case ${id.toUpperCase()}.`, {
        caseId: id,
        wallet: d.sender,
      });
    }
  }

  function closeCase() {
    if (selected) {
      auditLog.append("CASE_CLOSED", `${CURRENT_ANALYST.name} closed case ${selected.id.toUpperCase()}.`, {
        caseId: selected.id,
      });
    }
    setSelectedId(null);
  }

  function columnOf(id: string): KanbanColumn {
    return columns[id] ?? "pending";
  }

  function moveCard(id: string, col: KanbanColumn) {
    setColumns((c) => ({ ...c, [id]: col }));
  }

  function handleRequestEdd(d: Deposit) {
    setEdd((e) => ({ ...e, [d.id]: e[d.id] ?? newEddRequest() }));
    moveCard(d.id, "awaiting");
    auditLog.append("EDD_REQUESTED", `${CURRENT_ANALYST.name} requested EDD for ${d.id.toUpperCase()}.`, {
      caseId: d.id,
      wallet: d.sender,
    });
  }

  function handleMarkDocs(d: Deposit) {
    setEdd((e) => {
      const base = e[d.id] ?? newEddRequest();
      return { ...e, [d.id]: { ...base, receivedAt: new Date().toISOString() } };
    });
    moveCard(d.id, "ready");
    auditLog.append(
      "DOCUMENTS_RECEIVED",
      `${CURRENT_ANALYST.name} marked documents received for ${d.id.toUpperCase()}.`,
      { caseId: d.id, wallet: d.sender },
    );
  }

  function handleBlock(d: Deposit) {
    setOverrides((o) => ({ ...o, [d.id]: "BLOCKED" }));
    auditLog.append("DEPOSIT_BLOCKED", `${CURRENT_ANALYST.name} blocked deposit ${d.id.toUpperCase()}.`, {
      caseId: d.id,
      wallet: d.sender,
    });
  }

  function handleAccept(d: Deposit) {
    setOverrides((o) => ({ ...o, [d.id]: "CLEARED" }));
    auditLog.append("DEPOSIT_ACCEPTED", `${CURRENT_ANALYST.name} accepted deposit ${d.id.toUpperCase()}.`, {
      caseId: d.id,
      wallet: d.sender,
    });
    setSelectedId(null);
  }

  function handleAuditNoteChange(id: string, note: string) {
    setNotes((s) => ({ ...s, [id]: note }));
    if (noteEditTimer.current) clearTimeout(noteEditTimer.current);
    noteEditTimer.current = setTimeout(() => {
      auditLog.append("AUDIT_NOTE_EDITED", `${CURRENT_ANALYST.name} edited audit note on ${id.toUpperCase()}.`, {
        caseId: id,
      });
    }, 1500);
  }

  function openCaseFromOverview(caseId: string) {
    const d = allDeposits.find((x) => x.id === caseId);
    if (!d) return;
    if (d.verdict === "REVIEW") setNav("review");
    else if (d.verdict === "BLOCKED") setNav("blocked");
    else setNav("all");
    openCase(caseId);
  }

  const lastAudit = auditEntries[0];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-60 shrink-0 sticky top-0 h-screen overflow-y-auto bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="size-8 rounded-md bg-primary/15 grid place-items-center">
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">ChainSight</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              Pitch prototype
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
                    : item.id === "audit"
                      ? auditEntries.length
                      : item.id === "all"
                        ? allDeposits.length
                        : null;
            return (
              <button
                key={item.id}
                type="button"
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
                {count !== null && (
                  <span
                    className={`font-mono text-xs rounded-full px-1.5 ${
                      active
                        ? "bg-sidebar/70 text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/60"
                    }`}
                  >
                    {count}
                  </span>
                )}
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
              Live screening (demo)
            </div>
            <div className="mt-1.5 text-[11px] text-sidebar-foreground/60 leading-relaxed">
              Synthetic Solana graph + simulated ops feeds for pitch demos.
            </div>
          </div>
        </div>

        <div className="mt-auto border-t border-sidebar-border">
          {lastAudit && (
            <button
              type="button"
              onClick={() => setNav("audit")}
              className="w-full px-4 py-3 text-left hover:bg-sidebar-accent/40 transition-colors"
            >
              <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
                Last audit action
              </div>
              <div className="text-xs text-sidebar-foreground/70 mt-1 line-clamp-2">{lastAudit.summary}</div>
            </button>
          )}
          <div className="border-t border-sidebar-border p-3">
            <button
              type="button"
              className="w-full flex items-center gap-3 rounded-md px-2 py-2 hover:bg-sidebar-accent transition-colors text-left"
            >
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

      <main className="flex-1 min-w-0">
        <div className="px-6 py-6 space-y-5">
          {nav === "overview" ? (
            <>
              <div>
                <h1 className="text-xl font-medium tracking-tight">Command Center</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Executive view — hero metrics and live alert queue (demo data).
                </p>
              </div>
              <BackendStatusBar />
              <CommandCenter deposits={allDeposits} onOpenCase={openCaseFromOverview} />
            </>
          ) : (
            <>
              <BackendStatusBar />
              {nav !== "audit" && <StatCards deposits={allDeposits} />}
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
                        : nav === "audit"
                          ? "Append-only record of analyst actions for regulator audits."
                          : "All incoming deposits screened in the last 24 hours."}
                </p>
              </div>

              {nav === "review" && (
                <NeedsReviewBoard
                  cases={reviewCases}
                  columnOf={columnOf}
                  onOpen={(d) => openCase(d.id, "review")}
                  onRequestEdd={handleRequestEdd}
                  onMarkDocs={handleMarkDocs}
                />
              )}

              {nav === "blocked" && (
                <DepositTable
                  deposits={blockedDeposits}
                  onOpen={(d) => openCase(d.id, "blocked")}
                  emptyLabel="No blocked deposits."
                />
              )}

              {nav === "cleared" && (
                <DepositTable
                  deposits={clearedDeposits}
                  onOpen={(d) => openCase(d.id, "cleared")}
                  emptyLabel="No accepted deposits."
                />
              )}

              {nav === "all" && (
                <DepositTable deposits={allDeposits} onOpen={(d) => openCase(d.id, "all")} />
              )}

              {nav === "audit" && <AuditLogPanel />}
            </>
          )}
        </div>
      </main>

      {selected && (
        <CaseDetail
          deposit={selected}
          column={columns[selected.id]}
          edd={edd[selected.id]}
          auditNote={notes[selected.id] ?? ""}
          onAuditNoteChange={(n) => handleAuditNoteChange(selected.id, n)}
          onClose={closeCase}
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
            openCase(announced.id, "review");
            depositStore.dismissAnnouncement(announced.id);
          }}
          onDismiss={() => depositStore.dismissAnnouncement(announced.id)}
        />
      )}

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
