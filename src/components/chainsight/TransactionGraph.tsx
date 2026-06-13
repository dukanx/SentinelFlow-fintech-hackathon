import { ReactFlow, Background, Controls, type Node, type Edge } from "@xyflow/react";
import { useMemo } from "react";
import {
  SenderNode,
  IntermediaryNode,
  MixerNode,
  SanctionedNode,
  ExchangeNode,
} from "./graph-nodes";

interface Props {
  nodes: Node[];
  edges: Edge[];
}

export function TransactionGraph({ nodes, edges }: Props) {
  const nodeTypes = useMemo(
    () => ({
      sender: SenderNode,
      intermediary: IntermediaryNode,
      mixer: MixerNode,
      sanctioned: SanctionedNode,
      exchange: ExchangeNode,
    }),
    [],
  );

  return (
    <div className="h-[380px] w-full rounded-lg border bg-surface overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll={false}
      >
        <Background gap={20} size={1} color="oklch(0.32 0.013 250)" />
        <Controls showInteractive={false} className="!bg-surface-2 !border-border" />
      </ReactFlow>
    </div>
  );
}
