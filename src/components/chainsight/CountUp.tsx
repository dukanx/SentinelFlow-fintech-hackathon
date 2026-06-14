import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value up to `target` with an ease-out
 * curve. Respects prefers-reduced-motion (jumps straight to the value).
 */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    let raf = 0;
    let start: number | null = null;

    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setValue(from + (target - from) * eased);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export function CountUp({
  value,
  duration,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const animated = useCountUp(value, duration);
  return <span className={className}>{Math.round(animated)}</span>;
}
