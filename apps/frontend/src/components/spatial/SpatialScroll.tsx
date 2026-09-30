"use client";

import React, { useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Section1Productivity } from './Section1Productivity';
import { Section2 } from './Section2';
import { Section3 } from './Section3';
import { Section4 } from './Section4';
import { useIsMobile } from './useIsMobile';

const SECTION_POSITIONS = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
];

export function SpatialScroll() {
  const isMobile = useIsMobile();
  const isPhone = useIsMobile(600);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sectionRef = useRef(0);
  const isAnimating = useRef(false);
  const hasLooped = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const posFor = useCallback((idx: number) => {
    const pos = SECTION_POSITIONS[idx];
    return {
      tx: pos.x * (window.innerWidth * 0.74),
      ty: pos.y * (window.innerHeight * 0.82),
    };
  }, []);

  const goTo = useCallback((idx: number) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    if (sectionRef.current === 3 && idx === 0) hasLooped.current = true;
    const { tx, ty } = posFor(idx);
    animate(x, tx, { duration: 0.85, ease: [0.76, 0, 0.24, 1] });
    animate(y, ty, { duration: 0.85, ease: [0.76, 0, 0.24, 1] });
    sectionRef.current = idx;
    setTimeout(() => { isAnimating.current = false; }, 950);
  }, [x, y, posFor]);

  useEffect(() => {
    if (isMobile) return;
    const handleWheel = (e: WheelEvent) => {
      // Check if mouse is hovering this spatial scroll container
      const container = document.getElementById('spatial-scroll-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const inView = rect.top <= 50 && rect.bottom >= window.innerHeight - 50;
      if (!inView) return;

      if (Math.abs(e.deltaY) < 5) return;
      
      // If we are navigating the internal sections
      const dir = e.deltaY > 0 ? 1 : -1;
      if (dir > 0 && sectionRef.current < 3) {
        e.preventDefault();
        goTo(sectionRef.current + 1);
      } else if (dir < 0 && sectionRef.current > 0) {
        e.preventDefault();
        goTo(sectionRef.current - 1);
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [goTo, isMobile]);

  useEffect(() => {
    if (isMobile) return;
    let timer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { tx, ty } = posFor(sectionRef.current);
        x.set(tx);
        y.set(ty);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); clearTimeout(timer); };
  }, [x, y, posFor, isMobile]);

  useEffect(() => {
    if (isMobile) return;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = touchStart.current.x - t.clientX;
      const dy = touchStart.current.y - t.clientY;
      touchStart.current = null;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx < 50 && absDy < 50) return;
      const dir = absDx >= absDy ? (dx > 0 ? 1 : -1) : (dy > 0 ? 1 : -1);
      if (!hasLooped.current && sectionRef.current === 0 && dir === -1) return;
      goTo((sectionRef.current + dir + 4) % 4);
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchend', onTouchEnd); };
  }, [isMobile, goTo]);

  if (isMobile) {
    const isTablet = !isPhone;
    const snapSlot: React.CSSProperties = {
      minHeight: '100svh',
      scrollSnapAlign: 'start',
      scrollSnapStop: 'always',
      overflow: 'hidden',
      paddingBottom: isTablet ? '36px' : 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
    return (
      <div id="spatial-scroll-container" ref={scrollContainerRef} style={{ width: '100vw', backgroundColor: '#0a0d15', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <div style={snapSlot}><Section1Productivity /></div>
        <div style={snapSlot}><Section2 /></div>
        <div style={snapSlot}><Section3 /></div>
        <div style={snapSlot}><Section4 /></div>
      </div>
    );
  }

  return (
    <section id="spatial-scroll-container" style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0a0d15', position: 'relative' }}>
      {/* Interactive Navigation Indicator Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
        {[0, 1, 2, 3].map((idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={`transition-all duration-300 rounded-full ${
              sectionRef.current === idx
                ? 'w-7 h-2 bg-gradient-to-r from-[#24FF95] to-[#4C6DFF]'
                : 'w-2 h-2 bg-white/30 hover:bg-white/60'
            }`}
            aria-label={`Go to section ${idx + 1}`}
          />
        ))}
        <span className="text-[11px] font-mono text-white/50 pl-1">
          {sectionRef.current + 1} / 4
        </span>
      </div>

      <motion.div style={{ x, y, position: 'relative', width: '200vw', height: '200vh', willChange: 'transform' }}>
        <div style={{ position: 'absolute', top: '0', left: '0', width: '100vw', height: '100vh' }}><Section1Productivity /></div>
        <div style={{ position: 'absolute', top: '0', left: '74vw', width: '100vw', height: '100vh' }}><Section2 /></div>
        <div style={{ position: 'absolute', top: '82vh', left: '74vw', width: '100vw', height: '100vh' }}><Section3 /></div>
        <div style={{ position: 'absolute', top: '82vh', left: '0', width: '100vw', height: '100vh' }}><Section4 /></div>
      </motion.div>
    </section>
  );
}
