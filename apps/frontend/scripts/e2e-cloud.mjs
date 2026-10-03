/* Cloud transcription fallback (Groq) end-to-end, against a local MOCK of Groq's /audio/transcriptions API.
   Setup (the script does NOT edit env files): add to apps/frontend/.env.local while running, then remove:
     GROQ_BASE_URL=http://localhost:3999/openai/v1
     GROQ_API_KEY=revoked-key
     GROQ_API_KEY_BACKUP=good-key
   Needs the frontend dev server on :3000 and packages/companion/.e2e-out/input.mp4 (or $E2E_VIDEO). Self-cleaning. */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = join(root, "..", "..");
const { createClient } = createRequire(join(root, "package.json"))("@supabase/supabase-js");
const env = Object.fromEntries(readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const BASE = process.env.APP_URL ? `${process.env.APP_URL}/api/v1` : `http://localhost:${process.env.API_PORT ?? "3000"}/api/v1`;
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const VIDEO = process.env.E2E_VIDEO ?? join(REPO, "packages", "companion", ".e2e-out", "input.mp4");
let pass = 0, fail = 0;
const check = (n, c, x = "") => { (c ? pass++ : fail++); console.log(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  -> " + String(x).slice(0, 300)}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- mock Groq
const seen = { keys: [], models: [], granularities: [], bytes: 0 };
let mode = "ok";
const mock = createServer((req, res) => {
  if (!req.url.endsWith("/audio/transcriptions")) return res.writeHead(404).end();
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("latin1");
    const key = (req.headers.authorization ?? "").replace("Bearer ", "");
    seen.keys.push(key);
    seen.models.push(/name="model"\r\n\r\n([^\r]+)/.exec(body)?.[1]);
    seen.granularities.push([...body.matchAll(/name="timestamp_granularities\[\]"\r\n\r\n([^\r]+)/g)].map((m) => m[1]).join(","));
    seen.bytes = chunks.reduce((n, c) => n + c.length, 0);
    if (key === "revoked-key") return res.writeHead(401, { "content-type": "application/json" }).end('{"error":{"message":"Invalid API Key"}}');
    if (mode === "fail") return res.writeHead(503, { "content-type": "application/json" }).end('{"error":{"message":"over capacity"}}');
    const words = ["Cloud", "captions", "are", "working", "great."].map((w, i) => ({ word: w, start: 0.2 + i * 0.4, end: 0.55 + i * 0.4 }));
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ task: "transcribe", language: "english", duration: 6.5, text: words.map((w) => w.word).join(" "), words, segments: [{ start: 0, end: 2.4, avg_logprob: -0.12 }] }));
  });
});
await new Promise((r) => mock.listen(3999, r));

const call = async (method, path, token, body) => {
  const r = await fetch(BASE + path, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
const waitFor = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(1500); } return null; };

let uid;
try {
  const email = `e2e-cloud-${Date.now()}@capseasy.test`, password = `Pw-${Date.now()}-x!`;
  const { data: cu } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  uid = cu.user.id;
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const token = (await anon.auth.signInWithPassword({ email, password })).data.session.access_token;
  const file = readFileSync(VIDEO);

  const upload = async (title) => {
    const { data: p } = await admin.from("projects").insert({ owner_id: uid, title }).select("id").single();
    const reg = await call("POST", `/projects/${p.id}/videos`, token, { filename: "clip.mp4", size: file.length, mime: "video/mp4", probe: { durationMs: 6500, width: 720, height: 1280 } });
    await anon.storage.from("media").uploadToSignedUrl(reg.data.path, reg.data.token, new Blob([file], { type: "video/mp4" }));
    return { pid: p.id, videoId: reg.data.videoId };
  };

  // 1) no computer online -> auto picks the cloud; first key is revoked -> backup key is used
  const a = await upload("cloud A");
  const done = await call("POST", `/videos/${a.videoId}/complete`, token, {});
  check("no companion online -> transcription runs in the cloud", done.status === 200 && done.data.engine === "cloud", JSON.stringify(done));
  const docA = await waitFor(async () => (await call("GET", `/projects/${a.pid}/studio`, token)).data?.document?.doc);
  check("cloud captions appear in the studio", docA?.words?.map((w) => w.text).join(" ") === "Cloud captions are working great.", JSON.stringify(docA?.words));
  check("word timings converted from seconds", docA?.words?.[0]?.startMs === 200 && docA.words[0].endMs === 550, JSON.stringify(docA?.words?.[0]));
  check("revoked primary key -> fell back to the backup key", seen.keys.includes("revoked-key") && seen.keys.at(-1) === "good-key", JSON.stringify(seen.keys));
  check("requested word timestamps from whisper-large-v3-turbo", seen.models.at(-1) === "whisper-large-v3-turbo" && /word/.test(seen.granularities.at(-1)), JSON.stringify(seen));
  check("the real video bytes were sent", seen.bytes > file.length, `${seen.bytes} vs ${file.length}`);
  const { data: jobA } = await admin.from("jobs").select("status, engine").eq("id", done.data.jobId).single();
  check("job completed with engine=cloud", jobA.status === "completed" && jobA.engine === "cloud", JSON.stringify(jobA));
  const { data: usage } = await admin.from("usage_events").select("kind, amount").eq("owner_id", uid);
  check("cloud minutes metered", usage.some((u) => u.kind === "cloud_transcribe_s" && u.amount === 7), JSON.stringify(usage));

  // 2) provider outage -> clear failure -> retry succeeds
  mode = "fail";
  const b = await upload("cloud B");
  const doneB = await call("POST", `/videos/${b.videoId}/complete`, token, {});
  const failed = await waitFor(async () => { const s = (await call("GET", `/projects/${b.pid}/studio`, token)).data; return s?.job?.status === "failed" ? s.job : null; }, 45000);
  check("provider outage -> job fails with a readable message", failed && /Cloud transcription failed/.test(failed.error_message), JSON.stringify(failed));
  mode = "ok";
  const retry = await call("POST", `/jobs/${doneB.data.jobId}/retry`, token);
  const docB = await waitFor(async () => (await call("GET", `/projects/${b.pid}/studio`, token)).data?.document?.doc);
  check("retry re-runs the cloud job and succeeds", retry.status === 200 && docB?.words?.length === 5, JSON.stringify(retry));

  // 3) user prefers their computer -> waits; "Use the cloud instead" switches the waiting job
  await admin.from("profiles").update({ preferences: { transcription_engine: "local" } }).eq("id", uid);
  const c = await upload("cloud C");
  const doneC = await call("POST", `/videos/${c.videoId}/complete`, token, {});
  const sc = (await call("GET", `/projects/${c.pid}/studio`, token)).data;
  check("preference 'local' -> waits for the computer, cloud offered", doneC.data.engine === "local" && sc.job?.status === "queued" && sc.cloudAvailable === true, JSON.stringify({ e: doneC.data.engine, j: sc.job?.status, c: sc.cloudAvailable }));
  const sw = await call("POST", `/projects/${c.pid}/transcribe`, token, { engine: "cloud" });
  const docC = await waitFor(async () => (await call("GET", `/projects/${c.pid}/studio`, token)).data?.document?.doc);
  const { data: oldJob } = await admin.from("jobs").select("status").eq("id", doneC.data.jobId).single();
  check("'Use the cloud instead' cancels the waiting job and transcribes in the cloud", sw.data?.engine === "cloud" && docC?.words?.length === 5 && oldJob.status === "cancelled", JSON.stringify({ sw, old: oldJob }));

  // 4) monthly quota used up -> cloud not offered, explicit cloud request refused
  await admin.from("usage_events").insert({ owner_id: uid, kind: "cloud_transcribe_s", amount: 999999 });
  const d = await upload("cloud D");
  await call("POST", `/videos/${d.videoId}/complete`, token, {});
  const sd = (await call("GET", `/projects/${d.pid}/studio`, token)).data;
  check("quota exhausted -> cloud not offered", sd.cloudAvailable === false, JSON.stringify(sd.cloudAvailable));
  const refused = await call("POST", `/projects/${d.pid}/transcribe`, token, { engine: "cloud" });
  check("quota exhausted -> explicit cloud request refused with reason", refused.status === 409 && /cloud minutes/i.test(refused.error?.message), JSON.stringify(refused));
} catch (e) {
  fail++; console.log("FATAL", e);
} finally {
  mock.close();
  if (uid) {
    const { data: projs } = await admin.from("projects").select("id").eq("owner_id", uid);
    const pids = (projs ?? []).map((p) => p.id);
    if (pids.length) { for (const t of ["caption_documents", "exports", "jobs", "transcripts", "videos"]) await admin.from(t).delete().in("project_id", pids); await admin.from("projects").delete().in("id", pids); }
    await admin.from("usage_events").delete().eq("owner_id", uid);
    const walk = async (p) => { const { data } = await admin.storage.from("media").list(p, { limit: 100 }); for (const o of data ?? []) { if (o.id) await admin.storage.from("media").remove([`${p}/${o.name}`]); else await walk(`${p}/${o.name}`); } };
    await walk(uid);
    await admin.from("profiles").delete().eq("id", uid);
    await admin.auth.admin.deleteUser(uid);
  }
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
