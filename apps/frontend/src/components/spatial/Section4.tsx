"use client";

import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useIsMobile } from './useIsMobile';
import { BlurFadeWords } from './BlurFadeWords';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const RING_END   = [0.54, 0.69, 0.84, 1.00];
const RING_EXIT  = [0.70, 0.90, 1.09, 1.30];

function OrbitRings({ isActive }: { isActive: boolean }) {
  const c0 = useAnimation();
  const c1 = useAnimation();
  const c2 = useAnimation();
  const c3 = useAnimation();

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    const loop = async () => {
      if (cancelled) return;
      c0.set({ scale: 0.18, opacity: 0 });
      c1.set({ scale: 0.18, opacity: 0 });
      c2.set({ scale: 0.18, opacity: 0 });
      c3.set({ scale: 0.18, opacity: 0 });

      const inT = { duration: 1.0, ease: [0.22, 1, 0.36, 1] as const };
      c0.start({ scale: RING_END[0], opacity: 1, transition: inT });
      await sleep(220);
      if (cancelled) return;
      c1.start({ scale: RING_END[1], opacity: 1, transition: inT });
      await sleep(220);
      if (cancelled) return;
      c2.start({ scale: RING_END[2], opacity: 1, transition: inT });
      await sleep(220);
      if (cancelled) return;
      await c3.start({ scale: RING_END[3], opacity: 1, transition: inT });

      await sleep(700);
      if (cancelled) return;

      const outT = { duration: 1.1, ease: [0.76, 0, 0.24, 1] as const };
      await Promise.all([
        c0.start({ scale: RING_EXIT[0], opacity: 0, transition: outT }),
        c1.start({ scale: RING_EXIT[1], opacity: 0, transition: outT }),
        c2.start({ scale: RING_EXIT[2], opacity: 0, transition: outT }),
        c3.start({ scale: RING_EXIT[3], opacity: 0, transition: outT }),
      ]);

      await sleep(3000);
      if (!cancelled) loop();
    };
    loop();
    return () => { cancelled = true; };
  }, [c0, c1, c2, c3, isActive]);

  const srcs = [
    '/assets/orbit-1.svg',
    '/assets/orbit-2.svg',
    '/assets/orbit-3.svg',
    '/assets/orbit-3.svg',
  ];
  const controls = [c0, c1, c2, c3];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 5, willChange: 'transform' }}>
      {srcs.map((src, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <motion.img
          key={i}
          src={src}
          alt=""
          initial={{ scale: 0.18, opacity: 0 }}
          animate={controls[i]}
          style={{ position: 'absolute', width: '175%', height: '175%', objectFit: 'contain' }}
        />
      ))}
    </div>
  );
}

const NATIVE_W = 1040;
const NATIVE_H = 684;

export function Section4() {
  const isMobile = useIsMobile();
  const [scale, setScale] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let wasVisible = false;
    const enterRatio = isMobile ? 0.3 : 0.9;
    const exitRatio = isMobile ? 0.05 : 0.1;
    const obs = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio;
        if (entry.isIntersecting && ratio >= enterRatio && !wasVisible) {
          wasVisible = true;
          setIsInView(true);
        } else if (!entry.isIntersecting || ratio < exitRatio) {
          wasVisible = false;
          setIsInView(false);
        }
      },
      { threshold: [exitRatio, enterRatio] }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isMobile]);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScale(w > 1024 ? Math.min(1, w / 1440, h / 900) : Math.max(0.28, (w - 24) / NATIVE_W));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const card = (
    <div
      style={{
        position: 'relative',
        width: NATIVE_W,
        height: NATIVE_H,
        borderRadius: '24px',
        backgroundColor: 'transparent',
        backgroundImage: 'url(/assets/s4-card-bg.png)',
        backgroundSize: '115%',
        backgroundPosition: 'center',
        overflow: 'hidden',
        boxShadow:
          '0 0 0 1px rgba(129,209,189,0.01), 0 40px 120px rgba(0,0,0,0.75), 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <OrbitRings isActive={isInView} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/card-light-overlay.png"
        alt=""
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          pointerEvents: 'none',
          zIndex: 50,
        }}
      />

      {/* ── Text block ── */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          left: 0, right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
          visibility: isInView ? 'visible' : 'hidden',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-jakarta, var(--font-normal-sys), sans-serif)',
            fontSize: '60px',
            fontWeight: 300,
            lineHeight: 1.05,
            letterSpacing: '-1.5px',
            color: '#ffffff',
            margin: 0,
            marginBottom: '10px',
            overflow: 'visible',
          }}
        >
          <BlurFadeWords text="Team Created" baseDelay={0.3} isInView={isInView} />
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-jakarta, var(--font-normal-sys), sans-serif)',
            fontSize: '36px',
            fontWeight: 300,
            lineHeight: 1.18,
            letterSpacing: '-0.6px',
            margin: 0,
            marginBottom: '18px',
            overflow: 'visible',
          }}
        >
          <BlurFadeWords
            text="ai/Running Plan Template"
            baseDelay={0.6}
            isInView={isInView}
            wordStyle={{
              background: 'linear-gradient(180deg, #A0A0A0 0%, #DFDFDF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          />
        </p>

        <p
          style={{
            fontFamily: 'var(--font-jakarta, var(--font-normal-sys), sans-serif)',
            fontSize: '19px',
            fontWeight: 300,
            lineHeight: 1.5,
            letterSpacing: '-0.2px',
            color: 'rgba(255,255,255,0.6)',
            margin: 0,
          }}
        >
          <BlurFadeWords text="Welcome to the New journey!" baseDelay={1.0} isInView={isInView} />
        </p>

        {/* Perspective wrapper for 3D bar animation */}
        <div style={{ perspective: '1000px', marginTop: '70px', flexShrink: 0 }}>
          <motion.div
            initial={{ opacity: 0, rotateX: -28, y: 40, scale: 0.88 }}
            animate={isInView ? { opacity: 1, rotateX: 0, y: 0, scale: 1 } : { opacity: 0, rotateX: -28, y: 40, scale: 0.88 }}
            transition={isInView ? { delay: 2.3, duration: 1.3, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
            style={{
              position: 'relative',
              width: '376px',
              height: '164px',
              backgroundImage: 'url(/assets/s4-stats-bar.png)',
              backgroundSize: '100% 100%',
              transformOrigin: 'center bottom',
              borderRadius: '20px',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            {/* Top-left: device → arrow → desktop */}
            <div style={{ position: 'absolute', top: '18px', left: '32px', display: 'flex', alignItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                src="/assets/s4-single-device.png"
                alt=""
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={isInView ? { delay: 2.8, duration: 0.65, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 }}
                style={{ width: '52px', height: '52px', objectFit: 'contain', position: 'relative', left: '-10px' }}
              />
              <motion.div
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                animate={isInView ? { clipPath: 'inset(0 0% 0 0)' } : { clipPath: 'inset(0 100% 0 0)' }}
                transition={isInView ? { delay: 3.15, duration: 0.75, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
                style={{ position: 'relative', left: '-14px', top: '12px', display: 'flex' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/s4-arrows-divider.svg" alt="" style={{ height: '60px', objectFit: 'contain' }} />
              </motion.div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                src="/assets/s4-desktop-icon.svg"
                alt=""
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={isInView ? { delay: 3.15 + 0.75, duration: 0.65, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 }}
                style={{ width: '37px', height: '37px', objectFit: 'contain', position: 'relative', top: '-15px', left: '-14px' }}
              />
            </div>

            {/* Top-right: 3 avatars */}
            <div style={{ position: 'absolute', top: '25px', right: '21px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {['/assets/s4-avatar-left.png', '/assets/s4-avatar-middle.png', '/assets/s4-avatar-right.png'].map((src, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <motion.img
                  key={i}
                  src={src}
                  alt=""
                  initial={{ scale: 0, opacity: 0 }}
                  animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={isInView ? { delay: 2.9 + i * 0.13, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 }}
                  style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }}
                />
              ))}
            </div>

            {/* Bottom-left: 3 icons */}
            <div style={{ position: 'absolute', bottom: '18px', left: '26px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {['/assets/meta-icon.svg', '/assets/reddit-icon.svg', '/assets/feather-icon.svg'].map((src, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <motion.img
                  key={i}
                  src={src}
                  alt=""
                  initial={{ scale: 0, rotate: 0, opacity: 0 }}
                  animate={isInView ? { scale: 1, rotate: 360, opacity: 1 } : { scale: 0, rotate: 0, opacity: 0 }}
                  transition={isInView ? { delay: 3.1 + i * 0.15, duration: 0.85, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 }}
                  style={{ width: '40px', height: '40px' }}
                />
              ))}
            </div>

            {/* Bottom-right: Template button */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={isInView ? { delay: 3.3, duration: 0.7, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 }}
              style={{ position: 'absolute', bottom: '18px', right: '26px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '999px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/asterisk-orange.svg" alt="" style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '15px', fontWeight: 400, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>Template</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/arrow-down.svg" alt="" style={{ width: '11px', height: '11px', flexShrink: 0 }} />
            </motion.div>

            {/* Magic Border */}
            <div
              style={{
                position: 'absolute',
                top: 0, bottom: 0, left: 0, right: 0,
                borderRadius: '20px',
                pointerEvents: 'none',
                overflow: 'hidden',
                zIndex: 60,
                padding: '2px',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
              }}
            >
              <motion.div
                style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  width: '250%', height: '250%',
                  background: 'conic-gradient(from 0deg, transparent 0%, transparent 42%, rgba(255,255,255,0.1) 47%, #ffffff 50%, rgba(255,255,255,0.1) 53%, transparent 58%, transparent 100%)',
                  x: '-50%', y: '-50%',
                  transformOrigin: 'center center',
                  filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))',
                  willChange: 'transform',
                }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={isInView ? { delay: 2.5, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 }}
          style={{
            width: '180px', height: '40px',
            marginTop: '60px',
            backgroundImage: 'url(/assets/s4-action-button-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/s4-loader-spinner.png" alt="" style={{ width: '18px', height: '18px', flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '14px', fontWeight: 400, color: '#ffffff', whiteSpace: 'nowrap' }}>Open in 25 Sec...</span>
        </motion.div>
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: '24px', pointerEvents: 'none', overflow: 'hidden', zIndex: 60, padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
        <motion.div
          style={{ position: 'absolute', left: '50%', top: '50%', width: '250%', height: '250%', background: 'conic-gradient(from 0deg, transparent 0%, transparent 42%, rgba(255,255,255,0.1) 47%, #ffffff 50%, rgba(255,255,255,0.1) 53%, transparent 58%, transparent 100%)', x: '-50%', y: '-50%', transformOrigin: 'center center', filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5)) drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))', willChange: 'transform' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
        />
      </div>
    </div>
  );

  return (
    <section
      ref={sectionRef}
      style={{
        width: '100vw',
        height: isMobile ? 'auto' : '100vh',
        ...(isMobile ? { minHeight: '100svh', backgroundColor: '#060b0d', overflow: 'hidden' } : {}),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        contain: 'layout style paint',
      }}
    >
      <div style={{
        position: 'relative',
        flexShrink: 0,
        width: NATIVE_W * scale,
        height: NATIVE_H * scale,
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: NATIVE_W,
          height: NATIVE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}>
          {card}
        </div>
      </div>
    </section>
  );
}
