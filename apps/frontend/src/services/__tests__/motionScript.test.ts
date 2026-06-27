import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

function mockFetch(): Mock {
  return fetch as unknown as Mock;
}

vi.mock("../auth", () => ({
  authService: { getToken: () => "test-token" },
}));

import { motionScriptService } from "../motionScript";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("motionScriptService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the motion script when one exists", async () => {
    mockFetch().mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          version: "1.0",
          metadata: { project_id: "p1", video_id: "v1" },
          timeline: [],
        },
      })
    );

    const result = await motionScriptService.getMotionScript("p1");
    expect(result?.version).toBe("1.0");
    expect(result?.metadata.project_id).toBe("p1");
  });

  it("returns null when the backend has no motion script yet", async () => {
    mockFetch().mockResolvedValueOnce(
      jsonResponse({ success: false, data: null, error: { code: "NOT_FOUND", message: "No motion script found for this project yet." } }, 404)
    );

    const result = await motionScriptService.getMotionScript("p1");
    expect(result).toBeNull();
  });
});
