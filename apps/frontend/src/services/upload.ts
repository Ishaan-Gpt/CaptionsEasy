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
  async uploadVideo(
    projectId: string,
    file: File,
    onProgress: (progress: number) => void,
    onAbortReady?: (abort: () => void) => void
  ): Promise<UploadResponse> {
    validateFile(file);

    // 1. Get signed upload URL from Next.js API
    const data = await apiClient.post<{ uploadUrl: string; videoId: string; jobId: string }>(
      `/projects/${projectId}/upload`
    );

    // 2. Upload directly to Supabase Storage using XMLHttpRequest to track progress
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", data.uploadUrl);
      
      // Supabase storage requires the exact content type
      xhr.setRequestHeader("Content-Type", file.type);
      
      onAbortReady?.(() => xhr.abort());

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error("Direct upload to storage failed."));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.onabort = () => reject(new Error("Upload cancelled."));

      xhr.send(file);
    });

    // 3. (Optional) Tell backend to start processing
    await apiClient.post(`/projects/${projectId}/process`);

    return {
      videoId: data.videoId,
      jobId: data.jobId,
      status: "UPLOADED"
    };
  },

  async getUploadStatus(projectId: string): Promise<UploadStatusResponse> {
    return apiClient.get<UploadStatusResponse>(`/projects/${projectId}/upload/status`);
  },
};
