# CAPTIONSEASY: RAW SPEECH TO POLISHED TEXT

A **Story** launch film for CaptionsEasy, leaving the viewer with a feeling of effortless creativity and premium quality. It uses dynamic slides and transitions to show how raw speech becomes stunning, styled motion typography in seconds. The film is built entirely in code with no templates or stock motion graphics.

**<inputs>**
The CaptionsEasy logo, actual interface components (upload flow, speech-to-text toasts, style presets like Kalakar/Emerald, rendering engine), and an upbeat, casual yet impactful original music track tailored to the brand's fast pacing. Only the real interface is used, with no invented features.

**<direction>**
The visual style is rooted in CaptionsEasy’s Neo-Brutalist, high-motion aesthetics. The canvas color is `#FFFFEB` (Major), with `#F0D7FF` (Side) and pops of `#34D399` (Emerald) and `#FFA946` (Orange). `#1A1A1A` (Obsidian) is used for sharp contrast. Typography combines `Plus_Jakarta_Sans` for interface labels and `Bricolage_Grotesque` for the styled accent words. Features are presented as panels/slides with smooth easing, generous zoom-in/out effects, and seamless transitions. The sound is an original track where every UI action (e.g., text sweeping, generating) lands perfectly on the beat.

**<structure>**
- **Hook (0-5s)**: A bold text-led intro asking "Still typing subtitles by hand?" using Bricolage Grotesque, with a subtle zoom-in.
- **Arrival (5-10s)**: The CaptionsEasy browser window slides in. The infinite logo/text marquee animates smoothly across the top.
- **Features (10-25s)**:
  - **Upload & Transcribe**: A video file drops in; raw speech toasts instantly transform into polished text cards on a strong beat drop.
  - **Style & Pace**: A preset style is clicked; the subtitle text sweeps with a conic-gradient rotating border and bouncy easing.
  - **Local Render Engine**: The progress indicator sweeps across the screen, completing flawlessly on the beat.
- **End Card (25-30s)**: The CaptionsEasy logo scales up with the phrase "Effortless Captions" and a call-to-action button "Start Creating".

**<build>**
Landscape format (1920 × 1080), 30 seconds in length. Every frame is a deterministic `seek(t)` function using closed-form springs and easings. The interface elements are rebuilt accurately from the frontend code.
