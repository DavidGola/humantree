import axiosInst from "./client";
import type { User, UserPublic, UserDetailSkill } from "../types/user";

export const userApi = {
  getProfile: () =>
    axiosInst.get<User>("/users/me/profile").then((res) => res.data),

  getByUsername: (username: string) =>
    axiosInst.get<UserPublic>(`/users/${username}/`).then((res) => res.data),

  updateProfile: (data: { bio?: string; avatar_url?: string }) =>
    axiosInst.patch<User>("/users/me/profile", data).then((res) => res.data),

  getSkillsChecked: () =>
    axiosInst
      .get<UserDetailSkill>("/users/skills-checked/")
      .then((res) => res.data),

  addSkillChecked: (skillId: number) =>
    axiosInst.post("/users/skills-checked/", { skill_id: skillId }),

  removeSkillChecked: (skillId: number) =>
    axiosInst.delete(`/users/skills-checked/${skillId}/`),

  login: (formData: URLSearchParams) =>
    axiosInst.post("/users/login/", formData),

  refresh: () => axiosInst.post("/users/refresh/"),

  register: (username: string, email: string, password: string) =>
    axiosInst.post("/users/register/", { username, email, password }),
};
