"use client";

import React from "react";
import { Link2, AlertTriangle } from "lucide-react";

interface ProjectLinkProps {
  /** Repo-relative path this feature maps to, e.g. "apps/remotion-pipeline/src/Subtitles.tsx:233" */
  file: string;
  /** One-line description of the concrete tie-in to CaptionsEasy's real pipeline. */
  description: string;
  /** Set when the capability isn't used in production yet — renders as a flagged gap/opportunity instead of an existing mapping. */
  gap?: boolean;
}

/** Callout every feature card on every /test page must carry: where this
 * Remotion capability lives (or could live) in CaptionsEasy's actual
 * pipeline, so nothing in the explorer floats disconnected from the
 * product it exists to serve. */
export function ProjectLink({ file, description, gap = false }: ProjectLinkProps) {
  return (
    <div
      className={`flex items-start gap-2 rounded border px-2.5 py-2 text-[9px] leading-relaxed ${
        gap
          ? "border-[#FFB800]/30 bg-[#FFB800]/5 text-[#FFDF8C]"
          : "border-[#00F5C4]/25 bg-[#00F5C4]/5 text-[#B9FFF1]"
      }`}
    >
      {gap ? <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-[#FFB800]" /> : <Link2 className="w-3 h-3 mt-0.5 shrink-0 text-[#00F5C4]" />}
      <div>
        <div className="font-mono text-[8px] text-white/70 mb-0.5">{file}</div>
        <div>
          {gap ? <span className="font-bold uppercase tracking-wider">Not used yet — </span> : null}
          {description}
        </div>
      </div>
    </div>
  );
}
