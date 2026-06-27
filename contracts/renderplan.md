# Render Plan Specification

Version: 1.0

## Purpose

This document defines the contract between the AI Pipeline and the Rendering Engine.

The AI never renders videos.

The AI only produces a Render Plan.

The Renderer consumes the Render Plan and deterministically produces the final video.

---

# Principles

* Deterministic
* JSON only
* Versioned
* Backward compatible
* Renderer never calls AI

---

# Pipeline

Video

↓

Transcript

↓

Creative Plan

↓

Caption Plan

↓

Render Plan

↓

Renderer

↓

MP4

---

# Render Plan Structure

A Render Plan contains:

* Metadata
* Assets
* Global Settings
* Timeline
* Layers
* Effects
* Export Settings

---

# Metadata

Contains

* version
* project_id
* video_id
* generated_at
* generator_version

---

# Assets

Assets available to the renderer.

Examples

Fonts

Images

Emojis

Audio

Icons

Brand Assets

Every asset has

* id
* type
* source
* preload

---

# Global Settings

Contains

Canvas

Frame Rate

Resolution

Aspect Ratio

Safe Area

Theme

Default Font

Default Colors

Motion Preset

---

# Timeline

Timeline is an ordered list of events.

Each event contains

* id
* start_ms
* end_ms
* layer
* type
* payload

Timeline is sorted chronologically.

No overlapping events on the same exclusive layer.

---

# Event Types

The renderer must support the following event types.

## Caption

Displays text.

Payload

* text
* font
* size
* weight
* color
* alignment
* animation

---

## Highlight

Highlights specific words.

Payload

* indices
* color
* animation

---

## Emoji

Displays an emoji.

Payload

* emoji
* animation
* position
* scale

---

## Shape

Draws graphical shapes.

Payload

* rectangle
* circle
* underline
* arrow

---

## Camera

Virtual camera effects.

Payload

* zoom
* pan
* shake
* blur

---

## Transition

Transitions between scenes.

Payload

* type
* duration
* easing

---

## Audio Effect

Optional future support.

Payload

* effect
* volume
* fade

Future only.

---

# Layers

Renderer supports ordered layers.

Background

↓

Video

↓

Graphics

↓

Captions

↓

Highlights

↓

Overlays

↓

Debug

---

# Caption Rules

Captions never overlap.

Maximum two lines.

Safe margins required.

Automatic line wrapping.

Word timings preserved.

---

# Typography

Supports

Font Family

Weight

Letter Spacing

Line Height

Stroke

Shadow

Glow

Opacity

Scale

Rotation

Anchor Point

---

# Animation

Supported animations

Fade

Pop

Slide

Bounce

Scale

Rotate

Blur

Elastic

Typewriter

Animations are preset-based.

Renderer does not invent animations.

---

# Export Settings

Contains

Resolution

Frame Rate

Codec

Bitrate

Audio

Container

Quality

---

# Validation Rules

Every timeline event must contain

* id
* type
* start_ms
* end_ms

Unknown event types are rejected.

Negative timestamps are invalid.

Timeline must be chronological.

---

# Versioning

Render Plan Version

1.0

Future versions must remain backward compatible.

---

# Future Event Types

Not implemented in MVP.

* Auto Zoom
* Face Tracking
* B-roll
* Lower Third
* Progress Bar
* Sticker
* Image Overlay
* Particle Effects
* CTA Animation

---

# Acceptance Criteria

Claude Code must generate

* JSON Schema
* TypeScript Types
* Python Models
* Validation Layer
* Parser
* Renderer Interfaces

from this specification.

Do not generate rendering logic.

Do not generate FFmpeg commands.

Do not invent additional event types.
