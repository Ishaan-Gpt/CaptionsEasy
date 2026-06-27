/**
 * Thin client for the real MotionAI backend. Source: contracts/api.md >
 * Standard Response Format.
 *
 * TODO: the bearer token currently comes from the mock authService
 * (localStorage "motionai_mock_token"), which is not a real Supabase JWT.
 * Auth/login integration against the real backend is Phase 1
 * (docs/ROADMAP.md) and out of scope for this upload-foundation sprint —
 * the upload endpoints will reject this mock token with 401 until that
 * lands.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const MOCK_TOKEN_KEY = "motionai_mock_token";

export interface ApiErrorBody {
  code: string;
  message: string;
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.code = body.code;
    this.status = status;
  }
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MOCK_TOKEN_KEY);
}

async function unwrap<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new ApiError(response.status, body.error ?? { code: "UNKNOWN_ERROR", message: "Request failed." });
  }
  return body.data as T;
}

export const apiClient = {
  async post<T>(path: string, init?: { json?: unknown; formData?: FormData }): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: init?.formData ? headers : { ...headers, "Content-Type": "application/json" },
      body: init?.formData ?? (init?.json !== undefined ? JSON.stringify(init.json) : undefined),
    });
    return unwrap<T>(response);
  },

  async get<T>(path: string): Promise<T> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return unwrap<T>(response);
  },

  /** Multipart upload with progress reporting (fetch has no upload-progress event).
   * `onXhrReady` hands back the underlying XHR so the caller can `.abort()` it. */
  uploadWithProgress<T>(
    path: string,
    formData: FormData,
    onProgress: (percent: number) => void,
    onXhrReady?: (xhr: XMLHttpRequest) => void
  ): Promise<T> {
    const token = getAuthToken();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}${path}`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      onXhrReady?.(xhr);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        let body: any;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          reject(new Error("Backend returned a non-JSON response."));
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300 && body.success !== false) {
          resolve(body.data as T);
        } else {
          reject(new ApiError(xhr.status, body.error ?? { code: "UNKNOWN_ERROR", message: "Upload failed." }));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.onabort = () => reject(new DOMException("Upload cancelled.", "AbortError"));

      xhr.send(formData);
    });
  },
};
