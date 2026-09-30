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

const MAGIC_BORDER_PURPLE = 'conic-gradient(from 0deg, transparent 0%, transparent 35%, rgba(144,106,255,0.12) 42%, #906AFF 50%, rgba(144,106,255,0.12) 58%, transparent 65%, transparent 100%)';

const NATIVE_W = 1040;
const NATIVE_H = 684;

export function Section2() {
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
    obs.observe(el)
    return () => obs.disconnect();
  }, [isMobile]);

  const card = (
    <div
      style={{
        position: 'relative',
        width: NATIVE_W,
        height: NATIVE_H,
        borderRadius: '24px',
        backgroundImage: 'url(/assets/s2-card-bg.png)',
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
          filter: 'drop-shadow(0 0 50px rgba(87, 36, 233, 0.75))',
        }}
      />

      {/* ── Text block ── */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
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
          style={{ position: 'relative', width: '320px', height: '80px', marginBottom: '25px', marginLeft: '-30px', marginTop: '10px' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/step-indicator-s2.svg"
            alt="02/03"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
          />
          <div style={{
            position: 'absolute', width: '155px', height: '155px',
            top: '50%', left: '44px', transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(85,32,244,0.10) 0%, rgba(85,32,244,0) 70%)',
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
          <BlurFadeWords text="Flexibility" baseDelay={0.5} isInView={isInView} />
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
            text="ai/World-Wide"
            baseDelay={0.8}
            isInView={isInView}
            wordStyle={{
              background: 'linear-gradient(180deg, #906AFF 0%, #703FFF 100%)',
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
          <BlurFadeWords text="Work the way you want with customizable" baseDelay={1.1} isInView={isInView} />
          <br />
          <BlurFadeWords text="backgrounds that showcase your personality." baseDelay={1.45} isInView={isInView} />
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
        <AnimatedNetworkLines isInView={isInView} color="#906AFF" />

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

      {/* Right side card */}
      <div style={{ perspective: '1200px', position: 'absolute', top: 0, right: 0, width: '500px', height: '630px' }}>
        <motion.div
          initial={{ opacity: 0, x: 140, rotateY: -22, scale: 0.88 }}
          animate={isInView ? { opacity: 1, x: 0, rotateY: 0, scale: 1 } : { opacity: 0, x: 140, rotateY: -22, scale: 0.88 }}
          transition={isInView ? { delay: 0.4, duration: 1.2, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
          style={{ position: 'relative', width: '100%', height: '100%', transformOrigin: 'right center' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/s2-right-card-bg.png"
            alt=""
            style={{ position: 'absolute', top: 0, right: 0, width: '440px', height: '630px', pointerEvents: 'none' }}
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 1.1, duration: 0.5, ease: 'easeOut' }}
            style={{ position: 'absolute', top: '327px', right: '194px', display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/web-loading-lines.svg" alt="" style={{ width: '26px', height: '26px', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '18px', fontWeight: 400, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', opacity: 0.8 }}>Adding Plan...</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 1.1, duration: 0.5, ease: 'easeOut' }}
            style={{ position: 'absolute', top: '323px', right: '52px', display: 'flex', alignItems: 'stretch', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.14)', overflow: 'hidden', pointerEvents: 'auto' }}
          >
            <div style={{ width: '52px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/arrow-right.svg" alt="" style={{ width: '20px', height: '20px', transform: 'rotate(180deg)', opacity: 0.35 }} />
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.14)', alignSelf: 'stretch' }} />
            <div style={{ width: '52px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/arrow-right.svg" alt="" style={{ width: '20px', height: '20px' }} />
            </div>
          </motion.div>

          <div style={{ position: 'absolute', top: '373px', right: '111px', pointerEvents: 'none' }}>
            <span style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '18px', fontWeight: 400, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', opacity: 0.8 }}>
              <AnimatedWords text="Journey to the Far Reaches" baseDelay={1.2} isInView={isInView} />
            </span>
          </div>

          <div style={{ position: 'absolute', top: '410px', right: '61px', pointerEvents: 'none' }}>
            <p style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '16px', fontWeight: 400, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
              <AnimatedWords text="Create a comprehensive plan for your" baseDelay={1.45} isInView={isInView} /><br />
              <AnimatedWords text="team's success with the Manage" baseDelay={1.9} isInView={isInView} /><br />
              <AnimatedWords text="app's powerful planning tools." baseDelay={2.25} isInView={isInView} />
            </p>
          </div>

          <div style={{ position: 'absolute', bottom: '100px', right: '-25px', width: '440px', display: 'flex', justifyContent: 'center', pointerEvents: 'auto', zIndex: 70 }}>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              transition={isInView ? { delay: 1.75, duration: 0.65, ease: [0.34, 1.56, 0.64, 1] } : { duration: 0 }}
            >
              <button style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 20px', borderRadius: '14px', border: '1px solid rgba(160,140,255,0.3)', backgroundColor: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', cursor: 'pointer' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/gear-icon.svg" alt="" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '15px', fontWeight: 400, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap' }}>Create a Plan</span>
              </button>
            </motion.div>
          </div>

          {/* Magic Border */}
          <div style={{
            position: 'absolute',
            top: '8.5%',
            right: '6.5%',
            bottom: '13.9%',
            left: '28.1%',
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
                background: MAGIC_BORDER_PURPLE,
                x: '-50%', y: '-50%',
                transformOrigin: 'center center',
                filter: 'drop-shadow(0 0 5px rgba(144, 106, 255, 0.5)) drop-shadow(0 0 10px rgba(144, 106, 255, 0.3))',
                willChange: 'transform',
              }}
              animate={isInView ? { rotate: 360 } : false}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            />
          </div>

          {/* Help Center + Support Team */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ delay: 2.1, duration: 0.7, ease: 'easeOut' }}
            style={{ position: 'absolute', bottom: '22px', right: '75px', display: 'flex', alignItems: 'center', gap: '15px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/quick-actions-icon.svg" alt="" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>Help Center</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/mail-icon.svg" alt="" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-aeonik, var(--font-normal-sys), sans-serif)', fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>Support Team</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: '24px', pointerEvents: 'none', overflow: 'hidden', zIndex: 60, padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
        <motion.div
          style={{ position: 'absolute', left: '50%', top: '50%', width: '250%', height: '250%', background: MAGIC_BORDER_PURPLE, x: '-50%', y: '-50%', transformOrigin: 'center center', filter: 'drop-shadow(0 0 5px rgba(144, 106, 255, 0.5)) drop-shadow(0 0 10px rgba(144, 106, 255, 0.3))', willChange: 'transform' }}
          animate={isInView ? { rotate: [270, 630] } : false}
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
