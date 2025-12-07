import { useEffect, useRef, useState } from "react";
import { HashLink } from "react-router-hash-link";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [allowHeroMotion, setAllowHeroMotion] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    const desktopQuery = window.matchMedia("(min-width: 768px)");

    type NavigatorConnection = {
      saveData?: boolean;
      effectiveType?: string;
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
      addListener?: (listener: () => void) => void;
      removeListener?: (listener: () => void) => void;
    };

    const connection = (
      navigator as Partial<Navigator> & {
        connection?: NavigatorConnection;
      }
    ).connection;

    const isSlowConnection = () => {
      const effectiveType = connection?.effectiveType ?? "";
      return effectiveType === "slow-2g" || effectiveType === "2g";
    };

    const evaluate = () => {
      const saveData = connection?.saveData;
      const canStream =
        !reduceMotionQuery.matches &&
        !saveData &&
        !isSlowConnection() &&
        desktopQuery.matches;
      setShouldLoadVideo(canStream);
    };

    const handleChange = () => evaluate();

    const attachMediaListener = (
      query: MediaQueryList,
      listener: () => void
    ) => {
      if (query.addEventListener) {
        query.addEventListener("change", listener);
        return () => query.removeEventListener("change", listener);
      }
      if (query.addListener) {
        query.addListener(listener);
        return () => query.removeListener(listener);
      }
      return () => undefined;
    };

    evaluate();

    const removeReduceMotion = attachMediaListener(
      reduceMotionQuery,
      handleChange
    );
    const removeDesktop = attachMediaListener(desktopQuery, handleChange);

    connection?.addEventListener?.("change", handleChange);

    return () => {
      removeReduceMotion();
      removeDesktop();
      connection?.removeEventListener?.("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (prefersReducedMotion) {
      setAllowHeroMotion(false);
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    const evaluate = () => {
      setAllowHeroMotion(desktopQuery.matches);
    };

    evaluate();

    const handleChange = () => evaluate();

    if (desktopQuery.addEventListener) {
      desktopQuery.addEventListener("change", handleChange);
      return () => desktopQuery.removeEventListener("change", handleChange);
    }

    desktopQuery.addListener?.(handleChange);
    return () => desktopQuery.removeListener?.(handleChange);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!shouldLoadVideo) return;
    const video = videoRef.current;
    if (!video) return;

    let attempts = 0;
    const maxAttempts = 20;

    const tryPlay = () => {
      if (!video) return;
      video
        .play()
        .then(() => setVideoReady(true))
        .catch(() => {
          attempts++;
          if (attempts < maxAttempts) {
            // Safari necesita que intentes varias veces
            requestAnimationFrame(tryPlay);
          } else {
            // Indica que el autoplay fue bloqueado — mostraremos un botón para reproducir
            setAutoplayBlocked(true);
          }
        });
    };

    // Esperar a que pueda reproducirse
    video.addEventListener("canplaythrough", tryPlay);

    // Intentar inmediatamente en caso que ya esté listo
    if (video.readyState >= 3) tryPlay();

    return () => {
      video.removeEventListener("canplaythrough", tryPlay);
    };
  }, [shouldLoadVideo]);

  return (
    <section className="relative w-full h-screen xl:h-[90vh] overflow-hidden bg-black">
      {/* Fondo visual */}
      <div className="absolute inset-0 z-0">
        {/* Imagen fallback */}
        <img
          alt="Equipo Agencia Ethan Comunicaciones"
          className="w-full h-full object-cover"
          decoding="async"
          fetchPriority="high"
          src="/web-equipo_1_layer.webp"
          width={1080}
          height={608}
        />

        {/* Video de fondo */}
        {shouldLoadVideo ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/web-equipo_1_layer.webp"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              videoReady ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Video de presentación de la Agencia Ethan Comunicaciones"
          >
            {/* Ordenar de menor a mayor resolución prioriza móviles lentos */}
            <source
              src="/videoequipo_405p_h265.mp4"
              type='video/mp4; codecs="hvc1"'
              media="(max-width: 767px)"
            />
            <source
              src="/videoequipo_405p_24fps.webm"
              type="video/webm"
              media="(max-width: 767px)"
            />
            <source
              src="/videoequipo_540p.webm"
              type="video/webm"
              media="(min-width: 768px) and (max-width: 1279px)"
            />
            <source
              src="/videoequipo_540p.mp4"
              type="video/mp4"
              media="(min-width: 768px) and (max-width: 1279px)"
            />
            <source
              src="/videoequipo_720p.webm"
              type="video/webm"
              media="(min-width: 1280px)"
            />
            <source
              src="/videoequipo_720p.mp4"
              type="video/mp4"
              media="(min-width: 1280px)"
            />
            Tu navegador no soporta este vídeo de fondo.
          </video>
        ) : (
          <img
            src="/web-equipo_1_layer.webp"
            alt="Equipo creativo de Agencia Ethan Comunicaciones"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            fetchPriority="high"
            width={1080}
            height={608}
          />
        )}

        {/* Botón accesible para reproducir si el autoplay fue bloqueado */}
        {autoplayBlocked && shouldLoadVideo && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <button
              onClick={async () => {
                const v = videoRef.current;
                if (!v) return;
                try {
                  await v.play();
                  setVideoReady(true);
                  setAutoplayBlocked(false);
                } catch {
                  // no hacemos console.log en producción
                  setAutoplayBlocked(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const v = videoRef.current;
                  if (v)
                    v.play()
                      .then(() => setVideoReady(true))
                      .catch(() => setAutoplayBlocked(true));
                }
              }}
              aria-label="Reproducir video de portada"
              className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm rounded-full p-6 md:p-8 flex items-center justify-center border border-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 md:h-10 md:w-10"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        )}

        {/* Overlay */}
        {/* Overlay general (oscurece un poco el video) */}
        <div className="absolute inset-0 bg-fondobody/50" />

        {/* Gradiente inferior para el scroll */}
        <div className="absolute bottom-0 left-0 w-full h-100 bg-linear-to-t from-fondobody to-transparent pointer-events-none" />
      </div>

      {/* Contenido Hero Rediseñado */}
      <div className="relative z-10 flex flex-col justify-center items-center text-center h-full px-8 md:px-24 py-20">
        <motion.h1
          initial={
            allowHeroMotion ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={
            allowHeroMotion
              ? { duration: 1, ease: "easeOut" }
              : { duration: 0.01 }
          }
          className="text-4xl md:text-[4rem] font-bold text-white md:leading-13 tracking-tight max-w-2xl mb-4 text-center drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)]"
        >
          <span className="block text-3xl md:text-7xl">Agencia Ethan</span>
          <span>Comunicaciones</span>
        </motion.h1>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={
          allowHeroMotion ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={
          allowHeroMotion
            ? {
                delay: 1.2,
                duration: 0.6,
                repeat: Infinity,
                repeatType: "mirror",
              }
            : { duration: 0.01 }
        }
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-white/80 z-50 pointer-events-auto"
      >
        <HashLink
          smooth
          to="#marcas"
          className="text-sm tracking-widest font-regular pointer-events-auto hover:text-white transition-colors"
        >
          {t("hero.scroll")}
        </HashLink>
        <div className="w-0.5 h-8 bg-white/50 mt-2 rounded-full mx-auto" />
      </motion.div>
    </section>
  );
}
