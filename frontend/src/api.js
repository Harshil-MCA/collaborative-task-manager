
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:5000/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the login token to protected requests.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
