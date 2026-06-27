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
  } = useQuery<any | null>({
    queryKey: ["motionScript", projectId],
    queryFn: () => motionScriptService.getMotionScript(projectId),
    enabled: project?.status === "COMPLETED",
  });

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
          <div className="lg:col-span-8 space-y-6">
            <Card className="p-0 overflow-hidden border-zinc-900 bg-zinc-950 relative aspect-[9/16] max-w-sm mx-auto flex flex-col justify-center items-center">
              <FileVideo size={48} className="text-zinc-800 mb-4" />
              <span className="text-xs text-zinc-650 font-semibold tracking-wide uppercase">Video Preview Unavailable</span>
              <span className="text-[10px] text-zinc-600 mt-1">Captioned preview rendering is not in scope yet</span>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="border-zinc-900 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Transcript</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Fetched from the stored speech-recognition output</p>
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

            <Card className="border-zinc-900 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">MotionScript JSON</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Deterministic rendering instructions</p>
              </div>

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
            </Card>

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
              </div>

              <Button disabled className="w-full gap-2 opacity-50 cursor-not-allowed" title="Export/render is not implemented yet">
                <Download size={14} />
                Export Clip
              </Button>
              <p className="text-[10px] text-zinc-600 text-center">
                Export rendering is not implemented yet — no backend endpoint exists for this.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
