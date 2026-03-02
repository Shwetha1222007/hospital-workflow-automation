import api from "./axiosInstance";

export const uploadLabReport = (formData) =>
  api.post("/api/lab-reports/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateLabStatus = (reportId, status, notes) =>
  api.patch(`/api/lab-reports/${reportId}/status`, { status, notes });

export const getPatientReports = (patientCode) =>
  api.get(`/api/lab-reports/patient/${patientCode}`);

export const getAllReports = () => api.get("/api/lab-reports/");

export const uploadExistingReportFile = (reportId, formData) =>
  api.post(`/api/lab-reports/${reportId}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const downloadReport = (reportId) =>
  `http://localhost:8000/api/lab-reports/${reportId}/download`;
