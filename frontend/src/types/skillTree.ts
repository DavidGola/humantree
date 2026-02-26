// Types correspondant aux schemas backend

export interface Skill {
  id: number;
  name: string;
  description: string | null;
  is_root: boolean;
  linked_tree_id?: number | null;
  unlock_ids: number[];
}

export interface SkillTreeSimple {
  id: number;
  name: string;
  description: string | null;
  creator_username: string;
  created_at: string;
  tags: string[];
}

export interface SkillTreeDetail extends SkillTreeSimple {
  skills: Skill[];
}
