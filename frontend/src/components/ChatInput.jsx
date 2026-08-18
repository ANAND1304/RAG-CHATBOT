import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import clsx from "clsx";

export default function ChatInput({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [value]);

  const handleSend = () => {
    const q = value.trim();
    if (!q || disabled) return;
    onSend(q);
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 bg-surface-100 dark:bg-surface-850 border border-surface-200 dark:border-surface-700 rounded-2xl px-4 py-3 shadow-lg">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder || "Ask a question about your documents…"}
        rows={1}
        className={clsx(
          "flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 dark:text-gray-100",
          "placeholder:text-gray-400 dark:placeholder:text-gray-600",
          "disabled:opacity-50 font-sans",
          "max-h-40 leading-relaxed"
        )}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className={clsx(
          "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150",
          disabled || !value.trim()
            ? "bg-surface-200 dark:bg-surface-800 text-gray-500 cursor-not-allowed"
            : "bg-accent hover:bg-accent-dim text-white shadow-md shadow-accent/30 hover:scale-105 active:scale-95"
        )}
      >
        {disabled ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
