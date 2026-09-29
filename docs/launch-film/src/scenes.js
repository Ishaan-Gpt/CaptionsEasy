film({ W: 1920, H: 1080, BPM: 120, BEATS: 60 });

const APP = { name: "CaptionsEasy", url: "captionseasy.app", cta: "Start Creating", line: "Effortless Captions", facts: ["Powered by Groq", "Local rendering", "Zero cloud wait"] };
const HOME = { x: 1470, y: 968 };
const LEFT = { x: 40, y: 84, w: 620, h: 920 };
const RIGHT = { x: 680, y: 84, w: 1200, h: 920 };
const K = {};

const pebble = (id, face = true) => `<svg viewBox="0 0 200 210" width="100%" height="100%" style="overflow:visible">
  ${face ? `<ellipse cx="100" cy="204" rx="62" ry="7" fill="rgba(23,21,15,.12)"/>` : ""}
  <path d="M100 18 C156 18 186 64 186 116 C186 170 150 202 100 202 C50 202 14 170 14 116 C14 64 44 18 100 18Z" fill="var(--accent)"/>
  <path d="M58 40 C70 30 88 26 104 27" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="9" stroke-linecap="round"/>
  <g data-k="${id}Eyes"><ellipse cx="74" cy="104" rx="15" ry="19" fill="#fff"/><ellipse cx="126" cy="104" rx="15" ry="19" fill="#fff"/>
    <g data-k="${id}Pupils"><circle cx="76" cy="108" r="8" fill="var(--ink)"/><circle cx="128" cy="108" r="8" fill="var(--ink)"/></g></g>
  <path data-k="${id}Mouth" fill="var(--ink)"/></svg>`;

function face(id, { blink = 0, wide = 0, smile = 0.5, look = 0 }) {
  const open = Math.max(0.08, 1 - blink) * (1 + 0.35 * wide);
  $[id + "Eyes"].setAttribute("transform", `translate(0 ${(104 * (1 - open)).toFixed(2)}) scale(1 ${open.toFixed(3)})`);
  $[id + "Pupils"].setAttribute("transform", `translate(${(5 * look).toFixed(2)} 0)`);
  const o = 12 * wide, c = 14 * smile;
  $[id + "Mouth"].setAttribute("d", o > 1 ? `M100 ${(146 - o).toFixed(1)} a${(7 + o * 0.4).toFixed(1)} ${o.toFixed(1)} 0 1 0 0.1 0Z` : `M86 146 Q100 ${(146 + c).toFixed(1)} 114 146 Q100 ${(146 + c * 0.45).toFixed(1)} 86 146Z`);
}

function build(stage) {
  Object.assign(K, { h1: B(1), h2: B(3), h3: B(5), meet: B(9), f1: B(13), f2: B(21), f3: B(29), end: B(37), out: B(46.5), home: B(47) });
  
  stage.innerHTML = `
    ${scene("hookScene", "var(--bg)", `
      <div class="abs" style="left:150px;top:210px">${headline("h1", "Still typing", { size: 116 })}</div>
      <div class="abs" style="left:150px;top:360px">${headline("h2", "subtitles", { size: 116 })}</div>
      <div class="abs" style="left:150px;top:510px">${headline("h3", "by *hand?*", { size: 116, accent: "var(--accent2)" })}</div>
      <div class="abs" style="left:150px;top:380px">${headline("meet", "Meet *CaptionsEasy.*", { size: 116 })}</div>
      <div class="abs" data-k="browser" style="left:1250px;top:170px;width:1200px;height:760px;border-radius:24px;background:#fff;box-shadow:0 30px 60px rgba(26,26,26,.18);border:1px solid var(--hair)">
        <div class="abs row" style="left:0;top:0;width:100%;height:48px;background:var(--panel);border-bottom:1px solid var(--hair);padding:0 16px;gap:8px">
          <div style="width:12px;height:12px;border-radius:6px;background:#FF5F56"></div>
          <div style="width:12px;height:12px;border-radius:6px;background:#FFBD2E"></div>
          <div style="width:12px;height:12px;border-radius:6px;background:#27C93F"></div>
          <div class="kit-mono center" style="flex:1;font-size:14px;color:var(--ink3);background:#fff;margin:0 16px;border-radius:6px;height:28px">captionseasy.app</div>
        </div>
        <div class="abs" style="left:24px;top:80px;font-family:var(--serif);font-size:32px;font-weight:700">CaptionsEasy</div>
        <div class="abs" style="left:24px;top:140px;width:300px;height:200px;background:var(--field1);border-radius:16px;display:flex;align-items:center;justify-content:center"><div class="t" style="font-weight:600;font-size:24px">Drag Video</div></div>
      </div>`)}
      
    ${scene("f1", "var(--field1)", `
      ${panel("f1L", LEFT, "var(--panel)", `<div class="abs" style="left:40px;top:100px">${headline("f1h", "Raw speech to\n*Polished text.*", { size: 78, lh: 1.2 })}</div>`)}
      ${panel("f1R", RIGHT, "var(--bg)", `
        ${card("f1c", { x: 100, y: 100, w: 1000, h: 720 }, `
          <div class="abs center" data-k="dropzone" style="left:40px;top:40px;width:920px;height:200px;border:3px dashed var(--accent);border-radius:24px;background:rgba(52,211,153,.1)"><span style="font-weight:700;font-size:28px;color:var(--accent)">File Dropped</span></div>
          <div class="abs" data-k="toast1" style="left:40px;top:280px;width:920px"><div class="toast">uhh so today we are going to</div></div>
          <div class="abs" data-k="toast2" style="left:40px;top:360px;width:920px"><div class="toast">build a launch film</div></div>
          <div class="abs" data-k="toast3" style="left:40px;top:440px;width:920px"><div class="toast">and it's gonna be awesome</div></div>
          <div class="abs" data-k="toast1p" style="left:40px;top:280px;width:920px"><div class="toast toast-polished">Today, we're building a launch film.</div></div>
          <div class="abs" data-k="toast2p" style="left:40px;top:370px;width:920px"><div class="toast toast-polished">And it's going to be awesome.</div></div>
        `)}`)}`)}
        
    ${scene("f2", "var(--field2)", `
      ${panel("f2L", LEFT, "var(--panel)", `<div class="abs" style="left:40px;top:100px">${headline("f2h", "Style it in\n*one click.*", { size: 78, lh: 1.2, accent: "var(--ink)" })}</div>`)}
      ${panel("f2R", RIGHT, "var(--bg)", `
        ${card("f2c", { x: 60, y: 100, w: 1080, h: 720 }, `
          <div class="abs t" style="left:40px;top:40px;font-size:32px;font-weight:700">Style Presets</div>
          <div class="abs row" style="left:40px;top:100px;gap:16px">
            <div data-k="preset1" class="center" style="width:200px;height:80px;border-radius:16px;background:var(--hair2);font-weight:600;font-size:20px;border:3px solid transparent">Minimal</div>
            <div data-k="preset2" class="center" style="width:200px;height:80px;border-radius:16px;background:var(--hair2);font-weight:600;font-size:20px;border:3px solid transparent">Kalakar</div>
            <div data-k="preset3" class="center" style="width:200px;height:80px;border-radius:16px;background:var(--accent);color:#fff;font-weight:600;font-size:20px;border:3px solid var(--accent)">Emerald</div>
          </div>
          <div class="abs center" data-k="styledTextWrap" style="left:40px;top:240px;width:1000px;height:400px;background:var(--ink);border-radius:32px;overflow:hidden">
            <div class="abs conic-border" data-k="conicGlow" style="width:800px;height:120px;background:conic-gradient(from 0deg, var(--accent) 0%, var(--accent2) 50%, var(--accent) 100%)">
              <div class="conic-inner"><span style="color:var(--ink)">Effortless</span><span style="color:var(--accent);margin-left:12px">Captions</span></div>
            </div>
          </div>
        `)}`)}`)}
        
    ${scene("f3", "var(--field3)", `
      ${panel("f3L", LEFT, "var(--panel)", `<div class="abs" style="left:40px;top:100px">${headline("f3h", "Rendered\n*locally.*", { size: 78, lh: 1.2, accent: "var(--ink)" })}</div>`)}
      ${panel("f3R", RIGHT, "var(--bg)", `
        ${card("f3c", { x: 60, y: 100, w: 1080, h: 720 }, `
          <div class="abs center" style="left:40px;top:40px;width:1000px;height:640px">
            <div style="width:800px">
              <div class="t" style="font-size:48px;font-weight:700;margin-bottom:24px">Rendering Video...</div>
              <div style="width:100%;height:32px;background:var(--hair2);border-radius:16px;overflow:hidden">
                <div data-k="progressBar" style="width:0%;height:100%;background:var(--accent);border-radius:16px"></div>
              </div>
              <div data-k="progressText" class="kit-mono" style="margin-top:16px;font-size:24px;color:var(--accent)">0%</div>
            </div>
          </div>
        `)}`)}`)}
        
    ${scene("endScene", "var(--bg)", `
      <div class="abs" data-k="glow" style="left:560px;top:140px;width:800px;height:800px;border-radius:50%;background:radial-gradient(circle, rgba(52,211,153,.16) 0%, rgba(52,211,153,0) 70%)"></div>
      <div class="abs row" data-k="lockup" style="left:0;top:330px;width:1920px;justify-content:center;gap:34px">
        <div class="center" data-k="icon" style="width:150px;height:150px;border-radius:36px;background:var(--accent);color:#fff;font-size:92px;font-weight:800;font-family:var(--serif)">CE</div>
        <div class="mask" style="height:176px"><div data-k="wordmark" class="t" style="font-size:154px;font-weight:700;letter-spacing:-.045em;font-family:var(--serif)">${APP.name}</div></div></div>
      <div class="abs hl-center" style="left:0;top:540px;width:1920px">${headline("tag", APP.line, { size: 74, color: "var(--ink)", weight: 700, accent: "var(--accent)" })}</div>
      <div class="abs row" style="left:0;top:690px;width:1920px;justify-content:center;gap:34px">
        <div class="center" data-k="cta" style="height:78px;padding:0 44px;border-radius:39px;background:var(--ink);color:#fff;font-size:30px;font-weight:700">${APP.cta}</div>
        <div class="row" style="font-family:var(--mono);font-size:34px;min-width:260px">${[...APP.url].map((ch, i) => `<span data-k="url${i}">${ch}</span>`).join("")}</div></div>
      <div class="abs kit-mono" data-k="facts" style="left:0;top:940px;width:1920px;text-align:center;font-size:22px">${APP.facts.join("&nbsp;&nbsp;·&nbsp;&nbsp;")}</div>`)}
      
    <div class="abs" data-k="badge" style="left:${LEFT.x + 40}px;top:${LEFT.y + LEFT.h - 190}px;width:150px;height:150px;border-radius:50%;background:#fff;border:5px solid var(--accent);overflow:hidden">
      <div class="abs" style="left:-6px;top:6px;width:162px;height:170px">${pebble("bd", false)}</div></div>
    ${character("hero", pebble("hr"), 420, 441)}`;
    
  collect(stage);
  const iconBox = $.icon.getBoundingClientRect(), stageBox = stage.getBoundingClientRect(), k = FILM.W / stageBox.width;
  K.onIcon = { x: (iconBox.left - stageBox.left + iconBox.width / 2) * k, y: (iconBox.top - stageBox.top) * k + 6 };
}

function heroAt(t) {
  let x = HOME.x, y = HOME.y, s = 1, hop = 0, squash = 0, lean = 0, on = true;
  const look = -0.9 * pulse(t, K.h1, 1.2) - 0.7 * prog(t, K.h2, 0.3) * (1 - prog(t, K.meet, 0.3));
  const shock = pulse(t, K.h3 + 0.15, 0.9);
  
  if (t >= K.meet && t < K.end + 0.2) {
    const f = clamp((t - K.meet) / 0.55);
    x = lerp(HOME.x, 2250, f);
    hop = 260 * 4 * f * (1 - f);
    on = f < 1;
  }
  if (t >= K.end + 0.2 && t < K.home) {
    const f = clamp((t - K.end - 0.2) / 0.6);
    x = lerp(2250, K.onIcon.x, f);
    y = lerp(HOME.y, K.onIcon.y, f);
    s = lerp(1, 0.42, f);
    hop = 300 * 4 * f * (1 - f);
    squash = -0.25 * pulse(t, K.end + 0.8, 0.3);
  }
  if (t >= K.home) {
    const f = clamp((t - K.home) / 0.6);
    x = lerp(K.onIcon.x, HOME.x, f);
    y = lerp(K.onIcon.y, HOME.y, f);
    s = lerp(0.42, 1, E.out(f));
    hop = 320 * 4 * f * (1 - f);
    squash = -0.25 * pulse(t, K.home + 0.6, 0.3) * (1 - prog(t, K.home + 0.9, 0.2));
  }
  
  squash += -0.2 * pulse(t, K.h3 + 0.1, 0.25) + 0.12 * shock;
  lean = 0.06 * look;
  show($.hero, on);
  characterAt("hero", t, { x, y, s, hop, squash, lean });
  const blink = Math.max(pulse(t, B(4), 0.16), pulse(t, B(41.5), 0.16), pulse(t, B(44), 0.16));
  const glad = prog(t, K.end + 0.8, 0.3) - prog(t, K.home + 0.6, 0.3);
  face("hr", { blink, wide: shock, smile: 0.5 + 0.5 * glad - 0.6 * shock, look });
}

function apply(t) {
  sceneAt("hookScene", t, -1, K.f1 + 0.6);
  headlineAt("h1", t, K.h1, K.meet);
  headlineAt("h2", t, K.h2, K.meet + 0.05);
  headlineAt("h3", t, K.h3, K.meet + 0.1);
  headlineAt("meet", t, K.meet + 0.35);
  
  const up = clamp(spring(t, K.meet + 0.25, 0.55, 0.8), 0, 1.05);
  show($.browser, t >= K.meet + 0.2);
  setT($.browser, `translateY(${((1 - up) * 900).toFixed(2)}px)`);

  sceneAt("f1", t, K.f1, K.f2 + 0.6);
  driftAt($.f1L, t, K.f1);
  driftAt($.f1R, t, K.f1, 160);
  headlineAt("f1h", t, K.f1 + 0.3);
  cardAt("f1c", t, K.f1 + 0.5);
  
  const t1 = clamp(spring(t, B(15), 0.5, 0.8), 0, 1.1);
  const t2 = clamp(spring(t, B(15.5), 0.5, 0.8), 0, 1.1);
  const t3 = clamp(spring(t, B(16), 0.5, 0.8), 0, 1.1);
  setT($.toast1, `translateY(${((1-t1)*100).toFixed(2)}px)`); $.toast1.style.opacity = t1.toFixed(3);
  setT($.toast2, `translateY(${((1-t2)*100).toFixed(2)}px)`); $.toast2.style.opacity = t2.toFixed(3);
  setT($.toast3, `translateY(${((1-t3)*100).toFixed(2)}px)`); $.toast3.style.opacity = t3.toFixed(3);
  
  const pDrop = clamp(spring(t, B(18), 0.4, 0.7), 0, 1.1);
  show($.toast1p, t >= B(18));
  show($.toast2p, t >= B(18));
  setT($.toast1p, `scale(${pDrop.toFixed(4)})`); $.toast1p.style.opacity = pDrop.toFixed(3);
  setT($.toast2p, `scale(${pDrop.toFixed(4)})`); $.toast2p.style.opacity = pDrop.toFixed(3);
  $.toast1.style.opacity = (t >= B(18) ? 0 : t1).toFixed(3);
  $.toast2.style.opacity = (t >= B(18) ? 0 : t2).toFixed(3);
  $.toast3.style.opacity = (t >= B(18) ? 0 : t3).toFixed(3);

  sceneAt("f2", t, K.f2, K.f3 + 0.6);
  driftAt($.f2L, t, K.f2);
  driftAt($.f2R, t, K.f2, 160);
  headlineAt("f2h", t, K.f2 + 0.3);
  cardAt("f2c", t, K.f2 + 0.5);
  
  const glowRot = ((t * 60) % 360).toFixed(2);
  $.conicGlow.style.background = `conic-gradient(from ${glowRot}deg, var(--accent) 0%, var(--accent2) 50%, var(--accent) 100%)`;
  
  sceneAt("f3", t, K.f3, K.end + 0.6);
  driftAt($.f3L, t, K.f3);
  driftAt($.f3R, t, K.f3, 160);
  headlineAt("f3h", t, K.f3 + 0.3);
  cardAt("f3c", t, K.f3 + 0.5);
  
  const renderP = clamp(prog(t, B(30), B(35) - B(30), E.linear));
  $.progressBar.style.width = `${(renderP * 100).toFixed(1)}%`;
  $.progressText.textContent = `${Math.floor(renderP * 100)}%`;
  
  const badge = clamp(spring(t, K.f1 + 0.6, 0.45, 0.7), 0, 1.1) * (1 - prog(t, K.end, 0.3, E.in));
  show($.badge, badge > 0.001);
  setT($.badge, `scale(${badge.toFixed(4)})`);
  face("bd", { blink: pulse(t, B(18), 0.16) + pulse(t, B(26), 0.16), smile: 0.4 + 0.6 * Math.max(pulse(t, B(17), 0.6), pulse(t, B(31), 0.6)), look: 0.6 });

  sceneAt("endScene", t, K.end);
  const clear = prog(t, K.out, 0.45, E.in);
  const iconP = clamp(spring(t, K.end + 0.35, 0.45, 0.72), 0, 1.1);
  setT($.icon, `scale(${(iconP * (1 - clear)).toFixed(4)})`);
  setT($.wordmark, `translateY(${(((1 - clamp(spring(t, K.end + 0.5, 0.5, 0.86), 0, 1.02)) + clear) * 105).toFixed(2)}%)`);
  headlineAt("tag", t, B(39), K.out);
  const cta = clamp(spring(t, B(41), 0.42, 0.74), 0, 1.08) * (1 - clear);
  setT($.cta, `scale(${cta.toFixed(4)})`);
  [...APP.url].forEach((_, i) => show($["url" + i], t >= B(41.6) + i * 0.05 && clear < 0.5));
  $.facts.style.opacity = (prog(t, B(43), 0.5) * (1 - clear)).toFixed(3);
  $.glow.style.opacity = (prog(t, K.end + 0.3, 0.8) * (1 - clear)).toFixed(3);

  heroAt(t);
}

function cues() {
  const wipe = (t) => ["whoosh", t - 0.05, { pan: 0.5 }];
  return [
    ...headlineCues("h1", K.h1), ...headlineCues("h2", K.h2), ...headlineCues("h3", K.h3),
    ["hop", K.meet], ["whoosh", K.meet + 0.2, { pan: 0.3, gain: -2 }], ...headlineCues("meet", K.meet + 0.35),
    wipe(K.f1), ...headlineCues("f1h", K.f1 + 0.3), ["thud", K.f1 + 0.62],
    ["pop", B(15)], ["pop", B(15.5)], ["pop", B(16)], ["thud", B(18), { note: 7 }],
    wipe(K.f2), ...headlineCues("f2h", K.f2 + 0.3), ["thud", K.f2 + 0.62],
    wipe(K.f3), ...headlineCues("f3h", K.f3 + 0.3), ["thud", K.f3 + 0.62],
    wipe(K.end), ["pop", K.end + 0.4, { note: 7 }], ["hop", K.end + 0.2], ["thud", K.end + 0.8, { gain: -3 }], ["chime", K.end + 0.55],
    ...headlineCues("tag", B(39)), ["pop", B(41), { note: 9 }],
    ...[...APP.url].map((_, i) => ["tick", B(41.6) + i * 0.05]),
    ["hop", K.home], ["thud", K.home + 0.6, { gain: -3 }],
  ];
}
