"use client";

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { AnimatedNetworkLines } from './AnimatedNetworkLines';
import { useIsMobile } from './useIsMobile';
import { BlurFadeWords } from './BlurFadeWords';

const MAGIC_BORDER_BLUE = 'conic-gradient(from 0deg, transparent 0%, transparent 35%, rgba(76,109,255,0.12) 42%, #4C6DFF 50%, rgba(76,109,255,0.12) 58%, transparent 65%, transparent 100%)';

const NATIVE_W = 1040;
const NATIVE_H = 684;

export function Section3() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const isMobile = useIsMobile();
  const [scale, setScale] = useState(1);

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

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let wasVisible = false;
    const enterRatio = isMobile ? 0.2 : 0.92;
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

  // Chat bubbles — card-relative pixel coords (1040×684 space)
  const bubbles = [
    { src: '/assets/s3-chat-hola.png', w: 240, h: 60, delay: 2.1, top: -23, right: 65 },
    { src: '/assets/s3-chat-hello-friend.png', w: 250, h: 70, delay: 1.8, top: 26, right: 215 },
    { src: '/assets/s3-chat-hello-kitty.png', w: 240, h: 65, delay: 1.5, top: 92, right: 65 },
  ];

  const card = (
    <div
      style={{
        position: 'relative',
        width: NATIVE_W,
        height: NATIVE_H,
        borderRadius: '24px',
        backgroundImage: 'url(/assets/s3-card-bg.png)',
        backgroundSize: '115%',
        backgroundPosition: 'center',
        overflow: 'hidden',
        boxShadow:
          '0 0 0 1px rgba(129,209,189,0.01), 0 40px 120px rgba(0,0,0,0.75), 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* LightsOfCard overlay */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/s3-card-light-overlay.png"
        alt=""
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          pointerEvents: 'none',
          zIndex: 999,
          filter: 'drop-shadow(0 0 50px rgba(108, 133, 226, 0.75))',
        }}
      />

      {/* ── Text block ── */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '65px',
          width: '480px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          visibility: isInView ? 'visible' : 'hidden',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', width: '320px', height: '80px', marginBottom: '25px', marginLeft: '-30px' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/step-indicator-s3.svg"
            alt="03/03"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: 'center center',
              display: 'block',
            }}
          />
          <div style={{
            position: 'absolute',
            width: '155px', height: '155px',
            top: '50%', left: '44px', transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(86,134,249,0.10) 0%, rgba(86,134,249,0) 70%)',
            pointerEvents: 'none', borderRadius: '50%',
          }} />
        </motion.div>

        <h1
          style={{
            fontFamily: 'var(--font-jakarta, var(--font-normal-sys), sans-serif)',
            fontSize: '60px',
            fontWeight: 300,
            lineHeight: 1.05,
            letterSpacing: '-1.5px',
            color: '#ffffff',
            margin: 0,
            marginBottom: '6px',
            overflow: 'visible',
          }}
        >
          <BlurFadeWords text="Unify Teams" baseDelay={0.5} isInView={isInView} />
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
            text="ai/EasierTeamwork"
            baseDelay={0.8}
            isInView={isInView}
            wordStyle={{
              background: 'linear-gradient(180deg, #9BB1FF 0%, #4C6DFF 100%)',
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
            lineHeight: 1.3,
            letterSpacing: '-0.2px',
            color: 'rgba(255,255,255,0.6)',
            margin: 0,
            maxWidth: '400px',
            overflow: 'visible',
          }}
        >
          <BlurFadeWords text="Craft your team's perfect process with over" baseDelay={1.1} isInView={isInView} />
          <br />
          <BlurFadeWords text="4000 extensions and 800 integrations." baseDelay={1.45} isInView={isInView} />
        </p>
      </div>

      {/* ── Diagram block ── */}
      <div
        style={{
          position: 'absolute',
          left: '35px',
          bottom: '-25px',
          width: '570px',
          height: '358px',
          zIndex: 10,
        }}
      >
        <AnimatedNetworkLines isInView={isInView} color="#4C6DFF" />

        <motion.img
          src="/assets/asterisk-icon.svg"
          alt=""
          initial={{ rotate: 0, opacity: 0 }}
          animate={isInView ? { rotate: [0, 14, 0], opacity: 1 } : { rotate: 0, opacity: 0 }}
          transition={{
            rotate: { delay: 0.1, duration: 1.1, ease: [0.45, 0, 0.55, 1] },
            opacity: { delay: 0.1, duration: 0.7, ease: 'easeOut' },
          }}
          style={{
            position: 'absolute',
            width: '85px', height: '85px',
            left: '48px', top: '134px',
            objectFit: 'contain',
            objectPosition: 'center calc(60% + 2px)',
            backdropFilter: 'blur(12px)',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(160,160,160,0.1)',
            borderRadius: '20px',
            padding: '1px',
            boxSizing: 'border-box',
          }}
        />

        <motion.img
          src="/assets/discord-icon.svg"
          alt=""
          initial={{ scale: 0, rotate: -180, y: -20 }}
          animate={isInView ? { scale: 1, rotate: 0, y: 0 } : { scale: 0, rotate: -180, y: -20 }}
          transition={isInView ? { delay: 2.0, duration: 0.8, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
          style={{
            position: 'absolute',
            width: '85px', height: '85px',
            left: '375px', top: '64px',
            objectFit: 'contain',
            objectPosition: 'center calc(50% + 2px)',
            backdropFilter: 'blur(12px)',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(160,160,160,0.1)',
            borderRadius: '20px',
            padding: '1px',
            boxSizing: 'border-box',
          }}
        />

        <motion.img
          src="/assets/slack-icon.svg"
          alt=""
          initial={{ scale: 0, rotate: -180, y: -20 }}
          animate={isInView ? { scale: 1, rotate: 0, y: 0 } : { scale: 0, rotate: -180, y: -20 }}
          transition={isInView ? { delay: 2.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
          style={{
            position: 'absolute',
            width: '85px', height: '85px',
            left: '380px', top: '193px',
            objectFit: 'contain',
            objectPosition: 'center calc(50% + 2px)',
            backdropFilter: 'blur(12px)',
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(160,160,160,0.1)',
            borderRadius: '20px',
            padding: '1px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* chandelier */}
      <motion.img
        src="/assets/s3-chandelier.svg"
        alt=""
        initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
        animate={isInView ? { clipPath: 'inset(0% 0% 0% 0%)' } : { clipPath: 'inset(100% 0% 0% 0%)' }}
        transition={isInView ? { delay: 0.9, duration: 1.0, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
        style={{
          position: 'absolute',
          bottom: '474px', right: '183px',
          width: '114px', height: '55px',
          pointerEvents: 'none',
        }}
      />

      {/* 3SectionCard container */}
      <div style={{ position: 'absolute', bottom: '-30px', right: '40px', width: '440px', height: '530px', perspective: '1200px' }}>
        <motion.div
          initial={{ opacity: 0, x: 120, rotateY: -22, scale: 0.88 }}
          animate={isInView ? { opacity: 1, x: 0, rotateY: 0, scale: 1 } : { opacity: 0, x: 120, rotateY: -22, scale: 0.88 }}
          transition={isInView ? { delay: 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
          style={{ position: 'relative', width: '100%', height: '100%', transformOrigin: 'right center' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/s3-right-card-bg.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

          {/* AddMembers button */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={isInView ? { delay: 1.4, duration: 0.65, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 }}
            style={{ position: 'absolute', bottom: '40px', right: '-5px', width: '250px', transformOrigin: 'center center' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/s3-add-members-button.png" alt="" style={{ width: '250px', height: '130px', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 1V13M1 7H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '15px', fontWeight: 400, color: 'white', whiteSpace: 'nowrap' }}>Add members</span>
            </div>
          </motion.div>

          {/* Magic Border */}
          <div style={{
            position: 'absolute',
            top: '4.75%', bottom: '14.5%',
            left: '17%', right: '7%',
            borderRadius: '24px',
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 60,
            padding: '2px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}>
            <motion.div
              style={{
                position: 'absolute',
                left: '50%', top: '50%',
                width: '250%', height: '250%',
                background: MAGIC_BORDER_BLUE,
                x: '-50%', y: '-50%',
                transformOrigin: 'center center',
                filter: 'drop-shadow(0 0 5px rgba(76, 109, 255, 0.5)) drop-shadow(0 0 10px rgba(76, 109, 255, 0.3))',
                willChange: 'transform',
              }}
              animate={isInView ? { rotate: 360 } : false}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            />
          </div>
        </motion.div>
      </div>

      {/* Chat bubbles — clipped by card overflow:hidden */}
      {bubbles.map(({ src, w, h, delay, top, right }) => (
        <div key={src} style={{ position: 'absolute', top, right, perspective: '700px', zIndex: 55 }}>
          <motion.div
            key={src}
            initial={{ opacity: 0, scale: 0.72, y: 28, rotateX: 20 }}
            animate={isInView ? { opacity: 1, scale: 1, y: 0, rotateX: 0 } : { opacity: 0, scale: 0.72, y: 28, rotateX: 20 }}
            transition={isInView ? { delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" style={{ width: w, height: h, display: 'block', pointerEvents: 'none' }} />
          </motion.div>
        </div>
      ))}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: '24px', pointerEvents: 'none', overflow: 'hidden', zIndex: 60, padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
        <motion.div
          style={{ position: 'absolute', left: '50%', top: '50%', width: '250%', height: '250%', background: MAGIC_BORDER_BLUE, x: '-50%', y: '-50%', transformOrigin: 'center center', filter: 'drop-shadow(0 0 5px rgba(76, 109, 255, 0.5)) drop-shadow(0 0 10px rgba(76, 109, 255, 0.3))', willChange: 'transform' }}
          animate={isInView ? { rotate: [0, 360] } : false}
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
        position: 'relative',
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
