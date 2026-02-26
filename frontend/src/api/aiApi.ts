import axiosInst from "./client";

export interface GeneratedTree {
  name: string;
  description: string;
  tags: string[];
  skills: {
    id: number;
    name: string;
    description: string;
    is_root: boolean;
    unlock_ids: number[];
  }[];
}

export const aiApi = {
  generateTree: (prompt: string, provider?: string) =>
    axiosInst
      .post<GeneratedTree>("/ai/generate-tree", { prompt, provider }, { timeout: 120000 })
      .then((res) => res.data),

  enrichSkill: (params: {
    skillName: string;
    treeName?: string;
    treeDescription?: string;
    currentDescription?: string;
    provider?: string;
  }) =>
    axiosInst
      .post<{ description: string }>(
        "/ai/enrich-skill",
        {
          skill_name: params.skillName,
          tree_name: params.treeName,
          tree_description: params.treeDescription,
          current_description: params.currentDescription,
          provider: params.provider,
        },
        { timeout: 60000 },
      )
      .then((res) => res.data),
};
