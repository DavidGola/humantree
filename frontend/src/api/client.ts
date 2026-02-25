import axios, { type AxiosInstance } from "axios";

const axiosInst: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  withCredentials: true,
});

axiosInst.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosInst.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      !error.config.url.includes("/users/refresh/")
    ) {
      // Handle unauthorized error (e.g., redirect to login)
      return axiosInst
        .post("/users/refresh/")
        .then((response) => {
          const newToken = response.data.access_token;
          localStorage.setItem("token", newToken);
          // Retry the original request with the new token
          const originalRequest = error.config;
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return axiosInst(originalRequest);
        })
        .catch((refreshError) => {
          localStorage.removeItem("token");
          localStorage.removeItem("username");
          window.dispatchEvent(new CustomEvent("auth:logout"));
          return Promise.reject(refreshError);
        });
    }
    return Promise.reject(error);
  },
);

export default axiosInst;
