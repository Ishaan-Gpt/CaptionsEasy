/** RenderPlan TypeScript types. Source: contracts/renderplan.md */

export type Layer =
  | "background"
  | "video"
  | "graphics"
  | "captions"
  | "highlights"
  | "overlays"
  | "debug";

export type EventType =
  | "caption"
  | "highlight"
  | "emoji"
  | "shape"
  | "camera"
  | "transition"
  | "audio_effect";

export type Animation =
  | "fade"
  | "pop"
  | "slide"
  | "bounce"
  | "scale"
  | "rotate"
  | "blur"
  | "elastic"
  | "typewriter";

export interface RenderPlanMetadata {
  version: "1.0";
  project_id: string;
  video_id: string;
  generated_at: string;
  generator_version: string;
}

export interface RenderPlanAsset {
  id: string;
  /** TODO(renderplan.md): only examples given (font, image, emoji, audio, icon, brand_asset). */
  type: string;
  source: string;
  preload: boolean;
}

export interface Canvas {
  width: number;
  height: number;
}

export interface SafeArea {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface GlobalSettings {
  canvas: Canvas;
  frame_rate: number;
  resolution: string;
  aspect_ratio: string;
  safe_area: SafeArea;
  theme: string;
  default_font: string;
  default_colors: string[];
  motion_preset: string;
  /** The caption template actually used to build this timeline (e.g.
   * "staggered_3line") — renderers must read this rather than re-deriving
   * a template from the style preset's own default. */
  caption_template?: string | null;
  /** Layout variant for staggered_3line only: "splash" or "centre". */
  staggered_layout?: string | null;
}

export interface CaptionPayload {
  text: string;
  font: string;
  size: number;
  weight: string;
  color: string;
  alignment: string;
  animation: Animation;
  text_transform?: string; // "none" | "uppercase" | "lowercase" | "capitalize"
  underline?: boolean;
  letter_spacing?: number;
  word_spacing?: number;
  line_spacing?: number;
  color_mode?: string; // "solid" | "gradient"
  color2?: string | null;
  x_position_percent?: number | null;
  y_position_percent?: number | null;
  shadow?: number;
  outline?: number;
  background_style?: string; // "none" | "pill" | "shadow-box"
  entrance_anim?: string; // "none" | "rise" | "pop" | "fade"
  highlight_anim?: string; // "pop" | "flash" | "underline" | "glow"
  outline_color?: string;
  shadow_color?: string;
  /** Per-caption-card bounding-box override — see SafeArea. None/absent
   * means "use the project's global safe_area". */
  box?: SafeArea | null;
}

export interface HighlightPayload {
  indices: number[];
  color: string;
  animation: Animation;
  is_keyword?: boolean;
  /** Optional per-template hero-word styling — None/absent means "inherit
   * the caption's own font/weight/size". */
  font?: string | null;
  weight?: string | null;
  size_scale?: number | null;
}

export interface EmojiPayload {
  emoji: string;
  animation: Animation;
  position: { x: number; y: number };
  scale: number;
}

export type ShapeKind = "rectangle" | "circle" | "underline" | "arrow";

export interface ShapePayload {
  shape: ShapeKind;
}

export interface CameraPayload {
  zoom?: number;
  pan?: Record<string, unknown>;
  shake?: number;
  blur?: number;
}

export interface TransitionPayload {
  type: string;
  duration: number;
  easing: string;
}

/** Future only, per renderplan.md. */
export interface AudioEffectPayload {
  effect: string;
  volume: number;
  fade: number;
}

export type TimelineEventPayload =
  | CaptionPayload
  | HighlightPayload
  | EmojiPayload
  | ShapePayload
  | CameraPayload
  | TransitionPayload
  | AudioEffectPayload;

export interface TimelineEvent {
  id: string;
  start_ms: number;
  end_ms: number;
  layer: Layer;
  type: EventType;
  payload: TimelineEventPayload;
}

export interface ExportSettings {
  resolution: string;
  frame_rate: number;
  codec: string;
  bitrate: string;
  audio: string;
  container: string;
  quality: string;
}

export interface RenderPlan {
  metadata: RenderPlanMetadata;
  assets: RenderPlanAsset[];
  global_settings: GlobalSettings;
  timeline: TimelineEvent[];
  export_settings?: ExportSettings;
}
