import type React from "react";
import type { CaptionStyleV2, Page, ProjectSettings } from "@capseasy/shared";
import type { ACTIVE_EFFECTS, ENTRANCES } from "@capseasy/shared";

export interface Canvas {
  width: number;
  height: number;
  fps: number;
}

export interface MeasureSpec {
  fontFamily: string;
  fontWeight: number | string;
  fontSize: number;
  letterSpacing?: number;
  fontStyle?: string;
}
export type MeasureFn = (text: string, spec: MeasureSpec) => number;

export interface PageRenderProps {
  page: Page;
  /** absolute media time in ms (page.startMs + local elapsed) */
  timeMs: number;
  style: CaptionStyleV2;
  canvas: Canvas;
  measure: MeasureFn;
  /** true when paused/scrubbing: entrances render fully settled */
  settled?: boolean;
}

export type LayoutId = "sentence" | "word" | "stack3";

export interface TemplateCapabilities {
  hero: boolean;
  alignment: boolean;
  stagger: boolean;
  accentPeriod: boolean;
  weight: boolean;
  color: boolean;
  background: boolean;
  emoji: boolean;
  activeEffects: readonly (typeof ACTIVE_EFFECTS)[number][];
  entrances: readonly (typeof ENTRANCES)[number][];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  layout: LayoutId;
  defaults: Partial<CaptionStyleV2>;
  settingsDefaults: Partial<ProjectSettings>;
  capabilities: TemplateCapabilities;
  /** Google font families this template always needs, on top of the style's fonts */
  fonts: string[];
  Page: React.FC<PageRenderProps>;
}

export interface LookDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  templateId: string;
  style: CaptionStyleV2;
  settings: Partial<ProjectSettings>;
  legacy?: boolean;
}
