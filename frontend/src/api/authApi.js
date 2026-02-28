import api from "./axiosInstance";

export const login = (email, password) => {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return api.post("/api/auth/token", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
};

export const register = (data) => api.post("/api/auth/register", data);
export const getMe = () => api.get("/api/auth/me");
