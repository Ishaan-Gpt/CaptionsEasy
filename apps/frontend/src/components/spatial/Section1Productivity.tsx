"use client";

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { AnimatedNetworkLines } from './AnimatedNetworkLines';
import { useIsMobile } from './useIsMobile';
import { BlurFadeWords } from './BlurFadeWords';

function AnimatedWords({ text, baseDelay = 0, isInView }: {
  text: string;
  baseDelay?: number;
  isInView: boolean;
}) {
  const words = text.split(' ');
  return (
    <>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: baseDelay + i * 0.1, duration: 0.4, ease: 'easeOut' }}
          style={{ display: 'inline' }}
        >
          {word}{i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </>
  );
}

const MAGIC_BORDER_GREEN = 'conic-gradient(from 0deg, transparent 0%, transparent 35%, rgba(36,255,149,0.12) 42%, #24FF95 50%, rgba(36,255,149,0.12) 58%, transparent 65%, transparent 100%)';

function MagicBorder({ color, radius = '24px', reverse = false, duration = 4, initialAngle = 0, isInView = true }: { color: string; radius?: string; reverse?: boolean; duration?: number; initialAngle?: number; isInView?: boolean }) {
  const fromAngle = reverse ? -initialAngle : initialAngle;
  const toAngle = fromAngle + (reverse ? -360 : 360);
  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius, pointerEvents: 'none', overflow: 'hidden', zIndex: 60, padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <motion.div
        style={{ position: 'absolute', left: '50%', top: '50%', width: '250%', height: '250%', background: color, x: '-50%', y: '-50%', transformOrigin: 'center center', filter: 'drop-shadow(0 0 5px rgba(36, 255, 149, 0.5)) drop-shadow(0 0 10px rgba(36, 255, 149, 0.3))', willChange: 'transform' }}
        animate={isInView ? { rotate: [fromAngle, toAngle] } : false}
        transition={{ repeat: Infinity, duration, ease: 'linear' }}
      />
    </div>
  );
}

const NATIVE_W = 1040;
const NATIVE_H = 684;

export function Section1Productivity() {
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

  const card = (
    <div
      style={{
        position: 'relative',
        width: NATIVE_W,
        height: NATIVE_H,
        borderRadius: '24px',
        backgroundImage: 'url(/assets/s1-main-card-bg.png)',
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
        src="/assets/card-light-overlay.png"
        alt=""
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          pointerEvents: 'none',
          zIndex: 999,
          filter: 'drop-shadow(0 0 50px rgba(36, 255, 149, 0.75))',
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
            src="/assets/s1-notification-badge.svg"
            alt="01/03"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
          />
          <div style={{
            position: 'absolute', width: '155px', height: '155px',
            top: '50%', left: '44px', transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(36,255,149,0.10) 0%, rgba(36,255,149,0) 70%)',
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
          <BlurFadeWords text="Productivity" baseDelay={0.5} isInView={isInView} />
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
            text="ai/SmartSolution"
            baseDelay={0.8}
            isInView={isInView}
            wordStyle={{
              background: 'linear-gradient(180deg, #9BFFCF 0%, #24FF95 100%)',
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
          <BlurFadeWords text="Give teams the context needed to make" baseDelay={1.1} isInView={isInView} />
          <br />
          <BlurFadeWords text="quick decisions while staying aligned." baseDelay={1.45} isInView={isInView} />
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
        <AnimatedNetworkLines isInView={isInView} color="#24FF95" />

        <motion.img
          src="/assets/asterisk-button.svg"
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
          src="/assets/discord-button.svg"
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
          src="/assets/slack-button.svg"
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

      {/* Right half */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: '-1%',
          width: '50%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '6px 0 6px 73px',
          boxSizing: 'border-box',
          perspective: '1200px',
        }}
      >
        {/* Top card */}
        <div style={{ flex: 0.93, position: 'relative', overflow: 'hidden' }}>
          <motion.div
            initial={{ opacity: 0, x: -200, rotateY: -90, scale: 0.8 }}
            animate={isInView ? { opacity: 1, x: 0, rotateY: 0, scale: 1 } : { opacity: 0, x: -200, rotateY: -90, scale: 0.8 }}
            transition={isInView ? { type: 'spring', stiffness: 32, damping: 22, mass: 1.2 } : { duration: 0 }}
            style={{
              width: '100.5%',
              height: '100.5%',
              marginTop: '-0.25%',
              marginLeft: '-0.25%',
              borderRadius: '24px',
              backgroundImage: 'url(/assets/s1-top-card-bg.png)',
              backgroundSize: '100% 100%',
              overflow: 'hidden',
              position: 'relative',
              transformOrigin: 'center center',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.01)',
            }}
          >
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '-70px', right: 0, pointerEvents: 'none' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/s1-top-card-header.png"
                alt=""
                style={{
                  position: 'absolute',
                  top: '1.5px',
                  left: '50%',
                  transform: 'translateX(calc(-50% + 30px))',
                  width: '90%', height: 'auto',
                  pointerEvents: 'none',
                  filter: 'grayscale(1) sepia(1) hue-rotate(116deg) saturate(1.8) brightness(1.1)',
                }}
              />
              <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(calc(-50% + 35px))', width: '80%', height: '100%', pointerEvents: 'none' }}>
                <motion.img
                  src="/assets/s1-top-card-light.png"
                  alt=""
                  initial={{ opacity: 0, y: -100 }}
                  animate={isInView ? { opacity: 0.5, y: 0 } : { opacity: 0, y: -100 }}
                  transition={isInView ? {
                    opacity: { duration: 0.8, ease: 'easeOut', delay: 0.2 },
                    y: { duration: 1.4, ease: [0.45, 0, 0.55, 1], delay: 0.2 },
                  } : { duration: 0 }}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'top center',
                    pointerEvents: 'none',
                    transformOrigin: '50% 0%',
                    filter: 'drop-shadow(0 0 60px rgba(36, 255, 149, 0.7)) drop-shadow(0 0 30px rgba(36, 255, 149, 0.5))',
                  }}
                />
              </div>

              <div style={{ position: 'absolute', top: '-5px', left: 'calc(59% - 10px)', transform: 'translate(-50%, -50%)', marginTop: '4px', pointerEvents: 'auto' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/avatar-man-top.png" alt="" style={{ width: '100%', height: 'calc(100% + 15px)', objectFit: 'cover', marginTop: '15px' }} />
                </div>
              </div>

              {/* Outer orbit */}
              <motion.div
                style={{ position: 'absolute', inset: 0, transformOrigin: 'calc(59% - 10px) 13.5px', willChange: 'transform' }}
                initial={{ rotate: 180 }}
                animate={isInView ? { rotate: 0 } : { rotate: 180 }}
                transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 } : { duration: 0 }}
              >
                <div style={{ position: 'absolute', top: 'calc(37% - 20px)', left: 'calc(22% + 10px)', transform: 'translate(-50%,-50%)', pointerEvents: 'auto' }}>
                  <motion.div initial={{ rotate: -180, opacity: 0 }} animate={isInView ? { rotate: 0, opacity: 1 } : { rotate: -180, opacity: 0 }} transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 } : { duration: 0 }} style={{ width: '34px', height: '34px', borderRadius: '50%', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/github-icon.svg" alt="" style={{ width: '16px', height: '16px' }} />
                  </motion.div>
                </div>
                <div style={{ position: 'absolute', top: 'calc(55% - 0px)', left: 'calc(32% + 13px)', transform: 'translate(-50%,-50%)', pointerEvents: 'auto' }}>
                  <motion.div initial={{ rotate: -180, opacity: 0 }} animate={isInView ? { rotate: 0, opacity: 1 } : { rotate: -180, opacity: 0 }} transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 } : { duration: 0 }} style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/avatar-woman-1.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </motion.div>
                </div>
                <div style={{ position: 'absolute', top: 'calc(66% - -2px)', left: '54%', transform: 'translate(-50%,-50%)', pointerEvents: 'auto' }}>
                  <motion.div initial={{ rotate: -180, opacity: 0 }} animate={isInView ? { rotate: 0, opacity: 1 } : { rotate: -180, opacity: 0 }} transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 } : { duration: 0 }} style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/avatar-woman-2.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </motion.div>
                </div>
                <div style={{ position: 'absolute', top: 'calc(56% - -3px)', left: '75%', transform: 'translate(-50%,-50%)', pointerEvents: 'auto' }}>
                  <motion.div initial={{ rotate: -180, opacity: 0 }} animate={isInView ? { rotate: 0, opacity: 1 } : { rotate: -180, opacity: 0 }} transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 } : { duration: 0 }} style={{ width: '54px', height: '54px', borderRadius: '50%', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/avatar-woman-3.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </motion.div>
                </div>
              </motion.div>

              {/* Middle orbit */}
              <motion.div
                style={{ position: 'absolute', inset: 0, transformOrigin: 'calc(59% - 10px) 13.5px', willChange: 'transform' }}
                initial={{ rotate: -180 }}
                animate={isInView ? { rotate: 0 } : { rotate: -180 }}
                transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.4 } : { duration: 0 }}
              >
                <div style={{ position: 'absolute', top: 'calc(26% - 25px)', left: 'calc(86% - 9px)', transform: 'translate(-50%,-50%)', pointerEvents: 'auto' }}>
                  <motion.div initial={{ rotate: 180, opacity: 0 }} animate={isInView ? { rotate: 0, opacity: 1 } : { rotate: 180, opacity: 0 }} transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.4 } : { duration: 0 }} style={{ width: '34px', height: '34px', borderRadius: '50%', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/widget-box-icon.svg" alt="" style={{ width: '16px', height: '16px' }} />
                  </motion.div>
                </div>
              </motion.div>

              {/* Inner orbit */}
              <motion.div
                style={{ position: 'absolute', inset: 0, transformOrigin: 'calc(59% - 10px) 13.5px', willChange: 'transform' }}
                initial={{ rotate: 180 }}
                animate={isInView ? { rotate: 0 } : { rotate: 180 }}
                transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.6 } : { duration: 0 }}
              >
                <div style={{ position: 'absolute', top: 'calc(27% - 20px)', left: 'calc(36% + 9px)', transform: 'translate(-50%,-50%)', pointerEvents: 'auto' }}>
                  <motion.div initial={{ rotate: -180, opacity: 0 }} animate={isInView ? { rotate: 0, opacity: 1 } : { rotate: -180, opacity: 0 }} transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.6 } : { duration: 0 }} style={{ width: '46px', height: '46px', borderRadius: '50%', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/avatar-man-1.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </motion.div>
                </div>
                <div style={{ position: 'absolute', top: 'calc(42% - 36px)', left: 'calc(56% + 5px)', transform: 'translate(-50%,-50%)', pointerEvents: 'auto' }}>
                  <motion.div initial={{ rotate: -180, opacity: 0 }} animate={isInView ? { rotate: 0, opacity: 1 } : { rotate: -180, opacity: 0 }} transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.6 } : { duration: 0 }} style={{ width: '76px', height: '76px', borderRadius: '50%', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/avatar-man-2.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </motion.div>
                </div>
                <div style={{ position: 'absolute', top: 'calc(21% - 30px)', left: 'calc(75% - 6px)', transform: 'translate(-50%,-50%)', pointerEvents: 'auto' }}>
                  <motion.div initial={{ rotate: -180, opacity: 0 }} animate={isInView ? { rotate: 0, opacity: 1 } : { rotate: -180, opacity: 0 }} transition={isInView ? { duration: 2.4, ease: [0.16, 1, 0.3, 1], delay: 0.6 } : { duration: 0 }} style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/avatar-man-bottom.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </motion.div>
                </div>
              </motion.div>
            </div>

            <div style={{ position: 'absolute', left: '30px', bottom: '38px' }}>
              <h3 style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '24px', fontWeight: 300, color: 'rgba(255,255,255,0.8)', margin: 0, marginBottom: '6px', letterSpacing: '-0.4px' }}>
                <AnimatedWords text="Create a Team" baseDelay={0.8} isInView={isInView} />
              </h3>
              <p style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '14px', fontWeight: 300, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.4 }}>
                <AnimatedWords text="Whether you're leading a project, organising a event" baseDelay={1.05} isInView={isInView} />
              </p>
            </div>

            <MagicBorder color={MAGIC_BORDER_GREEN} radius="24px" isInView={isInView} />
          </motion.div>
        </div>

        {/* Bottom card */}
        <div style={{ flex: 1.07, overflow: 'hidden' }}>
          <motion.div
            initial={{ opacity: 0, x: 200, rotateY: 90, scale: 0.8 }}
            animate={isInView ? { opacity: 1, x: 0, rotateY: 0, scale: 1 } : { opacity: 0, x: 200, rotateY: 90, scale: 0.8 }}
            transition={isInView ? { type: 'spring', stiffness: 32, damping: 22, mass: 1.2, delay: 0.15 } : { duration: 0 }}
            style={{
              width: '100.5%',
              height: '100.5%',
              marginTop: '-0.25%',
              marginLeft: '-0.25%',
              borderRadius: '24px',
              backgroundImage: 'url(/assets/s1-bottom-card-bg.png)',
              backgroundSize: '100% 100%',
              overflow: 'hidden',
              position: 'relative',
              transformOrigin: 'center center',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.01)',
            }}
          >
            <div style={{ position: 'absolute', top: '24px', left: '86px', right: '24px', marginBottom: '7px' }}>
              <h3 style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '22px', fontWeight: 300, color: 'rgba(255,255,255,0.8)', margin: 0, letterSpacing: '-0.4px' }}>Personal Performance</h3>
            </div>

            <motion.img
              src="/assets/crypto-chart.svg"
              alt=""
              initial={{ clipPath: 'inset(0% 100% 0% 0%)' }}
              animate={isInView ? { clipPath: 'inset(0% 0% 0% 0%)' } : { clipPath: 'inset(0% 100% 0% 0%)' }}
              transition={isInView ? { delay: 0.9, duration: 1.5, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
              style={{ position: 'absolute', bottom: '48px', left: '25px', width: '390px', height: 'auto', pointerEvents: 'none' }}
            />

            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : { scale: 0 }}
              transition={isInView ? { delay: 1.4, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 }}
              style={{ position: 'absolute', bottom: '15px', left: '35px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/zap-icon.svg" alt="" style={{ width: '16px', height: '16px' }} />
              <span style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>Generate Custom</span>
            </motion.div>

            <div style={{ position: 'absolute', top: '105px', left: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[{ label: 'Weekly', border: '#868686' }, { label: 'Finance', border: '#868686' }, { label: 'Food', border: '#2B2B2B' }, { label: 'Works', border: '#2B2B2B' }, { label: 'Shopping', border: '#2B2B2B' }].map(({ label, border }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isInView ? 1 : 0 }}
                  transition={{ delay: 0.9 + i * 0.13, duration: 0.45, ease: 'easeOut' }}
                  style={{ padding: '6px 14px', borderRadius: '999px', border: `1px solid ${border}`, fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}
                >
                  {label}
                </motion.div>
              ))}
            </div>

            <MagicBorder color={MAGIC_BORDER_GREEN} radius="24px" reverse isInView={isInView} />
          </motion.div>
        </div>
      </div>
      <MagicBorder color={MAGIC_BORDER_GREEN} radius="24px" duration={10} initialAngle={180} isInView={isInView} />
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
          top: 0,
          left: 0,
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
