import axios, { type AxiosInstance } from "axios";

const axiosInst: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  withCredentials: true,
});

axiosInst.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const url = error.config?.url || "";
    const isAuthRoute =
      url.includes("/users/refresh/") ||
      url.includes("/users/login") ||
      url.includes("/users/register");
    if (error.response && error.response.status === 401 && !isAuthRoute) {
      return axiosInst
        .post("/users/refresh/")
        .then(() => {
          // Cookie access_token is set automatically by the browser
          // Retry the original request
          return axiosInst(error.config);
        })
        .catch((refreshError) => {
          window.dispatchEvent(new CustomEvent("auth:logout"));
          return Promise.reject(refreshError);
        });
    }
    return Promise.reject(error);
  },
);

export default axiosInst;
