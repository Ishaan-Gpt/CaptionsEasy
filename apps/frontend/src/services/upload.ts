/**
 * Real upload service. Replaces the mocked progress-timer upload.
 */

import { apiClient } from "./api-client";

export interface UploadResponse {
  videoId: string;
  jobId: string;
  status: "UPLOADED";
}

export interface UploadStatusResponse {
  jobId: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress: number;
}

const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_SIZE_BYTES = 500 * 1024 * 1024;

export class UploadValidationError extends Error {}

function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new UploadValidationError("Invalid format! Please upload an MP4, MOV, or WEBM video file.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadValidationError("File is too large! Maximum allowed upload size is 500 MB.");
  }
}

export const uploadService = {
  /** Uploads `file` to the backend for `projectId`. Resolves with the
   * created Video/Job ids once the request completes — does not poll. */
  async uploadVideo(
    projectId: string,
    file: File,
    onProgress: (progress: number) => void,
    onAbortReady?: (abort: () => void) => void
  ): Promise<UploadResponse> {
    validateFile(file);

    const formData = new FormData();
    formData.append("file", file);

    return apiClient.uploadWithProgress<UploadResponse>(
      `/projects/${projectId}/upload`,
      formData,
      onProgress,
      (xhr) => onAbortReady?.(() => xhr.abort())
    );
  },

  async getUploadStatus(projectId: string): Promise<UploadStatusResponse> {
    return apiClient.get<UploadStatusResponse>(`/projects/${projectId}/upload/status`);
  },
};
