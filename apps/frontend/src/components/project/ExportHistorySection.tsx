"use client";

import React, { useState } from "react";
import { Project } from "@/services/types";
import { projectsService } from "@/services/projects";
import { jobsService, JobStatusResponse } from "@/services/jobs";

interface ExportHistorySectionProps {
  projectId: string;
  project: Project | null | undefined;
  refetchProject: () => Promise<any>;
  exports: any[] | undefined;
  refetchExports: () => Promise<any>;
  activeExportId: string | null;
  setActiveExportId: (id: string | null) => void;
  customCaptionTemplate: string;
  
  // AI stage parameters
  jobStatus: JobStatusResponse | null;
  setJobStatus: (s: JobStatusResponse | null) => void;
  processingError: string | null;
  startProcessing: () => void;

  // Render state & methods
  isRendering: boolean;
  setIsRendering: (v: boolean) => void;
  renderJobStatus: JobStatusResponse | null;
  setRenderJobStatus: (s: JobStatusResponse | null) => void;
  renderError: string | null;
  setRenderError: (e: string | null) => void;
}

const AI_PIPELINE_STAGES = [
  { id: "speech", name: "Speech Transcription" },
  { id: "creative", name: "Creative Pacing Analysis" },
  { id: "caption", name: "Subtitle/Caption Planning" },
  { id: "render_planning", name: "Styling & Motion Script" },
];

const RENDER_PIPELINE_STAGES = [
  { id: "preparing", name: "Preparing Media" },
  { id: "generating ass", name: "Subtitle Generation" },
  { id: "rendering", name: "Burning Subtitles (GPU/FFmpeg)" },
  { id: "encoding", name: "Video Encoding" },
  { id: "uploading", name: "Uploading Output" },
];

export const ExportHistorySection: React.FC<ExportHistorySectionProps> = ({
  projectId,
  project,
  refetchProject,
  exports,
  refetchExports,
  activeExportId,
  setActiveExportId,
  customCaptionTemplate,
  jobStatus,
  setJobStatus,
  processingError,
  startProcessing,
  isRendering,
  setIsRendering,
  renderJobStatus,
  setRenderJobStatus,
  renderError,
  setRenderError,
}) => {
  const [isPipelineDropdownOpen, setIsPipelineDropdownOpen] = useState(true);

  const getAiStageState = (stageId: string) => {
    if (project?.status === "COMPLETED") return "completed";
    
    const activeStage = jobStatus?.stage || "";
    const isFailed = project?.status === "FAILED" || activeStage.toLowerCase() === "failed" || jobStatus?.error_message;
    const errMessage = jobStatus?.error_message || processingError || "";
    
    const stagesOrder = ["speech", "creative", "caption", "render_planning"];
    const checkIdx = stagesOrder.indexOf(stageId);
    
    let activeIdx = 0;
    const stageLower = activeStage.toLowerCase();
    if (stageLower.includes("speech") || stageLower.includes("transcript")) {
      activeIdx = 0;
    } else if (stageLower.includes("creative")) {
      activeIdx = 1;
    } else if (stageLower.includes("caption")) {
      activeIdx = 2;
    } else if (stageLower.includes("render_planning") || stageLower.includes("render_validation")) {
      activeIdx = 3;
    } else if (project?.status === "PROCESSING") {
      activeIdx = 0;
    } else if (project?.status === "UPLOADED") {
      return "pending";
    } else if (project?.status === "CREATED") {
      return "pending";
    }

    if (isFailed) {
      let failedIdx = activeIdx;
      if (errMessage.includes("SPEECH_RECOGNITION") || errMessage.includes("TRANSCRIPT")) {
        failedIdx = 0;
      } else if (errMessage.includes("CREATIVE")) {
        failedIdx = 1;
      } else if (errMessage.includes("CAPTION")) {
        failedIdx = 2;
      } else if (errMessage.includes("RENDER_PLANNING") || errMessage.includes("RENDER_VALIDATION")) {
        failedIdx = 3;
      }
      
      if (checkIdx === failedIdx) return "failed";
      if (checkIdx < failedIdx) return "completed";
      return "pending";
    }

    if (project?.status !== "PROCESSING") return "pending";

    if (checkIdx < activeIdx) return "completed";
    if (checkIdx === activeIdx) return "running";
    return "pending";
  };

  const getRenderStageState = (stageId: string) => {
    if (!isRendering && !renderJobStatus) return "pending";
    
    const activeStage = renderJobStatus?.stage || "";
    const stageLower = activeStage.toLowerCase();
    const isFailed = stageLower === "failed" || renderError;
    
    const stagesOrder = ["preparing", "generating ass", "rendering", "encoding", "uploading"];
    const checkIdx = stagesOrder.indexOf(stageId);
    
    let activeIdx = 0;
    if (stageLower.includes("preparing")) {
      activeIdx = 0;
    } else if (stageLower.includes("generating ass") || stageLower.includes("ass")) {
      activeIdx = 1;
    } else if (stageLower.includes("rendering")) {
      activeIdx = 2;
    } else if (stageLower.includes("encoding")) {
      activeIdx = 3;
    } else if (stageLower.includes("uploading")) {
      activeIdx = 4;
    } else if (stageLower === "completed" || renderJobStatus?.progress === 100) {
      return "completed";
    } else if (isRendering) {
      activeIdx = 0;
    }

    if (isFailed) {
      if (checkIdx === activeIdx) return "failed";
      if (checkIdx < activeIdx) return "completed";
      return "pending";
    }

    if (stageLower === "completed" || renderJobStatus?.progress === 100) return "completed";
    if (!isRendering) return "pending";

    if (checkIdx < activeIdx) return "completed";
    if (checkIdx === activeIdx) return "running";
    return "pending";
  };

  const startRendering = async () => {
    if (isRendering) return;
    setIsRendering(true);
    setRenderError(null);
    setRenderJobStatus(null);
    
    try {
      const { jobId } = await projectsService.startExport(projectId);
      await jobsService.pollJobStatus(jobId, {
        onUpdate: (status) => setRenderJobStatus(status),
      });
      
      const finalStatus = await jobsService.getJobStatus(jobId);
      if (finalStatus.stage.toLowerCase() === "completed" || finalStatus.progress === 100) {
        const freshExports = await refetchExports();
        const exportsList = freshExports || [];
        const latestCompleted = exportsList
          .filter((e: any) => e.status === "completed" && e.download_url)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        if (latestCompleted) {
          setActiveExportId(latestCompleted.id);
        }
      } else {
        setRenderError(`Rendering failed: ${finalStatus.stage}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setRenderError(err.message);
      } else {
        setRenderError("Something went wrong during video rendering.");
      }
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <section className="w-72 bg-[#1E170D] border-l border-[#3B301C] p-4 flex flex-col justify-between shrink-0 overflow-y-auto shadow-sm text-left">
      <div className="space-y-6">
        <div className="pb-2 border-b border-[#3B301C]">
          <span className="text-[9px] font-bold text-white uppercase tracking-widest">Export Config</span>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between text-[10px] uppercase font-bold text-white border-b border-[#3B301C] pb-2">
            <span>Output Format</span>
            <span className="text-white">MP4 (H.264)</span>
          </div>
          <div className="flex justify-between text-[10px] uppercase font-bold text-white border-b border-[#3B301C] pb-2">
            <span>Target Resolution</span>
            <span className="text-white">1080x1920 (Vertical)</span>
          </div>
          <div className="flex justify-between text-[10px] uppercase font-bold text-white border-b border-[#3B301C] pb-2">
            <span>Layout Applied</span>
            <span className="text-[#6FBF8F] font-mono">{customCaptionTemplate}</span>
          </div>
        </div>

        {/* STEP 1 — RUN PIPELINE (once per video). After it completes, every
            template previews live and is freely switchable; no re-run needed. */}
        <div className="space-y-3 pt-2">
          {project?.status === "COMPLETED" ? (
            <div className="p-3 bg-[#281F10] border border-[#6FBF8F]/30 space-y-1">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                <span className="text-[#6FBF8F]">✓ Pipeline complete</span>
                <button
                  onClick={startProcessing}
                  title="Re-transcribe and re-plan this video from scratch"
                  className="text-white/40 hover:text-white text-[8px] uppercase tracking-wider cursor-pointer"
                >
                  Re-run
                </button>
              </div>
              <p className="text-[8px] text-white/50 leading-relaxed">
                All templates are live in the preview — switch and style freely,
                then export the one you like.
              </p>
            </div>
          ) : project?.status === "PROCESSING" ? (
            <div className="space-y-2 p-3 bg-[#281F10] border border-[#3B301C]">
              <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-white">
                <span>Running pipeline… {jobStatus?.stage || "starting"}</span>
                <span className="text-[#DCC8A4]">{Math.round((jobStatus?.progress || 0) * (jobStatus && jobStatus.progress <= 1 ? 100 : 1))}%</span>
              </div>
              <div className="w-full bg-[#3B301C] h-1">
                <div
                  className="bg-[#DCC8A4] h-1 transition-all"
                  style={{ width: `${Math.min(100, (jobStatus?.progress || 0) * (jobStatus && jobStatus.progress <= 1 ? 100 : 1))}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={startProcessing}
              disabled={project?.status === "CREATED"}
              title={project?.status === "CREATED" ? "Upload a clip first" : "Transcribe and plan captions for this video"}
              className={`w-full font-sora font-black uppercase text-[10px] tracking-wider py-3.5 transition-all text-center shadow-sm ${
                project?.status === "CREATED"
                  ? "bg-[#3B301C] text-white/30 cursor-not-allowed border border-[#1E170D]"
                  : "bg-[#DCC8A4] text-[#171208] hover:bg-[#C9AF83] cursor-pointer"
              }`}
            >
              {project?.status === "FAILED" ? "Retry Pipeline" : project?.status === "CREATED" ? "Upload a clip first" : "Run Pipeline"}
            </button>
          )}

          {/* STEP 2 — EXPORT the currently-styled look as an MP4 download. */}
          {isRendering ? (
            <div className="space-y-2 p-3 bg-[#281F10] border border-[#3B301C]">
              <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-white">
                <span>Exporting MP4…</span>
                <span className="text-[#6FBF8F]">{renderJobStatus?.progress || 0}%</span>
              </div>
              <div className="w-full bg-[#3B301C] h-1">
                <div
                  className="bg-[#6FBF8F] h-1 transition-all"
                  style={{ width: `${renderJobStatus?.progress || 0}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={startRendering}
              disabled={project?.status !== "COMPLETED"}
              title={project?.status !== "COMPLETED" ? "Run the pipeline first" : "Render the current template + styling into a downloadable MP4"}
              className={`w-full font-sora font-black uppercase text-[10px] tracking-wider py-3 transition-all text-center ${
                project?.status === "COMPLETED"
                  ? "bg-[#171208] text-[#DCC8A4] border border-[#DCC8A4] hover:bg-[#DCC8A4] hover:text-[#171208] cursor-pointer"
                  : "bg-[#3B301C] text-white/30 cursor-not-allowed border border-[#1E170D]"
              }`}
            >
              Export MP4
            </button>
          )}
        </div>

        {/* COLLAPSIBLE PIPELINE DETAILS ACCORDION */}
        <div className="border border-[#3B301C] bg-[#281F10]/50 rounded-none overflow-hidden">
          <button
            onClick={() => setIsPipelineDropdownOpen(!isPipelineDropdownOpen)}
            className="w-full px-3 py-2.5 flex justify-between items-center bg-[#281F10] border-b border-[#3B301C] text-[9px] font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#2C2314] transition-all"
          >
            <span>Pipeline Activity</span>
            <span className="text-white/60 text-[10px]">
              {isPipelineDropdownOpen ? "▲" : "▼"}
            </span>
          </button>
          
          {isPipelineDropdownOpen && (
            <div className="p-3 space-y-4">
              {/* AI PIPELINE STAGES SECTION */}
              <div className="space-y-2">
                <div className="text-[8px] font-bold uppercase text-white/50 tracking-wider">
                  AI Analysis Stages
                </div>
                <div className="space-y-1.5 pl-1">
                  {AI_PIPELINE_STAGES.map((stage) => {
                    const state = getAiStageState(stage.id);
                    return (
                      <div key={stage.id} className="flex items-center justify-between text-[9px]">
                        <span className={`font-medium ${
                          state === "completed" ? "text-white/80" : 
                          state === "running" ? "text-[#DCC8A4] font-bold animate-pulse" : 
                          state === "failed" ? "text-red-400 font-bold" : 
                          "text-white/30"
                        }`}>
                          {stage.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {state === "completed" && (
                            <span className="text-[#6FBF8F] font-bold">✓</span>
                          )}
                          {state === "running" && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DCC8A4] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DCC8A4]"></span>
                            </span>
                          )}
                          {state === "failed" && (
                            <span className="text-red-500 font-bold">✗</span>
                          )}
                          {state === "pending" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white/10"></span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RENDER PIPELINE STAGES SECTION */}
              {(isRendering || renderJobStatus || (exports || []).length > 0) && (
                <div className="space-y-2 pt-2 border-t border-[#3B301C]/50">
                  <div className="text-[8px] font-bold uppercase text-white/50 tracking-wider">
                    Render Pipeline Stages
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {RENDER_PIPELINE_STAGES.map((stage) => {
                      const state = getRenderStageState(stage.id);
                      return (
                        <div key={stage.id} className="flex items-center justify-between text-[9px]">
                          <span className={`font-medium ${
                            state === "completed" ? "text-white/80" : 
                            state === "running" ? "text-[#6FBF8F] font-bold animate-pulse" : 
                            state === "failed" ? "text-red-400 font-bold" : 
                            "text-white/30"
                          }`}>
                            {stage.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {state === "completed" && (
                              <span className="text-[#6FBF8F] font-bold">✓</span>
                            )}
                            {state === "running" && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6FBF8F] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6FBF8F]"></span>
                              </span>
                            )}
                            {state === "failed" && (
                              <span className="text-red-500 font-bold">✗</span>
                            )}
                            {state === "pending" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white/10"></span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FAILED JOB/PROCESSING ALERTS */}
              {project?.status === "FAILED" && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-bold p-2.5 space-y-1.5 text-left">
                  <div className="uppercase tracking-wider">AI Pipeline Failed</div>
                  <div className="font-mono text-[7px] leading-relaxed break-words opacity-80">
                    {jobStatus?.error_message || processingError || "Unknown processing error"}
                  </div>
                  <button
                    onClick={startProcessing}
                    className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 font-sora font-black uppercase text-[7px] tracking-wider py-1 border border-red-500/30 cursor-pointer text-center transition-colors"
                  >
                    Retry AI Processing
                  </button>
                </div>
              )}

              {/* RENDERING ERROR ALERTS */}
              {renderError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-bold p-2.5 space-y-1 text-left">
                  <div className="uppercase tracking-wider">Rendering Failed</div>
                  <div className="font-mono text-[7px] leading-relaxed break-words opacity-80">
                    {renderError}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-[#3B301C]">
        <span className="block text-[9px] font-bold text-white uppercase tracking-widest">Render History</span>
        
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
          {(exports || []).length === 0 ? (
            <span className="block text-[8px] font-bold uppercase text-white italic">No exports generated.</span>
          ) : (
            (exports || []).map((exp, idx) => (
              <div key={idx} className="bg-[#281F10] border border-[#3B301C] p-2.5 flex flex-col justify-between gap-2 text-left shadow-sm">
                <div className="flex justify-between items-center text-[7px] font-mono text-white uppercase">
                  <span>EXPORT #{idx + 1}</span>
                  <span className={exp.status === "completed" ? "text-[#6FBF8F]" : "text-yellow-500"}>
                    {exp.status}
                  </span>
                </div>
                {exp.status === "completed" && exp.download_url && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setActiveExportId(exp.id)}
                      className={`text-[9px] font-bold uppercase tracking-wider transition-colors text-center flex-1 py-1 border block cursor-pointer ${
                        activeExportId === exp.id
                          ? "text-[#171208] bg-[#DCC8A4] border-[#DCC8A4]"
                          : "text-white/80 bg-[#171208] border-[#3B301C] hover:text-white"
                      }`}
                    >
                      {activeExportId === exp.id ? "Now Previewing" : "Preview"}
                    </button>
                    <a
                      href={exp.download_url}
                      download
                      className="text-[9px] font-bold uppercase tracking-wider text-[#6FBF8F] hover:text-[#5FA97C] transition-colors text-center flex-1 py-1 bg-[#171208] border border-[#3B301C] block"
                    >
                      Download
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
