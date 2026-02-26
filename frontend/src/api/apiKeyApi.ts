import axiosInst from "./client";

export interface ApiKeyInfo {
  provider: string;
  created_at: string;
}

export const apiKeyApi = {
  list: () =>
    axiosInst
      .get<ApiKeyInfo[]>("/users/api-keys")
      .then((res) => res.data),

  save: (provider: string, apiKey: string) =>
    axiosInst
      .post<ApiKeyInfo>("/users/api-keys", { provider, api_key: apiKey })
      .then((res) => res.data),

  remove: (provider: string) =>
    axiosInst.delete(`/users/api-keys/${provider}`),
};
