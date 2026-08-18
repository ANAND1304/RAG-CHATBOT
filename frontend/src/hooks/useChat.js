import { useState, useCallback, useRef } from "react";
import { sendMessage } from "../api";

const MAX_HISTORY = 20; // keep last 10 exchanges in memory

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const historyRef = useRef([]); // raw history for API

  const addMessage = useCallback((role, content, meta = {}) => {
    const msg = { id: Date.now() + Math.random(), role, content, ...meta, ts: new Date() };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const ask = useCallback(
    async (question) => {
      if (!question.trim() || isLoading) return;

      setError(null);
      addMessage("user", question);

      // Build API history (last N messages)
      const history = historyRef.current.slice(-MAX_HISTORY);

      setIsLoading(true);
      try {
        const result = await sendMessage(question, history);

        const assistantMsg = addMessage("assistant", result.answer, {
          sources: result.sources || [],
          contextUsed: result.context_used,
          chunksRetrieved: result.chunks_retrieved || 0,
        });

        // Update rolling history
        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: question },
          { role: "assistant", content: result.answer },
        ].slice(-MAX_HISTORY);

        return assistantMsg;
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || "Something went wrong.";
        setError(msg);
        addMessage("assistant", `⚠️ ${msg}`, { isError: true });
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, addMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    historyRef.current = [];
  }, []);

  return { messages, isLoading, error, ask, clearChat };
}
