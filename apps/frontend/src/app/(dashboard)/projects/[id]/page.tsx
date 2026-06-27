"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  UploadCloud,
  Download,
  AlertTriangle,
  FileVideo,
  Sparkles,
  Play,
  Check,
} from "lucide-react";
import { projectsService } from "@/services/projects";
import { jobsService, JobStatusResponse } from "@/services/jobs";
import { uploadService, UploadValidationError } from "@/services/upload";
import { transcriptService, TranscriptResponse } from "@/services/transcript";
import { motionScriptService } from "@/services/motionScript";
import { ApiError, NetworkUnavailableError } from "@/services/api-client";
import { Project } from "@/services/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Timeline, { TimelineStage } from "@/components/ui/Timeline";
import Spinner from "@/components/ui/Spinner";

function describeError(err: unknown): string {
  if (err instanceof NetworkUnavailableError) return err.message;
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

const STYLE_PRESETS = [
  { id: "minimal", name: "Minimal", desc: "Clean typography, light outline", font: "Inter", color: "White" },
  { id: "modern", name: "Modern", desc: "Outfit font with yellow highlights", font: "Outfit", color: "Yellow" },
  { id: "podcast", name: "Podcast", desc: "Bold slides, word-by-word green active", font: "Inter", color: "Green" },
  { id: "documentary", name: "Documentary", desc: "Elegant serif with subtle fade", font: "Cinzel", color: "Beige" },
  { id: "viral shorts", name: "Viral Shorts", desc: "Ultra bold uppercase with emojis", font: "Outfit", color: "Gold" },
  { id: "educational", name: "Educational", desc: "Rounded sans-serif bounce layouts", font: "Outfit", color: "Pink" },
  { id: "luxury", name: "Luxury", desc: "Bodoni elegance with gold coloring", font: "Cinzel", color: "Gold" },
];


export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadAbortRef = useRef<(() => void) | null>(null);

  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const pollAbortRef = useRef<AbortController | null>(null);
  const processingStartedRef = useRef(false);

  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
    error: projectError,
    refetch: refetchProject,
  } = useQuery<Project | null>({
    queryKey: ["project", projectId],
    queryFn: () => projectsService.getProjectById(projectId),
  });

  const startProcessing = async () => {
    if (processingStartedRef.current) return;
    processingStartedRef.current = true;
    setProcessingError(null);

    const controller = new AbortController();
    pollAbortRef.current = controller;

    try {
      await projectsService.updateProjectStatus(projectId, "PROCESSING");
      await refetchProject();

      const { jobId } = await projectsService.startProcessing(projectId);
      await jobsService.pollJobStatus(jobId, {
        onUpdate: (status) => setJobStatus(status),
        signal: controller.signal,
      });

      const finalStatus = await jobsService.getJobStatus(jobId);
      if (finalStatus.stage.toLowerCase() === "completed") {
        await projectsService.updateProjectStatus(projectId, "COMPLETED");
      } else {
        await projectsService.updateProjectStatus(projectId, "FAILED");
        setProcessingError(`Processing ${finalStatus.stage}.`);
      }
      await refetchProject();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setProcessingError(describeError(err));
    } finally {
      processingStartedRef.current = false;
      pollAbortRef.current = null;
    }
  };

  useEffect(() => {
    if (project?.status === "PROCESSING" && !processingStartedRef.current && !jobStatus) {
      startProcessing();
    }
  }, [project?.status]);

  const {
    data: transcript,
    isLoading: isTranscriptLoading,
    isError: isTranscriptError,
    error: transcriptQueryError,
  } = useQuery<TranscriptResponse | null>({
    queryKey: ["transcript", projectId],
    queryFn: () => transcriptService.getTranscript(projectId),
    enabled: project?.status === "COMPLETED",
  });

  const {
    data: motionScript,
    isLoading: isMotionScriptLoading,
    isError: isMotionScriptError,
    error: motionScriptQueryError,
    refetch: refetchMotionScript,
  } = useQuery<any | null>({
    queryKey: ["motionScript", projectId],
    queryFn: () => motionScriptService.getMotionScript(projectId),
    enabled: project?.status === "COMPLETED",
  });

  const {
    data: exports,
    refetch: refetchExports,
  } = useQuery<any[]>({
    queryKey: ["exports", projectId],
    queryFn: () => projectsService.getExports(projectId),
    enabled: project?.status === "COMPLETED",
  });

  const [selectedStyle, setSelectedStyle] = useState<string>("minimal");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    if (project?.style) {
      setSelectedStyle(project.style);
    }
  }, [project?.style]);

  const handleStyleSelect = async (styleId: string) => {
    setSelectedStyle(styleId);
    setScriptError(null);
    setIsGeneratingScript(true);
    try {
      await projectsService.updateProjectStyle(projectId, styleId);
      await projectsService.generateMotionScript(projectId);
      await refetchMotionScript();
      await refetchProject();
    } catch (err) {
      setScriptError(describeError(err));
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const [renderJobStatus, setRenderJobStatus] = useState<JobStatusResponse | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [devMode, setDevMode] = useState(false);

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
        await refetchExports();
      } else {
        setRenderError(`Rendering failed at stage: ${finalStatus.stage}`);
      }
    } catch (err) {
      setRenderError(describeError(err));
    } finally {
      setIsRendering(false);
    }
  };

  useEffect(() => {
    return () => {
      pollAbortRef.current?.abort();
    };
  }, []);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    setUploadError(null);
    try {
      await uploadService.uploadVideo(
        projectId,
        file,
        (progress) => setUploadProgress(progress),
        (abort) => {
          uploadAbortRef.current = abort;
        }
      );
      uploadAbortRef.current = null;
      setUploadProgress(null);

      await projectsService.updateProjectStatus(projectId, "UPLOADED");
      await refetchProject();
      processingStartedRef.current = false;
      setJobStatus(null);
      startProcessing();
    } catch (err) {
      uploadAbortRef.current = null;
      setUploadProgress(null);
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof UploadValidationError) {
        setUploadError(err.message);
      } else {
        setUploadError(describeError(err));
      }
    }
  };

  const handleCancelProcessing = () => {
    pollAbortRef.current?.abort();
    processingStartedRef.current = false;
    setJobStatus(null);
    setProcessingError(null);
    projectsService.updateProjectStatus(projectId, "CREATED").then(() => refetchProject());
  };

  const getTimelineStages = (): TimelineStage[] => {
    const currentStage = jobStatus?.stage;
    const stages = [{ id: "speech", name: "Speech Analysis", description: "Transcribing verbal dialogue to text" }];

    let currentFoundIndex = stages.findIndex((s) => s.name === currentStage);
    if (currentStage?.toLowerCase() === "completed") {
      currentFoundIndex = stages.length;
    }

    return stages.map((s, idx) => {
      let status: TimelineStage["status"] = "idle";
      if (currentStage?.toLowerCase() === "failed" && idx === currentFoundIndex) {
        status = "failed";
      } else if (idx < currentFoundIndex) {
        status = "completed";
      } else if (idx === currentFoundIndex) {
        status = "processing";
      } else if (jobStatus) {
        status = "queued";
      }
      return { ...s, status };
    });
  };

  if (isProjectLoading) {
    return (
      <div className="h-[60vh] w-full flex flex-col items-center justify-center gap-3">
        <Spinner className="w-8 h-8 text-indigo-500" />
        <p className="text-sm text-zinc-400 font-medium">Retrieving workspace metadata...</p>
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="h-[60vh] w-full flex flex-col items-center justify-center text-center max-w-md mx-auto gap-4">
        <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-200">Project Not Found</h3>
          <p className="text-xs text-zinc-500 mt-1">
            {projectError ? describeError(projectError) : "The workspace project does not exist or has been deleted."}
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push("/dashboard")} className="gap-2">
          <ArrowLeft size={14} />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 border border-zinc-800/80 bg-zinc-900/30 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-100">{project.title}</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider rounded-md px-1.5 py-0.5 border bg-zinc-900 border-zinc-800 text-zinc-400">
                {project.status.toLowerCase()}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-0.5">ID: {project.id}</p>
          </div>
        </div>
      </div>

      {/* 1. UPLOAD VIEW (CREATED) */}
      {project.status === "CREATED" && (
        <Card className="max-w-2xl mx-auto border-dashed border-zinc-800/80 bg-zinc-900/10 p-12 text-center relative overflow-hidden">
          {uploadProgress !== null ? (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-400 animate-pulse">
                <UploadCloud size={24} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-zinc-200">Uploading Video File...</h4>
                <p className="text-xs text-zinc-500">Do not close this tab. Processing will trigger immediately after.</p>
              </div>
              <div className="max-w-xs mx-auto space-y-1">
                <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-550">
                  <span>{uploadProgress}%</span>
                  <span>500 MB max</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  uploadAbortRef.current?.();
                  uploadAbortRef.current = null;
                  setUploadProgress(null);
                }}
                className="text-red-400 hover:bg-red-500/5"
              >
                Cancel Upload
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-550 mx-auto">
                <UploadCloud size={30} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-200">Upload your talking-head clip</h3>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
                  Drag and drop your file here, or click to choose from system files. Support for MP4, MOV, and WEBM (max 500 MB).
                </p>
              </div>

              {uploadError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs font-medium max-w-sm mx-auto">
                  {uploadError}
                </div>
              )}

              <div className="relative inline-block">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleUploadFile}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Button variant="secondary" className="pointer-events-none">
                  Select Video File
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 2. PROCESSING VIEW (PROCESSING / UPLOADED / FAILED) */}
      {(project.status === "PROCESSING" || project.status === "UPLOADED" || project.status === "FAILED") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-zinc-900 space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">Speech Recognition</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Polling the backend job for live progress</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelProcessing}
                className="text-red-400 hover:bg-red-500/5 cursor-pointer"
              >
                Cancel Pipeline
              </Button>
            </div>

            {processingError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs font-medium">
                {processingError}
              </div>
            )}

            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-900 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-300">{jobStatus?.stage || "Queue check"}</span>
                <span className="font-bold text-indigo-400">{jobStatus?.progress ?? 0}%</span>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${jobStatus?.progress ?? 0}%` }}
                />
              </div>
            </div>
          </Card>

          <Card className="border-zinc-900 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pipeline Flow</h3>
            <Timeline stages={getTimelineStages()} />
          </Card>
        </div>
      )}

      {/* 3. WORKSPACE EDITOR VIEW (COMPLETED) */}
      {project.status === "COMPLETED" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: PLAYER & STYLE SELECTOR */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-0 overflow-hidden border-zinc-900 bg-zinc-950 relative aspect-[9/16] max-w-sm mx-auto flex flex-col justify-center items-center shadow-2xl rounded-xl">
              {exports && exports.filter((e: any) => e.status === "completed").length > 0 ? (
                <video 
                  src={exports.filter((e: any) => e.status === "completed")[0].download_url} 
                  controls 
                  className="w-full h-full object-contain"
                  poster={project.thumbnail_url || undefined}
                />
              ) : (
                <div className="p-6 text-center space-y-4">
                  <FileVideo size={48} className="text-zinc-800 mx-auto animate-pulse" />
                  <div>
                    <span className="text-xs text-zinc-400 font-semibold tracking-wide uppercase block">No Export Rendered Yet</span>
                    <span className="text-[10px] text-zinc-500 block mt-1">Choose a style below and click "Render Video" to burn captions.</span>
                  </div>
                </div>
              )}
            </Card>

            {/* STYLE SELECTOR */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-300 tracking-wide uppercase">Cinematic Styles</h3>
                <p className="text-[11px] text-zinc-550 mt-0.5">Select a reusable style template to generate your layout rules</p>
              </div>

              {isGeneratingScript && (
                <div className="flex items-center gap-2 text-xs text-zinc-450 bg-indigo-500/10 border border-indigo-500/25 rounded-lg p-3">
                  <Spinner className="w-4 h-4 text-indigo-400" />
                  <span>Applying style rules and compiling MotionScript intermediate representation...</span>
                </div>
              )}

              {scriptError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs font-medium">
                  {scriptError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {STYLE_PRESETS.map((preset) => {
                  const isActive = selectedStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleStyleSelect(preset.id)}
                      disabled={isGeneratingScript || isRendering}
                      className={`text-left p-4 rounded-xl border transition-all duration-250 flex flex-col justify-between h-32 relative overflow-hidden ${
                        isActive 
                          ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.15)]" 
                          : "border-zinc-900 bg-zinc-950/40 hover:border-zinc-800"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5">
                          <Check size={10} />
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold text-zinc-200 block">{preset.name}</span>
                        <span className="text-[10px] text-zinc-500 mt-1 block leading-normal">{preset.desc}</span>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[9px] text-zinc-600 font-mono tracking-tight">{preset.font}</span>
                        <span 
                          className="w-3 h-3 rounded-full border border-zinc-900 shadow-inner"
                          style={{
                            backgroundColor: 
                              preset.color === "Yellow" ? "#FFFF00" :
                              preset.color === "Green" ? "#00FF00" :
                              preset.color === "Beige" ? "#F5F5DC" :
                              preset.color === "Gold" ? "#D4AF37" :
                              preset.color === "Pink" ? "#FF4081" : "#FFFFFF"
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ACTION CONTROLS & EXPORT HISTORY */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-zinc-900 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Export Asset</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Start video rendering with the active StylePreset</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Resolution</span>
                  <span className="font-semibold text-zinc-300">1080p (Full HD)</span>
                </div>
                <div className="flex justify-between text-xs border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Style applied</span>
                  <span className="font-semibold text-zinc-300 capitalize">{selectedStyle}</span>
                </div>
              </div>

              {isRendering ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-zinc-400">
                    <span>Status: {renderJobStatus?.stage || "Preparing"}</span>
                    <span>{renderJobStatus?.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-1.5 transition-all duration-350" 
                      style={{ width: `${renderJobStatus?.progress || 0}%` }}
                    />
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={startRendering} 
                  disabled={isGeneratingScript}
                  className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  <Download size={14} />
                  Render Video
                </Button>
              )}

              {renderError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs font-medium">
                  {renderError}
                </div>
              )}
            </Card>

            {/* EXPORT HISTORY */}
            <Card className="border-zinc-900 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Export History</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">cinematic rendering logs & assets</p>
              </div>

              {exports && exports.length > 0 ? (
                <div className="space-y-3">
                  {exports.map((exp: any) => {
                    const formattedSize = exp.file_size ? `${(exp.file_size / (1024 * 1024)).toFixed(2)} MB` : "N/A";
                    const formattedDur = exp.duration_ms ? `${(exp.duration_ms / 1000).toFixed(1)}s` : "N/A";
                    const formattedRender = exp.render_time_ms ? `${(exp.render_time_ms / 1000).toFixed(1)}s` : "N/A";
                    const dateStr = exp.created_at ? new Date(exp.created_at).toLocaleDateString() : "Recent";
                    
                    return (
                      <div key={exp.id} className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-900 space-y-2 text-xs flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-zinc-200 capitalize">{exp.style} Preset</span>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">{dateStr} &middot; {exp.resolution}</span>
                          </div>
                          <a 
                            href={exp.download_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 p-1.5 rounded-lg border border-zinc-800 transition"
                            title="Re-download MP4"
                          >
                            <Download size={12} />
                          </a>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900 text-[10px] text-zinc-500">
                          <div>
                            <span className="block text-zinc-600">Duration</span>
                            <span className="font-semibold">{formattedDur}</span>
                          </div>
                          <div>
                            <span className="block text-zinc-600">File Size</span>
                            <span className="font-semibold">{formattedSize}</span>
                          </div>
                          <div>
                            <span className="block text-zinc-600">Render Time</span>
                            <span className="font-semibold">{formattedRender}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">No assets have been rendered yet.</p>
              )}
            </Card>

            <Card className="border-zinc-900 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">MotionScript JSON</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Deterministic rendering instructions</p>
                </div>
                <Button 
                  onClick={() => setDevMode(!devMode)} 
                  variant="secondary" 
                  className="text-[10px] px-2 py-1 h-auto"
                >
                  {devMode ? "Hide Dev Mode" : "Show Dev Mode"}
                </Button>
              </div>

              {devMode && (
                <>
                  {isMotionScriptLoading ? (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Spinner className="w-4 h-4" />
                      Loading MotionScript...
                    </div>
                  ) : isMotionScriptError ? (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs font-medium">
                      {describeError(motionScriptQueryError)}
                    </div>
                  ) : !motionScript ? (
                    <p className="text-xs text-zinc-500 italic">No MotionScript generated yet.</p>
                  ) : (
                    <pre className="text-[10px] text-zinc-400 bg-zinc-950 p-3 rounded-lg overflow-auto max-h-60 font-mono leading-normal border border-zinc-900">
                      {JSON.stringify(motionScript, null, 2)}
                    </pre>
                  )}
                </>
              )}
            </Card>

            <Card className="border-zinc-900 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Transcript</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Speech-recognition output</p>
              </div>

              {isTranscriptLoading ? (
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Spinner className="w-4 h-4" />
                  Loading transcript...
                </div>
              ) : isTranscriptError ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs font-medium">
                  {describeError(transcriptQueryError)}
                </div>
              ) : !transcript ? (
                <p className="text-xs text-zinc-500 italic">No transcript has been generated for this project yet.</p>
              ) : (
                <div className="text-xs text-zinc-300 leading-relaxed max-h-64 overflow-y-auto space-y-1">
                  <p>{transcript.transcript.words.map((w) => w.text).join(" ")}</p>
                  <p className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-900">
                    Language: {transcript.transcript.language} &middot; Provider: {transcript.provider}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
