import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

function mockFetch(): Mock {
  return fetch as unknown as Mock;
}

vi.mock("../auth", () => ({
  authService: { getToken: async () => "test-token" },
}));

import { jobsService } from "../jobs";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("jobsService.pollJobStatus", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("polls until the job reaches COMPLETED and reports each update", async () => {
    mockFetch()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { progress: 0, stage: "Speech Analysis", estimated_remaining_ms: 2000 } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { progress: 50, stage: "Speech Analysis", estimated_remaining_ms: 1000 } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { progress: 100, stage: "completed", estimated_remaining_ms: null } }));

    const updates: number[] = [];
    const final = await jobsService.pollJobStatus("job-1", {
      intervalMs: 1,
      onUpdate: (status) => updates.push(status.progress),
    });

    expect(updates).toEqual([0, 50, 100]);
    expect(final.stage).toBe("completed");
  });

  it("polls until the job reaches FAILED", async () => {
    mockFetch()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { progress: 10, stage: "Speech Analysis", estimated_remaining_ms: 1000 } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { progress: 10, stage: "failed", estimated_remaining_ms: null } }));

    const final = await jobsService.pollJobStatus("job-2", { intervalMs: 1, onUpdate: () => {} });

    expect(final.stage).toBe("failed");
  });

  it("stops polling and rejects when the abort signal fires", async () => {
    mockFetch().mockResolvedValue(
      jsonResponse({ success: true, data: { progress: 5, stage: "Speech Analysis", estimated_remaining_ms: 1000 } })
    );
    const controller = new AbortController();

    const pollPromise = jobsService.pollJobStatus("job-3", {
      intervalMs: 50,
      onUpdate: () => controller.abort(),
      signal: controller.signal,
    });

    await expect(pollPromise).rejects.toMatchObject({ name: "AbortError" });
  });
});
