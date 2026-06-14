import { ACTION_LABELS, useAuditLog, type AuditLogEntry } from "@/lib/audit-log";
import { formatDateTime, formatRelative, truncateAddress } from "@/lib/format";
import { AnalystAvatar } from "./AnalystAvatar";

function EntryRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <div className="px-5 py-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-start gap-3">
        <AnalystAvatar analystId={entry.analystId} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-muted">
              {ACTION_LABELS[entry.action]}
            </span>
            <span className="text-[10px] text-muted-foreground">{formatRelative(entry.timestamp)}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed">{entry.summary}</p>
          {(entry.caseId || entry.wallet) && (
            <div className="mt-1 text-[11px] font-mono text-muted-foreground">
              {entry.caseId && <span>{entry.caseId.toUpperCase()}</span>}
              {entry.caseId && entry.wallet && " · "}
              {entry.wallet && truncateAddress(entry.wallet, 8, 6)}
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {formatDateTime(entry.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuditLogPanel() {
  const entries = useAuditLog();

  return (
    <div className="rounded-xl border bg-surface overflow-hidden">
      <div className="px-5 py-3 border-b">
        <h3 className="text-sm font-medium">Immutable audit log</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Append-only session record — production uses tamper-evident storage.
        </p>
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
        <div className="divide-y">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}
