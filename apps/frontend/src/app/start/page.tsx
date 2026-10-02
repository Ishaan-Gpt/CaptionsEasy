"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/auth/supabaseClient";
import { projectsService } from "@/services/projects";
import { startGuestSession } from "@/services/auth/guest";
import type { Project } from "@/services/types";

/**
 * Where every sign-in lands (password, Google/OAuth, email confirmation): straight into the studio.
 * Reuses the newest EMPTY draft (no video yet) so repeated logins don't pile up blank projects; otherwise
 * creates the next "Untitled 001". `replace`, never `push`, so Back doesn't bounce through here.
 */
const isEmptyDraft = (p: Project) => !p.archived_at && !p.deleted_at && String(p.status ?? "").toUpperCase() === "CREATED";

function nextUntitled(projects: Project[]) {
  const used = projects.map((p) => /^Untitled (\d+)$/i.exec(p.title.trim())?.[1]).filter(Boolean).map(Number);
  return `Untitled ${String((used.length ? Math.max(...used) : 0) + 1).padStart(3, "0")}`;
}

/** The session can still be arriving (OAuth / confirmation links carry it in the URL): wait briefly for it. */
async function waitForSession(ms = 6000) {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  return new Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>((resolve) => {
    const t = setTimeout(() => {
      sub.subscription.unsubscribe();
      resolve(null);
    }, ms);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) return;
      clearTimeout(t);
      sub.subscription.unsubscribe();
      resolve(session);
    });
  });
}

export default function StartPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return; // Strict Mode runs effects twice: never create two projects
    once.current = true;
    void (async () => {
      // new visitor: straight into the studio as a guest; they sign up only when they export
      const session = (await waitForSession(/[?&]code=|access_token=|token_hash=/.test(window.location.search + window.location.hash) ? 6000 : 400)) ?? ((await startGuestSession()) ? (await supabase.auth.getSession()).data.session : null);
      if (!session) return router.replace("/login?mode=signup");
      try {
        const projects = await projectsService.getProjects();
        const draft = projects
          .filter(isEmptyDraft)
          .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
        const project = draft ?? (await projectsService.createProject(nextUntitled(projects)));
        router.replace(`/projects/${project.id}`);
      } catch {
        setFailed(true);
      }
    })();
  }, [router]);

  return (
    <div className="grid min-h-[100svh] place-items-center bg-[#FFFFEB] px-6 text-center">
      {failed ? (
        <div>
          <p className="text-[15px] font-semibold text-[#1A1A1A]">We couldn&apos;t open your studio.</p>
          <button onClick={() => router.replace("/dashboard")} className="mt-4 rounded-full bg-[#1A1A1A] px-5 py-2.5 text-sm font-semibold text-[#FFFFEB]">
            Go to your dashboard
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-9 items-end gap-[5px]" aria-hidden>
            {["#1A1A1A", "#FFA946", "#34D399"].map((c, i) => (
              <span key={c} className="block w-2 animate-pulse rounded-full" style={{ background: c, height: ["60%", "100%", "80%"][i], animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
          <p className="text-[13px] font-semibold text-[#1A1A1A]/70">Opening your studio…</p>
        </div>
      )}
    </div>
  );
}
