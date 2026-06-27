import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

function mockFetch(): Mock {
  return fetch as unknown as Mock;
}

vi.mock("../auth", () => ({
  authService: { getToken: () => "test-token" },
}));

import { transcriptService } from "../transcript";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("transcriptService", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the transcript when one exists", async () => {
    mockFetch().mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          language: "en",
          provider: "dummy",
          version: 1,
          transcript: { version: "1.0", language: "en", duration_ms: 4000, words: [{ text: "Hi", start_ms: 0, end_ms: 100, confidence: 0.9 }] },
        },
      })
    );

    const result = await transcriptService.getTranscript("p1");
    expect(result?.language).toBe("en");
    expect(result?.transcript.words[0].text).toBe("Hi");
  });

  it("returns null (not an error) when the backend has no transcript yet", async () => {
    mockFetch().mockResolvedValueOnce(
      jsonResponse({ success: false, data: null, error: { code: "NOT_FOUND", message: "No transcript found for this project yet." } }, 404)
    );

    const result = await transcriptService.getTranscript("p1");
    expect(result).toBeNull();
  });
});
