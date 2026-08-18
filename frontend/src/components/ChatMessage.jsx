import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, ChevronDown, ChevronUp, FileText, AlertCircle } from "lucide-react";
import clsx from "clsx";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const [showSources, setShowSources] = useState(false);

  return (
    <div
      className={clsx(
        "flex gap-3 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
          isUser
            ? "bg-accent text-white"
            : "bg-surface-800 border border-surface-200 dark:border-surface-700 text-accent"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={clsx(
          "max-w-[80%] flex flex-col gap-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={clsx(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-accent text-white rounded-tr-sm"
              : message.isError
              ? "bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-sm"
              : "bg-surface-100 dark:bg-surface-850 border border-surface-200 dark:border-surface-700 text-gray-800 dark:text-gray-100 rounded-tl-sm"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  return inline ? (
                    <code
                      className="bg-surface-800/50 dark:bg-surface-900 px-1.5 py-0.5 rounded text-xs font-mono text-accent"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-surface-900 rounded-lg p-3 overflow-x-auto mt-2">
                      <code className="text-xs font-mono text-gray-300" {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                strong: ({ children }) => <strong className="font-semibold text-accent-glow">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Sources toggle */}
        {!isUser && message.sources?.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setShowSources((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent transition-colors"
            >
              {showSources ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {message.sources.length} source{message.sources.length !== 1 ? "s" : ""} used
            </button>

            {showSources && (
              <div className="mt-2 flex flex-col gap-2 animate-fade-in">
                {message.sources.map((src) => (
                  <div
                    key={src.excerpt}
                    className="bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg p-3 text-xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3 h-3 text-accent flex-shrink-0" />
                      <span className="font-mono text-accent truncate">{src.source}</span>
                      {src.page !== "N/A" && (
                        <span className="text-gray-500 ml-auto">p.{src.page}</span>
                      )}
                      <span className="ml-auto text-emerald-400 font-mono">
                        {(src.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-gray-500 italic leading-relaxed">&ldquo;{src.preview}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No context warning */}
        {!isUser && message.contextUsed === false && !message.isError && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>No relevant context found in documents</span>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-gray-600 dark:text-gray-600">
          {message.ts?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
