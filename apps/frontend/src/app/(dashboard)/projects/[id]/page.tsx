"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import WaveSurfer from "wavesurfer.js";

import { projectsService } from "@/services/projects";
import { authService } from "@/services/auth";
import { jobsService, JobStatusResponse } from "@/services/jobs";
import { uploadService, UploadValidationError } from "@/services/upload";
import { transcriptService, TranscriptResponse } from "@/services/transcript";
import { ApiError, NetworkUnavailableError } from "@/services/api-client";
import { Project } from "@/services/types";
import { TEMPLATE_PRESETS_LIST, getTemplateStyle } from "@/config/captionTemplates";

function describeError(err: unknown): string {
  if (err instanceof NetworkUnavailableError) return err.message;
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

const POPULAR_FONTS = [
  "Outfit",            // Modern Sans-serif
  "Anton",             // Clean Heavy Display
  "Playfair Display",  // Elegant Serif
  "Permanent Marker",  // Bold Brush Handwriting
  "Pacifico",          // Classic Flowing Script
  "JetBrains Mono",    // Modern Monospace
  "Bungee",            // Heavy Blocky Display
  "Cinzel",            // Decorative Roman
  "Dela Gothic One",   // Chunky Gothic Display
  "Courier Prime"      // Classic Typewriter
];

// Picks the heavier of two CSS-style font weights ("400"/"700"/"900" or
// keywords "bold"/"normal") — used so a template's minimum weight never
// makes an already-heavier user-chosen weight *lighter*.
const maxWeight = (a: string, b: string): string => {
  const toInt = (w: string) => (/^\d+$/.test(w) ? parseInt(w, 10) : w.toLowerCase() === "bold" ? 700 : 400);
  return toInt(a) >= toInt(b) ? a : b;
};

const ensureFontLoaded = (fontFamily: string) => {
  if (typeof window === "undefined" || !fontFamily) return;
  const id = `gf-${fontFamily.toLowerCase().replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}:wght@400;700;800;900&display=swap`;
  document.head.appendChild(link);
};

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
  const [editingWordText, setEditingWordText] = useState("");
  const [localWords, setLocalWords] = useState<any[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadAbortRef = useRef<(() => void) | null>(null);

  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const processingStartedRef = useRef(false);

  // Styling inputs
  const [customFont, setCustomFont] = useState<string>("Outfit");
  const [customSize, setCustomSize] = useState<number>(48);
  const [customWeight, setCustomWeight] = useState<string>("800");
  const [customColor, setCustomColor] = useState<string>("#FFFFFF");
  const [customHighlightColor, setCustomHighlightColor] = useState<string>("#00F5C4");
  const [customShadow, setCustomShadow] = useState<number>(0.0);
  const [customOutline, setCustomOutline] = useState<number>(2.0);
  const [customBackgroundStyle, setCustomBackgroundStyle] = useState<string>("none");
  const [customYPositionPercent, setCustomYPositionPercent] = useState<number>(71.4);
  const [customCaptionTemplate, setCustomCaptionTemplate] = useState<string>("staggered_3line");
  // staggered_3line layout variant: "splash" (line 1 left, line 3 right,
  // offset around the keyword — the original look) or "centre" (all three
  // lines center-aligned).
  const [customStaggeredLayout, setCustomStaggeredLayout] = useState<"splash" | "centre">("splash");
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);

  // New tab and format/position/spacing/effects styling states
  const [activeTab, setActiveTab] = useState<"text" | "templates">("text");
  const [customFontFace, setCustomFontFace] = useState<string>("Bold");
  const [customCasing, setCustomCasing] = useState<"none" | "uppercase" | "lowercase" | "capitalize">("none");
  const [customUnderline, setCustomUnderline] = useState<boolean>(false);
  const [customAlignment, setCustomAlignment] = useState<"left" | "center" | "right">("center");
  const [customXPositionPercent, setCustomXPositionPercent] = useState<number>(50);
  const [customColorMode, setCustomColorMode] = useState<"solid" | "gradient">("solid");
  const [customColor2, setCustomColor2] = useState<string>("#00F5C4"); // Secondary color for gradient
  const [customLetterSpacing, setCustomLetterSpacing] = useState<number>(0);
  const [customWordSpacing, setCustomWordSpacing] = useState<number>(6);
  const [customLineSpacing, setCustomLineSpacing] = useState<number>(1.0);

  // Effects toggles
  const [shadowEnabled, setShadowEnabled] = useState<boolean>(false);
  const [strokeEnabled, setStrokeEnabled] = useState<boolean>(true);
  const [backgroundEnabled, setBackgroundEnabled] = useState<boolean>(false);
  const [selectedBackgroundStyle, setSelectedBackgroundStyle] = useState<"pill" | "shadow-box">("pill");

  // Aspect ratio and player zoom controls
  const [selectedRatio, setSelectedRatio] = useState<"original" | "9:16" | "16:9" | "1:1" | "4:5">("original");
  const [playerZoom, setPlayerZoom] = useState<number>(100);
  const [showSafetyGrid, setShowSafetyGrid] = useState<boolean>(false);
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<number>(9/16);

  // Active template dropdown inside the left panel
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>("staggered_3line");

  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
    refetch: refetchProject,
  } = useQuery<Project | null>({
    queryKey: ["project", projectId],
    queryFn: () => projectsService.getProjectById(projectId),
    enabled: authService.isAuthenticated(),
  });

  const startProcessing = async () => {
    if (processingStartedRef.current) return;
    processingStartedRef.current = true;
    setProcessingError(null);

    try {
      await projectsService.updateProjectStatus(projectId, "PROCESSING");
      await refetchProject();

      const { jobId } = await projectsService.startProcessing(projectId);
      await jobsService.pollJobStatus(jobId, {
        onUpdate: (status) => setJobStatus(status),
      });

      const finalStatus = await jobsService.getJobStatus(jobId);
      if (finalStatus.stage.toLowerCase() === "completed") {
        await projectsService.updateProjectStatus(projectId, "COMPLETED");
      } else {
        await projectsService.updateProjectStatus(projectId, "FAILED");
        setProcessingError(`Processing failed: ${finalStatus.stage}.`);
      }
      await refetchProject();
    } catch (err) {
      setProcessingError(describeError(err));
    } finally {
      processingStartedRef.current = false;
    }
  };

  useEffect(() => {
    if (project?.status === "PROCESSING" && !processingStartedRef.current && !jobStatus) {
      startProcessing();
    }
  }, [project?.status]);

  const {
    data: transcript,
  } = useQuery<TranscriptResponse | null>({
    queryKey: ["transcript", projectId],
    queryFn: () => transcriptService.getTranscript(projectId),
    enabled: project?.status === "COMPLETED",
  });
 
  useEffect(() => {
    if (transcript?.transcript?.words) {
      setLocalWords(
        transcript.transcript.words.map((w: any) => ({
          ...w,
          highlighted: w.highlighted || false,
        }))
      );
    }
  }, [transcript]);

  useEffect(() => {
    if (customFont) {
      ensureFontLoaded(customFont);
    }
  }, [customFont]);

  useEffect(() => {
    const keywordFont = getTemplateStyle(customCaptionTemplate).keywordFont;
    if (keywordFont) {
      ensureFontLoaded(keywordFont);
    }
  }, [customCaptionTemplate]);

  const {
    data: exports,
    refetch: refetchExports,
  } = useQuery<any[]>({
    queryKey: ["exports", projectId],
    queryFn: () => projectsService.getExports(projectId),
    enabled: project?.status === "COMPLETED",
  });

  const {
    data: motionScript,
    refetch: refetchMotionScript,
  } = useQuery<any>({
    queryKey: ["motionScript", projectId],
    queryFn: () => projectsService.getMotionScript(projectId),
    enabled: project?.status === "COMPLETED",
  });

  const {
    data: projectVideo,
  } = useQuery<any>({
    queryKey: ["projectVideo", projectId],
    queryFn: () => projectsService.getProjectVideo(projectId),
    // The raw uploaded clip exists as soon as upload finishes ("UPLOADED"),
    // well before the AI pipeline reaches "COMPLETED" — gating on
    // COMPLETED left the preview player stuck on "No active video source"
    // for the entire processing/render duration even though a perfectly
    // playable video was already available.
    enabled: project?.status === "UPLOADED" || project?.status === "PROCESSING" || project?.status === "COMPLETED",
  });

  // Fetch custom style when project loads
  useEffect(() => {
    if (project?.id) {
      projectsService.getCustomStyle(project.id)
        .then((res) => {
          if (res) {
            setCustomFont(res.font || "Outfit");
            setCustomSize(res.size || 48);
            setCustomWeight(res.weight || "800");
            setCustomColor(res.color || "#FFFFFF");
            setCustomHighlightColor(res.highlight_color || "#00F5C4");
            setCustomShadow(res.shadow || 0.0);
            setCustomOutline(res.outline || 2.0);
            setCustomBackgroundStyle(res.background_style || "none");
            setCustomYPositionPercent(res.y_position_percent || 71.4);
            setCustomCaptionTemplate(res.caption_template || "staggered_3line");
            setExpandedTemplateId(res.caption_template || "staggered_3line");
            setCustomStaggeredLayout((res.staggered_layout as "splash" | "centre") || "splash");

            setCustomAlignment((res.alignment || "center") as any);
            setShadowEnabled(res.shadow > 0);
            setStrokeEnabled(res.outline > 0);
            setBackgroundEnabled(res.background_style && res.background_style !== "none");
            if (res.background_style && res.background_style !== "none") {
              setSelectedBackgroundStyle(res.background_style as any);
            }
            const wMap: Record<string, string> = {
              "100": "Thin", "200": "Extra Light", "300": "Light", "400": "Regular",
              "500": "Medium", "600": "Semi Bold", "700": "Bold", "800": "Extra Bold", "900": "Black"
            };
            setCustomFontFace(wMap[res.weight || "800"] || "Bold");
          }
        })
        .catch((err) => console.error("Error loading custom style: ", err));
    }
  }, [project?.id]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current) return;
    
    const videoUrl = projectVideo?.download_url || (exports || []).filter((e: any) => e.status === "completed")[0]?.download_url;
    if (!videoUrl) return;

    if (wavesurfer.current) {
      wavesurfer.current.destroy();
    }

    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "#23272F",
      progressColor: "#00F5C4",
      height: 48,
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 2,
      minPxPerSec: 150 * zoomLevel,
    });

    // ws.destroy() (below, and on the next effect run) aborts this load's
    // in-flight fetch, which rejects this promise with an AbortError — an
    // expected outcome of an intentional destroy, not a real failure, so it
    // must be swallowed here rather than left as an unhandled rejection.
    ws.load(videoUrl).catch((err) => {
      if (err?.name !== "AbortError") console.error("Error loading waveform: ", err);
    });
    wavesurfer.current = ws;

    ws.on("click", (relativeX) => {
      if (videoRef.current) {
        const timeSec = relativeX * videoRef.current.duration;
        videoRef.current.currentTime = timeSec;
        setCurrentTimeMs(timeSec * 1000);
      }
    });

    return () => {
      ws.destroy();
    };
  }, [projectVideo?.download_url, exports]);

  // Synchronize wavesurfer zoom level
  useEffect(() => {
    if (wavesurfer.current) {
      wavesurfer.current.zoom(150 * zoomLevel);
    }
  }, [zoomLevel]);

  const handleWordEditSave = (wordIdx: number) => {
    if (!editingWordText.trim()) return;
    const updated = [...localWords];
    updated[wordIdx] = {
      ...updated[wordIdx],
      text: editingWordText.trim()
    };
    setLocalWords(updated);
    setEditingWordIndex(null);
    saveTranscriptBackground(updated);
  };
 
  const handleToggleHighlight = (wordIdx: number) => {
    const updated = [...localWords];
    updated[wordIdx] = {
      ...updated[wordIdx],
      highlighted: !updated[wordIdx].highlighted
    };
    setLocalWords(updated);
    saveTranscriptBackground(updated);
  };
 
  // Mirrors app.ai.providers.dummy.render_plan.pick_keyword_idx on the backend
  // (length + capitalization + digit-presence scoring, stopword penalty) so
  // the preview never disagrees with the export about which word is "the"
  // hero word when no LLM emphasis/backend keyword flag is available yet.
  const pickKeywordIndex = (wordsList: any[]) => {
    let bestIdx = 0;
    let bestScore = -1;
    const stopwords = new Set([
      "the", "a", "an", "is", "are", "was", "were", "of", "to", "and", "in", "on",
      "at", "it", "this", "that", "i", "you", "he", "she", "we", "they", "but",
      "or", "so", "be", "as", "for", "with", "my", "your", "do", "does", "did"
    ]);
    wordsList.forEach((w, idx) => {
      const clean = w.text.replace(/[^\w]/g, "");
      if (!clean) return;
      let score = clean.length;
      if (stopwords.has(clean.toLowerCase())) score -= 100;
      if (clean[0] && clean[0] === clean[0].toUpperCase()) score += 2;
      if (/\d/.test(w.text.replace(/[^\w.,$%]/g, ""))) score += 1;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    return bestIdx;
  };

  const getActiveSegmentAndIndex = () => {
    if (localWords.length === 0) return null;

    let activeWordIdx = localWords.findIndex(w => currentTimeMs >= w.start_ms && currentTimeMs <= w.end_ms);
    if (activeWordIdx === -1) {
      const nextWordIdx = localWords.findIndex(w => w.start_ms > currentTimeMs);
      if (nextWordIdx > 0) activeWordIdx = nextWordIdx - 1;
      else if (nextWordIdx === 0) activeWordIdx = 0;
      else activeWordIdx = localWords.length - 1;
    }

    // Used only before the backend's motion_script has loaded (or hasn't
    // been generated yet) — pause/sentence-aware grouping so this early
    // preview at least respects natural phrase boundaries instead of
    // chopping the transcript into arbitrary fixed-size word chunks.
    // Approximates (doesn't replicate) the backend's group_words() rules.
    const MAX_GROUP_WORDS = 8;
    const PAUSE_GAP_MS = 400;
    const endsSentence = (text: string) => /[.!?]$/.test((text || "").trim());

    let startIndex = activeWordIdx;
    while (startIndex > 0) {
      const prev = localWords[startIndex - 1];
      const gap = localWords[startIndex].start_ms - prev.end_ms;
      if (endsSentence(prev.text) || gap > PAUSE_GAP_MS || (activeWordIdx - startIndex) >= MAX_GROUP_WORDS - 1) break;
      startIndex--;
    }

    let endIndex = activeWordIdx;
    while (endIndex < localWords.length - 1) {
      const curr = localWords[endIndex];
      const gap = localWords[endIndex + 1].start_ms - curr.end_ms;
      if (endsSentence(curr.text) || gap > PAUSE_GAP_MS || (endIndex - startIndex) >= MAX_GROUP_WORDS - 1) break;
      endIndex++;
    }

    const segmentWords = localWords.slice(startIndex, endIndex + 1);
    const relativeActiveIdx = activeWordIdx - startIndex;

    return {
      words: segmentWords,
      absoluteStartIndex: startIndex,
      relativeActiveIdx,
    };
  };

  const styleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveStyleImmediate = async (styleOverrides?: any) => {
    const wMap: Record<string, string> = {
      "Thin": "100", "Extra Light": "200", "Light": "300", "Regular": "400",
      "Medium": "500", "Semi Bold": "600", "Bold": "700", "Extra Bold": "800", "Black": "900",
      "Thin Italic": "100", "Light Italic": "300", "Regular Italic": "400", "Medium Italic": "500",
      "Semi Bold Italic": "600", "Bold Italic": "700", "Extra Bold Italic": "800", "Black Italic": "900",
      "Template default": "800"
    };

    const resolvedWeight = wMap[styleOverrides?.fontFace || customFontFace] || "800";
    const resolvedAlignment = styleOverrides?.alignment || customAlignment;
    const resolvedShadow = (styleOverrides?.shadowEnabled ?? shadowEnabled) ? (styleOverrides?.shadow ?? (customShadow || 3.0)) : 0.0;
    const resolvedOutline = (styleOverrides?.strokeEnabled ?? strokeEnabled) ? (styleOverrides?.outline ?? (customOutline || 2.0)) : 0.0;
    const resolvedBgStyle = (styleOverrides?.backgroundEnabled ?? backgroundEnabled) ? (styleOverrides?.backgroundStyle || selectedBackgroundStyle) : "none";

    const merged = {
      font: customFont,
      size: customSize,
      weight: resolvedWeight,
      color: customColor,
      alignment: resolvedAlignment,
      shadow: resolvedShadow,
      outline: resolvedOutline,
      highlight_color: customHighlightColor,
      background_style: resolvedBgStyle,
      y_position_percent: customYPositionPercent,
      caption_template: customCaptionTemplate,
      staggered_layout: customStaggeredLayout,
      ...styleOverrides
    };

    try {
      await projectsService.saveCustomStyle(projectId, merged);
      if (project?.status === "COMPLETED") {
        await projectsService.generateMotionScript(projectId);
        refetchMotionScript();
      }
    } catch (err) {
      console.error("Error immediate saving custom style:", err);
    }
  };

  const saveStyleBackground = (styleOverrides?: any) => {
    if (styleSaveTimeoutRef.current) {
      clearTimeout(styleSaveTimeoutRef.current);
    }

    styleSaveTimeoutRef.current = setTimeout(async () => {
      const wMap: Record<string, string> = {
        "Thin": "100", "Extra Light": "200", "Light": "300", "Regular": "400",
        "Medium": "500", "Semi Bold": "600", "Bold": "700", "Extra Bold": "800", "Black": "900",
        "Thin Italic": "100", "Light Italic": "300", "Regular Italic": "400", "Medium Italic": "500",
        "Semi Bold Italic": "600", "Bold Italic": "700", "Extra Bold Italic": "800", "Black Italic": "900",
        "Template default": "800"
      };

      const resolvedWeight = wMap[styleOverrides?.fontFace || customFontFace] || "800";
      const resolvedAlignment = styleOverrides?.alignment || customAlignment;
      const resolvedShadow = (styleOverrides?.shadowEnabled ?? shadowEnabled) ? (styleOverrides?.shadow ?? (customShadow || 3.0)) : 0.0;
      const resolvedOutline = (styleOverrides?.strokeEnabled ?? strokeEnabled) ? (styleOverrides?.outline ?? (customOutline || 2.0)) : 0.0;
      const resolvedBgStyle = (styleOverrides?.backgroundEnabled ?? backgroundEnabled) ? (styleOverrides?.backgroundStyle || selectedBackgroundStyle) : "none";

      const merged = {
        font: customFont,
        size: customSize,
        weight: resolvedWeight,
        color: customColor,
        alignment: resolvedAlignment,
        shadow: resolvedShadow,
        outline: resolvedOutline,
        highlight_color: customHighlightColor,
        background_style: resolvedBgStyle,
        y_position_percent: customYPositionPercent,
        caption_template: customCaptionTemplate,
        staggered_layout: customStaggeredLayout,
        ...styleOverrides
      };

      try {
        await projectsService.saveCustomStyle(projectId, merged);
        if (project?.status === "COMPLETED") {
          await projectsService.generateMotionScript(projectId);
          refetchMotionScript();
        }
      } catch (err) {
        console.error("Error background saving custom style:", err);
      }
    }, 1000);
  };

  const saveTranscriptBackground = (updatedWords: any[]) => {
    if (transcriptSaveTimeoutRef.current) {
      clearTimeout(transcriptSaveTimeoutRef.current);
    }

    transcriptSaveTimeoutRef.current = setTimeout(async () => {
      try {
        await transcriptService.updateTranscript(projectId, updatedWords);
        if (project?.status === "COMPLETED") {
          await projectsService.generateMotionScript(projectId);
          refetchMotionScript();
        }
      } catch (err) {
        console.error("Error background saving transcript:", err);
      }
    }, 1200);
  };

  const handleTemplateClick = (templateId: string) => {
    setExpandedTemplateId(templateId);
    setCustomCaptionTemplate(templateId);
    saveStyleImmediate({ caption_template: templateId });
  };

  const getTextStyle = (isHighlighted: boolean) => {
    let fontStyle = "normal";
    if (customFontFace.toLowerCase().includes("italic")) {
      fontStyle = "italic";
    }

    const wMap: Record<string, string> = {
      "thin": "100", "extra light": "200", "light": "300", "regular": "400",
      "medium": "500", "semi bold": "600", "bold": "700", "extra bold": "800", "black": "900"
    };

    let userWeight = "800";
    const lowerFace = customFontFace.toLowerCase();
    for (const key of Object.keys(wMap)) {
      if (lowerFace.includes(key)) {
        userWeight = wMap[key];
        break;
      }
    }

    // Highlighted and non-highlighted text now get genuinely different
    // typographic treatment per-template (app/config/captionTemplates.ts) —
    // not just a color swap. The template sets a *floor* weight/font; the
    // user's own manual choice can still push a template's base weight
    // higher, but never below what the template calls for.
    const templateStyle = getTemplateStyle(customCaptionTemplate);
    const resolvedWeight = maxWeight(
      userWeight,
      isHighlighted ? templateStyle.keywordWeight : templateStyle.baseWeight
    );
    const resolvedFont = isHighlighted && templateStyle.keywordFont ? templateStyle.keywordFont : customFont;

    const baseStyle: any = {
      fontFamily: `${resolvedFont}, Montserrat, sans-serif`,
      fontWeight: resolvedWeight,
      fontStyle,
      textAlign: customAlignment,
      textTransform: customCasing === "none" ? "none" : customCasing,
      textDecoration: customUnderline ? "underline" : "none",
      letterSpacing: `${customLetterSpacing}px`,
      wordSpacing: `${customWordSpacing}px`,
      lineHeight: customLineSpacing,
      transition: "all 0.1s ease",
    };

    if (customColorMode === "gradient") {
      baseStyle.backgroundImage = `linear-gradient(135deg, ${customColor}, ${customHighlightColor})`;
      baseStyle.WebkitBackgroundClip = "text";
      baseStyle.WebkitTextFillColor = "transparent";
    } else {
      baseStyle.color = isHighlighted ? customHighlightColor : customColor;
    }

    const textShadowParts = [];
    if (strokeEnabled && customOutline > 0) {
      const strokeColor = isHighlighted ? customHighlightColor : "#000000";
      baseStyle.WebkitTextStroke = `${customOutline * 0.5}px ${strokeColor}`;
    }

    if (shadowEnabled && customShadow > 0) {
      textShadowParts.push(`0px ${customShadow}px ${customShadow}px rgba(0,0,0,0.6)`);
    }

    baseStyle.textShadow = textShadowParts.length > 0 ? textShadowParts.join(", ") : "none";

    return baseStyle;
  };

  const bgStyleVal = backgroundEnabled ? selectedBackgroundStyle : "none";
  const containerPadding = bgStyleVal === "pill" ? "10px 20px" : bgStyleVal === "shadow-box" ? "14px 18px" : "0px";
  const containerBg = bgStyleVal === "pill" ? "rgba(17,19,23,0.85)" : bgStyleVal === "shadow-box" ? "rgba(17,19,23,0.95)" : "transparent";
  const containerBorderRadius = bgStyleVal === "pill" ? "9999px" : bgStyleVal === "shadow-box" ? "8px" : "0px";
  const containerBorder = bgStyleVal !== "none" ? "1px solid rgba(255,255,255,0.1)" : "none";

  // Render trigger states
  const [renderJobStatus, setRenderJobStatus] = useState<JobStatusResponse | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isPipelineDropdownOpen, setIsPipelineDropdownOpen] = useState(true);

  const AI_PIPELINE_STAGES = [
    { id: "speech", name: "Speech Transcription" },
    { id: "creative", name: "Creative Pacing Analysis" },
    { id: "caption", name: "Subtitle/Caption Planning" },
    { id: "render_planning", name: "Styling & Motion Script" },
  ];

  const RENDER_PIPELINE_STAGES = [
    { id: "preparing", name: "Preparing Media" },
    { id: "generating ass", name: "Subtitle Generation" },
    { id: "rendering", name: "Burning Subtitles (GPU/FFmpeg)" },
    { id: "encoding", name: "Video Encoding" },
    { id: "uploading", name: "Uploading Output" },
  ];

  const getAiStageState = (stageId: string) => {
    if (project?.status === "COMPLETED") return "completed";
    
    const activeStage = jobStatus?.stage || "";
    const isFailed = project?.status === "FAILED" || activeStage.toLowerCase() === "failed" || jobStatus?.error_message;
    const errMessage = jobStatus?.error_message || processingError || "";
    
    const stagesOrder = ["speech", "creative", "caption", "render_planning"];
    const checkIdx = stagesOrder.indexOf(stageId);
    
    let activeIdx = 0;
    const stageLower = activeStage.toLowerCase();
    if (stageLower.includes("speech") || stageLower.includes("transcript")) {
      activeIdx = 0;
    } else if (stageLower.includes("creative")) {
      activeIdx = 1;
    } else if (stageLower.includes("caption")) {
      activeIdx = 2;
    } else if (stageLower.includes("render_planning") || stageLower.includes("render_validation")) {
      activeIdx = 3;
    } else if (project?.status === "PROCESSING") {
      activeIdx = 0;
    } else if (project?.status === "UPLOADED") {
      return "pending";
    } else if (project?.status === "CREATED") {
      return "pending";
    }

    if (isFailed) {
      let failedIdx = activeIdx;
      if (errMessage.includes("SPEECH_RECOGNITION") || errMessage.includes("TRANSCRIPT")) {
        failedIdx = 0;
      } else if (errMessage.includes("CREATIVE")) {
        failedIdx = 1;
      } else if (errMessage.includes("CAPTION")) {
        failedIdx = 2;
      } else if (errMessage.includes("RENDER_PLANNING") || errMessage.includes("RENDER_VALIDATION")) {
        failedIdx = 3;
      }
      
      if (checkIdx === failedIdx) return "failed";
      if (checkIdx < failedIdx) return "completed";
      return "pending";
    }

    if (project?.status !== "PROCESSING") return "pending";

    if (checkIdx < activeIdx) return "completed";
    if (checkIdx === activeIdx) return "running";
    return "pending";
  };

  const getRenderStageState = (stageId: string) => {
    if (!isRendering && !renderJobStatus) return "pending";
    
    const activeStage = renderJobStatus?.stage || "";
    const stageLower = activeStage.toLowerCase();
    const isFailed = stageLower === "failed" || renderError;
    
    const stagesOrder = ["preparing", "generating ass", "rendering", "encoding", "uploading"];
    const checkIdx = stagesOrder.indexOf(stageId);
    
    let activeIdx = 0;
    if (stageLower.includes("preparing")) {
      activeIdx = 0;
    } else if (stageLower.includes("generating ass") || stageLower.includes("ass")) {
      activeIdx = 1;
    } else if (stageLower.includes("rendering")) {
      activeIdx = 2;
    } else if (stageLower.includes("encoding")) {
      activeIdx = 3;
    } else if (stageLower.includes("uploading")) {
      activeIdx = 4;
    } else if (stageLower === "completed" || renderJobStatus?.progress === 100) {
      return "completed";
    } else if (isRendering) {
      activeIdx = 0;
    }

    if (isFailed) {
      if (checkIdx === activeIdx) return "failed";
      if (checkIdx < activeIdx) return "completed";
      return "pending";
    }

    if (stageLower === "completed" || renderJobStatus?.progress === 100) return "completed";
    if (!isRendering) return "pending";

    if (checkIdx < activeIdx) return "completed";
    if (checkIdx === activeIdx) return "running";
    return "pending";
  };

  const startRendering = async () => {
    if (isRendering) return;
    setIsRendering(true);
    setRenderError(null);
    setRenderJobStatus(null);
    
    try {
      const { jobId } = await projectsService.startExport(projectId);
      await jobsService.pollJobStatus(jobId, {
        onUpdate: (status) => setRenderJobStatus(status),
      });
      
      const finalStatus = await jobsService.getJobStatus(jobId);
      if (finalStatus.stage.toLowerCase() === "completed" || finalStatus.progress === 100) {
        await refetchExports();
      } else {
        setRenderError(`Rendering failed: ${finalStatus.stage}`);
      }
    } catch (err) {
      setRenderError(describeError(err));
    } finally {
      setIsRendering(false);
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(0);
    setUploadError(null);
    try {
      await uploadService.uploadVideo(
        projectId,
        file,
        (progress) => setUploadProgress(progress),
        (abort) => {
          uploadAbortRef.current = abort;
        }
      );
      uploadAbortRef.current = null;
      setUploadProgress(null);

      await projectsService.updateProjectStatus(projectId, "UPLOADED");
      await refetchProject();
      processingStartedRef.current = false;
      setJobStatus(null);
      startProcessing();
    } catch (err) {
      uploadAbortRef.current = null;
      setUploadProgress(null);
      if (err instanceof UploadValidationError) {
        setUploadError(err.message);
      } else {
        setUploadError(describeError(err));
      }
    }
  };

  if (isProjectLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-[#0A0B0D]">
        <div className="w-8 h-8 border-2 border-[#00F5C4] border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] uppercase font-bold tracking-widest text-white">Retrieving workspace...</p>
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#0A0B0D]">
        <h3 className="text-sm font-primary font-black uppercase text-white">Project Not Found</h3>
        <button 
          onClick={() => router.push("/dashboard")}
          className="border border-[#23272F] bg-[#111317] text-[#00F5C4] font-primary font-black uppercase text-[9px] tracking-wider px-5 py-2 hover:border-[#00F5C4] transition-all cursor-pointer shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden select-none selection:bg-[#00F5C4]/20 selection:text-[#00F5C4]">
      
      {/* Studio Top-bar */}
      <header className="h-14 bg-[#111317] border-b border-[#23272F] flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard")}
            className="hover:text-[#00F5C4] transition-colors cursor-pointer text-white"
            title="Back to dashboard"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </button>
          <div>
            <h1 className="text-xs font-primary font-black uppercase text-white tracking-wide inline-flex items-center gap-2">
              {project.title}
              <span className="text-[8px] uppercase px-1.5 py-0.5 border border-[#23272F] bg-[#0A0B0D] text-white">
                {project.status}
              </span>
            </h1>
          </div>
        </div>

        {/* Dynamic header widgets */}
        <div className="flex items-center gap-4">
          {project.status === "CREATED" && uploadProgress === null && (
            <div className="relative">
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleUploadFile}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <button className="bg-[#00F5C4] text-[#0A0B0D] font-primary font-black uppercase text-[9px] tracking-wider px-4 py-2 rounded-none transition-colors cursor-pointer shadow-sm hover:bg-[#00C2A0]">
                Upload MP4 Clip
              </button>
            </div>
          )}
          {uploadProgress !== null && (
            <span className="text-[9px] uppercase font-bold text-[#00F5C4] animate-pulse">
              UPLOADING: {uploadProgress}%
            </span>
          )}
          {project.status === "PROCESSING" && (
            <span className="text-[9px] uppercase font-bold text-[#00F5C4] animate-pulse">
              PIPELINE STAGE: {jobStatus?.stage || "TRANSCRIPTION"} ({jobStatus?.progress || 0}%)
            </span>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
             {/* A. LEFT PANEL: TEXT STYLING AND TEMPLATES TABS */}
        <section className="w-80 bg-[#111317] border-r border-[#23272F] flex flex-col shrink-0 z-10 shadow-sm overflow-hidden">
          {/* Global Tab Header */}
          <div className="flex border-b border-[#23272F] shrink-0">
            <button
              onClick={() => setActiveTab("text")}
              className={`flex-1 py-3 text-center text-[10px] font-primary font-black uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === "text"
                  ? "text-[#FFB800] border-b-2 border-[#FFB800] bg-[#181B21]/40"
                  : "text-white/40 hover:text-white/80"
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`flex-1 py-3 text-center text-[10px] font-primary font-black uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === "templates"
                  ? "text-[#FFB800] border-b-2 border-[#FFB800] bg-[#181B21]/40"
                  : "text-white/40 hover:text-white/80"
              }`}
            >
              Templates
            </button>
          </div>

          {/* Scrollable Tab Content Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
            {activeTab === "text" ? (
              <div className="space-y-5 text-left">
                {/* 1. FONT SECTION */}
                <div className="space-y-3">
                  <div className="text-[9px] font-bold text-white uppercase tracking-widest border-b border-[#23272F]/50 pb-1">
                    Font Settings
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-white/60">Font Family</label>
                    <select
                      value={customFont}
                      onChange={(e) => {
                        setCustomFont(e.target.value);
                        saveStyleImmediate({ font: e.target.value });
                      }}
                      className="w-full bg-[#181B21] border border-[#23272F] text-[10px] font-bold text-white px-2 py-1.5 focus:outline-none rounded"
                    >
                      {POPULAR_FONTS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[8px] font-bold uppercase tracking-wider text-white/60">Font Face</label>
                    <select
                      value={customFontFace}
                      onChange={(e) => {
                        setCustomFontFace(e.target.value);
                        saveStyleImmediate({ fontFace: e.target.value });
                      }}
                      className="w-full bg-[#181B21] border border-[#23272F] text-[10px] font-bold text-white px-2 py-1.5 focus:outline-none rounded"
                    >
                      <option value="Template default">Template default</option>
                      <option value="Thin">Thin</option>
                      <option value="Extra Light">Extra Light</option>
                      <option value="Light">Light</option>
                      <option value="Regular">Regular</option>
                      <option value="Medium">Medium</option>
                      <option value="Semi Bold">Semi Bold</option>
                      <option value="Bold">Bold</option>
                      <option value="Extra Bold">Extra Bold</option>
                      <option value="Black">Black</option>
                      <option value="Thin Italic">Thin Italic</option>
                      <option value="Light Italic">Light Italic</option>
                      <option value="Regular Italic">Regular Italic</option>
                      <option value="Medium Italic">Medium Italic</option>
                      <option value="Semi Bold Italic">Semi Bold Italic</option>
                      <option value="Bold Italic">Bold Italic</option>
                      <option value="Extra Bold Italic">Extra Bold Italic</option>
                      <option value="Black Italic">Black Italic</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-white/60">
                      <span>Subtitle Size</span>
                      <span className="font-mono text-[#FFB800]">{customSize}px</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="24"
                        max="80"
                        step="2"
                        value={customSize}
                        onChange={(e) => {
                          setCustomSize(parseInt(e.target.value));
                          saveStyleBackground({ size: parseInt(e.target.value) });
                        }}
                        className="flex-1 h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
                      />
                      <button 
                        onClick={() => {
                          setCustomSize(48);
                          saveStyleImmediate({ size: 48 });
                        }}
                        className="text-[9px] text-white/40 hover:text-white transition-colors cursor-pointer"
                        title="Reset font size"
                      >
                        ↺
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. FORMAT SECTION */}
                <div className="space-y-3">
                  <div className="text-[9px] font-bold text-white uppercase tracking-widest border-b border-[#23272F]/50 pb-1">
                    Format
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-white/60">Styles</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const c = customCasing === "capitalize" ? "none" : "capitalize";
                          setCustomCasing(c);
                          saveStyleImmediate({ textTransform: c });
                        }}
                        className={`px-3 py-1 border text-[10px] font-black uppercase transition-all rounded cursor-pointer ${
                          customCasing === "capitalize"
                            ? "border-[#FFB800] text-[#FFB800] bg-[#FFB800]/10"
                            : "border-[#23272F] text-white bg-[#181B21] hover:border-white/20"
                        }`}
                        title="Capitalize"
                      >
                        Tt
                      </button>
                      <button
                        onClick={() => {
                          const c = customCasing === "uppercase" ? "none" : "uppercase";
                          setCustomCasing(c);
                          saveStyleImmediate({ textTransform: c });
                        }}
                        className={`px-3 py-1 border text-[10px] font-black uppercase transition-all rounded cursor-pointer ${
                          customCasing === "uppercase"
                            ? "border-[#FFB800] text-[#FFB800] bg-[#FFB800]/10"
                            : "border-[#23272F] text-white bg-[#181B21] hover:border-white/20"
                        }`}
                        title="Uppercase"
                      >
                        T
                      </button>
                      <button
                        onClick={() => {
                          const c = customCasing === "lowercase" ? "none" : "lowercase";
                          setCustomCasing(c);
                          saveStyleImmediate({ textTransform: c });
                        }}
                        className={`px-3 py-1 border text-[10px] font-black uppercase transition-all rounded cursor-pointer ${
                          customCasing === "lowercase"
                            ? "border-[#FFB800] text-[#FFB800] bg-[#FFB800]/10"
                            : "border-[#23272F] text-white bg-[#181B21] hover:border-white/20"
                        }`}
                        title="Lowercase"
                      >
                        t
                      </button>
                      <button
                        onClick={() => {
                          setCustomUnderline(!customUnderline);
                          saveStyleImmediate({ underline: !customUnderline });
                        }}
                        className={`px-3 py-1 border text-[10px] font-black uppercase underline transition-all rounded cursor-pointer ${
                          customUnderline
                            ? "border-[#FFB800] text-[#FFB800] bg-[#FFB800]/10"
                            : "border-[#23272F] text-white bg-[#181B21] hover:border-white/20"
                        }`}
                        title="Underline"
                      >
                        U
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-white/60">Text Alignment</span>
                    <div className="flex border border-[#23272F] rounded overflow-hidden">
                      <button
                        onClick={() => {
                          setCustomAlignment("left");
                          saveStyleImmediate({ alignment: "left" });
                        }}
                        className={`px-3 py-1.5 text-[9px] font-bold transition-all cursor-pointer ${
                          customAlignment === "left" ? "bg-[#FFB800] text-[#0A0B0D]" : "bg-[#181B21] text-white/70 hover:bg-[#1C2027]"
                        }`}
                        title="Align Left"
                      >
                        Left
                      </button>
                      <button
                        onClick={() => {
                          setCustomAlignment("center");
                          saveStyleImmediate({ alignment: "center" });
                        }}
                        className={`px-3 py-1.5 text-[9px] font-bold transition-all cursor-pointer ${
                          customAlignment === "center" ? "bg-[#FFB800] text-[#0A0B0D]" : "bg-[#181B21] text-white/70 hover:bg-[#1C2027]"
                        }`}
                        title="Align Center"
                      >
                        Center
                      </button>
                      <button
                        onClick={() => {
                          setCustomAlignment("right");
                          saveStyleImmediate({ alignment: "right" });
                        }}
                        className={`px-3 py-1.5 text-[9px] font-bold transition-all cursor-pointer ${
                          customAlignment === "right" ? "bg-[#FFB800] text-[#0A0B0D]" : "bg-[#181B21] text-white/70 hover:bg-[#1C2027]"
                        }`}
                        title="Align Right"
                      >
                        Right
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. POSITION SECTION */}
                <div className="space-y-3">
                  <div className="text-[9px] font-bold text-white uppercase tracking-widest border-b border-[#23272F]/50 pb-1">
                    Position
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-white/60">X position %</label>
                      <div className="flex items-center bg-[#181B21] border border-[#23272F] p-1.5 rounded">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={customXPositionPercent}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 50;
                            setCustomXPositionPercent(val);
                            saveStyleBackground({ x_position_percent: val });
                          }}
                          className="w-full bg-transparent text-[10px] text-white font-bold focus:outline-none text-center"
                        />
                        <span className="text-[9px] text-white/40 font-bold ml-1">%</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-white/60">Y position %</label>
                      <div className="flex items-center bg-[#181B21] border border-[#23272F] p-1.5 rounded">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={customYPositionPercent}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 85;
                            setCustomYPositionPercent(val);
                            saveStyleBackground({ y_position_percent: val });
                          }}
                          className="w-full bg-transparent text-[10px] text-white font-bold focus:outline-none text-center"
                        />
                        <span className="text-[9px] text-white/40 font-bold ml-1">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. COLOR SECTION */}
                <div className="space-y-3">
                  <div className="text-[9px] font-bold text-white uppercase tracking-widest border-b border-[#23272F]/50 pb-1">
                    Color Settings
                  </div>

                  <div className="flex border border-[#23272F] rounded overflow-hidden">
                    <button
                      onClick={() => {
                        setCustomColorMode("solid");
                        saveStyleImmediate({ colorMode: "solid" });
                      }}
                      className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        customColorMode === "solid" ? "bg-[#FFB800] text-[#0A0B0D]" : "bg-[#181B21] text-white/70 hover:bg-[#1C2027]"
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      onClick={() => {
                        setCustomColorMode("gradient");
                        saveStyleImmediate({ colorMode: "gradient" });
                      }}
                      className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        customColorMode === "gradient" ? "bg-[#FFB800] text-[#0A0B0D]" : "bg-[#181B21] text-white/70 hover:bg-[#1C2027]"
                      }`}
                    >
                      Gradient
                    </button>
                  </div>

                  {customColorMode === "solid" ? (
                    <div className="space-y-1">
                      <label className="block text-[8px] font-bold uppercase tracking-wider text-white/60">Primary Color</label>
                      <div className="flex items-center gap-2 bg-[#181B21] border border-[#23272F] p-1.5 rounded">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => {
                            setCustomColor(e.target.value);
                            saveStyleBackground({ color: e.target.value });
                          }}
                          className="w-6 h-6 bg-transparent cursor-pointer shrink-0 rounded border-0"
                        />
                        <span className="text-[10px] text-white font-mono uppercase">{customColor}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-white/60">Color 1</label>
                        <div className="flex items-center gap-1.5 bg-[#181B21] border border-[#23272F] p-1.5 rounded">
                          <input
                            type="color"
                            value={customColor}
                            onChange={(e) => {
                              setCustomColor(e.target.value);
                              saveStyleBackground({ color: e.target.value });
                            }}
                            className="w-5 h-5 bg-transparent cursor-pointer shrink-0 rounded border-0"
                          />
                          <span className="text-[9px] text-white font-mono uppercase truncate">{customColor}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[8px] font-bold uppercase tracking-wider text-white/60">Color 2</label>
                        <div className="flex items-center gap-1.5 bg-[#181B21] border border-[#23272F] p-1.5 rounded">
                          <input
                            type="color"
                            value={customColor2}
                            onChange={(e) => {
                              setCustomColor2(e.target.value);
                              saveStyleBackground({ color2: e.target.value });
                            }}
                            className="w-5 h-5 bg-transparent cursor-pointer shrink-0 rounded border-0"
                          />
                          <span className="text-[9px] text-white font-mono uppercase truncate">{customColor2}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. SPACING SECTION */}
                <div className="space-y-3">
                  <div className="text-[9px] font-bold text-white uppercase tracking-widest border-b border-[#23272F]/50 pb-1">
                    Spacing
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-white/60">
                      <span>Letter Spacing</span>
                      <span className="font-mono text-[#FFB800]">{customLetterSpacing}</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="15"
                      step="1"
                      value={customLetterSpacing}
                      onChange={(e) => {
                        setCustomLetterSpacing(parseInt(e.target.value));
                        saveStyleBackground({ letter_spacing: parseInt(e.target.value) });
                      }}
                      className="w-full h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-white/60">
                      <span>Word Spacing</span>
                      <span className="font-mono text-[#FFB800]">{customWordSpacing}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={customWordSpacing}
                      onChange={(e) => {
                        setCustomWordSpacing(parseInt(e.target.value));
                        saveStyleBackground({ word_spacing: parseInt(e.target.value) });
                      }}
                      className="w-full h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-white/60">
                      <span>Line Spacing</span>
                      <span className="font-mono text-[#FFB800]">{customLineSpacing}</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="2.5"
                      step="0.1"
                      value={customLineSpacing}
                      onChange={(e) => {
                        setCustomLineSpacing(parseFloat(e.target.value));
                        saveStyleBackground({ line_spacing: parseFloat(e.target.value) });
                      }}
                      className="w-full h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
                    />
                  </div>
                </div>

                {/* 6. EFFECTS SECTION */}
                <div className="space-y-3">
                  <div className="text-[9px] font-bold text-white uppercase tracking-widest border-b border-[#23272F]/50 pb-1">
                    Effects
                  </div>

                  {/* Drop Shadow Switch */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white">Drop Shadow</span>
                      <span className="text-[7px] text-white/40 uppercase tracking-wider">Subtle offset shadow</span>
                    </div>
                    <button
                      onClick={() => {
                        setShadowEnabled(!shadowEnabled);
                        saveStyleImmediate({ shadowEnabled: !shadowEnabled });
                      }}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        shadowEnabled ? "bg-[#FFB800]" : "bg-[#23272F]"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                          shadowEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Text Stroke Switch */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white">Text Stroke</span>
                      <span className="text-[7px] text-white/40 uppercase tracking-wider">Outer outline stroke</span>
                    </div>
                    <button
                      onClick={() => {
                        setStrokeEnabled(!strokeEnabled);
                        saveStyleImmediate({ strokeEnabled: !strokeEnabled });
                      }}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        strokeEnabled ? "bg-[#FFB800]" : "bg-[#23272F]"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                          strokeEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {strokeEnabled && (
                    <div className="bg-[#181B21]/30 p-2.5 border border-[#23272F] rounded space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[7px] font-bold uppercase tracking-wider text-white/60">
                          <span>Stroke Thickness</span>
                          <span className="font-mono text-[#FFB800]">{customOutline}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="5"
                          step="0.5"
                          value={customOutline}
                          onChange={(e) => {
                            setCustomOutline(parseFloat(e.target.value));
                            saveStyleBackground({ outline: parseFloat(e.target.value) });
                          }}
                          className="w-full h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Background Switch */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white">Background Box</span>
                      <span className="text-[7px] text-white/40 uppercase tracking-wider">Highlight backing container</span>
                    </div>
                    <button
                      onClick={() => {
                        setBackgroundEnabled(!backgroundEnabled);
                        saveStyleImmediate({ backgroundEnabled: !backgroundEnabled });
                      }}
                      className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        backgroundEnabled ? "bg-[#FFB800]" : "bg-[#23272F]"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${
                          backgroundEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {backgroundEnabled && (
                    <div className="bg-[#181B21]/30 p-2.5 border border-[#23272F] rounded space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[7px] font-bold uppercase tracking-wider text-white/60">Box Type</label>
                        <div className="flex border border-[#23272F] rounded overflow-hidden">
                          <button
                            onClick={() => {
                              setSelectedBackgroundStyle("pill");
                              saveStyleImmediate({ backgroundStyle: "pill" });
                            }}
                            className={`flex-1 py-1 text-[8px] font-bold cursor-pointer ${
                              selectedBackgroundStyle === "pill" ? "bg-[#FFB800] text-[#0A0B0D]" : "bg-[#181B21] text-white/70"
                            }`}
                          >
                            Pill
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBackgroundStyle("shadow-box");
                              saveStyleImmediate({ backgroundStyle: "shadow-box" });
                            }}
                            className={`flex-1 py-1 text-[8px] font-bold cursor-pointer ${
                              selectedBackgroundStyle === "shadow-box" ? "bg-[#FFB800] text-[#0A0B0D]" : "bg-[#181B21] text-white/70"
                            }`}
                          >
                            Shadow Box
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // TEMPLATES TAB CONTENT
              <div className="space-y-4 text-left">
                <div className="pb-1 border-b border-[#23272F]/50">
                  <span className="text-[9px] font-bold text-white uppercase tracking-widest">Presets List</span>
                </div>

                <div className="space-y-3">
                  {TEMPLATE_PRESETS_LIST.map((tpl) => {
                    const isSelected = customCaptionTemplate === tpl.id;

                    return (
                      <div
                        key={tpl.id}
                        className={`border rounded p-3 transition-all duration-200 ${
                          isSelected ? "border-[#FFB800] bg-[#181B21]" : "border-[#23272F] bg-[#111317] hover:border-white/20"
                        }`}
                      >
                        <button
                          onClick={() => handleTemplateClick(tpl.id)}
                          className="w-full text-left flex flex-col justify-between cursor-pointer focus:outline-none"
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="text-[11px] font-primary font-black uppercase text-white tracking-wide block">
                              {tpl.name}
                            </span>
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-[#FFB800]" />
                            )}
                          </div>
                          <span className="text-[9px] text-white/50 uppercase tracking-wide leading-relaxed block mt-1">
                            {tpl.desc}
                          </span>
                        </button>

                        {/* Template specific Quick Customs */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-[#23272F] space-y-3">
                            <span className="text-[7px] font-black uppercase tracking-widest text-[#FFB800] block">
                              ⚡ Quick Customs
                            </span>

                            {/* Template quick custom fields */}
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <label className="block text-[8px] font-bold uppercase tracking-wider text-white/60">Highlight Color</label>
                                <div className="flex items-center gap-2 bg-[#111317] border border-[#23272F] p-1 rounded">
                                  <input
                                    type="color"
                                    value={customHighlightColor}
                                    onChange={(e) => {
                                      setCustomHighlightColor(e.target.value);
                                      saveStyleBackground({ highlight_color: e.target.value });
                                    }}
                                    className="w-5 h-5 bg-transparent cursor-pointer shrink-0 rounded border-0"
                                  />
                                  <span className="text-[9px] text-white font-mono uppercase truncate">{customHighlightColor}</span>
                                </div>
                              </div>

                              {tpl.id === "staggered_3line" && (
                                <>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[7px] font-bold uppercase tracking-wider text-white/60">
                                      <span>Offset Intensity</span>
                                      <span className="font-mono text-[#FFB800]">{customShadow}</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max="8"
                                      step="1"
                                      value={customShadow}
                                      onChange={(e) => {
                                        setCustomShadow(parseFloat(e.target.value));
                                        saveStyleBackground({ shadow: parseFloat(e.target.value) });
                                      }}
                                      className="w-full h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold uppercase tracking-wider text-white/60">Layout</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {(["splash", "centre"] as const).map((layout) => (
                                        <button
                                          key={layout}
                                          onClick={() => {
                                            setCustomStaggeredLayout(layout);
                                            saveStyleImmediate({ staggered_layout: layout });
                                          }}
                                          className={`px-2 py-1.5 text-[8px] font-black uppercase tracking-wider border rounded transition-colors cursor-pointer ${
                                            customStaggeredLayout === layout
                                              ? "border-[#FFB800] bg-[#FFB800]/10 text-[#FFB800]"
                                              : "border-[#23272F] bg-[#111317] text-white/60 hover:border-white/20"
                                          }`}
                                        >
                                          {layout}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}

                              {tpl.id === "word_by_word" && (
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-bold uppercase tracking-wider text-white/60">Stroke Outline</span>
                                  <button
                                    onClick={() => {
                                      const newVal = !strokeEnabled;
                                      setStrokeEnabled(newVal);
                                      saveStyleImmediate({ strokeEnabled: newVal });
                                    }}
                                    className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none ${
                                      strokeEnabled ? "bg-[#FFB800]" : "bg-[#23272F]"
                                    }`}
                                  >
                                    <div
                                      className={`w-3 h-3 rounded-full bg-white transition-transform ${
                                        strokeEnabled ? "translate-x-4" : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sync Button & Style Save Status */}
          <div className="p-4 border-t border-[#23272F] bg-[#0E1013] shrink-0">
            <button
              onClick={() => saveStyleImmediate()}
              className="w-full bg-[#FFB800] text-[#0A0B0D] font-primary font-black uppercase text-[10px] tracking-wider py-2.5 rounded transition-all cursor-pointer text-center hover:bg-[#E5A500]"
            >
              Sync Settings
            </button>

            {styleError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] uppercase font-bold tracking-wider p-2 mt-2 rounded">
                {styleError}
              </div>
            )}
          </div>
        </section>

        {/* B. MIDDLE PLAYER & TIMELINE */}
        <section className="flex-1 flex flex-col bg-[#0A0B0D] overflow-hidden relative min-h-0">
          
          {/* 1. Media Control Bar (Aspect Ratio, Zoom, Safety Grid, Fullscreen) */}
          <div className="h-10 bg-[#111317] border-b border-[#23272F] px-4 flex items-center justify-between shrink-0">
            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-1 bg-[#0A0B0D] border border-[#23272F] p-0.5 rounded-full">
              {(["original", "9:16", "16:9", "1:1", "4:5"] as const).map((r) => {
                const isActive = selectedRatio === r;
                const displayLabel = r === "original" ? "Original" : r;
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRatio(r)}
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#FFB800] text-[#0A0B0D] shadow-sm"
                        : "text-white/40 hover:text-white/80"
                    }`}
                  >
                    {displayLabel}
                  </button>
                );
              })}
            </div>

            {/* Zoom / Grid / Fullscreen Tools */}
            <div className="flex items-center gap-3">
              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlayerZoom(Math.max(50, playerZoom - 10))}
                  className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                  </svg>
                </button>
                <button
                  onClick={() => setPlayerZoom(100)}
                  className="text-[9px] font-mono font-bold text-[#FFB800] bg-[#0A0B0D] border border-[#23272F] px-2 py-0.5 rounded"
                  title="Reset Zoom"
                >
                  {playerZoom}%
                </button>
                <button
                  onClick={() => setPlayerZoom(Math.min(200, playerZoom + 10))}
                  className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>

              <div className="h-4 w-[1px] bg-[#23272F]" />

              {/* Safety Grid Guideline Toggle */}
              <button
                onClick={() => setShowSafetyGrid(!showSafetyGrid)}
                className={`p-1.5 transition-colors rounded cursor-pointer ${
                  showSafetyGrid ? "text-[#FFB800] bg-[#FFB800]/10" : "text-white/50 hover:text-white"
                }`}
                title="Toggle Safe Area Grid"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </button>

              {/* Fullscreen Player Toggle */}
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      videoRef.current.requestFullscreen().catch((err) => console.error(err));
                    }
                  }
                }}
                className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer"
                title="Fullscreen Toggle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0l-5.25-5.25" />
                </svg>
              </button>
            </div>
          </div>

          {/* 2. Top Video Preview Player Container */}
          <div className="flex-1 flex items-center justify-center p-6 relative bg-[#0E1013] min-h-0 overflow-hidden">
            
            <div 
              className="relative h-full max-h-[calc(100vh-420px)] w-auto max-w-full bg-[#111317] border border-[#23272F] shadow-2xl flex flex-col justify-center items-center overflow-hidden transition-all duration-200"
              style={{
                aspectRatio: selectedRatio === "original" ? naturalAspectRatio : selectedRatio === "9:16" ? 9/16 : selectedRatio === "16:9" ? 16/9 : selectedRatio === "1:1" ? 1 : 4/5,
                transform: `scale(${playerZoom / 100})`,
              }}
            >
              {/* Safety Title Grid Lines */}
              {showSafetyGrid && (
                <div className="absolute inset-0 border border-dashed border-[#FFB800]/25 pointer-events-none z-10 m-[10%]">
                  <div className="absolute inset-0 border border-dashed border-[#FFB800]/15 m-[5%]" />
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#FFB800]/10" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#FFB800]/10" />
                </div>
              )}
              
              {/* HTML5 Video Element */}
              {projectVideo?.download_url || (exports && exports.filter((e: any) => e.status === "completed").length > 0) ? (
                <video
                  ref={videoRef}
                  src={projectVideo?.download_url || (exports || []).filter((e: any) => e.status === "completed")[0]?.download_url}
                  className="w-full h-full object-cover"
                  poster={project.thumbnail_url || undefined}
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        videoRef.current.play().then(() => setIsPlaying(true));
                      }
                    }
                  }}
                  onTimeUpdate={() => {
                    if (videoRef.current) {
                      const timeMs = videoRef.current.currentTime * 1000;
                      setCurrentTimeMs(timeMs);
                      if (wavesurfer.current && videoRef.current.duration) {
                        wavesurfer.current.setTime(videoRef.current.currentTime);
                      }
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      setDurationMs(videoRef.current.duration * 1000);
                      if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
                        setNaturalAspectRatio(videoRef.current.videoWidth / videoRef.current.videoHeight);
                      }
                    }
                  }}
                  onEnded={() => setIsPlaying(false)}
                />
              ) : (
                <label className="flex flex-col items-center justify-center p-6 text-center space-y-4 cursor-pointer hover:bg-[#181B21]/50 transition-colors w-full h-full absolute inset-0">
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleUploadFile}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full border border-dashed border-[#FFB800] flex items-center justify-center text-[#FFB800] hover:scale-105 transition-transform duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-white uppercase font-black tracking-wider block">
                      Upload Media
                    </span>
                    <span className="text-[7px] text-white/40 uppercase tracking-widest block">
                      Drag & drop or click to upload
                    </span>
                  </div>
                </label>
              )}

              {/* Subtitle Preview Overlay */}
              {(() => {
                // If motionScript timeline exists, use it! Otherwise fallback to naive localWords segment.
                if (motionScript?.timeline) {
                  const activeCaption = motionScript.timeline.find(
                    (e: any) => e.type === "caption" && currentTimeMs >= e.start_ms && currentTimeMs <= e.end_ms
                  );
                  if (!activeCaption) return null;

                  const activeHighlight = motionScript.timeline.find(
                    (e: any) => e.type === "highlight" && currentTimeMs >= e.start_ms && currentTimeMs <= e.end_ms
                  );

                  // All highlight events belonging to this caption — used to read
                  // back the render plan's own keyword choice (which honors the
                  // caption-planning LLM's `emphasis` field when available)
                  // instead of re-deriving it from scratch client-side.
                  const capHighlights = motionScript.timeline.filter(
                    (e: any) => e.type === "highlight" && e.start_ms >= activeCaption.start_ms && e.start_ms < activeCaption.end_ms
                  );
                  const backendKeywordHighlight = capHighlights.find((h: any) => h.payload?.is_keyword);

                  const capText = activeCaption.payload.text || "";

                  // Production-grade client-side timing mapping lookup
                  const segmentWords = localWords.filter(
                    (w: any) => w.start_ms >= activeCaption.start_ms && w.end_ms <= activeCaption.end_ms
                  );

                  const words = segmentWords.length > 0
                    ? segmentWords.map((w: any) => w.text)
                    : capText.split(" ");

                  // Find revealed_max (index of highlighted word)
                  let revealedMax = segmentWords.findIndex(
                    (w: any) => currentTimeMs >= w.start_ms && currentTimeMs <= w.end_ms
                  );
                  if (revealedMax === -1) {
                    if (activeHighlight?.payload?.indices?.length > 0) {
                      revealedMax = activeHighlight.payload.indices[0];
                    } else {
                      revealedMax = 0;
                    }
                  }

                  if (customCaptionTemplate === "staggered_3line") {
                    const templateStyle = getTemplateStyle(customCaptionTemplate);
                    const k = backendKeywordHighlight?.payload?.indices?.[0] ??
                      pickKeywordIndex(words.map((w: string) => ({ text: w })));
                    const line1Words = words.slice(0, k);
                    const line2Word = words[k];
                    const line3Words = words.slice(k + 1);
                    const visibleL2 = k <= revealedMax ? line2Word : null;

                    return (
                      <div
                        className="absolute inset-x-0 flex flex-col items-center pointer-events-none px-3 select-none transition-all"
                        style={{ top: `${customYPositionPercent}%`, transform: "translateY(-50%)" }}
                      >
                        <div
                          className="flex flex-col items-center tracking-tight w-full max-w-[300px] transition-all"
                          style={{
                            padding: containerPadding,
                            backgroundColor: containerBg,
                            borderRadius: containerBorderRadius,
                            border: containerBorder,
                          }}
                        >
                          {/* Line 1 — always render the FULL final word list
                              (not just the revealed subset) and toggle
                              per-word visibility instead. Filtering the
                              array before joining used to change this div's
                              actual text content (and therefore its
                              intrinsic width) every time a new word
                              appeared, which shifted the whole centered
                              container — words visibly "jumped" to make
                              room instead of simply appearing in place. */}
                          {line1Words.length > 0 && (
                            <div
                              className={`tracking-wide transition-all duration-100 ${
                                customStaggeredLayout === "centre" ? "self-center text-center" : "self-start text-left"
                              }`}
                              style={{
                                ...getTextStyle(false),
                                fontSize: `${customSize * templateStyle.baseSizeScale}px`,
                                opacity: 0.96,
                              }}
                            >
                              {line1Words.map((w: string, i: number) => (
                                <span key={i} style={{ visibility: i <= revealedMax ? "visible" : "hidden" }}>
                                  {w}{i < line1Words.length - 1 ? " " : ""}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Line 2 */}
                          {line2Word && (
                            <div
                              className="tracking-tight leading-none select-none my-0.5 transition-all duration-100 uppercase"
                              style={{
                                ...getTextStyle(true),
                                fontSize: `${customSize * templateStyle.keywordSizeScale}px`,
                                visibility: visibleL2 ? "visible" : "hidden",
                              }}
                            >
                              {line2Word}
                            </div>
                          )}
                          {/* Line 3 — same always-render-full-list fix as Line 1. */}
                          {line3Words.length > 0 && (
                            <div
                              className={`tracking-wide transition-all duration-100 ${
                                customStaggeredLayout === "centre" ? "self-center text-center" : "self-end text-right"
                              }`}
                              style={{
                                ...getTextStyle(false),
                                fontSize: `${customSize * templateStyle.baseSizeScale}px`,
                                opacity: 0.96,
                              }}
                            >
                              {line3Words.map((w: string, i: number) => (
                                <span key={i} style={{ visibility: (k + 1 + i) <= revealedMax ? "visible" : "hidden" }}>
                                  {i > 0 ? " " : ""}{w}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else if (customCaptionTemplate === "word_by_word") {
                    const activeWord = words[revealedMax] || words[0];
                    if (!activeWord) return null;

                    return (
                      <div 
                        className="absolute inset-x-0 flex flex-col items-center pointer-events-none px-3 select-none transition-all"
                        style={{ top: `${customYPositionPercent}%`, transform: "translateY(-50%)" }}
                      >
                        <div 
                          className="flex flex-col items-center tracking-wide w-full max-w-[240px] transition-all"
                          style={{
                            padding: containerPadding,
                            backgroundColor: containerBg,
                            borderRadius: containerBorderRadius,
                            border: containerBorder,
                          }}
                        >
                          <span
                            className="uppercase transition-all duration-100 text-center"
                            style={{
                              ...getTextStyle(true),
                              fontSize: `${customSize * getTemplateStyle(customCaptionTemplate).keywordSizeScale}px`,
                            }}
                          >
                            {activeWord}
                          </span>
                        </div>
                      </div>
                    );
                  } else if (customCaptionTemplate === "sentence_highlight") {
                    const templateStyle = getTemplateStyle(customCaptionTemplate);
                    return (
                      <div
                        className="absolute inset-x-0 flex flex-col items-center pointer-events-none px-3 select-none transition-all"
                        style={{ top: `${customYPositionPercent}%`, transform: "translateY(-50%)" }}
                      >
                        <div
                          className="flex flex-wrap justify-center items-center gap-x-2.5 gap-y-1.5 tracking-wide w-full max-w-[320px] transition-all"
                          style={{
                            padding: containerPadding,
                            backgroundColor: containerBg,
                            borderRadius: containerBorderRadius,
                            border: containerBorder,
                          }}
                        >
                          {words.map((word: string, idx: number) => {
                            const isActive = idx === revealedMax;
                            return (
                              <span
                                key={idx}
                                className="transition-all duration-100"
                                style={{
                                  ...getTextStyle(isActive),
                                  fontSize: `${customSize * (isActive ? templateStyle.keywordSizeScale : templateStyle.baseSizeScale)}px`,
                                  transform: isActive ? "scale(1.05)" : "scale(1)",
                                }}
                              >
                                {word}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  } else {
                    const templateStyle = getTemplateStyle(customCaptionTemplate);
                    return (
                      <div
                        className="absolute inset-x-0 flex flex-col items-center pointer-events-none px-3 select-none transition-all"
                        style={{ top: `${customYPositionPercent}%`, transform: "translateY(-50%)" }}
                      >
                        <div
                          className="flex flex-wrap justify-center items-center gap-x-2.5 gap-y-1.5 tracking-wide w-full max-w-[320px] transition-all"
                          style={{
                            padding: containerPadding,
                            backgroundColor: containerBg,
                            borderRadius: containerBorderRadius,
                            border: containerBorder,
                          }}
                        >
                          {words.map((word: string, idx: number) => {
                            return (
                              <span
                                key={idx}
                                className="transition-all duration-105"
                                style={{
                                  ...getTextStyle(false),
                                  fontSize: `${customSize * templateStyle.baseSizeScale}px`,
                                }}
                              >
                                {word}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                }

                // Fallback to local words segment logic when motionScript is not yet generated
                const activeSegment = getActiveSegmentAndIndex();
                if (!activeSegment) return null;

                const words = activeSegment.words;
                const relativeActiveIdx = activeSegment.relativeActiveIdx;

                if (customCaptionTemplate === "staggered_3line") {
                  const templateStyle = getTemplateStyle(customCaptionTemplate);
                  const k = pickKeywordIndex(words);
                  const line1Words = words.slice(0, k);
                  const line2Word = words[k];
                  const line3Words = words.slice(k + 1);

                  const revealedMax = relativeActiveIdx;
                  const visibleL2 = k <= revealedMax ? line2Word : null;

                  return (
                    <div
                      className="absolute inset-x-0 flex flex-col items-center pointer-events-none px-3 select-none transition-all"
                      style={{ top: `${customYPositionPercent}%`, transform: "translateY(-50%)" }}
                    >
                      <div
                        className="flex flex-col items-center tracking-tight w-full max-w-[300px] transition-all"
                        style={{
                          padding: containerPadding,
                          backgroundColor: containerBg,
                          borderRadius: containerBorderRadius,
                          border: containerBorder,
                        }}
                      >
                        {/* Line 1 — full word list always rendered, per-word
                            visibility toggled, so the div's width never
                            changes as words reveal (see the loaded-motionScript
                            branch above for the full explanation). */}
                        {line1Words.length > 0 && (
                          <div
                            className={`tracking-wide transition-all duration-100 ${
                              customStaggeredLayout === "centre" ? "self-center text-center" : "self-start text-left"
                            }`}
                            style={{
                              ...getTextStyle(false),
                              fontSize: `${customSize * templateStyle.baseSizeScale}px`,
                              opacity: 0.96,
                            }}
                          >
                            {line1Words.map((w, i) => (
                              <span key={i} style={{ visibility: i <= revealedMax ? "visible" : "hidden" }}>
                                {w.text}{i < line1Words.length - 1 ? " " : ""}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Line 2 */}
                        {line2Word && (
                          <div
                            className="tracking-tight leading-none select-none my-0.5 transition-all duration-100 uppercase"
                            style={{
                              ...getTextStyle(true),
                              fontSize: `${customSize * templateStyle.keywordSizeScale}px`,
                              visibility: visibleL2 ? "visible" : "hidden",
                            }}
                          >
                            {line2Word.text}
                          </div>
                        )}
                        {/* Line 3 */}
                        {line3Words.length > 0 && (
                          <div
                            className={`tracking-wide transition-all duration-100 ${
                              customStaggeredLayout === "centre" ? "self-center text-center" : "self-end text-right"
                            }`}
                            style={{
                              ...getTextStyle(false),
                              fontSize: `${customSize * templateStyle.baseSizeScale}px`,
                              opacity: 0.96,
                            }}
                          >
                            {line3Words.map((w, i) => (
                              <span key={i} style={{ visibility: (k + 1 + i) <= revealedMax ? "visible" : "hidden" }}>
                                {i > 0 ? " " : ""}{w.text}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else if (customCaptionTemplate === "word_by_word") {
                  const activeWord = words[relativeActiveIdx];
                  if (!activeWord) return null;

                  return (
                    <div
                      className="absolute inset-x-0 flex flex-col items-center pointer-events-none px-3 select-none transition-all"
                      style={{ top: `${customYPositionPercent}%`, transform: "translateY(-50%)" }}
                    >
                      <div
                        className="flex flex-col items-center tracking-wide w-full max-w-[240px] transition-all"
                        style={{
                          padding: containerPadding,
                          backgroundColor: containerBg,
                          borderRadius: containerBorderRadius,
                          border: containerBorder,
                        }}
                      >
                        <span
                          className="uppercase transition-all duration-100 text-center"
                          style={{
                            ...getTextStyle(true),
                            fontSize: `${customSize * getTemplateStyle(customCaptionTemplate).keywordSizeScale}px`,
                          }}
                        >
                          {activeWord.text}
                        </span>
                      </div>
                    </div>
                  );
                } else if (customCaptionTemplate === "sentence_highlight") {
                  return (
                    <div 
                      className="absolute inset-x-0 flex flex-col items-center pointer-events-none px-3 select-none transition-all"
                      style={{ top: `${customYPositionPercent}%`, transform: "translateY(-50%)" }}
                    >
                      <div
                        className="flex flex-wrap justify-center items-center gap-x-2.5 gap-y-1.5 tracking-wide w-full max-w-[320px] transition-all"
                        style={{
                          padding: containerPadding,
                          backgroundColor: containerBg,
                          borderRadius: containerBorderRadius,
                          border: containerBorder,
                        }}
                      >
                        {words.map((word, idx) => {
                          const isActive = idx === relativeActiveIdx;
                          const templateStyle = getTemplateStyle(customCaptionTemplate);
                          return (
                            <span
                              key={idx}
                              className="transition-all duration-100"
                              style={{
                                ...getTextStyle(isActive),
                                fontSize: `${customSize * (isActive ? templateStyle.keywordSizeScale : templateStyle.baseSizeScale)}px`,
                                transform: isActive ? "scale(1.05)" : "scale(1)",
                              }}
                            >
                              {word.text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                } else {
                  const templateStyle = getTemplateStyle(customCaptionTemplate);
                  return (
                    <div
                      className="absolute inset-x-0 flex flex-col items-center pointer-events-none px-3 select-none transition-all"
                      style={{ top: `${customYPositionPercent}%`, transform: "translateY(-50%)" }}
                    >
                      <div
                        className="flex flex-wrap justify-center items-center gap-x-2.5 gap-y-1.5 tracking-wide w-full max-w-[320px] transition-all"
                        style={{
                          padding: containerPadding,
                          backgroundColor: containerBg,
                          borderRadius: containerBorderRadius,
                          border: containerBorder,
                        }}
                      >
                        {words.map((word, idx) => {
                          return (
                            <span
                              key={idx}
                              className="transition-all duration-105"
                              style={{
                                ...getTextStyle(false),
                                fontSize: `${customSize * templateStyle.baseSizeScale}px`,
                              }}
                            >
                              {word.text}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              })()}

              {/* Scrubber progress indicator */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-[#23272F]">
                <div 
                  className="h-full bg-[#00F5C4] transition-all duration-75"
                  style={{ width: `${durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0}%` }}
                />
              </div>

            </div>
          </div>

          {/* Scrubber control panel */}
          <div className="h-12 bg-[#111317] border-t border-[#23272F] px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) {
                      videoRef.current.pause();
                      setIsPlaying(false);
                    } else {
                      videoRef.current.play().then(() => setIsPlaying(true));
                    }
                  }
                }}
                className="p-1 text-white hover:text-[#00F5C4] transition-colors cursor-pointer"
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      const newMute = !isMuted;
                      videoRef.current.muted = newMute;
                      setIsMuted(newMute);
                    }
                  }}
                  className="text-white hover:text-[#00F5C4] transition-colors cursor-pointer"
                >
                  {isMuted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (videoRef.current) {
                      videoRef.current.volume = v;
                      videoRef.current.muted = v === 0;
                      setIsMuted(v === 0);
                    }
                  }}
                  className="w-16 h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="text-[10px] font-mono text-white">
              {(() => {
                const formatTime = (ms: number) => {
                  const sec = Math.floor(ms / 1000) % 60;
                  const min = Math.floor(ms / 60000);
                  return `${min}:${sec < 10 ? "0" : ""}${sec}`;
                };
                return `${formatTime(currentTimeMs)} / ${formatTime(durationMs)}`;
              })()}
            </div>
          </div>

          {/* C. BOTTOM TIMELINE WORKSTATION */}
          <div className="h-56 bg-[#111317] border-t border-[#23272F] flex flex-col shrink-0 overflow-hidden shadow-md">
            {/* 1. Timeline Top Control Bar */}
            <div className="h-12 border-b border-[#23272F] px-4 flex items-center justify-between bg-[#0E1013]/60 shrink-0">
              
              {/* Playback & Frame Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 0.1);
                      setCurrentTimeMs(videoRef.current.currentTime * 1000);
                    }
                  }}
                  className="p-1.5 bg-[#1C2027] border border-[#23272F] text-white hover:text-[#FFB800] transition-colors rounded cursor-pointer"
                  title="Previous frame"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      } else {
                        videoRef.current.play().then(() => setIsPlaying(true));
                      }
                    }
                  }}
                  className="w-7 h-7 bg-[#FFB800] hover:bg-[#DE9E00] text-[#0A0B0D] rounded-full flex items-center justify-center transition-all cursor-pointer shadow hover:scale-105"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  ) : (
                    <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 0.1);
                      setCurrentTimeMs(videoRef.current.currentTime * 1000);
                    }
                  }}
                  className="p-1.5 bg-[#1C2027] border border-[#23272F] text-white hover:text-[#FFB800] transition-colors rounded cursor-pointer"
                  title="Next frame"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>

              {/* Undo / Redo / Toggles */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button 
                    className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer text-[10px] uppercase font-bold"
                    title="Undo"
                  >
                    ↰
                  </button>
                  <button 
                    className="p-1.5 text-white/50 hover:text-white transition-colors cursor-pointer text-[10px] uppercase font-bold"
                    title="Redo"
                  >
                    ↱
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-[#23272F]" />

                {/* WORD / LINE Mode Selector Toggle */}
                <div className="flex border border-[#23272F] rounded bg-[#181B21] overflow-hidden">
                  <button
                    onClick={() => {}}
                    className="px-3 py-1 text-[8px] font-black uppercase tracking-wider text-white/40 hover:text-white transition-all cursor-pointer"
                  >
                    Word
                  </button>
                  <button
                    onClick={() => {}}
                    className="px-3 py-1 text-[8px] font-black uppercase tracking-wider bg-[#FFB800] text-[#0A0B0D] transition-all cursor-pointer"
                  >
                    Line
                  </button>
                </div>

                <button 
                  className="px-2.5 py-1 bg-[#1C2027] border border-[#23272F] text-white/80 hover:text-[#FFB800] transition-colors rounded text-[8px] font-black uppercase tracking-wider cursor-pointer"
                >
                  + Line
                </button>
              </div>

              {/* Time display & Zoom */}
              <div className="flex items-center gap-4">
                {/* Time Display */}
                <div className="text-[10px] font-mono font-bold text-[#FFB800] bg-[#181B21] px-2.5 py-1 rounded border border-[#23272F]">
                  {(() => {
                    const formatTime = (ms: number) => {
                      const sec = Math.floor(ms / 1000) % 60;
                      const min = Math.floor(ms / 60000);
                      const millis = Math.floor((ms % 1000) / 10);
                      return `${min < 10 ? "0" : ""}${min}:${sec < 10 ? "0" : ""}${sec}:${millis < 10 ? "0" : ""}${millis}`;
                    };
                    return `${formatTime(currentTimeMs)} / ${formatTime(durationMs)}`;
                  })()}
                </div>

                <div className="h-4 w-[1px] bg-[#23272F]" />

                {/* Zoom control */}
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-white/50" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                  </svg>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-[#23272F] rounded-lg appearance-none cursor-pointer accent-[#FFB800]"
                  />
                  <span className="text-[8px] font-mono text-white/40">{Math.round(zoomLevel * 100)}%</span>
                </div>
              </div>
            </div>

            {/* 2. Timeline Track Area (Word Boxes & Waveform) */}
            <div 
              className="flex-1 overflow-x-auto relative py-3 px-4 scrollbar-thin bg-[#0A0B0D]"
              onWheel={(e) => {
                const container = e.currentTarget;
                if (e.deltaY !== 0) {
                  container.scrollLeft += e.deltaY;
                  e.preventDefault();
                }
              }}
            >
              <div 
                className="h-full relative"
                style={{ width: `${(durationMs || 10000) * 0.15 * zoomLevel}px` }}
              >
                {/* Word Bounding Boxes Track */}
                <div className="absolute top-1 inset-x-0 h-14 z-10">
                  {localWords.map((word, idx) => {
                    const startX = word.start_ms * 0.15 * zoomLevel;
                    const width = (word.end_ms - word.start_ms) * 0.15 * zoomLevel;
                    const isActive = currentTimeMs >= word.start_ms && currentTimeMs <= word.end_ms;

                    return (
                      <div
                        key={idx}
                        className={`absolute h-11 rounded border flex flex-col items-center justify-center px-1 text-center transition-all cursor-pointer shadow-sm select-none ${
                          isActive
                            ? "bg-[#FFB800] border-[#E5A500] text-[#0A0B0D] scale-102 z-20"
                            : word.highlighted
                            ? "bg-[#FFEAA7]/80 border-[#FFB800]/50 text-[#2D3436]"
                            : "bg-[#DECEB0] border-[#C2B294] text-[#2E2514] hover:bg-[#E8DFCA] hover:border-white/40"
                        }`}
                        style={{ 
                          left: `${startX}px`, 
                          width: `${Math.max(28, width)}px` 
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoRef.current) {
                            videoRef.current.currentTime = word.start_ms / 1000;
                            setCurrentTimeMs(word.start_ms);
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingWordIndex(idx);
                          setEditingWordText(word.text);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          handleToggleHighlight(idx);
                        }}
                        title="Double-click to edit, right-click to highlight"
                      >
                        {editingWordIndex === idx ? (
                          <input
                            type="text"
                            value={editingWordText}
                            onChange={(e) => setEditingWordText(e.target.value)}
                            onBlur={() => handleWordEditSave(idx)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleWordEditSave(idx);
                              if (e.key === "Escape") setEditingWordIndex(null);
                            }}
                            autoFocus
                            className="bg-[#111317] border border-[#FFB800] text-[9px] font-bold text-center w-full focus:outline-none text-white rounded p-0.5"
                          />
                        ) : (
                          <>
                            <span className="text-[9px] font-black truncate w-full block">
                              {word.text}
                            </span>
                            <span className={`text-[6px] tracking-tighter opacity-60 font-medium w-full truncate block mt-0.5 ${isActive ? "text-[#0A0B0D]/80" : "text-[#2E2514]/70"}`}>
                              ♩ Text
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* WaveSurfer anchor element */}
                <div 
                  ref={waveformRef} 
                  className="absolute inset-x-0 bottom-1 h-[72px] z-0 opacity-80"
                />

                {/* Playhead vertical cursor */}
                <div 
                  className="absolute top-0 bottom-0 w-[2px] bg-[#FFB800] z-20 pointer-events-none"
                  style={{ left: `${currentTimeMs * 0.15 * zoomLevel}px` }}
                >
                  <div className="w-3 h-3 rounded-full bg-[#FFB800] -ml-[5px] -mt-[2px] border border-[#0A0B0D] shadow shadow-[#FFB800]/50 cursor-ew-resize" />
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* C. RIGHT SIDEBAR: EXPORT SETTINGS */}
        <section className="w-72 bg-[#111317] border-l border-[#23272F] p-4 flex flex-col justify-between shrink-0 overflow-y-auto shadow-sm">
          
          <div className="space-y-6">
            <div className="pb-2 border-b border-[#23272F]">
              <span className="text-[9px] font-bold text-white uppercase tracking-widest">Export Config</span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-[10px] uppercase font-bold text-white border-b border-[#23272F] pb-2">
                <span>Output Format</span>
                <span className="text-white">MP4 (H.264)</span>
              </div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-white border-b border-[#23272F] pb-2">
                <span>Target Resolution</span>
                <span className="text-white">1080x1920 (Vertical)</span>
              </div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-white border-b border-[#23272F] pb-2">
                <span>Layout Applied</span>
                <span className="text-[#00F5C4] font-mono">{customCaptionTemplate}</span>
              </div>
            </div>

            {/* RENDER OPTION ON TOP */}
            <div className="space-y-3 pt-2">
              {isRendering ? (
                <div className="space-y-2 p-3 bg-[#181B21] border border-[#23272F]">
                  <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-white">
                    <span>Rendering Video...</span>
                    <span className="text-[#00F5C4]">{renderJobStatus?.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-[#23272F] h-1">
                    <div 
                      className="bg-[#00F5C4] h-1 transition-all"
                      style={{ width: `${renderJobStatus?.progress || 0}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button 
                  onClick={startRendering}
                  disabled={project?.status !== "COMPLETED"}
                  className={`w-full font-primary font-black uppercase text-[10px] tracking-wider py-3.5 transition-all text-center shadow-sm ${
                    project?.status === "COMPLETED" 
                      ? "bg-[#00F5C4] text-[#0A0B0D] hover:bg-[#00C2A0] cursor-pointer" 
                      : "bg-[#23272F] text-white/30 cursor-not-allowed border border-[#111317]"
                  }`}
                >
                  Render & Export Video
                </button>
              )}
            </div>

            {/* COLLAPSIBLE PIPELINE DETAILS ACCORDION */}
            <div className="border border-[#23272F] bg-[#181B21]/50 rounded-none overflow-hidden">
              <button
                onClick={() => setIsPipelineDropdownOpen(!isPipelineDropdownOpen)}
                className="w-full px-3 py-2.5 flex justify-between items-center bg-[#181B21] border-b border-[#23272F] text-[9px] font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-[#1C2027] transition-all"
              >
                <span>Pipeline Activity</span>
                <span className="text-white/60 text-[10px]">
                  {isPipelineDropdownOpen ? "▲" : "▼"}
                </span>
              </button>
              
              {isPipelineDropdownOpen && (
                <div className="p-3 space-y-4">
                  {/* AI PIPELINE STAGES SECTION */}
                  <div className="space-y-2">
                    <div className="text-[8px] font-bold uppercase text-white/50 tracking-wider">
                      AI Analysis Stages
                    </div>
                    <div className="space-y-1.5 pl-1">
                      {AI_PIPELINE_STAGES.map((stage) => {
                        const state = getAiStageState(stage.id);
                        return (
                          <div key={stage.id} className="flex items-center justify-between text-[9px]">
                            <span className={`font-medium ${
                              state === "completed" ? "text-white/80" : 
                              state === "running" ? "text-[#FFB800] font-bold animate-pulse" : 
                              state === "failed" ? "text-red-400 font-bold" : 
                              "text-white/30"
                            }`}>
                              {stage.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {state === "completed" && (
                                <span className="text-[#00F5C4] font-bold">✓</span>
                              )}
                              {state === "running" && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFB800] opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFB800]"></span>
                                </span>
                              )}
                              {state === "failed" && (
                                <span className="text-red-500 font-bold">✗</span>
                              )}
                              {state === "pending" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white/10"></span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RENDER PIPELINE STAGES SECTION */}
                  {(isRendering || renderJobStatus || (exports || []).length > 0) && (
                    <div className="space-y-2 pt-2 border-t border-[#23272F]/50">
                      <div className="text-[8px] font-bold uppercase text-white/50 tracking-wider">
                        Render Pipeline Stages
                      </div>
                      <div className="space-y-1.5 pl-1">
                        {RENDER_PIPELINE_STAGES.map((stage) => {
                          const state = getRenderStageState(stage.id);
                          return (
                            <div key={stage.id} className="flex items-center justify-between text-[9px]">
                              <span className={`font-medium ${
                                state === "completed" ? "text-white/80" : 
                                state === "running" ? "text-[#00F5C4] font-bold animate-pulse" : 
                                state === "failed" ? "text-red-400 font-bold" : 
                                "text-white/30"
                              }`}>
                                {stage.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {state === "completed" && (
                                  <span className="text-[#00F5C4] font-bold">✓</span>
                                )}
                                {state === "running" && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F5C4] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F5C4]"></span>
                                  </span>
                                )}
                                {state === "failed" && (
                                  <span className="text-red-500 font-bold">✗</span>
                                )}
                                {state === "pending" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/10"></span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* FAILED JOB/PROCESSING ALERTS */}
                  {project?.status === "FAILED" && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-bold p-2.5 space-y-1.5 text-left">
                      <div className="uppercase tracking-wider">AI Pipeline Failed</div>
                      <div className="font-mono text-[7px] leading-relaxed break-words opacity-80">
                        {jobStatus?.error_message || processingError || "Unknown processing error"}
                      </div>
                      <button
                        onClick={() => {
                          processingStartedRef.current = false;
                          startProcessing();
                        }}
                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 font-primary font-black uppercase text-[7px] tracking-wider py-1 border border-red-500/30 cursor-pointer text-center transition-colors"
                      >
                        Retry AI Processing
                      </button>
                    </div>
                  )}

                  {/* RENDERING ERROR ALERTS */}
                  {renderError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-bold p-2.5 space-y-1 text-left">
                      <div className="uppercase tracking-wider">Rendering Failed</div>
                      <div className="font-mono text-[7px] leading-relaxed break-words opacity-80">
                        {renderError}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          <div className="space-y-4 pt-6 border-t border-[#23272F]">
            <span className="block text-[9px] font-bold text-white uppercase tracking-widest">Render History</span>
            
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {(exports || []).length === 0 ? (
                <span className="block text-[8px] font-bold uppercase text-white italic">No exports generated.</span>
              ) : (
                (exports || []).map((exp, idx) => (
                  <div key={idx} className="bg-[#181B21] border border-[#23272F] p-2.5 flex flex-col justify-between gap-2 text-left shadow-sm">
                    <div className="flex justify-between items-center text-[7px] font-mono text-white uppercase">
                      <span>EXPORT #{idx + 1}</span>
                      <span className={exp.status === "completed" ? "text-[#00F5C4]" : "text-yellow-500"}>
                        {exp.status}
                      </span>
                    </div>
                    {exp.status === "completed" && exp.download_url && (
                      <a 
                        href={exp.download_url} 
                        download 
                        className="text-[9px] font-bold uppercase tracking-wider text-[#00F5C4] hover:text-[#00C2A0] transition-colors text-center w-full py-1 bg-[#0A0B0D] border border-[#23272F] block"
                      >
                        Download Output File
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

      </div>

    </div>
  );
}
