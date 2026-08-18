import { useState, useCallback, useEffect } from "react";
import { uploadDocument, listDocuments, clearDocuments, getKBStatus } from "../api";

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [status, setStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [docsData, kbStatus] = await Promise.all([listDocuments(), getKBStatus()]);
      setDocuments(docsData.documents || []);
      setStatus(kbStatus);
    } catch (e) {
      console.error("Failed to refresh documents:", e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = useCallback(
    async (file) => {
      setError(null);
      setUploading(true);
      setUploadProgress(0);
      try {
        const result = await uploadDocument(file, setUploadProgress);
        await refresh();
        return result;
      } catch (e) {
        const msg = e.response?.data?.detail || e.message;
        setError(msg);
        throw e;
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [refresh]
  );

  const clear = useCallback(async () => {
    await clearDocuments();
    setDocuments([]);
    setStatus(null);
    await refresh();
  }, [refresh]);

  return { documents, status, uploading, uploadProgress, error, upload, clear, refresh };
}
