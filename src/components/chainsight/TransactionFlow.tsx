import { useMemo, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import { Ban, Wallet, Shuffle, Coins, Building2, Network } from "lucide-react";
import { truncateAddress } from "@/lib/format";

interface Props {
  nodes: Node[];
  edges: Edge[];
}

type Kind = "sanctioned" | "wallet" | "mixer" | "intermediary" | "sender" | "exchange";

const NODE_W = 180;
const NODE_H = 68;
const COL_GAP = 120;
const ROW_GAP = 56;
const PAD_X = 36;
const PAD_Y = 44;

function nodeStyles(kind: Kind) {
  switch (kind) {
    case "sanctioned":
      return {
        wrap: "border-[oklch(0.55_0.22_25)/0.35] bg-[oklch(0.97_0.04_25)]",
        chip: "text-[oklch(0.50_0.22_25)] bg-[oklch(0.95_0.05_25)]",
        iconBg: "bg-[oklch(0.93_0.07_25)] text-[oklch(0.50_0.22_25)]",
        label: "SANCTIONED",
        Icon: Ban,
      };
    case "mixer":
      return {
        wrap: "border-[oklch(0.62_0.18_295)/0.35] bg-[oklch(0.97_0.03_295)]",
        chip: "text-[oklch(0.48_0.20_295)] bg-[oklch(0.94_0.06_295)]",
        iconBg: "bg-[oklch(0.93_0.07_295)] text-[oklch(0.48_0.20_295)]",
        label: "MIXER",
        Icon: Shuffle,
      };
    case "wallet":
      return {
        wrap: "border-border bg-surface",
        chip: "text-muted-foreground bg-secondary",
        iconBg: "bg-secondary text-muted-foreground",
        label: "WALLET",
        Icon: Wallet,
      };
    case "intermediary":
      return {
        wrap: "border-border bg-surface",
        chip: "text-muted-foreground bg-secondary",
        iconBg: "bg-secondary text-muted-foreground",
        label: "HOP",
        Icon: Network,
      };
    case "sender":
      return {
        wrap: "border-[oklch(0.30_0.02_255)/0.45] bg-surface",
        chip: "text-foreground bg-secondary",
        iconBg: "bg-[oklch(0.25_0.02_255)] text-white",
        label: "SENDER",
        Icon: Coins,
      };
    case "exchange":
      return {
        wrap: "border-[oklch(0.55_0.16_295)/0.30] bg-[oklch(0.98_0.02_295)] opacity-90",
        chip: "text-[oklch(0.45_0.16_295)] bg-[oklch(0.95_0.04_295)]",
        iconBg: "bg-[oklch(0.93_0.05_295)] text-[oklch(0.45_0.16_295)]",
        label: "YOUR EXCHANGE",
        Icon: Building2,
      };
  }
}

export function TransactionFlow({ nodes, edges }: Props) {
  // Compute normalized layout — group nodes by their x position into columns.
  const layout = useMemo(() => {
    const xs = Array.from(new Set(nodes.map((n) => n.position.x))).sort((a, b) => a - b);
    const colIndex = new Map<number, number>(xs.map((x, i) => [x, i]));
    const cols = xs.length;
    // Group nodes per column, sort by y (top to bottom)
    const grouped = xs.map((x) =>
      nodes
        .filter((n) => n.position.x === x)
        .sort((a, b) => a.position.y - b.position.y),
    );
    const maxRows = Math.max(...grouped.map((g) => g.length));

    const positioned = new Map<string, { x: number; y: number; cx: number; cy: number }>();
    grouped.forEach((group, ci) => {
      const offset = (maxRows - group.length) * (NODE_H + ROW_GAP) * 0; // top-align
      group.forEach((n, ri) => {
        const x = PAD_X + ci * (NODE_W + COL_GAP);
        const y = PAD_Y + offset + ri * (NODE_H + ROW_GAP);
        positioned.set(n.id, {
          x,
          y,
          cx: x + NODE_W / 2,
          cy: y + NODE_H / 2,
        });
      });
    });

    const width = PAD_X * 2 + cols * NODE_W + (cols - 1) * COL_GAP;
    const height = PAD_Y * 2 + maxRows * NODE_H + (maxRows - 1) * ROW_GAP;
    return { positioned, width, height, colIndex };
  }, [nodes]);

  return (
    <div className="rounded-xl border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Network className="size-4 text-primary" />
          Transaction flow
        </div>
        <div className="text-[11px] text-muted-foreground">
          Hover any wallet to trace its path · left → right = fund direction
        </div>
      </div>

      {/* Canvas */}
      <div className="relative overflow-x-auto bg-[radial-gradient(oklch(0.92_0.005_250)_1px,transparent_1px)] [background-size:18px_18px]">
        <div
          className="relative mx-auto"
          style={{ width: layout.width, height: layout.height, minWidth: "100%" }}
        >
          {/* SVG edge layer */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={layout.width}
            height={layout.height}
          >
            <defs>
              <marker
                id="arrow-danger"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="oklch(0.58 0.22 25)" />
              </marker>
              <marker
                id="arrow-clean"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="oklch(0.75 0.01 250)" />
              </marker>
              <marker
                id="arrow-faded"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="oklch(0.58 0.22 25 / 0.45)" />
              </marker>
            </defs>
            {edges.map((e) => {
              const from = layout.positioned.get(e.source);
              const to = layout.positioned.get(e.target);
              if (!from || !to) return null;
              const x1 = from.x + NODE_W;
              const y1 = from.cy;
              const x2 = to.x;
              const y2 = to.cy;
              const mx = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
              const isDanger = e.className === "edge-danger";
              const isFaded = e.className === "edge-tainted-faded";
              const isClean = e.className === "edge-clean";
              const stroke = isDanger
                ? "oklch(0.58 0.22 25)"
                : isFaded
                  ? "oklch(0.58 0.22 25 / 0.45)"
                  : "oklch(0.75 0.01 250)";
              const dasharray = isClean ? undefined : "6 4";
              const marker = isDanger
                ? "url(#arrow-danger)"
                : isFaded
                  ? "url(#arrow-faded)"
                  : "url(#arrow-clean)";
              return (
                <g key={e.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={1.75}
                    strokeDasharray={dasharray}
                    markerEnd={marker}
                  />
                </g>
              );
            })}
          </svg>

          {/* Edge labels */}
          {edges.map((e) => {
            const from = layout.positioned.get(e.source);
            const to = layout.positioned.get(e.target);
            if (!from || !to || !e.label) return null;
            const mx = (from.x + NODE_W + to.x) / 2;
            const my = (from.cy + to.cy) / 2;
            const isDanger = e.className === "edge-danger";
            const isFaded = e.className === "edge-tainted-faded";
            const tone = isDanger
              ? "bg-[oklch(0.96_0.04_25)] text-[oklch(0.48_0.22_25)] border-[oklch(0.55_0.22_25)/0.30]"
              : isFaded
                ? "bg-[oklch(0.97_0.02_25)] text-[oklch(0.55_0.16_25)] border-[oklch(0.55_0.22_25)/0.20]"
                : "bg-surface text-muted-foreground border-border";
            return (
              <div
                key={`lbl-${e.id}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md border text-[10px] font-mono whitespace-nowrap ${tone}`}
                style={{ left: mx, top: my }}
              >
                {String(e.label)}
              </div>
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const pos = layout.positioned.get(n.id);
            if (!pos) return null;
            const kind = (n.type as Kind) ?? "intermediary";
            const s = nodeStyles(kind);
            const data = n.data as { label: string; address?: string };
            const Icon = s.Icon;
            return (
              <div
                key={n.id}
                className={`absolute rounded-lg border shadow-sm ${s.wrap} transition-shadow hover:shadow-md`}
                style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
              >
                <div className="flex items-center gap-2.5 px-2.5 py-2 h-full">
                  <span className={`size-7 grid place-items-center rounded-md ${s.iconBg}`}>
                    <Icon className="size-3.5" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[9px] font-semibold tracking-wider ${s.chip} rounded px-1 py-px inline-block leading-tight`}>
                      {s.label}
                    </div>
                    <div className="text-[12px] font-medium truncate leading-tight mt-0.5">
                      {data.label}
                    </div>
                    {data.address && (
                      <div className="text-[9px] font-mono text-muted-foreground truncate leading-tight">
                        {truncateAddress(data.address, 6, 4)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-t text-[11px] text-muted-foreground">
        <div className="flex items-center gap-4 flex-wrap">
          <LegendDot color="oklch(0.55 0.22 25)" label="Sanctioned / flagged" />
          <LegendDot color="oklch(0.52 0.20 295)" label="Mixer" />
          <LegendDot color="oklch(0.65 0.01 250)" label="Pass-through / known" square />
          <LegendDot color="oklch(0.30 0.02 255)" label="Sender" />
          <LegendDot color="oklch(0.55 0.16 295)" label="Your exchange" />
        </div>
        <div className="flex items-center gap-2">
          <svg width="36" height="6" className="overflow-visible">
            <line
              x1="0"
              y1="3"
              x2="36"
              y2="3"
              stroke="oklch(0.58 0.22 25)"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
          </svg>
          <span>Tainted fund flow</span>
        </div>
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  square,
}: {
  color: string;
  label: string;
  square?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`inline-block size-2.5 ${square ? "rounded-sm" : "rounded-full"}`}
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
