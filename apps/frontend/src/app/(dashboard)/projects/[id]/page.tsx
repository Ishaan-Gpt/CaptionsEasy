"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
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
import { CaptionStyle } from "@/remotion/CaptionEngine";

// Modular Project Detail Components
import { WorkspaceHeader } from "@/components/project/WorkspaceHeader";
import { SidebarControlsSection } from "@/components/project/SidebarControlsSection";
import { VideoPlayerSection } from "@/components/project/VideoPlayerSection";
import { TimelineEditorSection } from "@/components/project/TimelineEditorSection";
import { ExportHistorySection } from "@/components/project/ExportHistorySection";

function describeError(err: unknown): string {
  if (err instanceof NetworkUnavailableError) return err.message;
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const seen = new Set<string>();
    for (const tpl of TEMPLATE_PRESETS_LIST) {
      if (!seen.has(tpl.font)) {
        seen.add(tpl.font);
        ensureFontLoaded(tpl.font);
      }
    }
  }, []);

  const [playerWidth, setPlayerWidth] = useState<number>(360);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const element = playerContainerRef.current;
    if (!element) return;

    const updateSize = () => {
      if (element.clientWidth > 0) {
        setPlayerWidth(element.clientWidth);
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(element);

    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [mounted]);

  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
  const [editingWordText, setEditingWordText] = useState("");
  const [localWords, setLocalWords] = useState<any[]>([]);
  const [wordDisplayMode, setWordDisplayMode] = useState<"word" | "line">("word");
  const wordsHistoryRef = useRef<{ past: any[][]; future: any[][] }>({ past: [], future: [] });
  const [historyVersion, setHistoryVersion] = useState(0);
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
  const [customStaggeredLayout, setCustomStaggeredLayout] = useState<"splash" | "centre">("splash");
  const [customWordLimit, setCustomWordLimit] = useState<number>(5);
  const [customCaptionSpacingMs, setCustomCaptionSpacingMs] = useState<number>(50);
  const [customWordPacing, setCustomWordPacing] = useState<string>("dynamic");
  const [customPauseHandling, setCustomPauseHandling] = useState<string>("hold");
  const [customAccentPeriodEnabled, setCustomAccentPeriodEnabled] = useState<boolean>(true);

  // Formatting position/spacing styling states
  const [activeTab, setActiveTab] = useState<"text" | "templates">("text");
  const [customFontFace, setCustomFontFace] = useState<string>("Bold");
  const [customCasing, setCustomCasing] = useState<"none" | "uppercase" | "lowercase" | "capitalize">("none");
  const [customUnderline, setCustomUnderline] = useState<boolean>(false);
  const [customAlignment, setCustomAlignment] = useState<"left" | "center" | "right">("center");
  const [customXPositionPercent, setCustomXPositionPercent] = useState<number>(50);
  const [customColorMode, setCustomColorMode] = useState<"solid" | "gradient">("solid");
  const [customColor2, setCustomColor2] = useState<string>("#00F5C4");
  const [customLetterSpacing, setCustomLetterSpacing] = useState<number>(0);
  const [customWordSpacing, setCustomWordSpacing] = useState<number>(6);
  const [customLineSpacing, setCustomLineSpacing] = useState<number>(1.0);
  const [styleError, setStyleError] = useState<string | null>(null);

  // Bounding box editor positions
  const [customBoxTop, setCustomBoxTop] = useState<number>(80);
  const [customBoxBottom, setCustomBoxBottom] = useState<number>(120);
  const [customBoxLeft, setCustomBoxLeft] = useState<number>(50);
  const [customBoxRight, setCustomBoxRight] = useState<number>(50);
  const [boxEditMode, setBoxEditMode] = useState<boolean>(false);
  const [pendingBoxCommit, setPendingBoxCommit] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null);
  const [liveDragBox, setLiveDragBox] = useState<{ top: number; bottom: number; left: number; right: number } | null>(null);
  const [isSavingBox, setIsSavingBox] = useState(false);

  // Motion controls rendered by the shared CaptionEngine (preview + export).
  const [customEntranceAnim, setCustomEntranceAnim] = useState<"none" | "rise" | "pop" | "fade">("rise");
  const [customHighlightAnim, setCustomHighlightAnim] = useState<"pop" | "flash" | "underline" | "glow">("pop");
  const [customOutlineColor, setCustomOutlineColor] = useState<string>("#000000");
  const [customShadowColor, setCustomShadowColor] = useState<string>("#000000");

  // Edit target (primary vs secondary keyword text highlight customization)
  const [editTarget, setEditTarget] = useState<"primary" | "secondary">("primary");
  const [heroFont, setHeroFont] = useState<string>("");
  const [heroFontFace, setHeroFontFace] = useState<string>("Template default");
  const [heroSizeScale, setHeroSizeScale] = useState<number>(1.5);

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

  // Active template dropdown inside left panel
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>("staggered_3line");

  // Renders states
  const [renderJobStatus, setRenderJobStatus] = useState<JobStatusResponse | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [activeExportId, setActiveExportId] = useState<string | null>(null);

  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
    refetch: refetchProject,
  } = useQuery<Project | null>({
    queryKey: ["project", projectId],
    queryFn: () => projectsService.getProjectById(projectId),
    enabled: authService.isAuthenticated(),
    // One retry is enough to smooth over a blip; failing fast matters more
    // when the backend is down than a fourth identical attempt.
    retry: 1,
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
    const templateStyle = getTemplateStyle(customCaptionTemplate);
    if (templateStyle.keywordFont) {
      ensureFontLoaded(templateStyle.keywordFont);
    }
    if (templateStyle.baseFont) {
      ensureFontLoaded(templateStyle.baseFont);
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
            setCustomWordLimit(res.word_limit || 5);
            setCustomCaptionSpacingMs(res.caption_spacing_ms || 50);
            setCustomWordPacing(res.word_pacing || "dynamic");
            setCustomPauseHandling(res.pause_handling || "hold");
            setCustomAccentPeriodEnabled(res.accent_period_enabled !== undefined ? res.accent_period_enabled : true);

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

            setCustomCasing((res.text_transform || "none") as any);
            setCustomUnderline(Boolean(res.underline));
            setCustomLetterSpacing(res.letter_spacing ?? 0);
            setCustomWordSpacing(res.word_spacing ?? 6);
            setCustomLineSpacing(res.line_spacing ?? 1.0);
            setCustomColorMode((res.color_mode || "solid") as any);
            if (res.color2) setCustomColor2(res.color2);
            if (res.x_position_percent != null) setCustomXPositionPercent(res.x_position_percent);
            if (res.box_top != null) setCustomBoxTop(res.box_top);
            if (res.box_bottom != null) setCustomBoxBottom(res.box_bottom);
            if (res.box_left != null) setCustomBoxLeft(res.box_left);
            if (res.box_right != null) setCustomBoxRight(res.box_right);
            if (res.keyword_font) setHeroFont(res.keyword_font);
            if (res.keyword_weight) setHeroFontFace(wMap[res.keyword_weight] || "Template default");
            if (res.keyword_size_scale != null) setHeroSizeScale(res.keyword_size_scale);
            if (res.entrance_anim) setCustomEntranceAnim(res.entrance_anim);
            if (res.highlight_anim) setCustomHighlightAnim(res.highlight_anim);
            if (res.outline_color) setCustomOutlineColor(res.outline_color);
            if (res.shadow_color) setCustomShadowColor(res.shadow_color);
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
      waveColor: "#3B301C",
      progressColor: "#DCC8A4",
      height: 48,
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 2,
      minPxPerSec: 150 * zoomLevel,
    });

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

  const pushWordsHistory = (snapshot: any[]) => {
    const MAX_HISTORY = 50;
    const hist = wordsHistoryRef.current;
    hist.past = [...hist.past, snapshot].slice(-MAX_HISTORY);
    hist.future = [];
    setHistoryVersion((v) => v + 1);
  };

  const handleUndo = () => {
    const hist = wordsHistoryRef.current;
    if (hist.past.length === 0) return;
    const previous = hist.past[hist.past.length - 1];
    hist.past = hist.past.slice(0, -1);
    hist.future = [localWords, ...hist.future];
    setLocalWords(previous);
    saveTranscriptBackground(previous);
    setHistoryVersion((v) => v + 1);
  };

  const handleRedo = () => {
    const hist = wordsHistoryRef.current;
    if (hist.future.length === 0) return;
    const next = hist.future[0];
    hist.future = hist.future.slice(1);
    hist.past = [...hist.past, localWords];
    setLocalWords(next);
    saveTranscriptBackground(next);
    setHistoryVersion((v) => v + 1);
  };

  const styleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveStyleImmediate = async (styleOverrides?: any) => {
    setActiveExportId(null);
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
    const heroFaceValue = styleOverrides?.heroFontFace ?? heroFontFace;
    const resolvedKeywordWeight = heroFaceValue === "Template default" ? null : (wMap[heroFaceValue] || null);

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
      accent_period_enabled: customAccentPeriodEnabled,
      word_limit: customWordLimit,
      caption_spacing_ms: customCaptionSpacingMs,
      word_pacing: customWordPacing,
      pause_handling: customPauseHandling,
      text_transform: customCasing,
      underline: customUnderline,
      letter_spacing: customLetterSpacing,
      word_spacing: customWordSpacing,
      line_spacing: customLineSpacing,
      color_mode: customColorMode,
      color2: customColorMode === "gradient" ? customColor2 : null,
      x_position_percent: customXPositionPercent,
      box_top: customBoxTop,
      box_bottom: customBoxBottom,
      box_left: customBoxLeft,
      box_right: customBoxRight,
      keyword_font: heroFont || null,
      keyword_weight: resolvedKeywordWeight,
      keyword_size_scale: heroSizeScale,
      entrance_anim: customEntranceAnim,
      highlight_anim: customHighlightAnim,
      outline_color: customOutlineColor,
      shadow_color: customShadowColor,
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
    setActiveExportId(null);
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
      const heroFaceValue = styleOverrides?.heroFontFace ?? heroFontFace;
      const resolvedKeywordWeight = heroFaceValue === "Template default" ? null : (wMap[heroFaceValue] || null);

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
        accent_period_enabled: customAccentPeriodEnabled,
        word_limit: customWordLimit,
        caption_spacing_ms: customCaptionSpacingMs,
        word_pacing: customWordPacing,
        pause_handling: customPauseHandling,
        text_transform: customCasing,
        underline: customUnderline,
        letter_spacing: customLetterSpacing,
        word_spacing: customWordSpacing,
        line_spacing: customLineSpacing,
        color_mode: customColorMode,
        color2: customColorMode === "gradient" ? customColor2 : null,
        x_position_percent: customXPositionPercent,
        box_top: customBoxTop,
        box_bottom: customBoxBottom,
        box_left: customBoxLeft,
        box_right: customBoxRight,
        keyword_font: heroFont || null,
        keyword_weight: resolvedKeywordWeight,
        keyword_size_scale: heroSizeScale,
        entrance_anim: customEntranceAnim,
        highlight_anim: customHighlightAnim,
        outline_color: customOutlineColor,
        shadow_color: customShadowColor,
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

  const applyBoxToFragment = async (startMs: number, box: { top: number; bottom: number; left: number; right: number }) => {
    setIsSavingBox(true);
    try {
      await projectsService.setFragmentOverride(projectId, startMs, box);
      if (project?.status === "COMPLETED") {
        await projectsService.generateMotionScript(projectId);
        refetchMotionScript();
      }
    } catch (err) {
      console.error("Error saving fragment box override:", err);
    } finally {
      setIsSavingBox(false);
      setPendingBoxCommit(null);
    }
  };

  const applyBoxToAll = async (box: { top: number; bottom: number; left: number; right: number }) => {
    setIsSavingBox(true);
    setCustomBoxTop(box.top);
    setCustomBoxBottom(box.bottom);
    setCustomBoxLeft(box.left);
    setCustomBoxRight(box.right);
    try {
      await saveStyleImmediate({
        box_top: box.top,
        box_bottom: box.bottom,
        box_left: box.left,
        box_right: box.right,
      });
    } finally {
      setIsSavingBox(false);
      setPendingBoxCommit(null);
    }
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

  const handleWordEditSave = (wordIdx: number) => {
    if (!editingWordText.trim()) return;
    pushWordsHistory(localWords);
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
    pushWordsHistory(localWords);
    const updated = [...localWords];
    updated[wordIdx] = {
      ...updated[wordIdx],
      highlighted: !updated[wordIdx].highlighted
    };
    setLocalWords(updated);
    saveTranscriptBackground(updated);
  };

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

  // The one style object the shared CaptionEngine renders. Rebuilt from
  // live control state on every change — the preview reacts on the next
  // animation frame, no save round-trip needed.
  const captionStyle: CaptionStyle = useMemo(() => {
    const wMap: Record<string, string> = {
      "Thin": "100", "Extra Light": "200", "Light": "300", "Regular": "400",
      "Medium": "500", "Semi Bold": "600", "Bold": "700", "Extra Bold": "800", "Black": "900",
    };
    const heroWeight = heroFontFace === "Template default" ? null : wMap[heroFontFace.replace(" Italic", "")] || null;
    return {
      template: customCaptionTemplate,
      font: customFont,
      size: customSize,
      weight: wMap[customFontFace.replace(" Italic", "")] || "800",
      color: customColor,
      highlightColor: customHighlightColor,
      color2: customColorMode === "gradient" ? customColor2 : null,
      colorMode: customColorMode,
      alignment: customAlignment,
      casing: customCasing,
      underline: customUnderline,
      letterSpacing: customLetterSpacing,
      wordSpacing: customWordSpacing,
      lineSpacing: customLineSpacing,
      shadow: shadowEnabled ? (customShadow || 3) : 0,
      shadowColor: customShadowColor,
      outline: strokeEnabled ? (customOutline || 2) : 0,
      outlineColor: customOutlineColor,
      backgroundStyle: backgroundEnabled ? selectedBackgroundStyle : "none",
      xPercent: customXPositionPercent,
      yPercent: customYPositionPercent,
      staggeredLayout: customStaggeredLayout,
      heroFont: heroFont || null,
      heroWeight,
      heroSizeScale,
      entranceAnim: customEntranceAnim,
      highlightAnim: customHighlightAnim,
      box: { top: customBoxTop, bottom: customBoxBottom, left: customBoxLeft, right: customBoxRight },
      accentPeriod: customAccentPeriodEnabled,
    };
  }, [
    customCaptionTemplate, customFont, customSize, customFontFace, customColor,
    customHighlightColor, customColorMode, customColor2, customAlignment,
    customCasing, customUnderline, customLetterSpacing, customWordSpacing,
    customLineSpacing, shadowEnabled, customShadow, customShadowColor,
    strokeEnabled, customOutline, customOutlineColor, backgroundEnabled,
    selectedBackgroundStyle, customXPositionPercent, customYPositionPercent,
    customStaggeredLayout, heroFont, heroFontFace, heroSizeScale,
    customEntranceAnim, customHighlightAnim, customBoxTop, customBoxBottom,
    customBoxLeft, customBoxRight, customAccentPeriodEnabled,
  ]);

  const handleTemplateClick = async (presetId: string) => {
    setExpandedTemplateId(presetId);

    const preset = TEMPLATE_PRESETS_LIST.find((p) => p.id === presetId);
    if (!preset) return;

    setActiveExportId(null);

    setCustomFont(preset.font);
    setCustomSize(preset.size);
    setCustomColor(preset.color);
    setCustomHighlightColor(preset.highlight_color);
    setCustomShadow(preset.shadow);
    setCustomOutline(preset.outline);
    setCustomBackgroundStyle(preset.background_style);
    setCustomYPositionPercent(preset.y_position_percent);
    setCustomCaptionTemplate(preset.caption_template);
    setCustomStaggeredLayout(preset.staggered_layout || "splash");
    setCustomAccentPeriodEnabled(preset.accent_period_enabled !== undefined ? preset.accent_period_enabled : true);
    setCustomWordLimit(preset.word_limit || 5);
    setCustomCaptionSpacingMs(preset.caption_spacing_ms || 50);
    setCustomWordPacing(preset.word_pacing || "dynamic");
    setCustomPauseHandling(preset.pause_handling || "hold");

    setShadowEnabled(preset.shadow > 0);
    setStrokeEnabled(preset.outline > 0);
    setBackgroundEnabled(preset.background_style !== "none");
    if (preset.background_style !== "none") {
      setSelectedBackgroundStyle(preset.background_style as any);
    }

    setCustomCasing("none");
    setCustomUnderline(false);
    setCustomAlignment("center");
    setCustomXPositionPercent(50);
    setCustomColorMode("solid");
    setCustomLetterSpacing(0);
    setCustomWordSpacing(6);
    setCustomLineSpacing(1.0);

    setCustomBoxTop(preset.box_top);
    setCustomBoxBottom(preset.box_bottom);
    setCustomBoxLeft(preset.box_left);
    setCustomBoxRight(preset.box_right);

    setEditTarget("primary");
    setHeroFont("");
    setHeroFontFace("Template default");
    setHeroSizeScale(getTemplateStyle(preset.caption_template).keywordSizeScale);

    const wMap: Record<string, string> = {
      "100": "Thin", "200": "Extra Light", "300": "Light", "400": "Regular",
      "500": "Medium", "600": "Semi Bold", "700": "Bold", "800": "Extra Bold", "900": "Black"
    };
    setCustomFontFace(wMap[preset.weight] || "Bold");

    ensureFontLoaded(preset.font);
    const templateStyle = getTemplateStyle(preset.caption_template);
    if (templateStyle.keywordFont) {
      ensureFontLoaded(templateStyle.keywordFont);
    }
    if (templateStyle.baseFont) {
      ensureFontLoaded(templateStyle.baseFont);
    }

    await saveStyleImmediate({
      font: preset.font,
      size: preset.size,
      weight: preset.weight,
      color: preset.color,
      highlight_color: preset.highlight_color,
      shadow: preset.shadow,
      outline: preset.outline,
      background_style: preset.background_style,
      y_position_percent: preset.y_position_percent,
      caption_template: preset.caption_template,
      staggered_layout: preset.staggered_layout || "splash",
      accent_period_enabled: preset.accent_period_enabled !== undefined ? preset.accent_period_enabled : true,
      word_limit: preset.word_limit || 5,
      caption_spacing_ms: preset.caption_spacing_ms || 50,
      word_pacing: preset.word_pacing || "dynamic",
      pause_handling: preset.pause_handling || "hold",
      text_transform: "none",
      underline: false,
      letter_spacing: 0,
      word_spacing: 6,
      line_spacing: 1.0,
      color_mode: "solid",
      color2: null,
      x_position_percent: null,
      alignment: "center",
      keyword_font: null,
      keyword_weight: null,
      keyword_size_scale: null,
      box_top: preset.box_top,
      box_bottom: preset.box_bottom,
      box_left: preset.box_left,
      box_right: preset.box_right,
    });
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

  if (!mounted) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-[#171208]">
        <div className="w-8 h-8 border-2 border-[#3B301C] border-t-[#DCC8A4] rounded-full animate-spin" />
        <p className="text-[10px] uppercase font-bold tracking-widest text-white">Initializing client app...</p>
      </div>
    );
  }

  if (isProjectLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#171208]">
        <div className="w-8 h-8 border-2 border-[#3B301C] border-t-[#DCC8A4] rounded-full animate-spin" />
        <p className="font-sora text-[13px] font-semibold text-sand-300">Opening your workspace…</p>
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-5 bg-[#171208] px-6 text-center">
        <h3 className="font-serif text-2xl font-semibold text-sand-100">
          Couldn&rsquo;t open this project
        </h3>
        <p className="max-w-[44ch] text-[14px] leading-relaxed text-sand-400">
          Either the project doesn&rsquo;t exist anymore, or the render backend is
          offline. If you just started the backend, retry in a few seconds.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetchProject()}
            className="rounded-full bg-sand-300 px-6 py-2.5 font-sora text-[12px] font-semibold text-sand-900 hover:bg-sand-400 transition-colors cursor-pointer"
          >
            Retry
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-[#3B301C] px-6 py-2.5 font-sora text-[12px] font-semibold text-sand-300 hover:border-sand-400 hover:text-sand-100 transition-colors cursor-pointer"
          >
            Back to projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden select-none bg-[#1A140B] text-white">
      {/* 1. Header component */}
      <WorkspaceHeader
        project={project}
        processingError={processingError}
        jobStatus={jobStatus}
        startProcessing={startProcessing}
        wordsHistoryRef={wordsHistoryRef}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        historyVersion={historyVersion}
        uploadProgress={uploadProgress}
        handleUploadFile={handleUploadFile}
      />

      {/* 2. Main content container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Column (Styles and Presets) */}
        <SidebarControlsSection
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          customCaptionTemplate={customCaptionTemplate}
          setCustomCaptionTemplate={setCustomCaptionTemplate}
          customFont={customFont}
          setCustomFont={setCustomFont}
          customSize={customSize}
          setCustomSize={setCustomSize}
          customWeight={customWeight}
          setCustomWeight={setCustomWeight}
          customFontFace={customFontFace}
          setCustomFontFace={setCustomFontFace}
          customColorMode={customColorMode}
          setCustomColorMode={setCustomColorMode}
          customColor={customColor}
          setCustomColor={setCustomColor}
          customColor2={customColor2}
          setCustomColor2={setCustomColor2}
          customHighlightColor={customHighlightColor}
          setCustomHighlightColor={setCustomHighlightColor}
          customAlignment={customAlignment}
          setCustomAlignment={setCustomAlignment}
          customCasing={customCasing}
          setCustomCasing={setCustomCasing}
          customUnderline={customUnderline}
          setCustomUnderline={setCustomUnderline}
          customLetterSpacing={customLetterSpacing}
          setCustomLetterSpacing={setCustomLetterSpacing}
          customWordSpacing={customWordSpacing}
          setCustomWordSpacing={setCustomWordSpacing}
          customLineSpacing={customLineSpacing}
          setCustomLineSpacing={setCustomLineSpacing}
          shadowEnabled={shadowEnabled}
          setShadowEnabled={setShadowEnabled}
          customShadow={customShadow}
          setCustomShadow={setCustomShadow}
          strokeEnabled={strokeEnabled}
          setStrokeEnabled={setStrokeEnabled}
          customOutline={customOutline}
          setCustomOutline={setCustomOutline}
          backgroundEnabled={backgroundEnabled}
          setBackgroundEnabled={setBackgroundEnabled}
          selectedBackgroundStyle={selectedBackgroundStyle}
          setSelectedBackgroundStyle={setSelectedBackgroundStyle}
          customBackgroundStyle={customBackgroundStyle}
          setCustomBackgroundStyle={setCustomBackgroundStyle}
          customXPositionPercent={customXPositionPercent}
          setCustomXPositionPercent={setCustomXPositionPercent}
          customYPositionPercent={customYPositionPercent}
          setCustomYPositionPercent={setCustomYPositionPercent}
          customStaggeredLayout={customStaggeredLayout}
          setCustomStaggeredLayout={setCustomStaggeredLayout}
          customWordLimit={customWordLimit}
          setCustomWordLimit={setCustomWordLimit}
          customCaptionSpacingMs={customCaptionSpacingMs}
          setCustomCaptionSpacingMs={setCustomCaptionSpacingMs}
          customWordPacing={customWordPacing}
          setCustomWordPacing={setCustomWordPacing}
          customPauseHandling={customPauseHandling}
          setCustomPauseHandling={setCustomPauseHandling}
          customAccentPeriodEnabled={customAccentPeriodEnabled}
          setCustomAccentPeriodEnabled={setCustomAccentPeriodEnabled}
          expandedTemplateId={expandedTemplateId}
          setExpandedTemplateId={setExpandedTemplateId}
          editTarget={editTarget}
          setEditTarget={setEditTarget}
          heroFont={heroFont}
          setHeroFont={setHeroFont}
          heroFontFace={heroFontFace}
          setHeroFontFace={setHeroFontFace}
          heroSizeScale={heroSizeScale}
          setHeroSizeScale={setHeroSizeScale}
          saveStyleImmediate={saveStyleImmediate}
          saveStyleBackground={saveStyleBackground}
          handleTemplateClick={handleTemplateClick}
          styleError={styleError}
          customBoxTop={customBoxTop}
          customBoxBottom={customBoxBottom}
          customBoxLeft={customBoxLeft}
          customBoxRight={customBoxRight}
          setCustomBoxTop={setCustomBoxTop}
          setCustomBoxBottom={setCustomBoxBottom}
          setCustomBoxLeft={setCustomBoxLeft}
          setCustomBoxRight={setCustomBoxRight}
          boxEditMode={boxEditMode}
          setBoxEditMode={setBoxEditMode}
          customEntranceAnim={customEntranceAnim}
          setCustomEntranceAnim={setCustomEntranceAnim}
          customHighlightAnim={customHighlightAnim}
          setCustomHighlightAnim={setCustomHighlightAnim}
          customOutlineColor={customOutlineColor}
          setCustomOutlineColor={setCustomOutlineColor}
          customShadowColor={customShadowColor}
          setCustomShadowColor={setCustomShadowColor}
        />

        {/* Middle Canvas & Scrubber Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          <VideoPlayerSection
            selectedRatio={selectedRatio}
            setSelectedRatio={setSelectedRatio}
            playerZoom={playerZoom}
            setPlayerZoom={setPlayerZoom}
            showSafetyGrid={showSafetyGrid}
            setShowSafetyGrid={setShowSafetyGrid}
            naturalAspectRatio={naturalAspectRatio}
            setNaturalAspectRatio={setNaturalAspectRatio}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            currentTimeMs={currentTimeMs}
            setCurrentTimeMs={setCurrentTimeMs}
            durationMs={durationMs}
            setDurationMs={setDurationMs}
            volume={volume}
            setVolume={setVolume}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            activeExportId={activeExportId}
            setActiveExportId={setActiveExportId}
            boxEditMode={boxEditMode}
            setBoxEditMode={setBoxEditMode}
            pendingBoxCommit={pendingBoxCommit}
            setPendingBoxCommit={setPendingBoxCommit}
            liveDragBox={liveDragBox}
            setLiveDragBox={setLiveDragBox}
            isSavingBox={isSavingBox}
            videoRef={videoRef}
            playerContainerRef={playerContainerRef}
            playerWidth={playerWidth}
            setPlayerWidth={setPlayerWidth}
            wavesurfer={wavesurfer}
            project={project}
            projectVideo={projectVideo}
            exports={exports}
            motionScript={motionScript}
            localWords={localWords}
            customCaptionTemplate={customCaptionTemplate}
            customSize={customSize}
            customFont={customFont}
            customFontFace={customFontFace}
            customColor={customColor}
            customColor2={customColor2}
            customColorMode={customColorMode}
            customHighlightColor={customHighlightColor}
            customAlignment={customAlignment}
            customCasing={customCasing}
            customUnderline={customUnderline}
            customLetterSpacing={customLetterSpacing}
            customWordSpacing={customWordSpacing}
            customLineSpacing={customLineSpacing}
            shadowEnabled={shadowEnabled}
            strokeEnabled={strokeEnabled}
            backgroundEnabled={backgroundEnabled}
            selectedBackgroundStyle={selectedBackgroundStyle}
            customShadow={customShadow}
            customOutline={customOutline}
            customYPositionPercent={customYPositionPercent}
            customXPositionPercent={customXPositionPercent}
            customStaggeredLayout={customStaggeredLayout}
            customBoxTop={customBoxTop}
            customBoxBottom={customBoxBottom}
            customBoxLeft={customBoxLeft}
            customBoxRight={customBoxRight}
            applyBoxToFragment={applyBoxToFragment}
            applyBoxToAll={applyBoxToAll}
            handleUploadFile={handleUploadFile}
            pickKeywordIndex={pickKeywordIndex}
            getActiveSegmentAndIndex={getActiveSegmentAndIndex}
            captionStyle={captionStyle}
            captionWordLimit={customWordLimit}
          />

          <TimelineEditorSection
            currentTimeMs={currentTimeMs}
            setCurrentTimeMs={setCurrentTimeMs}
            durationMs={durationMs}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            wordDisplayMode={wordDisplayMode}
            setWordDisplayMode={setWordDisplayMode}
            localWords={localWords}
            editingWordIndex={editingWordIndex}
            setEditingWordIndex={setEditingWordIndex}
            editingWordText={editingWordText}
            setEditingWordText={setEditingWordText}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            videoRef={videoRef}
            waveformRef={waveformRef}
            wordsHistoryRef={wordsHistoryRef}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            handleWordEditSave={handleWordEditSave}
            handleToggleHighlight={handleToggleHighlight}
          />
        </div>

        {/* Right Sidebar Export & Pipeline History column */}
        <ExportHistorySection
          projectId={projectId}
          project={project}
          refetchProject={refetchProject}
          exports={exports}
          refetchExports={refetchExports}
          activeExportId={activeExportId}
          setActiveExportId={setActiveExportId}
          customCaptionTemplate={customCaptionTemplate}
          jobStatus={jobStatus}
          setJobStatus={setJobStatus}
          processingError={processingError}
          startProcessing={startProcessing}
          isRendering={isRendering}
          setIsRendering={setIsRendering}
          renderJobStatus={renderJobStatus}
          setRenderJobStatus={setRenderJobStatus}
          renderError={renderError}
          setRenderError={setRenderError}
        />

      </div>
    </div>
  );
}
