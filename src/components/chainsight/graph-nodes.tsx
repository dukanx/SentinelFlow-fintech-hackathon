import { Handle, Position } from "@xyflow/react";
import { Ban, AlertTriangle, Wallet, Building2, CircleDot } from "lucide-react";
import { truncateAddress } from "@/lib/format";

interface NodeData {
  label: string;
  address?: string;
}

function Shell({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "sender" | "intermediary" | "mixer" | "sanctioned" | "exchange";
}) {
  const styles = {
    sender: "border-foreground/40 bg-surface",
    intermediary: "border-border bg-surface",
    mixer: "border-verdict-review/60 bg-verdict-review-soft/60",
    sanctioned: "border-verdict-blocked/70 bg-verdict-blocked-soft/70",
    exchange: "border-primary/60 bg-surface ring-1 ring-primary/40",
  }[tone];
  return (
    <div className={`rounded-md border px-3 py-2 w-[200px] ${styles}`}>
      <Handle type="target" position={Position.Left} />
      {children}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function SenderNode({ data }: { data: NodeData }) {
  return (
    <Shell tone="sender">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Wallet className="size-3" /> Sender
      </div>
      <div className="mt-1 font-mono text-xs">{truncateAddress(data.address ?? "", 8, 6)}</div>
    </Shell>
  );
}

export function IntermediaryNode({ data }: { data: NodeData }) {
  return (
    <Shell tone="intermediary">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <CircleDot className="size-3" /> Hop
      </div>
      <div className="mt-1 text-xs">{data.label}</div>
    </Shell>
  );
}

export function MixerNode({ data }: { data: NodeData }) {
  return (
    <Shell tone="mixer">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-verdict-review">
        <AlertTriangle className="size-3" /> Mixer
      </div>
      <div className="mt-1 text-xs font-medium">{data.label}</div>
    </Shell>
  );
}

export function SanctionedNode({ data }: { data: NodeData }) {
  return (
    <Shell tone="sanctioned">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-verdict-blocked">
        <Ban className="size-3" /> Sanctioned
      </div>
      <div className="mt-1 text-xs font-medium">{data.label}</div>
    </Shell>
  );
}

export function ExchangeNode({ data }: { data: NodeData }) {
  return (
    <Shell tone="exchange">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-primary">
        <Building2 className="size-3" /> Exchange
      </div>
      <div className="mt-1 text-xs">{data.label}</div>
      <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{data.address}</div>
    </Shell>
  );
}
