"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Project } from "@/services/types";
import { JobStatusResponse } from "@/services/jobs";

// ISO-639-1 codes Whisper (Groq speech provider) supports well — the
// language hint only steers transcription accuracy; captions still always
// render in Latin script regardless of what's picked here.
export const TRANSCRIPTION_LANGUAGES: { code: string; label: string }[] = [
  { code: "", label: "Auto-detect" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
  { code: "id", label: "Indonesian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
  { code: "it", label: "Italian" },
  { code: "vi", label: "Vietnamese" },
  { code: "bn", label: "Bengali" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "mr", label: "Marathi" },
  { code: "ur", label: "Urdu" },
];

interface WorkspaceHeaderProps {
  project: Project | null | undefined;
  processingError: string | null;
  jobStatus: JobStatusResponse | null;
  startProcessing: () => void;
  wordsHistoryRef: React.MutableRefObject<{ past: any[][]; future: any[][] }>;
  handleUndo: () => void;
  handleRedo: () => void;
  historyVersion: number;
  uploadProgress: number | null;
  handleUploadFile: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  projectLanguage: string;
  onLanguageChange: (v: string) => void;
  languageDirty: boolean;
  onRetranscribe: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  project,
  processingError,
  jobStatus,
  startProcessing,
  wordsHistoryRef,
  handleUndo,
  handleRedo,
  historyVersion,
  uploadProgress,
  handleUploadFile,
  projectLanguage,
  onLanguageChange,
  languageDirty,
  onRetranscribe,
}) => {
  const router = useRouter();

  const getStatusText = () => {
    if (processingError) return "Processing failed";
    if (project?.status === "PROCESSING") {
      if (jobStatus) {
        return `${jobStatus.stage || "Captioning"} · ${Math.round((jobStatus.progress || 0) * 100)}%`;
      }
      return "Processing…";
    }
    if (project?.status === "COMPLETED") return "Ready";
    if (project?.status === "UPLOADED") return "Queued";
    if (project?.status === "CREATED") return "Awaiting upload";
    return project?.status || "…";
  };

  const statusClass = () => {
    if (processingError) return "text-red-400 bg-red-500/10 border-red-500/25";
    if (project?.status === "PROCESSING" || project?.status === "UPLOADED") {
      return "text-sand-300 bg-sand-300/10 border-sand-300/25 animate-pulse";
    }
    if (project?.status === "COMPLETED") return "text-[#6FBF8F] bg-[#6FBF8F]/10 border-[#6FBF8F]/25";
    return "text-sand-400/80 bg-white/5 border-white/10";
  };

  const undoDisabled = wordsHistoryRef.current.past.length === 0;
  const redoDisabled = wordsHistoryRef.current.future.length === 0;

  return (
    <header className="h-14 bg-[#1E170D] border-b border-[#3B301C] px-4 sm:px-6 flex items-center justify-between shrink-0 text-left">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => router.push("/dashboard")}
          title="Back to projects"
          className="p-2 rounded-full text-sand-300 hover:bg-[#281F10] hover:text-sand-100 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="min-w-0">
          <span className="block font-mono text-[10px] text-sand-500">
            Captions<span className="italic">Easy</span> studio
          </span>
          <h1 className="font-sora text-[13px] font-bold text-sand-100 -mt-0.5 max-w-[220px] truncate">
            {project?.title || "Loading…"}
          </h1>
        </div>
        <div className={`border rounded-full px-3 py-1 font-sora text-[10px] font-semibold whitespace-nowrap ${statusClass()}`}>
          {getStatusText()}
        </div>
        {processingError && (
          <button
            onClick={startProcessing}
            className="font-sora text-[10px] font-semibold text-sand-300 hover:text-sand-100 bg-white/5 border border-[#3B301C] px-3 py-1 rounded-full transition-colors cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>

      {/* Upload / pipeline widgets */}
      <div className="flex items-center gap-4">
        {/* Global project language/script — steers transcription; captions
            still always render in Latin script regardless of this pick. */}
        <div className="flex items-center gap-2">
          <label className="font-mono text-[9px] uppercase tracking-wider text-sand-500 hidden lg:block">
            Language
          </label>
          <select
            value={projectLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            title="Transcription language — captions always render in Latin script"
            className="bg-[#281F10] border border-[#3B301C] text-[10px] rounded px-2 py-1.5 focus:outline-none focus:border-[#DCC8A4] cursor-pointer text-sand-100"
          >
            {TRANSCRIPTION_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          {languageDirty && (project?.status === "COMPLETED" || project?.status === "PROCESSING") && (
            <button
              onClick={onRetranscribe}
              disabled={project?.status === "PROCESSING"}
              className="font-sora text-[10px] font-semibold text-[#171208] bg-[#DCC8A4] hover:bg-[#C9AF83] disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-full transition-colors cursor-pointer whitespace-nowrap"
              title="Re-run transcription with the newly selected language"
            >
              Re-transcribe
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-[#3B301C]" />

        {project?.status === "CREATED" && uploadProgress === null && (
          <div className="relative">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleUploadFile}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <button className="bg-sand-300 text-sand-900 font-sora font-semibold text-[11px] px-5 py-2 rounded-full transition-colors cursor-pointer hover:bg-sand-400">
              Upload clip
            </button>
          </div>
        )}
        {uploadProgress !== null && (
          <span className="font-mono text-[11px] text-sand-300 animate-pulse">
            uploading {uploadProgress}%
          </span>
        )}
        {project?.status === "PROCESSING" && (
          <span className="font-mono text-[11px] text-sand-300 animate-pulse hidden sm:block">
            {jobStatus?.stage || "transcribing"} · {jobStatus?.progress || 0}%
          </span>
        )}

        <div className="h-4 w-px bg-[#3B301C]" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={undoDisabled}
            className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
              undoDisabled
                ? "opacity-30 cursor-not-allowed text-sand-400"
                : "text-sand-300 hover:bg-[#281F10] hover:text-sand-100"
            }`}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={redoDisabled}
            className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
              redoDisabled
                ? "opacity-30 cursor-not-allowed text-sand-400"
                : "text-sand-300 hover:bg-[#281F10] hover:text-sand-100"
            }`}
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
