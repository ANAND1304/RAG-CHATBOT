import React, { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Cpu, Layers } from "lucide-react";
import FileUpload from "./FileUpload";
import clsx from "clsx";

export default function Sidebar({ onUploadSuccess }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "flex flex-col h-full bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 transition-all duration-300 relative",
        collapsed ? "w-12" : "w-72"
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-6 z-10 w-6 h-6 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-full flex items-center justify-center shadow-md hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        )}
      </button>

      {collapsed ? (
        <div className="flex flex-col items-center gap-4 pt-5 px-2">
          <BookOpen className="w-5 h-5 text-accent" />
          <div className="w-6 h-px bg-surface-200 dark:bg-surface-700" />
          <Layers className="w-4 h-4 text-gray-500" />
          <Cpu className="w-4 h-4 text-gray-500" />
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-surface-200 dark:border-surface-800">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="font-display font-semibold text-sm text-gray-800 dark:text-gray-100">
                Knowledge Base
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Upload documents to ground the AI's answers
            </p>
          </div>

          {/* Upload */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <FileUpload onUploadSuccess={onUploadSuccess} />
          </div>

          {/* RAG info footer */}
          <div className="border-t border-surface-200 dark:border-surface-800 px-4 py-4">
            <div className="bg-surface-50 dark:bg-surface-850 rounded-xl p-3 space-y-2">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                How it works
              </p>
              {[
                ["Embed", "Documents → vectors"],
                ["Retrieve", "Top-K similarity search"],
                ["Generate", "Grounded LLM answer"],
              ].map(([label, desc]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  <span className="text-[11px] text-gray-500">
                    <span className="text-accent font-medium">{label}:</span> {desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
