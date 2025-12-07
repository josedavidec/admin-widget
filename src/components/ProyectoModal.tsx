import React from "react";
import { motion } from "motion/react";
import type { Proyecto, BloqueContenido } from "@/data/Proyectos";
import ImageWithLoader from "@/components/ui/ImageWithLoader";

type Props = {
  proyectos: Proyecto[];
  indexActual: number;
  setIndexActual: React.Dispatch<React.SetStateAction<number | null>>;
  cerrar: () => void;
};

export default function ProyectoModal({
  proyectos,
  indexActual,
  setIndexActual,
  cerrar,
}: Props) {
  const p = proyectos[indexActual];

  const next = () =>
    setIndexActual((prev) => {
      const i = typeof prev === "number" ? prev : 0;
      return i + 1 >= proyectos.length ? 0 : i + 1;
    });

  const prev = () =>
    setIndexActual((prev) => {
      const i = typeof prev === "number" ? prev : 0;
      return i - 1 < 0 ? proyectos.length - 1 : i - 1;
    });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-999 flex items-center justify-center"
    >
      {/* FONDO CLIC CERRAR */}
      <div className="absolute inset-0" onClick={cerrar} />

      {/* FLECHAS FIJAS */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-4xl bg-black/50 px-3 py-1 rounded-full z-2000"
      >
        ‹
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-4xl bg-black/50 px-3 py-1 rounded-full z-2000"
      >
        ›
      </button>
      <motion.div
        key={p.id}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-[#0d0d0d] w-[95vw] max-w-7xl h-[90vh] 
             rounded-none border border-gray-800 flex flex-col overflow-hidden"
      >
        {/* --- HEADER --- */}
        <div className="flex-none px-8 py-4 border-b border-gray-800 flex justify-between items-center bg-[#0d0d0d] z-10">
          <div className="flex items-center gap-4">
            <span className="border border-white/30 px-2 py-0.5 rounded text-[10px] tracking-widest uppercase text-gray-300">
              Portafolio
            </span>
            <span className="text-sm tracking-[0.2em] font-light text-gray-400 uppercase">
              Ethan Comunicaciones
            </span>
          </div>
          {/* Close button inside header for cleaner look */}
          <button
            onClick={cerrar}
            className="text-gray-400 hover:text-white transition-colors text-sm uppercase tracking-widest"
          >
            Cerrar [X]
          </button>
        </div>

        {/* --- CONTENIDO SCROLLABLE --- */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto flex flex-col gap-12">
            {/* Descripción y Herramientas (Ahora más sutil) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-800/50 pb-8">
              <div className="md:col-span-2">
                <p className="text-gray-300 font-light leading-relaxed text-lg">
                  {p.descripcion}
                </p>
              </div>
              <div className="flex flex-wrap content-start gap-2">
                {p.herramientas.map((h: string) => (
                  <span
                    key={h}
                    className="px-3 py-1 text-xs rounded-full bg-white/5 border border-gray-700 text-gray-400"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* Bloques de Contenido */}
            <div className="flex flex-col gap-8">
              {p.bloques.map((bloque: BloqueContenido, i: number) => {
                if (bloque.tipo === "imagen") {
                  return (
                    <div
                      key={i}
                      className="border border-gray-800 rounded-xl overflow-hidden"
                    >
                      <ImageWithLoader
                        src={bloque.data[0]}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                }

                if (bloque.tipo === "galeria") {
                  return (
                    <div key={i} className="flex flex-col gap-5">
                      {bloque.data.map((img: string, j: number) => (
                        <div
                          key={j}
                          className="border border-gray-800 rounded-xl overflow-hidden"
                        >
                          <ImageWithLoader
                            src={img}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  );
                }

                if (bloque.tipo === "carrete") {
                  const carrete = bloque.data;
                  return (
                    <div key={i} className="rounded-xl overflow-hidden">
                      <div
                        className={`grid gap-2 
                      ${
                        carrete.length === 1
                          ? "grid-cols-1"
                          : carrete.length === 2
                          ? "grid-cols-2"
                          : carrete.length === 3
                          ? "grid-cols-3"
                          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                      }`}
                      >
                        {carrete.map((img: string, j: number) => (
                          <div
                            key={j}
                            className="w-full rounded-xl overflow-hidden border border-gray-700 bg-black/30 p-2"
                          >
                            <ImageWithLoader
                              src={img}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (bloque.tipo === "video") {
                  const videos = bloque.data;
                  return (
                    <div
                      key={i}
                      className={`grid gap-15 px-10 ${
                        videos.length === 3
                          ? "grid-cols-1 sm:grid-cols-3"
                          : "grid-cols-2"
                      } w-full`}
                    >
                      {videos.map((url: string, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-xl overflow-hidden border border-gray-800 p-2"
                        >
                          <video
                            src={url}
                            controls
                            className="w-full aspect-9/16 rounded-xl"
                          />
                        </div>
                      ))}
                    </div>
                  );
                }
                if (bloque.tipo === "videoyoutube") {
                  const videos = bloque.data;
                  return (
                    <div
                      key={i}
                      className={`grid gap-5 ${
                        videos.length === 3
                          ? "grid-cols-3"
                          : videos.length === 1
                          ? "grid-cols-1"
                          : "grid-cols-2"
                      } w-full`}
                    >
                      {videos.map((url: string, idx: number) => {
                        if (
                          url.includes("youtube.com") ||
                          url.includes("youtu.be")
                        ) {
                          return (
                            <div
                              key={idx}
                              className="rounded-xl overflow-hidden border border-gray-800 p-2"
                            >
                              <div className="w-full aspect-video rounded-xl overflow-hidden">
                                <iframe
                                  src={url}
                                  title="YouTube video player"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                  className="w-full h-full"
                                ></iframe>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={idx}
                              className="rounded-xl overflow-hidden border border-gray-800 p-2"
                            >
                              <video
                                src={url}
                                controls
                                className="w-full aspect-9/16 rounded-xl"
                              />
                            </div>
                          );
                        }
                      })}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="flex-none px-8 py-4 border-t border-gray-800 flex justify-between items-end bg-[#0d0d0d] z-10">
          <div className="hidden md:block">
            <span className="text-xs text-gray-500 tracking-widest uppercase">
              Proyecto Profesional
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="border border-white px-3 py-1 rounded-full text-xs tracking-widest uppercase text-white">
              {p.titulo}
            </span>
            <span className="text-sm tracking-widest font-light text-gray-400 uppercase">
              {p.categoria}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
