import axiosInst from "./client";
import type { SearchResults } from "../types/search";

export const searchApi = {
  search: (q: string, limit = 20, offset = 0) =>
    axiosInst
      .get<SearchResults>("/search/", { params: { q, limit, offset } })
      .then((res) => res.data),
};
