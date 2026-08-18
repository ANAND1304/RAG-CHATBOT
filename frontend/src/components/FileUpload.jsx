import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, File, CheckCircle, AlertCircle, Loader2, Trash2, Database } from "lucide-react";
import { useDocuments } from "../hooks/useDocuments";
import clsx from "clsx";

export default function FileUpload({ onUploadSuccess }) {
  const { documents, status, uploading, uploadProgress, error, upload, clear } = useDocuments();
  const [uploadResult, setUploadResult] = useState(null);
  const [successFile, setSuccessFile] = useState(null);

  const onDrop = useCallback(
    async (accepted) => {
      if (!accepted.length) return;
      const file = accepted[0];
      setSuccessFile(null);
      setUploadResult(null);
      try {
        const result = await upload(file);
        setSuccessFile(file.name);
        setUploadResult(result.stats);
        onUploadSuccess?.();
      } catch (_) {}
    },
    [upload, onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"], "text/markdown": [".md"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          "relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-200",
          "flex flex-col items-center gap-3 text-center",
          isDragActive
            ? "border-accent bg-accent/10"
            : "border-surface-200 dark:border-surface-800 hover:border-accent/60 hover:bg-surface-50 dark:hover:bg-surface-850",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <>
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <p className="text-sm font-medium text-surface-800 dark:text-gray-200">
              Indexing document... {uploadProgress}%
            </p>
            <div className="w-full bg-surface-200 dark:bg-surface-800 rounded-full h-1.5">
              <div
                className="bg-accent h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {isDragActive ? "Drop to upload" : "Drop a document or click"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">PDF, TXT, MD — up to 50 MB</p>
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success stats */}
      {uploadResult && successFile && (
        <div className="animate-fade-in bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs mb-1">
            <CheckCircle className="w-4 h-4" />
            <span>Indexed: {successFile}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
            <Stat label="Pages" value={uploadResult.pages} />
            <Stat label="Chunks" value={uploadResult.chunks} />
            <Stat label="Vectors" value={uploadResult.total_indexed_vectors} />
          </div>
        </div>
      )}

      {/* KB Status */}
      {status?.has_index && (
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-surface-100 dark:bg-surface-850 rounded-lg px-3 py-2">
          <Database className="w-3.5 h-3.5 text-accent" />
          <span className="font-mono">{status.total_vectors} vectors indexed</span>
          <span className="mx-1">·</span>
          <span>{status.document_count} doc{status.document_count !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="flex flex-col gap-1">
          {documents.map((doc) => (
            <div
              key={doc.name}
              className="flex items-center gap-2 text-xs text-gray-400 px-2 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-850 group"
            >
              {doc.type === "PDF" ? (
                <File className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              )}
              <span className="truncate flex-1 font-mono">{doc.name}</span>
              <span className="text-gray-500">{doc.size_kb} KB</span>
            </div>
          ))}
          <button
            onClick={clear}
            className="mt-1 flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all documents
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-emerald-400 font-mono font-bold">{value}</div>
      <div className="text-gray-500">{label}</div>
    </div>
  );
}
