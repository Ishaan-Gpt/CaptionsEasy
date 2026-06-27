/** Transcript / CreativePlan / CaptionPlan TypeScript types. Source: contracts/json-schemas.md */

export interface TranscriptWord {
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
}

export interface Transcript {
  version: "1.0";
  language: string;
  duration_ms: number;
  words: TranscriptWord[];
}

/** Caption style, per docs/PRD.md Caption Generation styles. */
export type CaptionStyle = "formal" | "sarcastic" | "humorous_tech" | "humorous_non_tech";

export interface EnergyCurvePoint {
  t_ms: number;
  energy: number;
}

export interface KeyMoment {
  start_ms: number;
  end_ms: number;
  label: string;
}

export interface CreativePlan {
  version: "1.0";
  speaking_style: string;
  emotion: string;
  pacing: string;
  energy_curve: EnergyCurvePoint[];
  audience: string;
  key_moments: KeyMoment[];
  recommended_style: CaptionStyle;
}

export interface CaptionSegment {
  id: string;
  text: string;
  start_ms: number;
  end_ms: number;
  /** TODO(json-schemas.md): shape not specified beyond its name; assumed word-index positions within `text`. */
  emphasis: number[];
  confidence: number;
}

export interface CaptionPlan {
  version: "1.0";
  caption_segments: CaptionSegment[];
}
