import React, { useEffect, useRef, useState } from "react";
import {
  Sparkles, RotateCcw, BookOpen, Zap, Shield, Database,
} from "lucide-react";
import ChatMessage from "../components/ChatMessage";
import TypingIndicator from "../components/TypingIndicator";
import ChatInput from "../components/ChatInput";
import Sidebar from "../components/Sidebar";
import { useChat } from "../hooks/useChat";

const SUGGESTIONS = [
  "Summarize the main points of the document",
  "What are the key findings?",
  "List any statistics or numbers mentioned",
  "What conclusions does the document draw?",
];

export default function ChatPage() {
  const { messages, isLoading, ask, clearChat } = useChat();
  const bottomRef = useRef(null);
  const [hasDocuments, setHasDocuments] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = (q) => {
    ask(q);
  };

  return (
    <div className="flex h-screen bg-surface-50 dark:bg-surface-950 font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar onUploadSuccess={() => setHasDocuments(true)} />

      {/* Main chat area */}
      <main className="flex flex-col flex-1 min-w-0 h-full">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h1 className="font-display font-bold text-sm text-gray-900 dark:text-white tracking-tight">
                RAG Chatbot
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-500">
                Document-grounded Q&A
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status badges */}
            <div className="hidden sm:flex items-center gap-2">
              <Badge icon={<Shield className="w-3 h-3" />} label="Anti-hallucination" />
              <Badge icon={<Zap className="w-3 h-3" />} label="RAG-powered" />
              <Badge icon={<Database className="w-3 h-3" />} label="FAISS" />
            </div>

            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-red-500/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
          {messages.length === 0 ? (
            <EmptyState onSuggest={handleSend} hasDocuments={hasDocuments} />
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && <TypingIndicator />}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="px-4 sm:px-6 pb-5 pt-3 border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 flex-shrink-0">
          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
            placeholder={
              hasDocuments
                ? "Ask anything about your documents…"
                : "Upload a document first, then ask questions…"
            }
          />
          <p className="text-center text-[10px] text-gray-500 dark:text-gray-600 mt-2">
            Answers are grounded in your uploaded documents only. Sources cited for every response.
          </p>
        </div>
      </main>
    </div>
  );
}

function Badge({ icon, label }) {
  return (
    <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 bg-surface-100 dark:bg-surface-850 border border-surface-200 dark:border-surface-700 px-2 py-1 rounded-full">
      <span className="text-accent">{icon}</span>
      {label}
    </div>
  );
}

function EmptyState({ onSuggest, hasDocuments }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center px-4 py-12">
      {/* Logo */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-accent" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-surface-950 flex items-center justify-center">
          <span className="text-[8px] text-black font-bold">AI</span>
        </div>
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white">
          Ask your documents anything
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {hasDocuments
            ? "Your documents are indexed. Ask questions and get answers grounded in your content — with sources."
            : "Upload a PDF or TXT file using the panel on the left, then start asking questions."}
        </p>
      </div>

      {hasDocuments && (
        <div className="flex flex-col gap-2 w-full max-w-sm">
          <p className="text-xs text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wider">
            Try asking
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSuggest(s)}
                className="text-left text-xs text-gray-600 dark:text-gray-400 bg-surface-100 dark:bg-surface-850 border border-surface-200 dark:border-surface-700 hover:border-accent/40 hover:text-accent hover:bg-accent/5 rounded-xl px-3 py-2.5 transition-all duration-150"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!hasDocuments && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 bg-surface-100 dark:bg-surface-850 border border-surface-200 dark:border-surface-700 px-4 py-3 rounded-xl">
          <BookOpen className="w-4 h-4 text-accent flex-shrink-0" />
          <span>Upload a document in the sidebar to get started</span>
        </div>
      )}
    </div>
  );
}
