"use client";

import React, { useRef, useEffect, useState, ReactNode, useCallback } from "react";

interface TextfitProps {
  children: ReactNode;
  id?: string;
  className?: string;
  mode?: "single" | "multi";
  min?: number;
  max?: number;
  forceSingleModeWidth?: boolean;
  alignVertWithFlexbox?: boolean;
  throttle?: number;
}

/**
 * Simple Textfit replacement for React 19 compatibility.
 * Auto-sizes text to fit within its container.
 */
export function Textfit({
  children,
  id,
  className = "",
  mode = "single",
  min = 8,
  max = 100,
}: TextfitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(max);
  const [recalcTrigger, setRecalcTrigger] = useState(0);

  const calculateFontSize = useCallback(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    // Binary search for optimal font size
    let low = min;
    let high = max;
    let optimal = min;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      text.style.fontSize = `${mid}px`;

      const fits =
        mode === "single"
          ? text.scrollWidth <= container.clientWidth
          : text.scrollHeight <= container.clientHeight &&
            text.scrollWidth <= container.clientWidth;

      if (fits) {
        optimal = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    setFontSize(optimal);
  }, [min, max, mode]);

  // Main calculation effect
  useEffect(() => {
    calculateFontSize();
  }, [children, calculateFontSize, recalcTrigger]);

  // Watch for container resize (handles layout changes after dynamic import)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateFontSize();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [calculateFontSize]);

  // Recalculate after fonts load
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Check if fonts are already loaded
    if (document.fonts.status === "loaded") {
      // Still trigger a recalc after a small delay to ensure layout is stable
      const timer = setTimeout(() => setRecalcTrigger((t) => t + 1), 100);
      return () => clearTimeout(timer);
    }

    // Wait for fonts to load
    const handleFontsLoaded = () => {
      setRecalcTrigger((t) => t + 1);
    };

    document.fonts.ready.then(handleFontsLoaded);
  }, []);

  return (
    <div
      ref={containerRef}
      id={id}
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <span
        ref={textRef}
        style={{
          fontSize: `${fontSize}px`,
          whiteSpace: mode === "single" ? "nowrap" : "normal",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {children}
      </span>
    </div>
  );
}

export default Textfit;
