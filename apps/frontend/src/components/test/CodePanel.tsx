"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodePanelProps {
  title?: string;
  code: string;
}

/** Copy-able code block showing the real Remotion code that produces the
 * page's current control state — generated from the actual live values,
 * not a canned string guessing at syntax. */
export function CodePanel({ title = "Remotion code", code }: CodePanelProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border border-[#23272F] rounded-lg overflow-hidden bg-[#0A0B0D]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0E1013] border-b border-[#23272F]">
        <span className="text-[8px] font-bold uppercase tracking-widest text-white/50">{title}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-white/60 hover:text-[#FFB800] cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-[#00F5C4]" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 text-[10px] leading-relaxed text-[#B9FFF1] font-mono overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}
