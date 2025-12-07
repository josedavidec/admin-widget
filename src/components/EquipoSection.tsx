import { motion } from "motion/react";

export default function EquipoSection() {
  const imagenes = [
    "/equipo/JUAN-CAMILO.webp",
    "/equipo/JHONATHAN.jpg",
    "/equipo/ORIANA.webp",
    "/equipo/CAMILO-GARCIA.jpg",
    "/equipo/SARA-HENAO.webp",
    "/equipo/JOSE.webp",
  ];

  return (
    <section className="bg-black py-20 text-center overflow-hidden">
      {/* Título animado */}
      <motion.h2
        className="text-3xl font-semibold mb-12 text-white"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
      >
        EQUIPO
      </motion.h2>

      {/* Contenedor animado con stagger */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto px-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.15, // animación escalonada
            },
          },
        }}
      >
        {imagenes.map((img, i) => (
          <motion.img
            key={i}
            src={img}
            alt={`Miembro ${i + 1}`}
            className="w-full h-auto rounded-xl object-cover brightness-80 hover:scale-105 hover:brightness-100 transition-all duration-300"
            variants={{
              hidden: { opacity: 0, y: 60, scale: 0.9, rotate: 2 },
              visible: { opacity: 1, y: 0, scale: 1, rotate: 0 },
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            loading="lazy"
          />
        ))}
      </motion.div>
    </section>
  );
}
