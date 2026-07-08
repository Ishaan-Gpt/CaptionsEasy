"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Project } from "@/services/types";
import { JobStatusResponse } from "@/services/jobs";

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
}) => {
  const router = useRouter();

  const getStatusText = () => {
    if (processingError) return "Processing Failed";
    if (project?.status === "PROCESSING") {
      if (jobStatus) {
        return `Processing: ${jobStatus.stage || "AI Captions"} (${Math.round((jobStatus.progress || 0) * 100)}%)`;
      }
      return "Processing Video...";
    }
    if (project?.status === "COMPLETED") return "Ready";
    if (project?.status === "UPLOADED") return "Uploaded (Processing...)";
    return project?.status || "Idle";
  };

  const statusClass = () => {
    if (processingError) return "text-red-400 bg-red-500/10 border-red-500/20";
    if (project?.status === "PROCESSING" || project?.status === "UPLOADED") {
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20 animate-pulse";
    }
    if (project?.status === "COMPLETED") return "text-[#00F5C4] bg-[#00F5C4]/10 border-[#00F5C4]/20";
    return "text-white/40 bg-white/5 border-white/10";
  };

  const undoDisabled = wordsHistoryRef.current.past.length === 0;
  const redoDisabled = wordsHistoryRef.current.future.length === 0;

  return (
    <header className="h-14 bg-[#111317] border-b border-[#23272F] px-6 flex items-center justify-between shrink-0 text-left">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="p-1.5 rounded-full bg-[#181B21] border border-[#23272F] hover:border-white/20 transition-colors cursor-pointer text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="text-left">
          <span className="text-[9px] text-white/40 uppercase tracking-widest font-bold">Project Workspace</span>
          <h1 className="text-xs font-primary font-black uppercase tracking-wider text-white -mt-0.5 max-w-[200px] truncate">
            {project?.title || "Loading Project..."}
          </h1>
        </div>
        <div className={`border rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-wider ${statusClass()}`}>
          {getStatusText()}
        </div>
        {processingError && (
          <button
            onClick={startProcessing}
            className="text-[8px] font-bold uppercase tracking-wider text-[#FFB800] hover:text-white bg-white/5 border border-[#23272F] px-2.5 py-1 rounded cursor-pointer"
          >
            Retry Process
          </button>
        )}
      </div>

      {/* Dynamic header widgets (Upload box & Status) */}
      <div className="flex items-center gap-4">
        {project?.status === "CREATED" && uploadProgress === null && (
          <div className="relative">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleUploadFile}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <button className="bg-[#FFB800] text-[#0A0B0D] font-primary font-black uppercase text-[9px] tracking-wider px-4 py-2 rounded-none transition-colors cursor-pointer shadow-sm hover:bg-[#E5A500]">
              Upload MP4 Clip
            </button>
          </div>
        )}
        {uploadProgress !== null && (
          <span className="text-[9px] uppercase font-bold text-[#FFB800] animate-pulse">
            UPLOADING: {uploadProgress}%
          </span>
        )}
        {project?.status === "PROCESSING" && (
          <span className="text-[9px] uppercase font-bold text-[#FFB800] animate-pulse">
            PIPELINE STAGE: {jobStatus?.stage || "TRANSCRIPTION"} ({jobStatus?.progress || 0}%)
          </span>
        )}

        <div className="h-4 w-[1px] bg-[#23272F]" />

        {/* Undo / Redo Tools */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={undoDisabled}
            className={`p-1.5 rounded bg-[#181B21] border border-[#23272F] transition-all flex items-center justify-center cursor-pointer ${
              undoDisabled ? "opacity-30 cursor-not-allowed" : "hover:border-[#FFB800] text-white"
            }`}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={redoDisabled}
            className={`p-1.5 rounded bg-[#181B21] border border-[#23272F] transition-all flex items-center justify-center cursor-pointer ${
              redoDisabled ? "opacity-30 cursor-not-allowed" : "hover:border-[#FFB800] text-white"
            }`}
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
