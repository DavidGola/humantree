import axiosInst from "./client";
import type { SkillTreeSimple, SkillTreeDetail } from "../types/skillTree";

export const skillTreeApi = {
  getAll: () =>
    axiosInst.get<SkillTreeSimple[]>("/skill-trees/").then((res) => res.data),

  getTrendings: () =>
    axiosInst
      .get<SkillTreeSimple[]>("/skill-trees/trendings/")
      .then((res) => res.data),

  getMyTrees: () =>
    axiosInst
      .get<SkillTreeSimple[]>("/skill-trees/my-skill-trees/")
      .then((res) => res.data),

  getMyFavorites: () =>
    axiosInst
      .get<SkillTreeSimple[]>("/skill-trees/my-favorite-skill-trees/")
      .then((res) => res.data),

  getById: (id: string) =>
    axiosInst
      .get<SkillTreeDetail>(`/skill-trees/${id}/`)
      .then((res) => res.data),

  create: (name: string, description: string) =>
    axiosInst.post("/skill-trees/", { name, description }),

  save: (id: string, data: SkillTreeDetail) =>
    axiosInst.put(`/skill-trees/save/${id}/`, data),

  remove: (id: number) => axiosInst.delete(`/skill-trees/${id}/`),

  addFavorite: (treeId: number) =>
    axiosInst.post(`/skill-trees/favorite/${treeId}`),

  removeFavorite: (treeId: number) =>
    axiosInst.delete(`/skill-trees/favorite/${treeId}`),
};
