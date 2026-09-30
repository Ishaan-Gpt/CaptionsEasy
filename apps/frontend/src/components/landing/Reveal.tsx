"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Scroll-in reveal. `initial` is kept identical on server and client so
 * hydration stays clean; reduced-motion users get an instant (zero-duration)
 * completion instead of a different initial state.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={
        reduce
          ? { duration: 0 }
          : { delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
