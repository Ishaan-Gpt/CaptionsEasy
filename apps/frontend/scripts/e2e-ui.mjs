// Drives the REAL studio UI in headless Chrome against the live API + a real companion process.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { join } from "node:path";

/* Real-browser test of the studio. Needs: frontend dev server on :3000, and a sample speech video at
   packages/companion/.e2e-out/input.mp4 (created by packages/companion/scripts/e2e.mjs) or $E2E_VIDEO.
   Run: node apps/frontend/scripts/e2e-ui.mjs   (screenshots land in apps/frontend/.e2e-ui/shots) */
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = process.env.E2E_OUT ?? join(REPO, "apps", "frontend", ".e2e-ui");
const SHOTS = join(OUT, "shots");
mkdirSync(SHOTS, { recursive: true });
const requireFE = createRequire(`${REPO}/apps/frontend/package.json`);
const { createClient } = requireFE("@supabase/supabase-js");
const puppeteer = requireFE("puppeteer-core");

const env = Object.fromEntries(readFileSync(`${REPO}/apps/frontend/.env.local`, "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]));
const APP = "http://localhost:3000";
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
let pass = 0, fail = 0;
const check = (n, c, x = "") => { (c ? pass++ : fail++); log(c ? "PASS" : "FAIL", n, c ? "" : "-> " + String(x).slice(0, 300)); };
const api = async (method, path, token, body) => {
  const r = await fetch(`${APP}/api/v1${path}`, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cenv = { ...process.env, CAPSEASY_CONFIG: join(OUT, "cfg"), CAPSEASY_CACHE: join(OUT, "cache"), CAPSEASY_DATA: process.env.E2E_DATA ?? join(OUT, "whisper") };
const CLI = `${REPO}/packages/companion/bin/capseasy.mjs`;
const runCli = (args, onLine) => new Promise((resolve) => {
  const p = spawn(process.execPath, [CLI, ...args], { env: cenv });
  let all = "";
  const feed = (d) => { const s = d.toString(); all += s; s.split(/\r?\n/).forEach((l) => l && onLine?.(l)); };
  p.stdout.on("data", feed); p.stderr.on("data", feed);
  p.on("close", (code) => resolve({ code, all }));
});

let uid, browser;
try {
  // ---------- setup: user, project, uploaded video, paired companion (all through the real API)
  const email = `e2e-ui-${Date.now()}@capseasy.test`, password = `Pw-${Date.now()}-x!`;
  const { data: cu } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  uid = cu.user.id;
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data: sess } = await anon.auth.signInWithPassword({ email, password });
  const token = sess.session.access_token;
  await admin.from("profiles").update({ preferences: { whisper_model: "tiny.en" } }).eq("id", uid);
  const { data: proj } = await admin.from("projects").insert({ owner_id: uid, title: "UI E2E", status: "DRAFT" }).select("id").single();
  const pid = proj.id;
  const mp4 = process.env.E2E_VIDEO ?? join(REPO, "packages", "companion", ".e2e-out", "input.mp4");
  check("sample video exists", existsSync(mp4));

  // ---------- 1. UI: empty project shows the upload panel
  const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  browser = await puppeteer.launch({ executablePath: `${REPO}/packages/compositions/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe`, headless: "shell", args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.evaluateOnNewDocument((k, v) => localStorage.setItem(k, v), `sb-${ref}-auth-token`, JSON.stringify(sess.session));
  await page.goto(`${APP}/projects/${pid}`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.waitForFunction(() => document.body.innerText.includes("Drop your video here"), { timeout: 60000 });
  check("empty project shows upload panel", true);
  await page.screenshot({ path: join(SHOTS, "1-upload.png") });

  // ---------- 2. UI upload: feed the real file through the actual <input type=file>
  const input = await page.$('input[type="file"]');
  await input.uploadFile(mp4);
  await page.waitForFunction(() => /Waiting for your computer/.test(document.body.innerText), { timeout: 90000 });
  check("after UI upload: 'Waiting for your computer' (companion offline)", true);
  await page.screenshot({ path: join(SHOTS, "2-waiting.png") });

  // ---------- 3. pair companion (approve through the real pair page API) and process
  let code = null;
  const lg = runCli(["login", "--api", APP, "--no-open", "--name", "UI Test PC"], (l) => { const m = /matches:\s+([A-Z0-9]{4}-[A-Z0-9]{4})/.exec(l); if (m && !code) { code = m[1]; api("POST", "/device/approve", token, { userCode: code }); } });
  check("companion paired", (await lg).code === 0);
  // the pair page in the real UI
  const pair = await browser.newPage();
  await pair.evaluateOnNewDocument((k, v) => localStorage.setItem(k, v), `sb-${ref}-auth-token`, JSON.stringify(sess.session));
  const start = await api("POST", "/device/start", null, { workerName: "Pair Page PC", platform: "win32" });
  await pair.goto(`${APP}/pair?code=${start.data.userCode}`, { waitUntil: "networkidle2", timeout: 60000 });
  await pair.waitForFunction(() => document.body.innerText.includes("Pair Page PC"), { timeout: 30000 });
  await pair.evaluate(() => [...document.querySelectorAll("button")].find((b) => /confirm/i.test(b.textContent))?.click());
  await pair.waitForFunction(() => /now connected/i.test(document.body.innerText), { timeout: 30000 });
  check("pair page (device-code) approves a computer", true);
  await pair.screenshot({ path: join(SHOTS, "3-pair.png") });
  await pair.close();

  const t0 = Date.now();
  const comp = runCli(["start", "--once"]);
  // the open studio tab should flip from 'waiting' to progress to the editor by itself (polling)
  await page.waitForFunction(() => document.querySelector('[aria-label="Timeline"]') !== null, { timeout: 240000 });
  log("editor appeared", ((Date.now() - t0) / 1000).toFixed(0), "s after starting companion");
  check("studio auto-updated into the editor when captions were ready", true);
  await comp;
  await sleep(2500); // fonts + player
  await page.screenshot({ path: join(SHOTS, "4-editor.png") });

  const text = await page.evaluate(() => document.body.innerText);
  check("caption words are listed", /scrolling/i.test(text) && /incredible/i.test(text), text.slice(0, 300));
  check("default look applied and saved", (await admin.from("projects").select("look_id, style_json").eq("id", pid).single()).data.look_id === "hormozi_viral");
  const hasVideo = await page.evaluate(() => { const v = document.querySelector("video"); return v ? { rs: v.readyState, w: v.videoWidth, src: !!v.currentSrc } : null; });
  check("Player has a video element with a signed source", !!hasVideo?.src, JSON.stringify(hasVideo));

  // ---------- 4. play: captions should render into the DOM at a spoken moment
  await page.evaluate(() => document.querySelector("video")?.play?.());
  await sleep(2500);
  await page.screenshot({ path: join(SHOTS, "5-playing.png") });

  // ---------- 5. Looks tab
  await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find((b) => /Looks/.test(b.textContent))?.click());
  await sleep(800);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /MrBeast Punch/.test(b.textContent))?.click());
  await sleep(1500);
  const { data: afterLook } = await admin.from("projects").select("look_id, template_id, style_json").eq("id", pid).single();
  check("choosing a look persists (look, template, style)", afterLook.look_id === "mrbeast_punch" && afterLook.template_id === "word_by_word" && afterLook.style_json.fontId === "Lilita One", JSON.stringify(afterLook).slice(0, 200));
  await page.screenshot({ path: join(SHOTS, "6-looks.png") });

  // ---------- 6. Style tab: change size, position
  await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find((b) => /Style/.test(b.textContent))?.click());
  await sleep(600);
  await page.screenshot({ path: join(SHOTS, "7-style.png") });

  // ---------- 7. edit a word -> autosave -> server
  await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].find((b) => /Captions/.test(b.textContent))?.click());
  await sleep(500);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "incredible")?.click());
  await sleep(500);
  const edit = await page.$('input[aria-label="Edit word"]');
  check("word editor opens on click", !!edit);
  if (edit) {
    await edit.click();
    await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
    await page.keyboard.type("amazing");
    await page.waitForFunction(() => /Saved/.test(document.body.innerText), { timeout: 20000 });
    await sleep(1200);
    const doc = await api("GET", `/projects/${pid}/document`, token);
    check("edit autosaved to the server (rev bumped, text changed)", doc.data.revision >= 2 && doc.data.doc.words.some((w) => w.text === "amazing") && !doc.data.doc.words.some((w) => w.text === "incredible"), JSON.stringify(doc.data.doc?.words?.map((w) => w.text)));
  }
  await page.screenshot({ path: join(SHOTS, "8-edited.png") });

  // ---------- 8. undo
  await page.evaluate(() => document.activeElement?.blur?.());
  await page.keyboard.down("Control"); await page.keyboard.press("z"); await page.keyboard.up("Control");
  await sleep(1800);
  const doc2 = await api("GET", `/projects/${pid}/document`, token);
  check("Ctrl+Z undoes and re-saves", doc2.data.doc.words.some((w) => w.text === "incredible"), JSON.stringify(doc2.data.doc?.words?.map((w) => w.text)));

  // ---------- 9. export modal -> SRT
  await page.evaluate(() => [...document.querySelectorAll("header button")].find((b) => b.textContent.trim() === "Export")?.click());
  await page.waitForFunction(() => !!document.querySelector('[role="dialog"]'), { timeout: 10000 });
  await page.screenshot({ path: join(SHOTS, "9-export.png") });
  await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((b) => /\.srt/.test(b.textContent))?.click());
  await page.waitForFunction(() => ![...document.querySelectorAll('[role="dialog"] button')].some((b) => b.disabled), { timeout: 20000 });
  await sleep(500);
  const exps = await api("GET", `/projects/${pid}/exports`, token);
  check("clicking 'Subtitles (.srt)' created a ready export", exps.data.some((e) => e.kind === "srt" && e.status_v2 === "ready"), JSON.stringify(exps.data));
  await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((b) => /Video with captions/.test(b.textContent))?.click());
  await sleep(3000);
  const exps2 = await api("GET", `/projects/${pid}/exports`, token);
  check("clicking MP4 queues a render job", exps2.data.some((e) => e.kind === "mp4" && e.status_v2 === "queued"), JSON.stringify(exps2.data.map((e) => e.kind + ":" + e.status_v2)));
  await page.screenshot({ path: join(SHOTS, "10-export-queued.png") });

  const realErrors = errors.filter((e) => !/favicon|Download the React DevTools|hydrat/i.test(e));
  check("no unexpected browser console errors", realErrors.length === 0, realErrors.slice(0, 4).join(" | "));
} catch (e) {
  fail++; log("FATAL", e?.stack ?? e);
} finally {
  await browser?.close().catch(() => undefined);
  if (uid) {
    const { data: projs } = await admin.from("projects").select("id").eq("owner_id", uid);
    const pids = (projs ?? []).map((p) => p.id);
    if (pids.length) { for (const t of ["exports", "jobs", "transcripts", "videos"]) await admin.from(t).delete().in("project_id", pids); await admin.from("projects").delete().in("id", pids); }
    for (const t of ["workers", "device_codes", "usage_events"]) await admin.from(t).delete().eq("owner_id", uid);
    const walk = async (p) => { const { data } = await admin.storage.from("media").list(p, { limit: 100 }); for (const o of data ?? []) { if (o.id) await admin.storage.from("media").remove([`${p}/${o.name}`]); else await walk(`${p}/${o.name}`); } };
    await walk(uid);
    await admin.from("profiles").delete().eq("id", uid);
    await admin.auth.admin.deleteUser(uid);
  }
  // also remove the pair-page device code created without an owner
  await admin.from("device_codes").delete().eq("worker_name", "Pair Page PC");
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
