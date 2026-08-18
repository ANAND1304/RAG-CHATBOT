import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: BASE,
  timeout: 120000, // 2 min for LLM generation
});

// ─── Document APIs ────────────────────────────────────────────

export const uploadDocument = async (file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/documents/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) =>
      onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  });
  return data;
};

export const listDocuments = async () => {
  const { data } = await api.get("/documents/list");
  return data;
};

export const clearDocuments = async () => {
  const { data } = await api.delete("/documents/clear");
  return data;
};

export const getKBStatus = async () => {
  const { data } = await api.get("/documents/status");
  return data;
};

// ─── Chat APIs ────────────────────────────────────────────────

export const sendMessage = async (question, chatHistory = []) => {
  const { data } = await api.post("/chat/", {
    question,
    chat_history: chatHistory,
    stream: false,
  });
  return data;
};

export const getHealth = async () => {
  const { data } = await api.get("/chat/health");
  return data;
};
