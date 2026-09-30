import { ApiError, CompanionApi, type ClaimedJob } from "./api";
import type { Config } from "./config";
import { runProxy } from "./executors/proxy";
import { runRender } from "./executors/render";
import { runTranscribe } from "./executors/transcribe";
import type { JobContext } from "./executors/context";
import { log } from "./log";
import { buildCapabilities, VERSION } from "./system";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

interface Active {
  id: string;
  controller: AbortController;
  reason: "cancelled" | "lease" | null;
}

/** Errors that will fail identically on retry: tell the server not to burn attempts on them. */
function classify(e: unknown): { code: string; retryable: boolean; message: string } {
  const message = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code;
  if (code === "NO_AUDIO") return { code, retryable: false, message };
  if (code === "ENOSPC" || /no space left/i.test(message)) return { code: "DISK_FULL", retryable: false, message: "Your computer is out of disk space. Free some space and retry." };
  if (/Unsupported|Invalid data found|moov atom not found|could not find codec/i.test(message)) return { code: "BAD_MEDIA", retryable: false, message: `The video could not be read: ${message.slice(0, 300)}` };
  return { code: code && typeof code === "string" ? code : "WORKER_ERROR", retryable: true, message };
}

export async function runCompanion(cfg: Config, opts: { once?: boolean; signal?: AbortSignal } = {}) {
  if (!cfg.token) throw new Error("This computer is not paired yet. Run: capseasy login");
  const api = new CompanionApi(cfg.apiBase, cfg.token);
  let active: Active | null = null;
  let stopped = false;
  let refuseJobs = false;

  const stop = (why: string) => {
    if (!stopped) log.error(why);
    stopped = true;
  };
  opts.signal?.addEventListener("abort", () => (stopped = true), { once: true });

  const heartbeat = async () => {
    try {
      const hb = await api.heartbeat({ version: VERSION, platform: process.platform, capabilities: await buildCapabilities(), currentJobId: active?.id ?? null });
      if (hb) {
        if (cmp(VERSION, hb.minVersion) < 0) {
          if (!refuseJobs) log.error(`This companion (${VERSION}) is older than the required ${hb.minVersion}. Update it, then restart.`);
          refuseJobs = true;
        }
        if (active && hb.cancelJobIds.includes(active.id)) {
          active.reason = "cancelled";
          active.controller.abort();
        }
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) stop("This computer's access was revoked. Pair it again with: capseasy login");
      else log.warn(`heartbeat failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  const execute = async (claimed: ClaimedJob) => {
    const a: Active = { id: claimed.job.id, controller: new AbortController(), reason: null };
    active = a;
    let lastSent = 0;
    let lastStage = "Starting";
    let lastPercent = 0;
    // sends progress AND renews the server-side lease; cancellation/lease loss abort the signal instead of throwing
    const send = async (stage: string, percent: number, message?: string) => {
      try {
        const r = await api.progress(claimed.job.id, stage, percent, message);
        if (r?.cancelRequested && !a.reason) {
          a.reason = "cancelled";
          a.controller.abort();
        }
      } catch (e) {
        if (e instanceof ApiError && e.code === "LEASE_LOST" && !a.reason) {
          a.reason = "lease";
          a.controller.abort();
        }
      }
    };
    const ctx: JobContext = {
      api,
      cfg,
      claimed,
      signal: a.controller.signal,
      report: async (stage, percent, message) => {
        const now = Date.now();
        const changed = stage !== lastStage;
        lastStage = stage;
        lastPercent = percent;
        if (!changed && now - lastSent < 1000) return;
        lastSent = now;
        await send(stage, percent, message);
      },
    };
    // long silent steps (first-run browser/model downloads) must not let the 90 s lease expire
    const keepalive = setInterval(() => {
      if (!a.controller.signal.aborted) void send(lastStage, lastPercent);
    }, 20_000);
    log.info(`job ${claimed.job.id.slice(0, 8)} ${claimed.job.kind} started (attempt ${claimed.job.attempts})`);
    try {
      if (claimed.job.kind === "transcribe") await runTranscribe(ctx);
      else if (claimed.job.kind === "render") await runRender(ctx);
      else if (claimed.job.kind === "proxy") await runProxy(ctx);
      else throw Object.assign(new Error(`Unsupported job kind: ${claimed.job.kind}`), { code: "UNSUPPORTED", retryable: false });
      log.info(`job ${claimed.job.id.slice(0, 8)} completed`);
    } catch (e) {
      if (a.reason === "lease") {
        log.warn(`job ${claimed.job.id.slice(0, 8)}: lease lost, dropping work`);
      } else if (a.reason === "cancelled" || a.controller.signal.aborted) {
        log.info(`job ${claimed.job.id.slice(0, 8)} cancelled`);
        await api.fail(claimed.job.id, "CANCELLED", "Cancelled", false).catch(() => undefined);
      } else {
        const c = classify(e);
        log.error(`job ${claimed.job.id.slice(0, 8)} failed: ${c.message}`);
        await api.fail(claimed.job.id, c.code, c.message, c.retryable).catch((err) => log.error(`could not report failure: ${err instanceof Error ? err.message : err}`));
      }
    } finally {
      clearInterval(keepalive);
      active = null;
    }
  };

  log.info(`companion ${VERSION} online (${cfg.apiBase})`);
  await heartbeat();
  const hbTimer = setInterval(() => void heartbeat(), 15_000 + Math.random() * 2000);

  try {
    while (!stopped) {
      if (!active && !refuseJobs) {
        try {
          // long-poll (20 s): picks a new job up within ~1 s instead of waiting for the next poll tick
          const claimed = await api.claim(["transcribe", "render", "proxy"], 20_000);
          if (claimed) {
            await execute(claimed);
            if (opts.once) break;
            continue;
          }
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) stop("This computer's access was revoked. Pair it again with: capseasy login");
          else log.warn(`claim failed: ${e instanceof Error ? e.message : e}`);
        }
      }
      // the claim itself already waited; only pause briefly (longer after errors or when refusing jobs)
      await sleep(refuseJobs ? 15_000 : 250 + Math.random() * 250);
    }
  } finally {
    clearInterval(hbTimer);
    if (active) {
      (active as Active).reason = "cancelled";
      (active as Active).controller.abort();
    }
  }
}
