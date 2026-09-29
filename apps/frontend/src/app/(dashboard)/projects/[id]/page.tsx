"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectsService } from "@/services/projects";
import { authService } from "@/services/auth";
import { Player, PlayerRef } from "@remotion/player";
import { CaptionComposition, CaptionStyleSettings } from "@/remotion/CaptionComposition";
import { Caption } from "@remotion/captions";

// Simple UI Components
import { ArrowLeft, Play, Pause, Download, Type, LayoutTemplate } from "lucide-react";

export default function RemotionStudioPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const playerRef = useRef<PlayerRef>(null);
  
  // Data Fetching
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsService.getProjectById(projectId),
    enabled: authService.isAuthenticated(),
  });

  // Editor State
  const [activeTab, setActiveTab] = useState<"text" | "templates">("text");
  
  const [styleSettings, setStyleSettings] = useState<CaptionStyleSettings>({
    fontFamily: "Montserrat",
    fontFace: "Extra Bold",
    fontSize: 56,
    secondaryFontFamily: "Poppins",
    secondaryFontFace: "Regular",
    secondaryFontSize: 36,
    color: "#FFFFFF",
    highlightColor: "#00FF00",
    casing: "none",
    alignment: "center",
    yPositionPercent: 70,
    entranceAnim: "rise",
    highlightAnim: "pop",
    shadowEnabled: true,
    strokeEnabled: true,
    backgroundEnabled: false,
  });

  // Video State
  const [isPlaying, setIsPlaying] = useState(false);

  // Derive captions from project
  const transcriptTokens = useMemo<Caption[]>(() => {
    if (!project?.transcript?.transcript_json?.words) return [];
    return project.transcript.transcript_json.words.map((w: any) => ({
      text: w.word,
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
      timestampMs: null,
      confidence: w.probability ?? null,
    }));
  }, [project]);

  const videoUrl = project?.video?.storage_path ? 
    `https://obxugkghzszatjmqoigf.supabase.co/storage/v1/object/public/videos/${project.video.storage_path}` : null;

  // We should fetch dimensions dynamically, but for now fallback to 9:16 standard
  const aspectW = project?.aspect_ratio === "16:9" ? 1920 : project?.aspect_ratio === "1:1" ? 1080 : 1080;
  const aspectH = project?.aspect_ratio === "16:9" ? 1080 : project?.aspect_ratio === "1:1" ? 1080 : 1920;
  const durationInFrames = Math.max(1, Math.round((project?.video?.duration_ms ?? 10000) / 1000 * 30));

  if (isLoading) return <div className="min-h-screen bg-[#111111] flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#111111] text-white overflow-hidden font-sans">
      
      {/* Top Navigation */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#111111] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")} className="p-2 hover:bg-white/10 rounded-full transition">
            <ArrowLeft size={18} />
          </button>
          <span className="font-semibold">{project?.title || "Untitled Project"}</span>
        </div>
        <div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-1.5 px-4 rounded-lg flex items-center gap-2 transition text-sm">
            <Download size={16} /> Export
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Captions List */}
        <aside className="w-[300px] border-r border-white/10 flex flex-col bg-[#161616]">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2"><Type size={18}/> Captions</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {transcriptTokens.length === 0 ? (
              <div className="text-white/50 text-sm text-center mt-10">No captions found</div>
            ) : (
              transcriptTokens.map((token, i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    if (playerRef.current) {
                      const frame = Math.floor((token.startMs / 1000) * 30);
                      playerRef.current.seekTo(frame);
                    }
                  }}
                  className="flex gap-3 text-sm p-2 hover:bg-white/5 rounded-md cursor-pointer transition"
                >
                  <span className="text-white/40 w-4">{i + 1}</span>
                  <span className="text-white/90">{token.text}</span>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center: Video Player */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 bg-black relative">
          <div className="w-full max-w-[400px] aspect-[9/16] relative bg-[#111] rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
            {videoUrl ? (
              <Player
                ref={playerRef}
                component={CaptionComposition}
                inputProps={{
                  videoUrl,
                  captions: transcriptTokens,
                  styleSettings,
                }}
                durationInFrames={durationInFrames}
                fps={30}
                compositionWidth={aspectW}
                compositionHeight={aspectH}
                style={{ width: "100%", height: "100%" }}
                controls={false}
                autoPlay={false}
                loop
                clickToPlay={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/30">
                No Video Uploaded
              </div>
            )}
          </div>

          {/* Simple Player Controls Below Canvas */}
          <div className="mt-6 flex items-center gap-4 bg-[#161616] py-2 px-4 rounded-full border border-white/10">
            <button 
              onClick={() => {
                if (playerRef.current) {
                  if (isPlaying) playerRef.current.pause();
                  else playerRef.current.play();
                  setIsPlaying(!isPlaying);
                }
              }} 
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
            </button>
            <div className="text-sm text-white/60 font-mono">
              00:00:00 / 00:00:00
            </div>
          </div>
        </main>

        {/* Right Sidebar: Tools */}
        <aside className="w-[320px] border-l border-white/10 flex flex-col bg-[#161616]">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button 
              onClick={() => setActiveTab("text")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${activeTab === "text" ? "border-emerald-500 text-emerald-500" : "border-transparent text-white/60 hover:text-white"}`}
            >
              Text
            </button>
            <button 
              onClick={() => setActiveTab("templates")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${activeTab === "templates" ? "border-emerald-500 text-emerald-500" : "border-transparent text-white/60 hover:text-white"}`}
            >
              Templates
            </button>
          </div>

          {/* Tools Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "text" ? (
              <div className="space-y-6">
                
                {/* FONTS */}
                <div>
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Fonts</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/70 block mb-1">Font Family</label>
                      <select 
                        value={styleSettings.fontFamily}
                        onChange={(e) => setStyleSettings({...styleSettings, fontFamily: e.target.value})}
                        className="w-full bg-[#222] border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                      >
                        <option>Montserrat</option>
                        <option>Inter</option>
                        <option>Anton</option>
                        <option>Outfit</option>
                        <option>Impact</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-white/70 block mb-1">Face</label>
                        <select 
                          value={styleSettings.fontFace}
                          onChange={(e) => setStyleSettings({...styleSettings, fontFace: e.target.value})}
                          className="w-full bg-[#222] border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                        >
                          <option>Regular</option>
                          <option>Bold</option>
                          <option>Extra Bold</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-white/70 block mb-1">Size</label>
                        <div className="flex items-center gap-2 bg-[#222] border border-white/10 rounded px-2">
                          <input 
                            type="range" min="20" max="120" 
                            value={styleSettings.fontSize}
                            onChange={(e) => setStyleSettings({...styleSettings, fontSize: Number(e.target.value)})}
                            className="w-full accent-emerald-500" 
                          />
                          <span className="text-xs">{styleSettings.fontSize}px</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10" />

                {/* COLOR */}
                <div>
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Color</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">Text Color</span>
                    <input 
                      type="color" 
                      value={styleSettings.color}
                      onChange={(e) => setStyleSettings({...styleSettings, color: e.target.value})}
                      className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/80">Highlight Color</span>
                    <input 
                      type="color" 
                      value={styleSettings.highlightColor}
                      onChange={(e) => setStyleSettings({...styleSettings, highlightColor: e.target.value})}
                      className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                  </div>
                </div>

                <div className="border-t border-white/10" />

                {/* POSITION */}
                <div>
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Position</h3>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Y-Axis</label>
                    <input 
                      type="range" min="10" max="90" 
                      value={styleSettings.yPositionPercent}
                      onChange={(e) => setStyleSettings({...styleSettings, yPositionPercent: Number(e.target.value)})}
                      className="w-full accent-emerald-500" 
                    />
                  </div>
                </div>

                <div className="border-t border-white/10" />

                {/* SPACING */}
                <div>
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Spacing</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/70 block mb-1">Alignment</label>
                      <select 
                        value={styleSettings.alignment}
                        onChange={(e) => setStyleSettings({...styleSettings, alignment: e.target.value as any})}
                        className="w-full bg-[#222] border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10" />

                {/* EMPHASIS */}
                <div>
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Emphasis</h3>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-white/70 block mb-1">Casing</label>
                        <select 
                          value={styleSettings.casing}
                          onChange={(e) => setStyleSettings({...styleSettings, casing: e.target.value as any})}
                          className="w-full bg-[#222] border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                        >
                          <option value="none">None</option>
                          <option value="uppercase">UPPERCASE</option>
                          <option value="lowercase">lowercase</option>
                          <option value="capitalize">Capitalize</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-white/70 block mb-1">Entrance Anim</label>
                        <select 
                          value={styleSettings.entranceAnim}
                          onChange={(e) => setStyleSettings({...styleSettings, entranceAnim: e.target.value as any})}
                          className="w-full bg-[#222] border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                        >
                          <option value="none">None</option>
                          <option value="rise">Rise</option>
                          <option value="pop">Pop</option>
                          <option value="fade">Fade</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-white/70 block mb-1">Highlight Anim</label>
                        <select 
                          value={styleSettings.highlightAnim}
                          onChange={(e) => setStyleSettings({...styleSettings, highlightAnim: e.target.value as any})}
                          className="w-full bg-[#222] border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                        >
                          <option value="pop">Pop</option>
                          <option value="flash">Flash</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10" />

                {/* EFFECTS */}
                <div>
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Effects</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input 
                        type="checkbox" 
                        checked={styleSettings.shadowEnabled} 
                        onChange={(e) => setStyleSettings({...styleSettings, shadowEnabled: e.target.checked})}
                        className="accent-emerald-500"
                      />
                      Drop Shadow
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input 
                        type="checkbox" 
                        checked={styleSettings.strokeEnabled} 
                        onChange={(e) => setStyleSettings({...styleSettings, strokeEnabled: e.target.checked})}
                        className="accent-emerald-500"
                      />
                      Text Stroke
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input 
                        type="checkbox" 
                        checked={styleSettings.backgroundEnabled} 
                        onChange={(e) => setStyleSettings({...styleSettings, backgroundEnabled: e.target.checked})}
                        className="accent-emerald-500"
                      />
                      Highlight Box
                    </label>
                  </div>
                </div>

              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {/* Placeholder templates */}
                <div className="aspect-video bg-[#222] rounded flex items-center justify-center border border-white/10 hover:border-emerald-500 cursor-pointer transition">
                  <span className="text-xs font-bold text-emerald-400 uppercase">Hormozi</span>
                </div>
                <div className="aspect-video bg-[#222] rounded flex items-center justify-center border border-white/10 hover:border-emerald-500 cursor-pointer transition">
                  <span className="text-xs font-bold text-yellow-400 uppercase shadow-md">MrBeast</span>
                </div>
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* Bottom Timeline */}
      <footer className="h-48 border-t border-white/10 bg-[#161616] p-4 shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 bg-[#222] rounded px-2 py-1 border border-white/10">
            <button className="text-xs px-2 py-1 bg-white/10 rounded">WORD</button>
            <button className="text-xs px-2 py-1 hover:bg-white/5 rounded text-white/50">LINE</button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">Zoom</span>
            <input type="range" className="w-24 accent-emerald-500" />
          </div>
        </div>
        <div className="flex-1 bg-[#111] border border-white/10 rounded relative overflow-hidden flex flex-col">
          {/* Baby timeline representation */}
          <div className="h-8 border-b border-white/5 bg-[#1a1a1a] flex items-center px-2">
            <span className="text-[10px] text-emerald-500 font-medium">T Captions</span>
          </div>
          <div className="flex-1 p-2 relative">
             <div className="absolute top-2 left-10 w-20 h-6 bg-emerald-500/20 border border-emerald-500/50 rounded flex items-center justify-center text-[10px] text-emerald-400">talking</div>
             <div className="absolute top-2 left-32 w-24 h-6 bg-emerald-500/20 border border-emerald-500/50 rounded flex items-center justify-center text-[10px] text-emerald-400">about their</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
