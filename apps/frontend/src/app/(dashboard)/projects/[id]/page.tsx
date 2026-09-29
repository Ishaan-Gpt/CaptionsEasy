"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { projectsService } from "@/services/projects";
import { authService } from "@/services/auth";
import { Player, PlayerRef } from "@remotion/player";
import { CaptionComposition } from "@/remotion/CaptionComposition";
import { CaptionStyle, DEFAULT_BOX } from "@motion-ai/caption-engine";
import { Caption } from "@remotion/captions";

// Simple UI Components
import { ArrowLeft, Play, Pause, Download, Type, ChevronDown, ChevronUp } from "lucide-react";

const Accordion = ({ title, isOpen, onToggle, children }: any) => (
  <div className="border-b border-white/10 last:border-0">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 px-4 text-xs font-bold text-white/40 uppercase tracking-wider hover:bg-white/5 transition"
    >
      {title}
      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
    {isOpen && <div className="p-4 pt-0">{children}</div>}
  </div>
);

export default function RemotionStudioPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const playerRef = useRef<PlayerRef>(null);
  
  // Data Fetching
  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsService.getProjectById(projectId),
    enabled: authService.isAuthenticated(),
  });

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Editor State
  const [activeTab, setActiveTab] = useState<"text" | "templates">("text");
  
  const [styleSettings, setStyleSettings] = useState<CaptionStyle>({
    template: "hormozi_block",
    font: "Montserrat",
    size: 64,
    weight: "900",
    color: "#FFFFFF",
    highlightColor: "#C5FF00",
    colorMode: "solid",
    alignment: "center",
    casing: "uppercase",
    underline: false,
    letterSpacing: 0,
    wordSpacing: 0,
    lineSpacing: 1.2,
    shadow: 0,
    shadowColor: "rgba(0,0,0,0.6)",
    outline: 2,
    outlineColor: "#000000",
    backgroundStyle: "none",
    xPercent: 50,
    yPercent: 75,
    staggeredLayout: "centre",
    entranceAnim: "rise",
    highlightAnim: "pop",
    box: DEFAULT_BOX,
  });

  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    Fonts: true,
    Position: false,
    Color: false,
    Emphasis: false,
    Spacing: false,
    Effects: false
  });
  
  const toggleDropdown = (key: string) => setOpenDropdowns(prev => ({...prev, [key]: !prev[key]}));

  // Video State
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Editable Captions State
  const [transcriptTokens, setTranscriptTokens] = useState<Caption[]>([]);

  useEffect(() => {
    if (project?.transcript?.transcript_json?.words && transcriptTokens.length === 0) {
      setTranscriptTokens(project.transcript.transcript_json.words.map((w: any) => ({
        text: w.word,
        startMs: Math.round(w.start * 1000),
        endMs: Math.round(w.end * 1000),
        timestampMs: null,
        confidence: w.probability ?? null,
      })));
    }
  }, [project, transcriptTokens.length]);

  const handleTextChange = (index: number, newText: string) => {
    setTranscriptTokens(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], text: newText };
      return copy;
    });
  };

  const videoUrl = project?.video?.storage_path ? 
    `https://obxugkghzszatjmqoigf.supabase.co/storage/v1/object/public/videos/${project.video.storage_path}` : null;

  const aspectW = project?.aspect_ratio === "16:9" ? 1920 : project?.aspect_ratio === "1:1" ? 1080 : 1080;
  const aspectH = project?.aspect_ratio === "16:9" ? 1080 : project?.aspect_ratio === "1:1" ? 1080 : 1920;
  
  const durationMs = project?.video?.duration_ms ?? 10000;
  const durationInFrames = Math.max(1, Math.round(durationMs / 1000 * 30));
  const timelineTotalWidth = (durationMs / 10) * zoom; // Base: 100px per second

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

      {/* Main Layout Area */}
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
                  className="flex gap-3 text-sm p-2 hover:bg-white/5 rounded-md transition items-center"
                >
                  <span 
                    className="text-white/40 w-4 cursor-pointer hover:text-emerald-500" 
                    onClick={() => {
                      if (playerRef.current) {
                        const frame = Math.floor((token.startMs / 1000) * 30);
                        playerRef.current.seekTo(frame);
                      }
                    }}
                  >
                    {i + 1}
                  </span>
                  <input
                    className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-emerald-500 outline-none text-white/90 w-full px-1"
                    value={token.text}
                    onChange={(e) => handleTextChange(i, e.target.value)}
                  />
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
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 bg-[#222]">
                {uploadProgress !== null ? (
                  <div className="flex flex-col items-center">
                    <div className="text-emerald-500 font-bold mb-2">Uploading: {Math.round(uploadProgress)}%</div>
                    <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center hover:text-white transition group p-4 border border-dashed border-white/20 rounded-lg hover:border-white/50">
                    <svg className="w-10 h-10 mb-3 opacity-50 group-hover:opacity-100 group-hover:text-emerald-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium">Click to upload video</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="video/mp4,video/quicktime,video/webm"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadProgress(0);
                          try {
                            const { uploadService } = await import("@/services/upload");
                            await uploadService.uploadVideo(projectId, file, (p) => setUploadProgress(p));
                            refetch();
                          } catch (err: any) {
                            alert(err.message || "Upload failed");
                            setUploadProgress(null);
                          }
                        }
                      }}
                    />
                  </label>
                )}
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
          <div className="flex border-b border-white/10 shrink-0">
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
          <div className="flex-1 overflow-y-auto">
            {activeTab === "text" ? (
              <div>
                {/* 1. FONTS */}
                <Accordion title="Fonts" isOpen={openDropdowns.Fonts} onToggle={() => toggleDropdown("Fonts")}>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/70 block mb-1">Font Family</label>
                      <select 
                        value={styleSettings.font}
                        onChange={(e) => setStyleSettings({...styleSettings, font: e.target.value})}
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
                        <label className="text-xs text-white/70 block mb-1">Weight</label>
                        <select 
                          value={styleSettings.weight}
                          onChange={(e) => setStyleSettings({...styleSettings, weight: e.target.value})}
                          className="w-full bg-[#222] border border-white/10 rounded px-2 py-1.5 text-sm outline-none focus:border-emerald-500"
                        >
                          <option value="400">Regular</option>
                          <option value="700">Bold</option>
                          <option value="900">Extra Bold</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-white/70 block mb-1">Size</label>
                        <div className="flex items-center gap-2 bg-[#222] border border-white/10 rounded px-2">
                          <input 
                            type="range" min="20" max="120" 
                            value={styleSettings.size}
                            onChange={(e) => setStyleSettings({...styleSettings, size: Number(e.target.value)})}
                            className="w-full accent-emerald-500" 
                          />
                          <span className="text-xs">{styleSettings.size}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Accordion>

                {/* 2. POSITION */}
                <Accordion title="Position" isOpen={openDropdowns.Position} onToggle={() => toggleDropdown("Position")}>
                  <div>
                    <label className="text-xs text-white/70 block mb-1">Y-Axis Placement</label>
                    <input 
                      type="range" min="10" max="90" 
                      value={styleSettings.yPercent}
                      onChange={(e) => setStyleSettings({...styleSettings, yPercent: Number(e.target.value)})}
                      className="w-full accent-emerald-500" 
                    />
                  </div>
                </Accordion>

                {/* 3. COLOR */}
                <Accordion title="Color" isOpen={openDropdowns.Color} onToggle={() => toggleDropdown("Color")}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
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
                </Accordion>

                {/* 4. EMPHASIS */}
                <Accordion title="Emphasis" isOpen={openDropdowns.Emphasis} onToggle={() => toggleDropdown("Emphasis")}>
                  <div className="space-y-3">
                    <div>
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
                </Accordion>

                {/* 5. SPACING */}
                <Accordion title="Spacing" isOpen={openDropdowns.Spacing} onToggle={() => toggleDropdown("Spacing")}>
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
                </Accordion>

                {/* 6. EFFECTS */}
                <Accordion title="Effects" isOpen={openDropdowns.Effects} onToggle={() => toggleDropdown("Effects")}>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input 
                        type="checkbox" 
                        checked={styleSettings.shadow > 0} 
                        onChange={(e) => setStyleSettings({...styleSettings, shadow: e.target.checked ? 4 : 0})}
                        className="accent-emerald-500"
                      />
                      Drop Shadow
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input 
                        type="checkbox" 
                        checked={styleSettings.outline > 0} 
                        onChange={(e) => setStyleSettings({...styleSettings, outline: e.target.checked ? 2 : 0})}
                        className="accent-emerald-500"
                      />
                      Text Stroke
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input 
                        type="checkbox" 
                        checked={styleSettings.backgroundStyle === "pill"} 
                        onChange={(e) => setStyleSettings({...styleSettings, backgroundStyle: e.target.checked ? "pill" : "none"})}
                        className="accent-emerald-500"
                      />
                      Highlight Box
                    </label>
                  </div>
                </Accordion>

              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 gap-2">
                <div onClick={() => setStyleSettings({...styleSettings, template: "hormozi_block"})} className={`aspect-video bg-[#222] rounded flex items-center justify-center border cursor-pointer transition ${styleSettings.template === "hormozi_block" ? "border-emerald-500" : "border-white/10 hover:border-white/30"}`}>
                  <span className="text-xs font-bold text-emerald-400 uppercase">Hormozi</span>
                </div>
                <div onClick={() => setStyleSettings({...styleSettings, template: "mrbeast_shadow"})} className={`aspect-video bg-[#222] rounded flex items-center justify-center border cursor-pointer transition ${styleSettings.template === "mrbeast_shadow" ? "border-emerald-500" : "border-white/10 hover:border-white/30"}`}>
                  <span className="text-xs font-bold text-yellow-400 uppercase shadow-md">MrBeast</span>
                </div>
                <div onClick={() => setStyleSettings({...styleSettings, template: "glow_stack"})} className={`aspect-video bg-[#222] rounded flex items-center justify-center border cursor-pointer transition ${styleSettings.template === "glow_stack" ? "border-emerald-500" : "border-white/10 hover:border-white/30"}`}>
                  <span className="text-xs font-bold text-blue-400 uppercase" style={{textShadow: "0 0 10px rgba(59,130,246,0.8)"}}>Glow Stack</span>
                </div>
                <div onClick={() => setStyleSettings({...styleSettings, template: "serif_pop"})} className={`aspect-video bg-[#222] rounded flex items-center justify-center border cursor-pointer transition ${styleSettings.template === "serif_pop" ? "border-emerald-500" : "border-white/10 hover:border-white/30"}`}>
                  <span className="text-xs font-bold text-amber-400 font-serif">Serif Pop</span>
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
            <input 
              type="range" min="0.5" max="3" step="0.1"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-24 accent-emerald-500" 
            />
          </div>
        </div>
        <div className="flex-1 bg-[#111] border border-white/10 rounded relative overflow-x-auto overflow-y-hidden flex flex-col custom-scrollbar">
          <div style={{ width: `${timelineTotalWidth}px`, minWidth: '100%', position: 'relative' }} className="flex-1 flex flex-col">
            <div className="h-8 border-b border-white/5 bg-[#1a1a1a] flex items-center px-2 sticky left-0 z-10 w-32 shadow-[2px_0_4px_rgba(0,0,0,0.5)]">
              <span className="text-[10px] text-emerald-500 font-medium tracking-wide">T CAPTIONS</span>
            </div>
            <div className="flex-1 relative">
               {transcriptTokens.map((token, i) => {
                 const leftPercent = (token.startMs / durationMs) * 100;
                 const widthPercent = ((token.endMs - token.startMs) / durationMs) * 100;
                 return (
                   <div 
                     key={i}
                     className="absolute top-2 h-6 bg-emerald-500/20 border border-emerald-500/50 rounded flex items-center px-2 text-[10px] text-emerald-400 overflow-hidden cursor-pointer hover:bg-emerald-500/30 whitespace-nowrap transition-colors"
                     style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                     onClick={() => {
                        if (playerRef.current) {
                          const frame = Math.floor((token.startMs / 1000) * 30);
                          playerRef.current.seekTo(frame);
                        }
                     }}
                   >
                     {token.text}
                   </div>
                 )
               })}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
