"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** stagger index — adds a small delay per item */
  delay?: number;
  /** translate distance in px (default 24) */
  y?: number;
  /** render as a different element if needed */
  as?: "div" | "li" | "span";
};

/**
 * Reveal — soft opacity + translate-Y entrance as content scrolls into view.
 * Staggered, not bouncy. Respects prefers-reduced-motion (simple fade only).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];

  if (reduce) {
    // Reduced motion: simple fade, no transform.
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-8% 0px -8% 0px" }}
        transition={{ duration: 0.4, delay }}
      >
        {children}
      </motion.div>
    );
  }

  const variants: Variants = {
    hidden: { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
    >
      {children}
    </MotionTag>
  );
}
