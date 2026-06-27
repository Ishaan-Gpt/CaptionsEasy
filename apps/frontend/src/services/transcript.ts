/**
 * Transcript service. Source: contracts/api.md > GET /projects/{id}/transcript.
 */

import { apiClient, ApiError } from "./api-client";
import { TranscriptWord } from "./types";

export interface TranscriptResponse {
  language: string | null;
  provider: string | null;
  version: number | null;
  transcript: {
    version: string;
    language: string;
    duration_ms: number;
    words: TranscriptWord[];
  };
}

export const transcriptService = {
  async getTranscript(projectId: string): Promise<TranscriptResponse | null> {
    try {
      return await apiClient.get<TranscriptResponse>(`/projects/${projectId}/transcript`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "NOT_FOUND") return null;
      throw err;
    }
  },
};
