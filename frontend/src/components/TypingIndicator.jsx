import React from "react";
import { Bot } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center">
        <Bot className="w-4 h-4 text-accent" />
      </div>
      <div className="bg-surface-100 dark:bg-surface-850 border border-surface-200 dark:border-surface-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-accent"
            style={{
              animation: "typing 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">Thinking…</span>
      </div>
    </div>
  );
}
