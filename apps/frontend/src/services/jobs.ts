import { Job, JobStatus, Project } from "./types";
import { projectsService } from "./projects";

export interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

const activeUploads: Record<string, { progress: number; intervalId: NodeJS.Timeout }> = {};
const activeProcessingJobs: Record<string, { progress: number; stageIndex: number; intervalId: NodeJS.Timeout; logs: LogEntry[] }> = {};

const PROCESS_STAGES = [
  { name: "Speech Analysis", desc: "Extracting audio track and executing speech-to-text transcription..." },
  { name: "Vision Analysis", desc: "Analyzing screen framing, scene cuts, face positions, and safe margins..." },
  { name: "Creative Planning", desc: "Understanding energy curve, speaker emotions, and recommended font branding..." },
  { name: "Caption Planning", desc: "Structuring text into readable subtitle blocks and matching timestamp coordinates..." },
  { name: "Motion Planning", desc: "Injecting animation styles, active pop presets, and highlight indicators..." },
  { name: "Render Generation", desc: "Assembling final RenderPlan JSON instructions..." }
];

export const jobsService = {
  // Simulate video upload
  startUpload(projectId: string, file: File, onProgress: (progress: number) => void, onComplete: () => void) {
    if (activeUploads[projectId]) {
      clearInterval(activeUploads[projectId].intervalId);
    }

    let progress = 0;
    const intervalId = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(intervalId);
        delete activeUploads[projectId];
        // Automatically mark project as UPLOADED
        projectsService.updateProjectStatus(projectId, "UPLOADED").then(() => {
          onProgress(100);
          onComplete();
        });
      } else {
        onProgress(progress);
      }
    }, 400);

    activeUploads[projectId] = { progress, intervalId };
  },

  cancelUpload(projectId: string) {
    if (activeUploads[projectId]) {
      clearInterval(activeUploads[projectId].intervalId);
      delete activeUploads[projectId];
    }
  },

  // Simulate pipeline processing jobs
  startProcessing(
    projectId: string,
    onUpdate: (job: Job, logs: LogEntry[]) => void,
    onComplete: () => void
  ) {
    if (activeProcessingJobs[projectId]) {
      clearInterval(activeProcessingJobs[projectId].intervalId);
    }

    // Set project status to PROCESSING
    projectsService.updateProjectStatus(projectId, "PROCESSING");

    const jobId = "job_" + Math.random().toString(36).substr(2, 9);
    let progress = 0;
    let stageIndex = 0;
    
    const logs: LogEntry[] = [
      { timestamp: new Date().toLocaleTimeString(), message: "Processing job queued in Redis queue.", type: "info" },
      { timestamp: new Date().toLocaleTimeString(), message: "Celery worker worker_v1 selected job.", type: "info" }
    ];

    const intervalId = setInterval(() => {
      const currentStage = PROCESS_STAGES[stageIndex];
      progress += Math.floor(Math.random() * 5) + 3;
      
      // Update logs when transitioning stages
      const targetStageIndex = Math.min(Math.floor((progress / 100) * PROCESS_STAGES.length), PROCESS_STAGES.length - 1);
      if (targetStageIndex > stageIndex) {
        stageIndex = targetStageIndex;
        logs.push({
          timestamp: new Date().toLocaleTimeString(),
          message: `Stage transition: Completed ${PROCESS_STAGES[stageIndex - 1].name}.`,
          type: "success"
        });
        logs.push({
          timestamp: new Date().toLocaleTimeString(),
          message: `Starting stage: ${PROCESS_STAGES[stageIndex].name} - ${PROCESS_STAGES[stageIndex].desc}`,
          type: "info"
        });
      }

      // Add a randomized diagnostic log sometimes
      if (Math.random() > 0.8 && progress < 100) {
        const diagnostics = [
          "Extracting audio frequencies...",
          "Analyzing safe regions for standard phone dimensions...",
          "Zod schema validation passed successfully.",
          "Analyzing caption pacing density...",
          "Framer motion curves configured.",
        ];
        logs.push({
          timestamp: new Date().toLocaleTimeString(),
          message: diagnostics[Math.floor(Math.random() * diagnostics.length)],
          type: "info"
        });
      }

      if (progress >= 100) {
        progress = 100;
        clearInterval(intervalId);
        delete activeProcessingJobs[projectId];
        
        logs.push({
          timestamp: new Date().toLocaleTimeString(),
          message: "RenderPlan assembled successfully.",
          type: "success"
        });
        logs.push({
          timestamp: new Date().toLocaleTimeString(),
          message: "Job completed in 12.4s.",
          type: "success"
        });

        // Mark project as COMPLETED
        projectsService.updateProjectStatus(projectId, "COMPLETED").then(() => {
          onUpdate({
            id: jobId,
            project_id: projectId,
            job_type: "processing",
            status: "completed",
            progress: 100,
            stage: "Completed"
          }, logs);
          onComplete();
        });
      } else {
        onUpdate({
          id: jobId,
          project_id: projectId,
          job_type: "processing",
          status: "processing",
          progress,
          stage: currentStage.name
        }, logs);
      }
    }, 800);

    activeProcessingJobs[projectId] = { progress, stageIndex, intervalId, logs };
  },

  cancelProcessing(projectId: string) {
    if (activeProcessingJobs[projectId]) {
      clearInterval(activeProcessingJobs[projectId].intervalId);
      delete activeProcessingJobs[projectId];
      projectsService.updateProjectStatus(projectId, "CREATED");
    }
  },

  // Export video simulation
  async triggerExport(projectId: string, resolution: string, quality: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return "export_" + Math.random().toString(36).substr(2, 9);
  }
};
