export interface User {
  id: number | null;
  username: string;
  email: string | null;
  created_at: string | null;
}

export interface UserDetailSkill {
  user_id: number;
  skill_ids: number[];
}
