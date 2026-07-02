import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../auth", () => ({
  authService: { getToken: async () => "test-token" },
}));

import { uploadService, UploadValidationError } from "../upload";

class FakeXHR {
  static instances: FakeXHR[] = [];

  upload = { onprogress: null as ((e: ProgressEvent) => void) | null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = "";
  aborted = false;
  private headers: Record<string, string> = {};

  open(): void {}
  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }
  send(): void {
    FakeXHR.instances.push(this);
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }

  respond(status: number, body: unknown) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.onload?.();
  }

  fail() {
    this.onerror?.();
  }
}

describe("uploadService", () => {
  beforeEach(() => {
    FakeXHR.instances = [];
    vi.stubGlobal("XMLHttpRequest", FakeXHR as unknown as typeof XMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects unsupported file types before making any request", async () => {
    const file = new File(["x"], "video.txt", { type: "text/plain" });

    await expect(
      uploadService.uploadVideo("p1", file, () => {})
    ).rejects.toBeInstanceOf(UploadValidationError);
    expect(FakeXHR.instances).toHaveLength(0);
  });

  it("reports progress and resolves with the backend response on success", async () => {
    const file = new File(["x"], "video.mp4", { type: "video/mp4" });
    const progressUpdates: number[] = [];

    const resultPromise = uploadService.uploadVideo("p1", file, (p) => progressUpdates.push(p));

    await vi.waitFor(() => expect(FakeXHR.instances).toHaveLength(1));
    const xhr = FakeXHR.instances[0];

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent);
    xhr.respond(202, { success: true, data: { videoId: "v1", jobId: "j1", status: "UPLOADED" } });

    const result = await resultPromise;
    expect(result).toEqual({ videoId: "v1", jobId: "j1", status: "UPLOADED" });
    expect(progressUpdates).toEqual([50]);
  });

  it("rejects with AbortError when the upload is cancelled", async () => {
    const file = new File(["x"], "video.mp4", { type: "video/mp4" });
    const abortRef: { current: (() => void) | null } = { current: null };

    const resultPromise = uploadService.uploadVideo("p1", file, () => {}, (fn) => {
      abortRef.current = fn;
    });

    await vi.waitFor(() => expect(FakeXHR.instances).toHaveLength(1));
    abortRef.current?.();

    await expect(resultPromise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects with a backend validation error when the server rejects the upload", async () => {
    const file = new File(["x"], "video.mp4", { type: "video/mp4" });

    const resultPromise = uploadService.uploadVideo("p1", file, () => {});

    await vi.waitFor(() => expect(FakeXHR.instances).toHaveLength(1));
    const xhr = FakeXHR.instances[0];
    xhr.respond(400, { success: false, data: null, error: { code: "VIDEO_TOO_LARGE", message: "Maximum upload size exceeded." } });

    await expect(resultPromise).rejects.toMatchObject({ code: "VIDEO_TOO_LARGE" });
  });
});
