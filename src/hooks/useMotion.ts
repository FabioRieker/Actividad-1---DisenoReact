import { RefObject, useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Anima un número desde su valor anterior (o 0 al montar) hasta el nuevo */
export function useCountUp(target: number, durationMs = 700): number {
  const [display, setDisplay] = useState<number>(() => (prefersReducedMotion() ? target : 0));
  const fromRef = useRef<number>(display);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(target);
      fromRef.current = target;
      return undefined;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (target - from) * eased);
      setDisplay(value);
      fromRef.current = value;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return display;
}

/** Devuelve true la primera vez que el elemento entra en pantalla */
export function useInView<T extends Element>(): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState<boolean>(
    () => prefersReducedMotion() || typeof IntersectionObserver === 'undefined'
  );

  useEffect(() => {
    if (inView || !ref.current) return undefined;
    let responded = false;
    const observer = new IntersectionObserver(
      (entries) => {
        responded = true;
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(ref.current);
    // Salvaguarda: si el observador nunca responde, el contenido no se queda invisible
    const fallback = window.setTimeout(() => {
      if (!responded) setInView(true);
    }, 1200);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [inView]);

  return [ref, inView];
}
