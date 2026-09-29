# CaptionsEasy Launch Film

This is a "Story" type launch film, running at 60 FPS, with a deterministic layout mapping every frame as a pure function of time (`seek(t)`). It is built entirely in HTML, CSS, and JS.

## Beat Map (120 BPM)
- **Beat 1 (0.0s)**: Hook part 1 ("Still typing")
- **Beat 3 (1.0s)**: Hook part 2 ("subtitles")
- **Beat 5 (2.0s)**: Hook part 3 ("by hand?")
- **Beat 9 (4.0s)**: Meet CaptionsEasy
- **Beat 13 (6.0s)**: Feature 1 (Upload & Transcribe)
- **Beat 15-16 (7.0-7.5s)**: Raw toasts pop in
- **Beat 18 (8.5s)**: Raw toasts transform into polished text cards
- **Beat 21 (10.0s)**: Feature 2 (Style & Pace)
- **Beat 29 (14.0s)**: Feature 3 (Local Rendering Engine)
- **Beat 37 (18.0s)**: End Card starts
- **Beat 47 (23.0s)**: Reset to initial state

## Instructions to Verify and Render
1. **Preview**: Open `src/index.html` in a web browser (e.g. Chrome). A player UI will appear at the bottom to scrub and play.
2. **Check**: Run `node <CLAUDE_SKILL_DIR>/scripts/check.mjs src/index.html` to ensure there are no CSS animations, random numbers, or page errors, and that it loops perfectly.
3. **Render Video**:
   \`\`\`bash
   $env:CHROME="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
   node <CLAUDE_SKILL_DIR>/scripts/render.mjs video src/index.html out/captionseasy-launch.mp4
   \`\`\`

## Sources and Rights
- Font families: Plus Jakarta Sans, Bricolage Grotesque (Open Source via Google Fonts)
- Music: Not included in this render (intended to be an original ACE-Step instrumental).
- UI Components: Rebuilt directly from CaptionsEasy React codebase. All names and data are fictionalized for demo purposes.
