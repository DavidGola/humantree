import axios, { type AxiosInstance } from "axios";

const axiosInst: AxiosInstance = axios.create({
  baseURL: "http://localhost:8000",
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

export default axiosInst;
