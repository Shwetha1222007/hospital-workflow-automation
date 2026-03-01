import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export const API = "http://localhost:8000/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getMe = () =>
    axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    getMe()
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginUser = async (username, password) => {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);
    const res = await axios.post(`${API}/auth/token`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = res.data;
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("role", data.role);
    if (data.patient_code) localStorage.setItem("patient_code", data.patient_code);
    setUser({
      id: data.user_id,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      patient_code: data.patient_code,
    });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("patient_code");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Axios helper with auth header
export function authAxios() {
  return axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
}
