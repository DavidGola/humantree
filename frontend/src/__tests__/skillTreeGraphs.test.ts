import { describe, it, expect, vi } from "vitest";
import {
  returnNewIdSkillNegative,
  transformSkillstoGraph,
  layoutGraph,
} from "../utils/skillTreeGraphs";
import type { SkillTreeDetail } from "../types/skillTree";

// ========== Helper ==========

function makeTree(
  skills: SkillTreeDetail["skills"] = [],
): SkillTreeDetail {
  return {
    id: 1,
    name: "Test Tree",
    description: null,
    creator_username: "testuser",
    created_at: "2024-01-01T00:00:00",
    skills,
  };
}

// ========== returnNewIdSkillNegative ==========

describe("returnNewIdSkillNegative", () => {
  it("retourne -1 quand tous les IDs sont positifs", () => {
    const tree = makeTree([
      { id: 1, name: "A", description: null, is_root: true, unlock_ids: [] },
      { id: 2, name: "B", description: null, is_root: false, unlock_ids: [] },
    ]);
    expect(returnNewIdSkillNegative(tree)).toBe(-1);
  });

  it("retourne minId - 1 quand il y a des IDs négatifs", () => {
    const tree = makeTree([
      { id: 1, name: "A", description: null, is_root: true, unlock_ids: [] },
      { id: -1, name: "B", description: null, is_root: false, unlock_ids: [] },
    ]);
    expect(returnNewIdSkillNegative(tree)).toBe(-2);
  });

  it("retourne minId - 1 quand plusieurs IDs négatifs", () => {
    const tree = makeTree([
      { id: -1, name: "A", description: null, is_root: true, unlock_ids: [] },
      { id: -2, name: "B", description: null, is_root: false, unlock_ids: [] },
      { id: -3, name: "C", description: null, is_root: false, unlock_ids: [] },
    ]);
    expect(returnNewIdSkillNegative(tree)).toBe(-4);
  });

  it("retourne -1 avec un seul skill positif", () => {
    const tree = makeTree([
      { id: 5, name: "A", description: null, is_root: true, unlock_ids: [] },
    ]);
    expect(returnNewIdSkillNegative(tree)).toBe(-1);
  });
});

// ========== transformSkillstoGraph ==========

describe("transformSkillstoGraph", () => {
  const noopCheck = vi.fn();

  it("retourne des nodes et edges vides pour un arbre sans skills", () => {
    const tree = makeTree([]);
    const result = transformSkillstoGraph(tree, false, false, null, noopCheck);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("crée un node par skill", () => {
    const tree = makeTree([
      { id: 1, name: "Root", description: null, is_root: true, unlock_ids: [2] },
      { id: 2, name: "Child", description: null, is_root: false, unlock_ids: [] },
    ]);
    const result = transformSkillstoGraph(tree, false, false, null, noopCheck);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].id).toBe("1");
    expect(result.nodes[1].id).toBe("2");
  });

  it("crée les edges à partir des unlock_ids", () => {
    const tree = makeTree([
      { id: 1, name: "Root", description: null, is_root: true, unlock_ids: [2, 3] },
      { id: 2, name: "Child A", description: null, is_root: false, unlock_ids: [] },
      { id: 3, name: "Child B", description: null, is_root: false, unlock_ids: [] },
    ]);
    const result = transformSkillstoGraph(tree, false, false, null, noopCheck);
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0]).toMatchObject({ source: "1", target: "2" });
    expect(result.edges[1]).toMatchObject({ source: "1", target: "3" });
  });

  it("utilise le type 'noCheckSkill' en mode editing", () => {
    const tree = makeTree([
      { id: 1, name: "Root", description: null, is_root: true, unlock_ids: [] },
    ]);
    const result = transformSkillstoGraph(tree, false, true, null, noopCheck);
    expect(result.nodes[0].type).toBe("noCheckSkill");
  });

  it("utilise le type 'checkSkill' en mode non-editing", () => {
    const tree = makeTree([
      { id: 1, name: "Root", description: null, is_root: true, unlock_ids: [] },
    ]);
    const result = transformSkillstoGraph(tree, false, false, null, noopCheck);
    expect(result.nodes[0].type).toBe("checkSkill");
  });

  it("applique le style root (gradient) au skill root", () => {
    const tree = makeTree([
      { id: 1, name: "Root", description: null, is_root: true, unlock_ids: [] },
      { id: 2, name: "Child", description: null, is_root: false, unlock_ids: [] },
    ]);
    const result = transformSkillstoGraph(tree, false, false, null, noopCheck);
    expect(result.nodes[0].style?.background).toContain("gradient");
    expect(result.nodes[1].style?.background).not.toContain("gradient");
  });

  it("applique le style dark mode aux skills non-root", () => {
    const tree = makeTree([
      { id: 1, name: "Child", description: null, is_root: false, unlock_ids: [] },
    ]);
    const lightResult = transformSkillstoGraph(tree, false, false, null, noopCheck);
    const darkResult = transformSkillstoGraph(tree, true, false, null, noopCheck);
    expect(lightResult.nodes[0].style?.background).toBe("#ffffff");
    expect(darkResult.nodes[0].style?.background).toBe("#1e293b");
  });

  it("passe les données du skill dans node.data", () => {
    const tree = makeTree([
      { id: 1, name: "Root", description: null, is_root: true, unlock_ids: [] },
    ]);
    const result = transformSkillstoGraph(tree, false, false, null, noopCheck);
    expect(result.nodes[0].data).toMatchObject({
      label: "Root",
      skillId: 1,
      isRoot: true,
    });
  });

  it("gère les chaînes de dépendances", () => {
    const tree = makeTree([
      { id: 1, name: "Root", description: null, is_root: true, unlock_ids: [2] },
      { id: 2, name: "Mid", description: null, is_root: false, unlock_ids: [3] },
      { id: 3, name: "Leaf", description: null, is_root: false, unlock_ids: [] },
    ]);
    const result = transformSkillstoGraph(tree, false, false, null, noopCheck);
    expect(result.edges).toHaveLength(2);
    expect(result.edges).toContainEqual(
      expect.objectContaining({ source: "1", target: "2" }),
    );
    expect(result.edges).toContainEqual(
      expect.objectContaining({ source: "2", target: "3" }),
    );
  });
});

// ========== layoutGraph ==========

describe("layoutGraph", () => {
  it("assigne des positions à chaque node", () => {
    const nodes = [
      { id: "1", data: { label: "A" }, position: { x: 0, y: 0 } },
      { id: "2", data: { label: "B" }, position: { x: 0, y: 0 } },
    ];
    const edges = [{ id: "e1-2", source: "1", target: "2" }];

    const result = layoutGraph(nodes, edges);
    expect(result).toHaveLength(2);
    result.forEach((node) => {
      expect(node.position.x).toBeDefined();
      expect(node.position.y).toBeDefined();
    });
  });

  it("positionne les nodes parent au-dessus des enfants (TB layout)", () => {
    const nodes = [
      { id: "1", data: { label: "Parent" }, position: { x: 0, y: 0 } },
      { id: "2", data: { label: "Child" }, position: { x: 0, y: 0 } },
    ];
    const edges = [{ id: "e1-2", source: "1", target: "2" }];

    const result = layoutGraph(nodes, edges);
    const parent = result.find((n) => n.id === "1")!;
    const child = result.find((n) => n.id === "2")!;
    expect(parent.position.y).toBeLessThan(child.position.y);
  });

  it("retourne un tableau vide pour un graphe vide", () => {
    const result = layoutGraph([], []);
    expect(result).toEqual([]);
  });
});
