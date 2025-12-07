import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

import { proyectos } from "@/data/Proyectos";

const truncate = (text: string, maxLength = 190) =>
  text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;

export default function PortafolioSection() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const cards = useMemo(
    () =>
      proyectos.map((proyecto) => ({
        id: proyecto.id,
        src: proyecto.portada,
        title: proyecto.titulo,
        category: proyecto.categoria,
        description: proyecto.descripcion,
        tools: proyecto.herramientas,
      })),
    []
  );

  const slideCount = cards.length;

  const stackCards = useMemo(() => {
    if (!slideCount) return [];
    const maxVisible = Math.min(5, slideCount);

    return cards
      .map((card, index) => ({
        ...card,
        offset: (index - currentIndex + slideCount) % slideCount,
      }))
      .filter((card) => card.offset < maxVisible)
      .sort((a, b) => a.offset - b.offset);
  }, [cards, currentIndex, slideCount]);

  const activeProject = slideCount ? cards[currentIndex] : null;

  useEffect(() => {
    if (!slideCount) return;

    const id = window.setInterval(() => {
      setCurrentIndex(
        (prev) => (((prev + 1) % slideCount) + slideCount) % slideCount
      );
    }, 5000);

    return () => window.clearInterval(id);
  }, [slideCount]);

  if (slideCount === 0) {
    return null;
  }

  return (
    <section className="py-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className=" text-3xl font-semibold tracking-wide text-white md:text-4xl"
          >
            {t("portfolio", "Portafolio").toUpperCase()}
          </motion.h2>
        </div>

        <div className="mt-5 grid gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="relative w-full">
            <div className="absolute inset-0 -z-10 bg-linear-to-r from-white/10 via-white/5 to-white/10 opacity-30 blur-3xl" />

            <div
              className="relative mx-auto h-[430px] w-full max-w-2xl sm:h-[480px] lg:mx-0"
              style={{ perspective: "1700px" }}
            >
              <div className="absolute inset-0" aria-hidden>
                <div className="absolute inset-x-0 bottom-[12%] mx-auto h-48 w-[72%] rounded-full bg-linear-to-r from-white/12 via-white/8 to-white/12 opacity-60 blur-3xl sm:bottom-[10%]" />
                <div
                  className="absolute bottom-[24%] left-1/2 h-[130px] w-[130px] -translate-x-1/2 rounded-full border border-white/25 bg-white/4 blur-2xl"
                  style={{ boxShadow: "0 0 120px 40px rgba(255,255,255,0.08)" }}
                />
              </div>

              {stackCards.map((card) => {
                const baseTranslateY = 28;
                const translateY = baseTranslateY + card.offset * 18;
                const translateX = card.offset * 18;
                const translateZ = -card.offset * 48;
                const rotateX = -12;
                const rotateY = card.offset * -3.4;
                const rotateZ = -3.2 + card.offset * 1.2;
                const scale = 1 - card.offset * 0.048;
                const blur = card.offset >= 4 ? (card.offset - 3) * 1.2 : 0;
                const shadowAlpha = 0.6 - card.offset * 0.12;
                const isActive = card.offset === 0;

                const containerAnimate = {
                  x: translateX,
                  z: translateZ,
                  rotateX,
                  rotateY,
                  boxShadow: `0 ${34 + card.offset * 16}px ${
                    88 + card.offset * 28
                  }px -34px rgba(8,8,8,${Math.max(shadowAlpha, 0.18)})`,
                } as const;

                const floatingOffset = translateY - 10;
                const activeScale = scale + 0.012;

                const animate = isActive
                  ? {
                      ...containerAnimate,
                      y: [translateY, floatingOffset, translateY],
                      rotateZ: [-0.9, 0.3, -0.9],
                      scale: [scale, activeScale, scale],
                    }
                  : {
                      ...containerAnimate,
                      y: translateY,
                      rotateZ,
                      scale,
                    };

                const transition = isActive
                  ? {
                      duration: 7,
                      repeat: Infinity,
                      repeatType: "mirror" as const,
                      ease: "easeInOut" as const,
                    }
                  : {
                      type: "spring" as const,
                      stiffness: 220,
                      damping: 28,
                      mass: 0.6,
                    };

                return (
                  <div
                    key={card.id}
                    className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
                    style={{ zIndex: 40 - card.offset }}
                  >
                    <motion.div
                      className="relative w-[min(70vw,15rem)] overflow-hidden rounded-3xl border border-white/12 bg-black/65 shadow-[0px_32px_80px_-32px_rgba(0,0,0,0.78)] backdrop-blur"
                      style={{
                        filter: `blur(${blur}px)`,
                        aspectRatio: "63 / 88",
                      }}
                      animate={animate}
                      transition={transition}
                      initial={{ y: 48, scale: 0.9, rotateZ: -12 }}
                    >
                      <motion.img
                        src={card.src}
                        alt={card.title}
                        loading="lazy"
                        draggable={false}
                        className="h-full w-full object-cover"
                        initial={false}
                      />

                      {isActive && (
                        <motion.div
                          aria-hidden
                          className="absolute -right-12 -top-12 h-28 w-28 rounded-full border border-white/20 bg-linear-to-tr from-white/20 via-transparent to-white/5 blur-lg"
                          animate={{ scale: [1, 1.12, 1] }}
                          transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}

                      <div className="absolute inset-0 bg-linear-to-tr from-white/18 via-transparent to-transparent mix-blend-screen" />
                      <div className="absolute inset-0 bg-black/25" />

                      <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/15 bg-black/55 px-5 py-4 text-left shadow-[0px_20px_45px_-25px_rgba(0,0,0,0.85)]">
                        <span className="text-[0.68rem] font-medium uppercase tracking-[0.32em] text-white/50">
                          {t("portfolio.cardLabel", "Proyecto destacado")}
                        </span>
                        <p className="mt-2 text-lg font-semibold leading-tight text-white">
                          {card.title}
                        </p>
                      </div>

                      <div className="pointer-events-none absolute -left-10 -right-10 -bottom-14 h-32 rounded-[50%] bg-black/45 blur-3xl" />
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>

          <motion.div
            className="flex w-full max-w-4xl flex-col gap-6 rounded-4xl border border-white/10 bg-white/3 p-8 text-left shadow-[0px_32px_90px_-40px_rgba(0,0,0,0.85)] backdrop-blur-lg"
            initial={{ opacity: 0, y: 38, filter: "blur(14px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {activeProject && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.32em] text-white/60">
                  <span className="h-px w-10 bg-linear-to-r from-transparent via-white/40 to-white/70" />
                  {activeProject.category}
                  <span className="h-px w-10 bg-linear-to-l from-transparent via-white/40 to-white/70" />
                </div>
                <h3 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">
                  {activeProject.title}
                </h3>
                <p className="max-w-xl text-sm text-white/70 sm:text-base">
                  {truncate(activeProject.description, 220)}
                </p>
                {activeProject.tools?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {activeProject.tools.map((tool) => (
                      <span
                        key={`${activeProject.id}-${tool}`}
                        className="rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.2em] text-white/70"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-start sm:gap-5">
              <Link
                to="/portafolio"
                className="group relative flex w-full max-w-xs items-center justify-center overflow-hidden rounded-full border border-transparent bg-white px-8 py-3 text-sm font-medium tracking-wide text-black shadow-[0px_25px_60px_-20px_rgba(255,255,255,0.55)] transition-all duration-300 hover:shadow-[0px_32px_70px_-18px_rgba(255,255,255,0.65)] sm:w-auto"
              >
                <span className="absolute inset-0 bg-linear-to-r from-white via-white to-gray-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center gap-3">
                  {t("portfolio.viewAllShort", "Ver portafolio")}
                  <span className="-translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                    &gt;
                  </span>
                </span>
              </Link>
              <Link
                to="/brochure"
                className="group relative flex w-full max-w-xs items-center justify-center overflow-hidden rounded-full border border-white/60 px-8 py-3 text-sm font-medium tracking-wide text-white shadow-[0px_25px_60px_-25px_rgba(255,255,255,0.45)] transition-all duration-300 hover:bg-white hover:text-black sm:w-auto"
              >
                <span className="absolute inset-0 bg-linear-to-r from-white/18 via-white/8 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center gap-3">
                  {t("brochure.downloadShort", "Brochure PDF")}
                  <span className="-translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                    &gt;
                  </span>
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
