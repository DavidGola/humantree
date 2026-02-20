import Dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";
import type { SkillTreeDetail } from "../types/skillTree";
import type { UserDetailSkill } from "../types/user";

export function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new Dagre.graphlib.Graph();

  // 1. Configurer le graphe
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 120, ranksep: 160 });

  // 2. Donner les noeuds et arêtes à dagre
  nodes.forEach((node) => g.setNode(node.id, { width: 220, height: 72 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  // 3. Calculer le layout
  Dagre.layout(g);

  // Après ça, g.node(id) retourne un objet avec .x et .y
  // À toi de compléter : parcours tes nodes et remplace leur position !
  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x, y: pos.y },
    };
  });
}

export function returnNewIdSkillNegative(skillTree: SkillTreeDetail): number {
  const minId = Math.min(...skillTree.skills.map((s) => s.id));
  return minId > 0 ? -1 : minId - 1; // Si tous les IDs sont positifs, commence à -1
}

export function transformSkillstoGraph(
  skillTree: SkillTreeDetail,
  isDarkMode: boolean,
  isEditing: boolean,
  userDetailSkill: UserDetailSkill | null,
  handleCheckSkill: (skillId: number, isChecked: boolean) => void,
) {
  const nodes = skillTree.skills.map((skill) => ({
    id: String(skill.id),
    data: {
      label: skill.name,
      skillId: skill.id,
      isRoot: skill.is_root,
      userDetailSkill,
      handleCheckSkill,
    },
    type: isEditing ? "noCheckSkill" : "checkSkill",
    position: { x: 0, y: 0 }, // Position par défaut, à ajuster avec un algorithme de layout
    style: {
      background: skill.is_root
        ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
        : isDarkMode
          ? "#1e293b"
          : "#ffffff",
      color: skill.is_root ? "#ffffff" : isDarkMode ? "#e2e8f0" : "#1f2937",
      border: skill.is_root
        ? "2px solid rgba(255, 255, 255, 0.2)"
        : isDarkMode
          ? "1px solid #475569"
          : "1px solid #d1d5db",
      borderRadius: "12px",
      padding: "12px 24px",
      fontSize: "15px",
      fontWeight: skill.is_root ? 600 : 400,
      boxShadow: skill.is_root ? "0 4px 16px rgba(99, 102, 241, 0.35)" : "none",
    },
  }));

  const edges = skillTree.skills.flatMap((skill) =>
    skill.unlock_ids.map((unlockId) => ({
      id: `e${skill.id}-${unlockId}`,
      source: String(skill.id),
      target: String(unlockId),
    })),
  );
  const laidOutNodes = layoutGraph(nodes, edges);
  return { nodes: laidOutNodes, edges };
}
