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
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Search,
  Trash2,
  Edit3,
  Type,
  Music,
  Settings,
  ChevronDown,
  Plus,
  Copy,
  RefreshCw,
} from "lucide-react";
import { projectsService } from "@/services/projects";
import { authService } from "@/services/auth";
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
  { id: "kalakar", name: "Kalakar", desc: "Outfit font with lime green staggered template", font: "Outfit", color: "Lime" },
  { id: "kalakar_shadow", name: "Kalakar Shadow", desc: "Outfit font, lime green staggered with shadows", font: "Outfit", color: "Lime" },
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

  const [activeSidebarTab, setActiveSidebarTab] = useState("captions");
  const [rightPanelTab, setRightPanelTab] = useState("templates");
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
  const [editingWordText, setEditingWordText] = useState("");
  const [localWords, setLocalWords] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
    enabled: authService.isAuthenticated(),
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
 
  useEffect(() => {
    if (transcript?.transcript?.words) {
      setLocalWords(
        transcript.transcript.words.map((w: any) => ({
          ...w,
          highlighted: w.highlighted || false,
        }))
      );
    }
  }, [transcript]);
 
  const handleWordEditSave = (wordIdx: number) => {
    if (!editingWordText.trim()) return;
    const updated = [...localWords];
    updated[wordIdx] = {
      ...updated[wordIdx],
      text: editingWordText.trim()
    };
    setLocalWords(updated);
    setEditingWordIndex(null);
  };
 
  const handleToggleHighlight = (wordIdx: number) => {
    const updated = [...localWords];
    updated[wordIdx] = {
      ...updated[wordIdx],
      highlighted: !updated[wordIdx].highlighted
    };
    setLocalWords(updated);
  };
 
  const pickKeywordIndex = (wordsList: any[]) => {
    let bestIdx = 0;
    let bestScore = -1;
    const stopwords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "of", "to", "and", "in", "on",
      "at", "it", "this", "that", "i", "you", "he", "she", "we", "they", "but",
      "or", "so", "be", "as", "for", "with", "my", "your", "do", "does", "did"
    ]);
    wordsList.forEach((w, idx) => {
      const clean = w.text.replace(/[^\w]/g, "");
      if (!clean) return;
      let score = clean.length;
      if (stopwords.has(clean.toLowerCase())) score -= 100;
      if (clean[0] && clean[0] === clean[0].toUpperCase()) score += 2;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    return bestIdx;
  };
 
  const getActiveSegmentAndIndex = () => {
    if (localWords.length === 0) return null;
    
    let activeWordIdx = localWords.findIndex(w => currentTimeMs >= w.start_ms && currentTimeMs <= w.end_ms);
    if (activeWordIdx === -1) {
      const nextWordIdx = localWords.findIndex(w => w.start_ms > currentTimeMs);
      if (nextWordIdx > 0) activeWordIdx = nextWordIdx - 1;
      else if (nextWordIdx === 0) activeWordIdx = 0;
      else activeWordIdx = localWords.length - 1;
    }
    
    const segmentSize = 6;
    const segmentIdx = Math.floor(activeWordIdx / segmentSize);
    const startIndex = segmentIdx * segmentSize;
    const segmentWords = localWords.slice(startIndex, startIndex + segmentSize);
    const relativeActiveIdx = activeWordIdx - startIndex;
    
    return {
      words: segmentWords,
      absoluteStartIndex: startIndex,
      relativeActiveIdx,
    };
  };

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

  const {
    data: projectVideo,
  } = useQuery<any>({
    queryKey: ["projectVideo", projectId],
    queryFn: () => projectsService.getProjectVideo(projectId),
    enabled: project?.status === "COMPLETED",
  });

  const [selectedStyle, setSelectedStyle] = useState<string>("minimal");
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const [customFont, setCustomFont] = useState<string>("Outfit");
  const [customSize, setCustomSize] = useState<number>(48);
  const [customWeight, setCustomWeight] = useState<string>("800");
  const [customColor, setCustomColor] = useState<string>("#FFFFFF");
  const [customHighlightColor, setCustomHighlightColor] = useState<string>("#C5FF00");
  const [customShadow, setCustomShadow] = useState<number>(0.0);
  const [customOutline, setCustomOutline] = useState<number>(2.0);
  const [customBackgroundStyle, setCustomBackgroundStyle] = useState<string>("none");
  const [customYPositionPercent, setCustomYPositionPercent] = useState<number>(71.4);
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);

  useEffect(() => {
    if (project?.style) {
      setSelectedStyle(project.style);
    }
  }, [project?.style]);

  // Fetch custom style when project loads or style changes
  useEffect(() => {
    if (project?.id) {
      projectsService.getCustomStyle(project.id)
        .then((res) => {
          if (res) {
            setCustomFont(res.font || "Outfit");
            setCustomSize(res.size || 48);
            setCustomWeight(res.weight || "800");
            setCustomColor(res.color || "#FFFFFF");
            setCustomHighlightColor(res.highlight_color || "#C5FF00");
            setCustomShadow(res.shadow || 0.0);
            setCustomOutline(res.outline || 2.0);
            setCustomBackgroundStyle(res.background_style || "none");
            setCustomYPositionPercent(res.y_position_percent || 71.4);
          }
        })
        .catch((err) => console.error("Error loading custom style: ", err));
    }
  }, [project?.id, project?.style]);

  const handleStyleSelect = async (styleId: string) => {
    setSelectedStyle(styleId);
    setScriptError(null);
    setIsGeneratingScript(true);
    try {
      await projectsService.updateProjectStyle(projectId, styleId);
      
      // If choosing a built-in template, initialize customized settings baseline
      if (styleId === "kalakar") {
        setCustomFont("Outfit");
        setCustomSize(48);
        setCustomWeight("800");
        setCustomColor("#FFFFFF");
        setCustomHighlightColor("#C5FF00");
        setCustomShadow(0.0);
        setCustomOutline(2.0);
        setCustomBackgroundStyle("none");
        setCustomYPositionPercent(71.4);
      } else if (styleId === "kalakar_shadow") {
        setCustomFont("Outfit");
        setCustomSize(48);
        setCustomWeight("800");
        setCustomColor("#FFFFFF");
        setCustomHighlightColor("#C5FF00");
        setCustomShadow(2.5);
        setCustomOutline(2.0);
        setCustomBackgroundStyle("none");
        setCustomYPositionPercent(71.4);
      }

      await projectsService.generateMotionScript(projectId);
      await refetchMotionScript();
      await refetchProject();
    } catch (err) {
      setScriptError(describeError(err));
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleSaveCustomStyle = async () => {
    setIsSavingStyle(true);
    setStyleError(null);
    try {
      const res = await projectsService.saveCustomStyle(projectId, {
        font: customFont,
        size: customSize,
        weight: customWeight,
        color: customColor,
        alignment: "center",
        shadow: customShadow,
        outline: customOutline,
        highlight_color: customHighlightColor,
        background_style: customBackgroundStyle,
        y_position_percent: customYPositionPercent
      });
      setSelectedStyle(res.style);
      
      await projectsService.generateMotionScript(projectId);
      await refetchMotionScript();
      await refetchProject();
    } catch (err) {
      setStyleError(describeError(err));
    } finally {
      setIsSavingStyle(false);
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

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || durationMs === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const timeMs = clickX / (0.15 * zoomLevel);
    const timeSec = Math.max(0, Math.min(timeMs / 1000, durationMs / 1000));
    videoRef.current.currentTime = timeSec;
    setCurrentTimeMs(timeSec * 1000);
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
        <div className="flex flex-col lg:flex-row h-[78vh] bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden relative">
          
          {/* A. LEFT VERTICAL TABS SIDEBAR */}
          <div className="flex lg:flex-col bg-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-900 w-full lg:w-16 items-center justify-around lg:justify-start py-2 lg:py-6 gap-0 lg:gap-6 shrink-0 z-10">
            <button
              onClick={() => setActiveSidebarTab("captions")}
              className={`p-3 rounded-xl transition cursor-pointer flex flex-col items-center gap-1 group relative ${
                activeSidebarTab === "captions"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Edit Captions"
            >
              <Type size={20} className="group-hover:scale-105 transition" />
              <span className="text-[9px] font-bold tracking-tight">Captions</span>
              {activeSidebarTab === "captions" && (
                <div className="hidden lg:block absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 rounded-r" />
              )}
            </button>

            <button
              onClick={() => setActiveSidebarTab("fonts")}
              className={`p-3 rounded-xl transition cursor-pointer flex flex-col items-center gap-1 group relative ${
                activeSidebarTab === "fonts"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Custom Fonts"
            >
              <Settings size={20} className="group-hover:scale-105 transition" />
              <span className="text-[9px] font-bold tracking-tight">Fonts</span>
              <span className="absolute -top-1 -right-1 text-[8px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-1 py-0.2 rounded font-mono font-bold scale-90">Soon</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab("audio")}
              className={`p-3 rounded-xl transition cursor-pointer flex flex-col items-center gap-1 group relative ${
                activeSidebarTab === "audio"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Audio Tracks"
            >
              <Music size={20} className="group-hover:scale-105 transition" />
              <span className="text-[9px] font-bold tracking-tight">Audio</span>
              <span className="absolute -top-1 -right-1 text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-1 py-0.2 rounded font-mono font-bold scale-90">Soon</span>
            </button>
          </div>

          {/* B. LEFT-MIDDLE INTERACTIVE TRANSCRIPT PANEL */}
          <div className="flex flex-col bg-zinc-950/40 border-r border-zinc-900 w-full lg:w-80 shrink-0 h-64 lg:h-auto overflow-hidden">
            {activeSidebarTab === "captions" ? (
              <>
                {/* Panel Header */}
                <div className="p-4 border-b border-zinc-900 space-y-3 shrink-0">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-zinc-200">Captions</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => refetchProject()}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        title="Sync Changes"
                      >
                        <RefreshCw size={14} className="animate-spin-slow" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Search and drop-down */}
                  <div className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-2.5 py-1.5">
                    <Search size={14} className="text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search transcript..."
                      className="bg-transparent border-none text-xs text-zinc-200 focus:outline-none w-full"
                    />
                  </div>
                </div>

                {/* Words list container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isTranscriptLoading ? (
                    <div className="h-full flex items-center justify-center gap-2 text-zinc-500 text-xs">
                      <Spinner className="w-4 h-4" />
                      Loading words...
                    </div>
                  ) : localWords.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic text-center pt-8">No transcript parsed.</p>
                  ) : (
                    // Render grouped segments (chunks of 6 words)
                    Array.from({ length: Math.ceil(localWords.length / 6) }).map((_, segIdx) => {
                      const startIndex = segIdx * 6;
                      const segmentWords = localWords.slice(startIndex, startIndex + 6);
                      const isCurrent = currentTimeMs >= (segmentWords[0]?.start_ms || 0) && currentTimeMs <= (segmentWords[segmentWords.length - 1]?.end_ms || 0);

                      return (
                        <div 
                          key={segIdx} 
                          className={`flex items-start gap-3 p-2.5 rounded-xl border transition ${
                            isCurrent 
                              ? "bg-indigo-500/5 border-indigo-500/20" 
                              : "border-transparent bg-zinc-900/10 hover:bg-zinc-900/30"
                          }`}
                        >
                          {/* Circle Index */}
                          <button
                            onClick={() => {
                              if (videoRef.current && segmentWords[0]) {
                                videoRef.current.currentTime = segmentWords[0].start_ms / 1000;
                                setCurrentTimeMs(segmentWords[0].start_ms);
                              }
                            }}
                            className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold border transition cursor-pointer ${
                              isCurrent
                                ? "bg-indigo-500 border-indigo-400 text-white shadow shadow-indigo-500/25"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                            }`}
                            title="Jump playhead"
                          >
                            {segIdx + 1}
                          </button>

                          {/* Words grid */}
                          <div className="flex-1 flex flex-wrap gap-1.5 pt-0.5">
                            {segmentWords.map((word, wordOffset) => {
                              const absoluteIdx = startIndex + wordOffset;
                              const isActive = currentTimeMs >= word.start_ms && currentTimeMs <= word.end_ms;

                              return (
                                <div key={absoluteIdx} className="relative group/word">
                                  {editingWordIndex === absoluteIdx ? (
                                    <input
                                      type="text"
                                      value={editingWordText}
                                      onChange={(e) => setEditingWordText(e.target.value)}
                                      onBlur={() => handleWordEditSave(absoluteIdx)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleWordEditSave(absoluteIdx);
                                        if (e.key === "Escape") setEditingWordIndex(null);
                                      }}
                                      autoFocus
                                      className="bg-indigo-600/20 border border-indigo-500 text-xs text-zinc-100 rounded px-1 py-0.2 focus:outline-none w-16 text-center font-medium"
                                    />
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingWordIndex(absoluteIdx);
                                        setEditingWordText(word.text);
                                      }}
                                      className={`text-xs font-medium px-1.5 py-0.5 rounded cursor-pointer transition select-none ${
                                        isActive
                                          ? "bg-indigo-500 text-white"
                                          : word.highlighted
                                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                                          : "text-zinc-300 hover:bg-zinc-800"
                                      }`}
                                      title="Double-click to edit, right-click to highlight"
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        handleToggleHighlight(absoluteIdx);
                                      }}
                                    >
                                      {word.text}
                                    </button>
                                  )}
                                  
                                  {/* Quick toggle highlight floating button */}
                                  <button
                                    onClick={() => handleToggleHighlight(absoluteIdx)}
                                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-zinc-950 border border-zinc-800 rounded px-1 py-0.2 text-[8px] opacity-0 group-hover/word:opacity-100 hover:text-emerald-400 hover:border-emerald-500/40 transition-opacity z-10 shrink-0 cursor-pointer shadow"
                                  >
                                    {word.highlighted ? "Unhighlight" : "Highlight"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center space-y-4">
                <AlertTriangle size={32} className="text-zinc-600 mx-auto" />
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tab Coming Soon</h4>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  Custom font uploads and multi-track audio features are scheduled for the next development sprints.
                </p>
              </div>
            )}
          </div>

          {/* C. MIDDLE PLAYER AREA */}
          <div className="flex-1 flex flex-col bg-zinc-900/15 overflow-hidden">
            {/* Top Player View */}
            <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-zinc-950/40">
              <div className="relative w-full max-w-[280px] sm:max-w-[310px] aspect-[9/16] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-900/80 shadow-2xl flex flex-col justify-center items-center">
                
                {/* 1. HTML5 Video Element */}
                {projectVideo?.download_url || (exports && exports.filter((e: any) => e.status === "completed").length > 0) ? (
                  <video
                    ref={videoRef}
                    src={projectVideo?.download_url || (exports || []).filter((e: any) => e.status === "completed")[0]?.download_url}
                    className="w-full h-full object-cover"
                    poster={project.thumbnail_url || undefined}
                    onClick={() => {
                      if (videoRef.current) {
                        if (isPlaying) {
                          videoRef.current.pause();
                          setIsPlaying(false);
                        } else {
                          videoRef.current.play().then(() => setIsPlaying(true));
                        }
                      }
                    }}
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTimeMs(videoRef.current.currentTime * 1000);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        setDurationMs(videoRef.current.duration * 1000);
                      }
                    }}
                    onEnded={() => setIsPlaying(false)}
                  />
                ) : (
                  <div className="p-6 text-center space-y-4">
                    <FileVideo size={42} className="text-zinc-700 mx-auto animate-pulse" />
                    <div>
                      <span className="text-xs text-zinc-400 font-semibold tracking-wide uppercase block">Loading Video asset...</span>
                    </div>
                  </div>
                )}

                {/* 2. Real-Time CSS Subtitle Overlay */}
                {(() => {
                  const activeSegment = getActiveSegmentAndIndex();
                  if (!activeSegment) return null;

                  const isStaggered = selectedStyle.startsWith("custom_") || selectedStyle === "kalakar" || selectedStyle === "kalakar_shadow";
                  if (isStaggered) {
                    const words = activeSegment.words;
                    const k = pickKeywordIndex(words);
                    
                    const line1Words = words.slice(0, k);
                    const line2Word = words[k];
                    const line3Words = words.slice(k + 1);

                    const revealedMax = activeSegment.relativeActiveIdx;
                    const visibleL1 = line1Words.filter((w, i) => i <= revealedMax);
                    const visibleL2 = k <= revealedMax ? line2Word : null;
                    const visibleL3 = line3Words.filter((w, i) => (k + 1 + i) <= revealedMax);

                    const outlineStyle = customOutline > 0 
                      ? { 
                          textShadow: `${customOutline}px ${customOutline}px 0px rgba(0,0,0,0.95)`,
                          WebkitTextStroke: `${customOutline * 0.5}px rgba(0,0,0,0.8)` 
                        } 
                      : {};

                    const highlightShadowStyle = customShadow > 0
                      ? { 
                          textShadow: `${customOutline}px ${customOutline}px 0px rgba(0,0,0,0.95), 0 0 ${customShadow * 3}px ${customHighlightColor}`,
                          WebkitTextStroke: customOutline > 0 ? `${customOutline * 0.5}px rgba(0,0,0,0.8)` : 'none'
                        }
                      : outlineStyle;

                    const containerPadding = customBackgroundStyle === "pill" ? "12px 24px" : customBackgroundStyle === "shadow-box" ? "16px 20px" : "0px";
                    const containerBg = customBackgroundStyle === "pill" ? "rgba(0,0,0,0.45)" : customBackgroundStyle === "shadow-box" ? "rgba(0,0,0,0.7)" : "transparent";
                    const containerBorderRadius = customBackgroundStyle === "pill" ? "9999px" : customBackgroundStyle === "shadow-box" ? "12px" : "0px";

                    return (
                      <div 
                        className="absolute inset-x-0 flex flex-col items-center pointer-events-none px-4 select-none animate-fade-in-up transition-all"
                        style={{ top: `${customYPositionPercent}%`, transform: "translateY(-50%)" }}
                      >
                        <div 
                          className="flex flex-col items-center tracking-tight w-full max-w-[260px] transition-all animate-fade-in-up"
                          style={{
                            padding: containerPadding,
                            backgroundColor: containerBg,
                            borderRadius: containerBorderRadius,
                          }}
                        >
                          {/* Line 1 */}
                          {line1Words.length > 0 && (
                            <div 
                              className="self-start tracking-wide text-left opacity-90 transition-all duration-100"
                              style={{ 
                                fontFamily: `${customFont}, Inter, sans-serif`,
                                fontSize: `${customSize * 0.45}px`,
                                color: customColor,
                                fontWeight: "normal",
                                visibility: visibleL1.length > 0 ? "visible" : "hidden",
                                ...outlineStyle
                              }}
                            >
                              {visibleL1.map(w => w.text).join(" ")}
                            </div>
                          )}
                          {/* Line 2 */}
                          {line2Word && (
                            <div 
                              className="tracking-tight leading-none select-none my-1.5 transition-all duration-100 uppercase"
                              style={{ 
                                fontFamily: `${customFont}, Inter, sans-serif`,
                                fontSize: `${customSize}px`,
                                color: customHighlightColor,
                                fontWeight: customWeight,
                                visibility: visibleL2 ? "visible" : "hidden",
                                ...highlightShadowStyle
                              }}
                            >
                              {line2Word.text}
                            </div>
                          )}
                          {/* Line 3 */}
                          {line3Words.length > 0 && (
                            <div 
                              className="self-end tracking-wide text-right opacity-90 transition-all duration-100"
                              style={{ 
                                fontFamily: `${customFont}, Inter, sans-serif`,
                                fontSize: `${customSize * 0.45}px`,
                                color: customColor,
                                fontWeight: "normal",
                                visibility: visibleL3.length > 0 ? "visible" : "hidden",
                                ...outlineStyle
                              }}
                            >
                              {visibleL3.map(w => w.text).join(" ")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    // Standard center caption preview fallback
                    const words = activeSegment.words;
                    const revealedWords = words.filter((w, i) => i <= activeSegment.relativeActiveIdx);
                    const isModern = selectedStyle === "modern";
                    const isPodcast = selectedStyle === "podcast";
                    const activeColor = isModern ? "#FFFF00" : isPodcast ? "#00FF00" : "#FFFFFF";

                    return (
                      <div className="absolute inset-x-0 bottom-24 text-center px-4 pointer-events-none select-none animate-fade-in-up">
                        <div 
                          className="text-sm font-extrabold tracking-wide uppercase"
                          style={{
                            fontFamily: "Inter, sans-serif",
                            color: activeColor,
                            textShadow: "1px 1px 1px rgba(0,0,0,0.9)"
                          }}
                        >
                          {revealedWords.map(w => w.text).join(" ")}
                        </div>
                      </div>
                    );
                  }
                })()}

                {/* Playback Progress Scrubber bar */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-900/60 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-75"
                    style={{ width: `${durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Middle Playback Controls Bar */}
            <div className="h-12 bg-zinc-950 border-t border-zinc-900 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        videoRef.current.play().then(() => setIsPlaying(true));
                      }
                    }
                  }}
                  className="p-1.5 hover:bg-zinc-900 text-zinc-350 hover:text-zinc-100 rounded-lg transition cursor-pointer"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        const newMute = !isMuted;
                        videoRef.current.muted = newMute;
                        setIsMuted(newMute);
                      }
                    }}
                    className="p-1.5 hover:bg-zinc-900 text-zinc-350 hover:text-zinc-100 rounded-lg transition cursor-pointer"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (videoRef.current) {
                        videoRef.current.volume = v;
                        videoRef.current.muted = v === 0;
                        setIsMuted(v === 0);
                      }
                    }}
                    className="w-16 h-1 rounded bg-zinc-800 accent-indigo-500 focus:outline-none appearance-none"
                  />
                </div>
              </div>

              {/* Time display */}
              <div className="text-[11px] text-zinc-500 font-mono">
                {(() => {
                  const formatTime = (ms: number) => {
                    const sec = Math.floor(ms / 1000) % 60;
                    const min = Math.floor(ms / 60000);
                    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
                  };
                  return `${formatTime(currentTimeMs)} / ${formatTime(durationMs)}`;
                })()}
              </div>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
                  }
                }}
                className="p-1.5 hover:bg-zinc-900 text-zinc-350 hover:text-zinc-100 rounded-lg transition cursor-pointer"
                title="Fullscreen"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            {/* D. BOTTOM WAVEFORM TIMELINE PANEL */}
            <div className="h-44 bg-zinc-950/80 border-t border-zinc-900 flex flex-col shrink-0 overflow-hidden select-none">
              
              {/* Timeline Header controls */}
              <div className="h-8 border-b border-zinc-900 px-4 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Waveform timeline</span>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-zinc-650 font-mono">Zoom</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                    className="w-20 h-0.5 rounded bg-zinc-800 accent-indigo-500 focus:outline-none appearance-none"
                  />
                </div>
              </div>

              {/* Scroller Track */}
              <div 
                className="flex-1 overflow-x-auto overflow-y-hidden relative py-2"
                onClick={handleTimelineClick}
              >
                {/* Horizontal Waveform + Word nodes Container */}
                <div 
                  className="h-full relative border-dashed border-zinc-900"
                  style={{ width: `${(durationMs || 10000) * 0.15 * zoomLevel}px` }}
                >
                  {/* Procedural Waveform lines */}
                  <div className="absolute inset-x-0 top-10 bottom-2 flex items-center justify-between opacity-15 pointer-events-none px-4">
                    {Array.from({ length: 120 }).map((_, idx) => {
                      // Sine noise procedural height
                      const heightPercent = 20 + Math.sin(idx * 0.25) * 35 + Math.cos(idx * 0.6) * 20 + (idx % 3 === 0 ? 15 : 0);
                      return (
                        <div 
                          key={idx} 
                          className="w-1.5 rounded-full bg-indigo-500" 
                          style={{ height: `${Math.max(10, Math.min(85, heightPercent))}%` }}
                        />
                      );
                    })}
                  </div>

                  {/* Words track layer */}
                  <div className="absolute top-1 inset-x-0 h-8 flex items-center">
                    {localWords.map((word, idx) => {
                      const startX = word.start_ms * 0.15 * zoomLevel;
                      const width = (word.end_ms - word.start_ms) * 0.15 * zoomLevel;
                      const isActive = currentTimeMs >= word.start_ms && currentTimeMs <= word.end_ms;

                      return (
                        <div
                          key={idx}
                          className={`absolute h-7 rounded border flex items-center justify-center text-[9px] font-semibold transition px-1 truncate pointer-events-auto ${
                            isActive
                              ? "bg-indigo-600/30 border-indigo-400 text-indigo-300"
                              : word.highlighted
                              ? "bg-emerald-500/25 border-emerald-500/40 text-emerald-300"
                              : "bg-zinc-900/40 border-zinc-800/80 text-zinc-500 hover:border-zinc-700"
                          }`}
                          style={{ 
                            left: `${startX}px`, 
                            width: `${Math.max(15, width)}px` 
                          }}
                          title={`${word.text} (${((word.end_ms - word.start_ms)/1000).toFixed(2)}s)`}
                          onClick={(e) => {
                            e.stopPropagation(); // Avoid triggering seek to click coordinate directly
                            if (videoRef.current) {
                              videoRef.current.currentTime = word.start_ms / 1000;
                              setCurrentTimeMs(word.start_ms);
                            }
                          }}
                        >
                          {word.text}
                        </div>
                      );
                    })}
                  </div>

                  {/* Playhead vertical line cursor */}
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-10 transition-all pointer-events-none"
                    style={{ left: `${currentTimeMs * 0.15 * zoomLevel}px` }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 -ml-1 -mt-0.5 shadow shadow-green-500/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* E. RIGHT OPTIONS SIDEBAR PANEL */}
          <div className="w-full lg:w-72 bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-900 flex flex-col shrink-0 overflow-hidden">
            {/* Panel Tabs */}
            <div className="flex h-11 border-b border-zinc-900 bg-zinc-950 shrink-0">
              <button
                onClick={() => setRightPanelTab("templates")}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-b-2 transition ${
                  rightPanelTab === "templates"
                    ? "border-indigo-500 text-zinc-100 bg-indigo-500/5"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Templates
              </button>
              <button
                onClick={() => setRightPanelTab("style")}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-b-2 transition ${
                  rightPanelTab === "style"
                    ? "border-indigo-500 text-zinc-100 bg-indigo-500/5"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Customize
              </button>
              <button
                onClick={() => setRightPanelTab("settings")}
                className={`flex-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-b-2 transition ${
                  rightPanelTab === "settings"
                    ? "border-indigo-500 text-zinc-100 bg-indigo-500/5"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Export
              </button>
            </div>

            {/* Tab content area */}
            <div className="flex-1 overflow-y-auto p-4">
              {rightPanelTab === "templates" ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Template presets</span>
                    <button className="text-[10px] text-indigo-400 font-semibold hover:text-indigo-300 cursor-pointer">Save Preset</button>
                  </div>

                  {/* Template cards */}
                  <div className="space-y-3">
                    {STYLE_PRESETS.map((preset) => {
                      const isActive = selectedStyle === preset.id;

                      return (
                        <button
                          key={preset.id}
                          onClick={() => handleStyleSelect(preset.id)}
                          disabled={isGeneratingScript || isRendering}
                          className={`w-full text-left p-3 rounded-xl border transition flex flex-col justify-between h-28 relative overflow-hidden cursor-pointer ${
                            isActive 
                              ? "border-indigo-500 bg-indigo-500/5 shadow" 
                              : "border-zinc-900 bg-zinc-950/40 hover:border-zinc-800"
                          }`}
                        >
                          {isActive && (
                            <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5">
                              <Check size={10} />
                            </div>
                          )}

                          {/* Graphical Preview rendering inside the sidebar button */}
                          <div className="absolute inset-0 opacity-10 flex flex-col justify-center items-center scale-95 pointer-events-none font-sans">
                            <span className="text-[10px]">Hello and</span>
                            <span className="text-xl font-black uppercase text-[#C5FF00]">WELCOME</span>
                            <span className="text-[10px]">to Kalakaar.</span>
                          </div>

                          <div className="relative z-10 space-y-1">
                            <span className="text-xs font-bold text-zinc-200 block">{preset.name}</span>
                            <span className="text-[10px] text-zinc-500 leading-normal block">{preset.desc}</span>
                          </div>

                          <div className="relative z-10 flex items-center justify-between mt-auto">
                            <span className="text-[9px] text-zinc-650 font-mono tracking-tight">{preset.font}</span>
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-zinc-900 shadow-inner"
                              style={{
                                backgroundColor: 
                                  preset.color === "Lime" ? "#C5FF00" :
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
              ) : rightPanelTab === "style" ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Caption Styling</span>
                    {isSavingStyle ? (
                      <span className="text-[9px] text-zinc-500 italic animate-pulse">Saving...</span>
                    ) : (
                      <button 
                        onClick={handleSaveCustomStyle}
                        className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 cursor-pointer"
                      >
                        Apply Settings
                      </button>
                    )}
                  </div>

                  {/* Font Family */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Font Family</label>
                    <select
                      value={customFont}
                      onChange={(e) => setCustomFont(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Outfit">Outfit</option>
                      <option value="Inter">Inter</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Arial">Arial</option>
                      <option value="system-ui">System Default</option>
                    </select>
                  </div>

                  {/* Font Weight */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Font Weight</label>
                    <select
                      value={customWeight}
                      onChange={(e) => setCustomWeight(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="400">400 - Regular</option>
                      <option value="600">600 - Semi Bold</option>
                      <option value="700">700 - Bold</option>
                      <option value="800">800 - Extra Bold</option>
                      <option value="900">900 - Black</option>
                    </select>
                  </div>

                  {/* Font Size */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      <span>Base Font Size</span>
                      <span className="font-mono text-zinc-300">{customSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="24"
                      max="80"
                      step="2"
                      value={customSize}
                      onChange={(e) => setCustomSize(parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Colors Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Text Color</label>
                      <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="w-6 h-6 rounded border border-zinc-800 bg-transparent cursor-pointer shrink-0"
                        />
                        <span className="text-[9px] text-zinc-400 font-mono select-all uppercase truncate">{customColor}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Highlight</label>
                      <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                        <input
                          type="color"
                          value={customHighlightColor}
                          onChange={(e) => setCustomHighlightColor(e.target.value)}
                          className="w-6 h-6 rounded border border-zinc-800 bg-transparent cursor-pointer shrink-0"
                        />
                        <span className="text-[9px] text-zinc-400 font-mono select-all uppercase truncate">{customHighlightColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stroke/Outline */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      <span>Outline Size</span>
                      <span className="font-mono text-zinc-300">{customOutline}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="0.5"
                      value={customOutline}
                      onChange={(e) => setCustomOutline(parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Shadow Size */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      <span>Shadow Glow</span>
                      <span className="font-mono text-zinc-300">{customShadow}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      step="0.5"
                      value={customShadow}
                      onChange={(e) => setCustomShadow(parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Y Position */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      <span>Vertical Center</span>
                      <span className="font-mono text-zinc-300">{customYPositionPercent.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="90"
                      step="1"
                      value={customYPositionPercent}
                      onChange={(e) => setCustomYPositionPercent(parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Background Style */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Background Block</label>
                    <select
                      value={customBackgroundStyle}
                      onChange={(e) => setCustomBackgroundStyle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="none">None</option>
                      <option value="pill">Pill Background</option>
                      <option value="shadow-box">Shadow Box</option>
                    </select>
                  </div>

                  {styleError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-2 text-[9px] font-medium leading-relaxed">
                      {styleError}
                    </div>
                  )}

                  <Button
                    onClick={handleSaveCustomStyle}
                    disabled={isSavingStyle}
                    className="w-full gap-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold cursor-pointer transition py-2 text-xs mt-1"
                  >
                    Save Custom Preset
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs border-b border-zinc-900 pb-2">
                      <span className="text-zinc-500">Resolution</span>
                      <span className="font-semibold text-zinc-300">1080p (Full HD)</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-zinc-900 pb-2">
                      <span className="text-zinc-500">Style applied</span>
                      <span className="font-semibold text-zinc-300 capitalize">{selectedStyle}</span>
                    </div>
                    <div className="flex justify-between text-xs border-b border-zinc-900 pb-2">
                      <span className="text-zinc-500">Output Container</span>
                      <span className="font-semibold text-zinc-300">MP4 (MPEG-4)</span>
                    </div>
                  </div>

                  {isRendering ? (
                    <div className="space-y-2 pt-2">
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
                      className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white font-bold cursor-pointer transition shadow shadow-green-600/15 py-2.5"
                    >
                      <Download size={14} />
                      Export Video
                    </Button>
                  )}

                  {renderError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-xs font-medium">
                      {renderError}
                    </div>
                  )}

                  {/* Dev Mode toggle inside export settings */}
                  <div className="pt-4 border-t border-zinc-900 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Developer Mode</span>
                      <button 
                        onClick={() => setDevMode(!devMode)}
                        className="text-[10px] text-indigo-400 font-semibold hover:text-indigo-300 cursor-pointer"
                      >
                        {devMode ? "Hide Details" : "Show Details"}
                      </button>
                    </div>

                    {devMode && (
                      <div className="space-y-2 animate-fade-in-up">
                        <span className="text-[9px] text-zinc-650 font-mono block">MotionScript JSON</span>
                        {isMotionScriptLoading ? (
                          <div className="text-zinc-650 text-[10px] italic">Loading script...</div>
                        ) : motionScript ? (
                          <pre className="text-[8px] text-zinc-450 bg-zinc-900/60 p-2.5 rounded-lg overflow-auto max-h-40 font-mono leading-normal border border-zinc-800/80">
                            {JSON.stringify(motionScript, null, 2)}
                          </pre>
                        ) : (
                          <div className="text-zinc-650 text-[10px] italic">No MotionScript compiled.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Panel footer: Action button when in templates/style tab */}
            {(rightPanelTab === "templates" || rightPanelTab === "style") && (
              <div className="p-4 border-t border-zinc-900 bg-zinc-950/60 shrink-0">
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
                    className="w-full gap-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold cursor-pointer transition py-2.5"
                  >
                    <Download size={14} />
                    Export Video
                  </Button>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
