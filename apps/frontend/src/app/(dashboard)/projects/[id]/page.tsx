"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  UploadCloud,
  Loader2,
  Video,
  Play,
  Pause,
  Download,
  AlertTriangle,
  FileVideo,
  ListRestart,
  Sparkles
} from "lucide-react";
import { projectsService } from "@/services/projects";
import { jobsService, LogEntry } from "@/services/jobs";
import { uploadService, UploadValidationError } from "@/services/upload";
import { Project, ProjectStatus, Job } from "@/services/types";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Timeline, { TimelineStage } from "@/components/ui/Timeline";
import Spinner from "@/components/ui/Spinner";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  // Local states
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [jobLogs, setJobLogs] = useState<LogEntry[]>([]);
  const uploadAbortRef = useRef<(() => void) | null>(null);
  
  // Preview configuration states
  const [selectedStyle, setSelectedStyle] = useState<"formal" | "sarcastic" | "tech" | "non-tech">("tech");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const playbackInterval = useRef<NodeJS.Timeout | null>(null);

  // Export overlay
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

  // Fetch project
  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
    refetch: refetchProject
  } = useQuery<Project | null>({
    queryKey: ["project", projectId],
    queryFn: () => projectsService.getProjectById(projectId)
  });

  // Watch status changes to trigger processing simulation automatically
  useEffect(() => {
    if (project?.status === "PROCESSING" && !activeJob) {
      triggerProcessing();
    }
  }, [project?.status]);

  // Handle mock playback timer
  useEffect(() => {
    if (isPlaying) {
      playbackInterval.current = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= 6.5) {
            return 0; // Loop mock video (6.5 seconds long)
          }
          return Number((prev + 0.1).toFixed(1));
        });
      }, 100);
    } else {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    }
    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [isPlaying]);

  // Mock Caption lists for playback sync based on selectedStyle
  const captionsData = {
    formal: [
      { text: "Good morning professionals.", start: 0, end: 1.5 },
      { text: "Today we present the quarterly results.", start: 1.6, end: 3.5 },
      { text: "Note the structured growth metrics.", start: 3.6, end: 5.2 },
      { text: "Let us review our scaling strategy.", start: 5.3, end: 6.5 }
    ],
    sarcastic: [
      { text: "Oh look... another meeting that could have been an email.", start: 0, end: 2.2 },
      { text: "Groundbreaking updates incoming.", start: 2.3, end: 4.2 },
      { text: "Please try to contain your absolute excitement.", start: 4.3, end: 6.5 }
    ],
    tech: [
      { text: "Check out this INSANE new developer setup! ⚡", start: 0, end: 2.0 },
      { text: "We replaced our codebase with autonomous AI agents.", start: 2.1, end: 4.5 },
      { text: "Now we just sit back and watch it deploy. 💻", start: 4.6, end: 6.5 }
    ],
    "non-tech": [
      { text: "So, I decided to bake a cake today... 🎂", start: 0, end: 2.0 },
      { text: "It went from zero to volcanic explosion real quick.", start: 2.1, end: 4.8 },
      { text: "Follow along for more kitchen disasters! 😂", start: 4.9, end: 6.5 }
    ]
  };

  const getActiveCaption = () => {
    const list = captionsData[selectedStyle];
    const match = list.find((c) => playbackTime >= c.start && playbackTime <= c.end);
    return match ? match.text : "";
  };

  // Upload handler — real backend call (replaces the mocked progress timer).
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    try {
      const result = await uploadService.uploadVideo(
        projectId,
        file,
        (progress) => setUploadProgress(progress),
        (abort) => {
          uploadAbortRef.current = abort;
        }
      );
      uploadAbortRef.current = null;
      setUploadProgress(null);
      // AI processing is not triggered yet — Job `result.jobId` is the
      // metadata-extraction job created by the backend, queued and not
      // started. The existing mock pipeline simulation continues to drive
      // the processing UI until the real AI pipeline (contracts/ai.md) is
      // wired up in a later sprint.
      void result.jobId;
      await refetchProject();
      triggerProcessing();
    } catch (err) {
      uploadAbortRef.current = null;
      setUploadProgress(null);
      if (err instanceof UploadValidationError) {
        alert(err.message);
      } else if (!(err instanceof DOMException && err.name === "AbortError")) {
        alert(err instanceof Error ? err.message : "Upload failed. Please try again.");
      }
    }
  };

  // Processing triggers
  const triggerProcessing = () => {
    setJobLogs([]);
    jobsService.startProcessing(
      projectId,
      (job, logs) => {
        setActiveJob(job);
        setJobLogs(logs);
      },
      () => {
        setActiveJob(null);
        refetchProject();
      }
    );
  };

  const handleCancelProcessing = () => {
    jobsService.cancelProcessing(projectId);
    setActiveJob(null);
    setJobLogs([]);
    refetchProject();
  };

  // Export handlers
  const handleTriggerExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setExportProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setExportComplete(true);
      }
    }, 300);
  };

  // Define processing stages for UI Timeline
  const getTimelineStages = (): TimelineStage[] => {
    const currentStage = activeJob?.stage;
    const stages = [
      { id: "speech", name: "Speech Analysis", desc: "Transcribing verbal dialogues to text" },
      { id: "vision", name: "Vision Analysis", desc: "Mapping bounding regions & face structures" },
      { id: "creative", name: "Creative Planning", desc: "Determining mood, pace & emphasis" },
      { id: "captions", name: "Caption Segmentation", desc: "Grouping transcription into segments" },
      { id: "motion", name: "Motion & Styling", desc: "Applying kinetic presets and glow styles" }
    ];

    let currentFoundIndex = stages.findIndex((s) => s.name === currentStage);
    if (activeJob?.status === "completed") {
      currentFoundIndex = stages.length;
    }

    return stages.map((s, idx) => {
      let status: TimelineStage["status"] = "idle";
      if (activeJob?.status === "failed" && idx === currentFoundIndex) {
        status = "failed";
      } else if (idx < currentFoundIndex) {
        status = "completed";
      } else if (idx === currentFoundIndex) {
        status = "processing";
      } else if (activeJob) {
        status = "queued";
      }
      return { ...s, status };
    });
  };

  // Render status widgets/layouts
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
            The workspace project does not exist or has been deleted from cache.
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

      {/* 2. PROCESSING VIEW (PROCESSING / UPLOADED) */}
      {(project.status === "PROCESSING" || project.status === "UPLOADED") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-zinc-900 space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">AI Transcription & Planning</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Assembling timeline nodes, word timings, and styles presets</p>
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

            {/* Percentage log tracker */}
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-900 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-300">
                  {activeJob?.stage || "Queue check"}
                </span>
                <span className="font-bold text-indigo-400">{activeJob?.progress || 0}%</span>
              </div>
              <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${activeJob?.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Stage Activity Log */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-semibold text-zinc-450 uppercase tracking-wider">Diagnostic activity logs</h4>
              <div className="h-48 rounded-xl bg-zinc-950/60 border border-zinc-900 p-4 font-mono text-[10px] text-zinc-400 overflow-y-auto space-y-1.5">
                {jobLogs.length === 0 ? (
                  <div className="text-zinc-600 italic">Waiting for queue check diagnostic logs...</div>
                ) : (
                  jobLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2 leading-relaxed">
                      <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                      <span
                        className={
                          log.type === "success"
                            ? "text-green-400"
                            : log.type === "error"
                            ? "text-red-400"
                            : "text-zinc-400"
                        }
                      >
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>

          {/* Timeline stage node visual widget */}
          <Card className="border-zinc-900 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pipeline Flow</h3>
            <Timeline stages={getTimelineStages()} />
          </Card>
        </div>
      )}

      {/* 3. WORKSPACE EDITOR VIEW (COMPLETED) */}
      {project.status === "COMPLETED" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main player layout */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-0 overflow-hidden border-zinc-900 bg-zinc-950 relative aspect-[9/16] max-w-sm mx-auto flex flex-col justify-between">
              {/* Radial gradient background overlays */}
              <div className="absolute inset-0 bg-glow-radial pointer-events-none" />

              {/* Video visual placeholder screen */}
              <div className="flex-1 flex flex-col items-center justify-center relative p-6">
                <FileVideo size={48} className="text-zinc-800 animate-pulse-slow mb-4" />
                <span className="text-xs text-zinc-650 font-semibold tracking-wide uppercase">Mock Player Stream</span>

                {/* Animated active caption block */}
                <div className="absolute bottom-24 left-6 right-6 text-center select-none z-10 pointer-events-none">
                  {isPlaying ? (
                    <div
                      className={`inline-block font-extrabold text-2xl tracking-tight transition-all drop-shadow-md py-2 px-4 rounded-xl ${
                        selectedStyle === "formal"
                          ? "font-sans uppercase text-zinc-100 border border-zinc-700 bg-zinc-900/80"
                          : selectedStyle === "sarcastic"
                          ? "font-serif italic text-yellow-400"
                          : selectedStyle === "tech"
                          ? "font-sans uppercase text-indigo-400 bg-indigo-950/70 border border-indigo-500/20 rotate-1"
                          : "font-sans text-pink-400 scale-105"
                      }`}
                    >
                      {getActiveCaption() || "..."}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 italic">Press play to preview caption layouts</div>
                  )}
                </div>
              </div>

              {/* Video control bottom bar */}
              <div className="h-16 px-4 bg-zinc-900/60 backdrop-blur-md border-t border-zinc-900 flex items-center justify-between z-10">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/10 transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-400">0:0{playbackTime.toFixed(0)}</span>
                  <span className="text-xs text-zinc-600">/</span>
                  <span className="text-xs font-mono text-zinc-500">0:06</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right sidebar options layout */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Style Selector Widget */}
            <Card className="border-zinc-900 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Caption Presets</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Select a cinematic caption structure</p>
              </div>

              <div className="space-y-2">
                {[
                  { id: "tech", label: "Humorous Tech", desc: "Indigo accents, bold caps & technical emojis" },
                  { id: "non-tech", label: "Humorous Non-Tech", desc: "Pink fonts, playful scale zoom effects" },
                  { id: "sarcastic", label: "Sarcastic", desc: "Yellow fonts, serif layouts, italic emphasis" },
                  { id: "formal", label: "Formal", desc: "Clean borders, standard caps and white texts" }
                ].map((style) => {
                  const isActive = selectedStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id as any)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex flex-col gap-0.5 cursor-pointer ${
                        isActive
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-400"
                          : "bg-zinc-900/30 border-zinc-900 text-zinc-400 hover:bg-zinc-900/60 hover:border-zinc-800"
                      }`}
                    >
                      <span className="font-semibold text-zinc-200">{style.label}</span>
                      <span className="text-[10px] text-zinc-500">{style.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Export Settings Card */}
            <Card className="border-zinc-900 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Export Asset</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Generate production rendering outputs</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Resolution</span>
                  <span className="font-semibold text-zinc-300">1080p (Full HD)</span>
                </div>
                <div className="flex justify-between text-xs border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Quality Preset</span>
                  <span className="font-semibold text-zinc-300">High (Prores)</span>
                </div>
                <div className="flex justify-between text-xs border-b border-zinc-900 pb-2">
                  <span className="text-zinc-500">Est. Size</span>
                  <span className="font-semibold text-zinc-300">~24.5 MB</span>
                </div>
              </div>

              <Button
                onClick={handleTriggerExport}
                className="w-full gap-2 shadow-lg shadow-indigo-600/10"
              >
                <Download size={14} />
                Export Clip
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* EXPORTING DIALOG PROGRESS MODAL */}
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl z-10 space-y-4 animate-fade-in-up relative text-center">
            <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
            
            {!exportComplete ? (
              <div className="space-y-4 py-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto text-indigo-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-150">Rendering Video...</h3>
                  <p className="text-xs text-zinc-400 mt-1">Applying style plans and rendering frames.</p>
                </div>
                <div className="max-w-xs mx-auto space-y-1">
                  <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-500">{exportProgress}%</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto text-green-400">
                  <span>✓</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-150">Render Completed!</h3>
                  <p className="text-xs text-zinc-400 mt-1">Your video is ready to post on social platforms.</p>
                </div>
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={() => {
                      alert("Downloading output file: video_export_1080p.mp4");
                      setIsExporting(false);
                    }}
                    className="gap-2"
                  >
                    <Download size={14} />
                    Download File
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsExporting(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
