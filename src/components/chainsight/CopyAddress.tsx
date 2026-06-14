import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { truncateAddress } from "@/lib/format";

interface Props {
  address: string;
  /** Show a shortened form instead of the full string. */
  truncate?: boolean;
  head?: number;
  tail?: number;
  className?: string;
}

/** Monospace address that copies to the clipboard on click, with a check tick. */
export function CopyAddress({ address, truncate = false, head = 6, tail = 6, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied!" : `Copy ${address}`}
      className={`group inline-flex items-center gap-1.5 font-mono text-left hover:text-foreground transition-colors ${className}`}
    >
      <span className={truncate ? "" : "break-all"}>
        {truncate ? truncateAddress(address, head, tail) : address}
      </span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-verdict-cleared" />
      ) : (
        <Copy className="size-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
