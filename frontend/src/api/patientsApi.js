import api from "./axiosInstance";

export const getPatients = () => api.get("/api/patients/");
export const searchPatients = (q) => api.get(`/api/patients/search?q=${q}`);
export const getPatient = (code) => api.get(`/api/patients/${code}`);
export const createPatient = (data) => api.post("/api/patients/", data);
