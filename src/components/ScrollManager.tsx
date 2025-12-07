import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Gestor global de scroll unificado:
 * - En cambios de ruta (pathname/search) fuerza scroll al inicio.
 * - En cambios de hash, hace scroll suave al elemento si existe.
 * - Desactiva la restauración automática del navegador para evitar saltos.
 */
export default function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    // Desactivar restauración automática del navegador
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // Actualizar la variable CSS global con la altura del header
    const header = document.querySelector("header");
    const headerHeight = header?.getBoundingClientRect().height || 88;
    document.documentElement.style.setProperty(
      "--header-offset",
      `${Math.round(headerHeight + 8)}px`
    );

    // Si hay hash, intentar desplazarse al elemento correspondiente con offset y tras estabilizar layout
    if (location.hash) {
      const targetId = location.hash.replace("#", "");
      const header = document.querySelector("header");
      const offset = (header?.getBoundingClientRect().height || 80) + 8;

      let framesStable = 0;
      let lastHeight = document.body.scrollHeight;
      let rafId = 0 as number;
      let tries = 0;
      const maxTries = 160; // ~2.6s a 60fps
      let cancelled = false;
      const cleanupFns: Array<() => void> = [];
      let settleRaf: number | null = null;
      let initialAlignDone = false;

      const stopSettle = () => {
        if (settleRaf !== null) {
          cancelAnimationFrame(settleRaf);
          settleRaf = null;
        }
      };
      cleanupFns.push(stopSettle);

      const resolveElement = () =>
        (document.querySelector(`[data-section-id="${targetId}"]`) ||
          document.getElementById(targetId)) as HTMLElement | null;

      const alignToElement = (
        el: HTMLElement | null,
        options?: { forceSmooth?: boolean }
      ) => {
        if (!el || cancelled) return;
        const target = el.getBoundingClientRect().top + window.scrollY - offset;
        const nextY = Math.max(target, 0);

        const delta = Math.abs(window.scrollY - nextY);
        if (delta > 1) {
          const shouldSmooth =
            options?.forceSmooth === true || !initialAlignDone || delta > 20;
          window.scrollTo({
            top: nextY,
            left: 0,
            behavior: shouldSmooth ? "smooth" : "auto",
          });
          if (!initialAlignDone && shouldSmooth) {
            initialAlignDone = true;
          }
        }
      };

      const startSettleMonitor = (el: HTMLElement) => {
        stopSettle();

        let attempts = 0;
        let hits = 0;
        const maxAttempts = 60;
        const tolerance = 1.5;

        const verify = () => {
          if (cancelled) {
            settleRaf = null;
            return;
          }

          const delta = Math.abs(el.getBoundingClientRect().top - offset);
          if (delta <= tolerance) {
            hits += 1;
            if (hits >= 3) {
              settleRaf = null;
              return;
            }
          } else {
            hits = 0;
            alignToElement(el);
          }

          attempts += 1;
          if (attempts < maxAttempts) {
            settleRaf = requestAnimationFrame(verify);
          } else {
            settleRaf = null;
          }
        };

        settleRaf = requestAnimationFrame(verify);
      };

      const scheduleFallbacks = (el: HTMLElement) => {
        const delays = [150, 320, 680, 1200];
        delays.forEach((delay) => {
          const timeoutId = window.setTimeout(() => {
            if (cancelled) return;
            alignToElement(el, { forceSmooth: !initialAlignDone });
            startSettleMonitor(el);
          }, delay);
          cleanupFns.push(() => clearTimeout(timeoutId));
        });

        if (typeof ResizeObserver !== "undefined") {
          let pending: number | null = null;
          const observer = new ResizeObserver(() => {
            if (cancelled) return;
            if (pending !== null) {
              cancelAnimationFrame(pending);
            }
            pending = requestAnimationFrame(() => {
              alignToElement(el);
              startSettleMonitor(el);
              pending = null;
            });
          });

          observer.observe(el);
          cleanupFns.push(() => {
            observer.disconnect();
            if (pending !== null) {
              cancelAnimationFrame(pending);
            }
          });
        }
      };

      const handleElementReady = (el: HTMLElement) => {
        alignToElement(el, { forceSmooth: true });
        startSettleMonitor(el);
        scheduleFallbacks(el);
      };

      const waitAndScroll = () => {
        const currentHeight = document.body.scrollHeight;
        if (Math.abs(currentHeight - lastHeight) < 2) {
          framesStable += 1;
        } else {
          framesStable = 0;
          lastHeight = currentHeight;
        }

        const el = resolveElement();

        const stabilityThreshold = 3;
        if (framesStable >= stabilityThreshold && el) {
          handleElementReady(el);
          return;
        }

        if (!el && tries >= maxTries) {
          window.scrollTo({ top: 0, left: 0 });
          return;
        }

        tries += 1;
        rafId = requestAnimationFrame(waitAndScroll);
      };

      rafId = requestAnimationFrame(waitAndScroll);
      cleanupFns.push(() => cancelAnimationFrame(rafId));

      return () => {
        cancelled = true;
        cleanupFns.forEach((fn) => fn());
      };
    }

    // Sin hash: en cada navegación, ir al inicio
    const id = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0 });
    });

    return () => {
      cancelAnimationFrame(id);
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
}
