import { useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, X } from "lucide-react";
import { toast } from "sonner";
import type { Deposit } from "@/lib/mock-data";
import {
  downloadSarDraft,
  generateSarDraft,
  type FilingType,
} from "@/lib/sar-draft";
import { auditLog } from "@/lib/audit-log";

interface Props {
  deposit: Deposit;
  analystDecision?: "BLOCKED" | "ACCEPTED";
  onClose: () => void;
}

export function SarDraftPanel({ deposit, analystDecision, onClose }: Props) {
  const [filingType, setFilingType] = useState<FilingType>("SAR");
  const draft = generateSarDraft({ deposit, filingType, analystDecision });

  function handleCopy() {
    void navigator.clipboard.writeText(draft);
    auditLog.append("SAR_DRAFT_EXPORTED", `Copied ${filingType} draft for ${deposit.id}.`, {
      caseId: deposit.id,
      wallet: deposit.sender,
    });
    toast.success("SAR draft copied to clipboard");
  }

  function handleDownload() {
    downloadSarDraft(draft, deposit.id, filingType);
    auditLog.append("SAR_DRAFT_EXPORTED", `Downloaded ${filingType} draft for ${deposit.id}.`, {
      caseId: deposit.id,
      wallet: deposit.sender,
    });
    toast.success("Draft downloaded");
  }

  const panel = (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] rounded-xl border bg-surface shadow-xl flex flex-col">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">SAR / STR draft</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Template only — not a legal filing. Case {deposit.id.toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border p-2 hover:bg-accent"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Template:</span>
          {(["SAR", "STR"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilingType(t)}
              className={`text-xs px-3 py-1 rounded-md border ${
                filingType === t ? "bg-primary/15 border-primary/40 font-medium" : "hover:bg-accent"
              }`}
            >
              {t === "SAR" ? "FinCEN SAR" : "FIU STR"}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border hover:bg-accent"
            >
              <Copy className="size-3.5" />
              Copy
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-primary/10 hover:bg-primary/20"
            >
              <Download className="size-3.5" />
              Download .txt
            </button>
          </div>
        </div>

        <pre className="flex-1 overflow-auto p-5 text-xs font-mono leading-relaxed whitespace-pre-wrap">
          {draft}
        </pre>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}
