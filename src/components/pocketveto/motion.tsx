'use client';

/**
 * PocketVeto — motion primitives.
 *
 * The house rules:
 *  1. Transform + opacity only (composited; no layout thrash).
 *  2. One restrained spring; the ease is an expo-out settle.
 *  3. Everything collapses to instant under prefers-reduced-motion.
 *
 * Implementation notes: reduced-motion is read through
 * useSyncExternalStore (the canonical external-store subscribe — no
 * state is set inside effects), the count-up only writes state from
 * rAF callbacks, and Reveal derives visibility instead of setting it
 * synchronously on mount.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, ReactNode } from 'react';

function subscribe(onChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );
}

/**
 * Animates toward `target` whenever it changes, easing out from the last
 * displayed value — so the $ ticker counts up on load and glides when an
 * item is added, vetoed, or removed. Returns the target immediately when
 * motion is reduced.
 */
export function useCountUp(target: number, duration = 750): number {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    if (reduced) {
      currentRef.current = target;
      return;
    }
    const from = currentRef.current;
    if (from === target) return;

    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = from + (target - from) * eased;
      currentRef.current = value;
      setDisplay(value);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        currentRef.current = target;
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);

  return reduced ? target : display;
}

/**
 * Reveals children with a rise the first time they scroll into view.
 * Visibility is derived: shown once the observer fires, immediately when
 * motion is reduced, or immediately when IntersectionObserver is
 * unavailable.
 */
export function Reveal({
  children,
  delay = 0,
  className = '',
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [observed, setObserved] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || typeof IntersectionObserver === 'undefined') return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setObserved(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const shown = observed || reduced || typeof IntersectionObserver === 'undefined';

  return (
    <div
      ref={ref}
      className={`${className} ${shown ? 'pv-rise' : 'opacity-0'}`}
      style={shown ? { ...style, animationDelay: `${delay}ms` } : style}
    >
      {children}
    </div>
  );
}
