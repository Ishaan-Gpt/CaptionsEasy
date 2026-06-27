/** JobStatus / ApiError / User / Project / Video / Export TypeScript types. Source: contracts/json-schemas.md */

export type JobStatusValue = "queued" | "processing" | "completed" | "failed" | "cancelled";

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
  retryable: boolean;
  timestamp: string;
}

export interface JobStatus {
  id: string;
  stage: string;
  progress: number;
  status: JobStatusValue;
  estimated_remaining_ms: number | null;
  error: ApiError | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export interface Project {
  id: string;
  title: string;
  /** TODO(database.md): no enumerated status values defined in the contracts. */
  status: string | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
  storage_path: string;
}

export interface Export {
  id: string;
  /** TODO(database.md): no enumerated resolution values defined in the contracts. */
  resolution: string | null;
  /** TODO(database.md): no enumerated quality values defined in the contracts. */
  quality: string | null;
  download_url: string | null;
  render_time_ms: number | null;
  file_size: number | null;
}
