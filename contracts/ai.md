# AI Pipeline Specification

Version: 1.0

Purpose

Defines the complete AI processing pipeline.

No AI provider may bypass this specification.

---

Pipeline

Video

↓

Speech Recognition

↓

Transcript Validation

↓

Creative Analysis

↓

Caption Planning

↓

Render Planning

↓

Validation

↓

Renderer

---

Stage 1

Speech Recognition

Input

Video

Output

Transcript

Responsibilities

* Extract speech
* Preserve timestamps
* Preserve confidence
* Detect language

No styling.

---

Stage 2

Transcript Validation

Responsibilities

* Remove empty words
* Merge duplicate timestamps
* Validate chronology
* Reject invalid transcript

Never modify wording.

---

Stage 3

Creative Analysis

Input

Transcript

Output

CreativePlan

Responsibilities

Determine

* energy
* pacing
* emotion
* speaking style
* emphasis
* audience

No caption generation.

---

Stage 4

Caption Planning

Input

CreativePlan

Transcript

Output

CaptionPlan

Responsibilities

* Split captions
* Preserve timing
* Mark emphasis
* Preserve readability

No typography.

No animation.

---

Stage 5

Render Planning

Input

Transcript

CreativePlan

CaptionPlan

Output

RenderPlan

Responsibilities

Choose

* typography
* colors
* animations
* layers
* timeline

No rendering.

---

Validation

Every stage validates JSON.

Invalid JSON is rejected.

Attempt automatic repair once.

If repair fails,

mark job failed.

---

Retry Policy

Retry

maximum

2

times.

Then fail.

---

Providers

Provider must be configurable.

Never hardcode

Gemini

Claude

OpenAI

Groq (current speech provider — see app.ai.providers.speech.groq_speech_provider)

Fireworks

Future providers supported.

---

Logging

Every stage records

* latency
* tokens
* estimated cost
* provider
* model
* success
* failure

---

Acceptance Criteria

Claude Code should generate

* AI pipeline services
* provider abstraction
* retry framework
* validation middleware
* structured logging

without embedding prompt text.
