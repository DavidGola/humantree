import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { Edge, Node } from "@xyflow/react";
import type { SkillTreeDetail } from "../types/skillTree";
import type { UserDetailSkill } from "../types/user";

const elk = new ELK();

function estimateNodeWidth(label: string): number {
  const textWidth = label.length * 8;
  return Math.max(200, Math.min(textWidth + 48, 400));
}

export async function layoutGraph(
  nodes: Node[],
  edges: Edge[],
): Promise<Node[]> {
  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.mergeEdges": "true",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: estimateNodeWidth(String(node.data.label ?? "")),
      height: 56,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layout = await elk.layout(elkGraph);

  return nodes.map((node) => {
    const elkNode = layout.children?.find((n) => n.id === node.id);
    return {
      ...node,
      position: { x: elkNode?.x ?? 0, y: elkNode?.y ?? 0 },
    };
  });
}

export function returnNewIdSkillNegative(skillTree: SkillTreeDetail): number {
  const minId = Math.min(...skillTree.skills.map((s) => s.id));
  return minId > 0 ? -1 : minId - 1;
}

export async function transformSkillstoGraph(
  skillTree: SkillTreeDetail,
  isDarkMode: boolean,
  isEditing: boolean,
  userDetailSkill: UserDetailSkill | null,
  handleCheckSkill: (skillId: number, isChecked: boolean) => void,
  linkedTreeStats?: Map<number, { checked: number; total: number }>,
) {
  const nodes = skillTree.skills.map((skill) => {
    const isLinked = skill.linked_tree_id !== null && skill.linked_tree_id !== undefined;
    const nodeType = isLinked
      ? "linkedTreeNode"
      : isEditing
        ? "noCheckSkill"
        : "checkSkill";

    let style;
    if (isLinked) {
      style = {
        background: isDarkMode
          ? "linear-gradient(135deg, #0d9488, #0f766e)"
          : "linear-gradient(135deg, #14b8a6, #0d9488)",
        color: "#ffffff",
        border: "2px dashed rgba(255, 255, 255, 0.4)",
        borderRadius: "12px",
        padding: "10px 20px",
        fontSize: "13px",
        fontWeight: 500,
        boxShadow: "0 4px 16px rgba(20, 184, 166, 0.3)",
        maxWidth: "400px",
        cursor: "pointer",
      };
    } else if (skill.is_root) {
      style = {
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "#ffffff",
        border: "2px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "12px",
        padding: "10px 20px",
        fontSize: "13px",
        fontWeight: 600,
        boxShadow: "0 4px 16px rgba(99, 102, 241, 0.35)",
        maxWidth: "400px",
      };
    } else {
      style = {
        background: isDarkMode ? "#1e293b" : "#ffffff",
        color: isDarkMode ? "#e2e8f0" : "#1f2937",
        border: isDarkMode ? "1px solid #475569" : "1px solid #d1d5db",
        borderRadius: "12px",
        padding: "10px 20px",
        fontSize: "13px",
        fontWeight: 400,
        boxShadow: "none",
        maxWidth: "400px",
      };
    }

    const stats = skill.linked_tree_id
      ? linkedTreeStats?.get(skill.linked_tree_id)
      : undefined;

    return {
      id: String(skill.id),
      data: {
        label: skill.name,
        skillId: skill.id,
        isRoot: skill.is_root,
        linkedTreeId: skill.linked_tree_id,
        userDetailSkill,
        handleCheckSkill,
        linkedTreeChecked: stats?.checked,
        linkedTreeTotal: stats?.total,
        isEditing,
      },
      type: nodeType,
      position: { x: 0, y: 0 },
      style,
    };
  });

  const edges = skillTree.skills.flatMap((skill) =>
    skill.unlock_ids.map((unlockId) => ({
      id: `e${skill.id}-${unlockId}`,
      source: String(skill.id),
      target: String(unlockId),
      type: "simplebezier",
      style: {
        stroke: isDarkMode ? "#475569" : "#cbd5e1",
        strokeWidth: 1.5,
      },
    })),
  );
  const laidOutNodes = await layoutGraph(nodes, edges);
  return { nodes: laidOutNodes, edges };
}
