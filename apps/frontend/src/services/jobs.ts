/**
 * Real jobs service. Source: contracts/api.md > GET /jobs/{id}. Sprint 1.6
 * replaces the previous setInterval-based upload/processing simulation
 * with polling against the real backend job status endpoint — upload
 * progress itself comes from services/upload.ts's real XHR progress events,
 * not from here.
 */

import { apiClient } from "./api-client";

export interface JobStatusResponse {
  progress: number;
  stage: string;
  estimated_remaining_ms: number | null;
}

const TERMINAL_STAGES = new Set(["completed", "failed", "cancelled"]);

export interface PollJobStatusOptions {
  intervalMs?: number;
  onUpdate: (status: JobStatusResponse) => void;
  signal?: AbortSignal;
}

export const jobsService = {
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return apiClient.get<JobStatusResponse>(`/jobs/${jobId}`);
  },

  /** Polls GET /jobs/{id} until the job reaches a terminal stage or `signal`
   * is aborted. Resolves with the final status (or rejects on abort/network
   * error so callers can distinguish "job failed" from "couldn't reach
   * the backend"). */
  async pollJobStatus(jobId: string, { intervalMs = 3000, onUpdate, signal }: PollJobStatusOptions): Promise<JobStatusResponse> {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException("Polling cancelled.", "AbortError");
      }

      const status = await this.getJobStatus(jobId);
      onUpdate(status);

      if (TERMINAL_STAGES.has(status.stage.toLowerCase())) {
        return status;
      }

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, intervalMs);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Polling cancelled.", "AbortError"));
        });
      });
    }
  },
};
