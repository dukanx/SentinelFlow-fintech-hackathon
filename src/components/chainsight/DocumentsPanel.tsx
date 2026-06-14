import {
  FolderOpen,
  Clock,
  CheckCircle2,
  Circle,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  type LucideIcon,
} from "lucide-react";
import type { Deposit, KanbanColumn } from "@/lib/mock-data";
import { requestedDocuments, receivedDocuments, dueLabel, type EddState } from "@/lib/edd";
import { formatDateTime } from "@/lib/format";

interface Props {
  deposit: Deposit;
  column?: KanbanColumn;
  edd?: EddState;
}

const KIND_ICON: Record<string, LucideIcon> = {
  PDF: FileText,
  Image: FileImage,
  CSV: FileSpreadsheet,
};

export function DocumentsPanel({ deposit, column, edd }: Props) {
  const received = column === "ready";
  const requested = requestedDocuments(deposit);
  const files = received ? receivedDocuments(deposit) : [];
  const due = edd ? dueLabel(edd.dueAt) : null;

  return (
    <div className="rounded-lg border bg-surface p-5 animate-float-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="size-4 text-col-awaiting" />
          <h2 className="text-sm font-medium">Enhanced due diligence</h2>
        </div>
        {received ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verdict-cleared-soft/70 text-verdict-cleared px-2.5 py-0.5 text-xs font-medium">
            <CheckCircle2 className="size-3.5" />
            Documents received
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-col-awaiting/15 text-col-awaiting px-2.5 py-0.5 text-xs font-medium">
            <Clock className="size-3.5" />
            Awaiting customer
            {due && <span className={due.overdue ? "text-verdict-blocked" : ""}>· {due.text}</span>}
          </span>
        )}
      </div>

      {/* RFI checklist */}
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
        Requested (RFI)
      </div>
      <ul className="space-y-1.5">
        {requested.map((doc) => (
          <li key={doc.id} className="flex items-center gap-2 text-sm">
            {received ? (
              <CheckCircle2 className="size-4 shrink-0 text-verdict-cleared" />
            ) : (
              <Circle className="size-4 shrink-0 text-muted-foreground/40" />
            )}
            <span className={received ? "" : "text-foreground/85"}>{doc.label}</span>
          </li>
        ))}
      </ul>

      {received ? (
        <div className="mt-4 border-t pt-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Uploaded {edd?.receivedAt ? `· ${formatDateTime(edd.receivedAt)}` : ""}
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {files.map((f) => {
              const Icon = KIND_ICON[f.kind] ?? File;
              return (
                <div
                  key={f.name}
                  className="flex items-center gap-2.5 rounded-md border bg-surface-2/50 px-3 py-2"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{f.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {f.kind} · {f.sizeKb} KB
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-muted-foreground">
          Awaiting customer upload — deposit funds held until source-of-funds evidence is reviewed.
        </div>
      )}
    </div>
  );
}
