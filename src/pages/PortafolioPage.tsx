import { useState, lazy, Suspense } from "react";
import { motion } from "motion/react";
const ProyectoModal = lazy(() => import("@/components/ProyectoModal"));
import { proyectos } from "@/data/Proyectos";
import SEO from "@/components/SEO";
import ImageWithLoader from "@/components/ui/ImageWithLoader";

export default function PortafolioPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="bg-black text-white min-h-screen pt-28 px-10">
      <SEO
        title="Portafolio"
        description="Explora nuestro portafolio de proyectos en marketing digital, producción audiovisual, diseño gráfico y desarrollo web."
        keywords="portafolio, proyectos, marketing, diseño, web, video, Ethan Comunicaciones"
        url="https://www.agenciaethancomunicaciones.com/portafolio"
      />
      <div className="flex justify-center mb-6">
        <motion.a
          href="https://www.behance.net/ethancomunic"
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="px-6 py-2 border border-gray-400 rounded-full text-sm tracking-wide font-light hover:border-white transition-colors"
        >
          Ver en Behance
        </motion.a>
      </div>
      <motion.h1
        initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-4xl mb-12 font-light tracking-wide text-center"
      >
        Portafolio
      </motion.h1>

      {/* GRID ANIMADO */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
      >
        {proyectos.map((p, i) => (
          <motion.div
            key={p.id}
            onClick={() => setActiveIndex(i)}
            className="cursor-pointer group rounded-xl overflow-hidden border border-gray-700"
            variants={{
              hidden: {
                opacity: 0,
                y: 40,
                scale: 0.95,
                filter: "blur(6px)",
              },
              show: {
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                transition: {
                  duration: 0.6,
                  ease: "easeOut",
                },
              },
            }}
            whileHover={{
              scale: 1.03,
              transition: { duration: 0.3, ease: "easeOut" },
            }}
          >
            <ImageWithLoader
              src={p.portada}
              alt={p.titulo}
              containerClassName="w-full h-64"
              className="h-full object-cover"
              whileHover={{ scale: 1.12 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />

            <div className="p-5">
              <h2 className="text-xl mb-1 font-light">{p.titulo}</h2>
              <p className="text-gray-400 uppercase text-xs tracking-wide">
                {p.categoria}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* MODAL */}
      {activeIndex !== null && (
        <Suspense
          fallback={
            <div className="text-center text-gray-400">Cargando...</div>
          }
        >
          <ProyectoModal
            proyectos={proyectos}
            indexActual={activeIndex}
            setIndexActual={setActiveIndex}
            cerrar={() => setActiveIndex(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
