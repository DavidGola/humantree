export interface User {
  id: number | null;
  username: string;
  email: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export interface UserPublic {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string | null;
  trees_count: number;
  skills_checked_count: number;
}

export interface UserDetailSkill {
  user_id: number;
  skill_ids: number[];
}
