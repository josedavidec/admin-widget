import React, { useState } from "react";
import { FaRegPlayCircle } from "react-icons/fa";
import { motion } from "motion/react";

interface TestimonioProps {
  videoId: string;
  portada: string;
  title: string;
  delay: number; // 👈 agregamos delay por video
}

const Testimonio: React.FC<TestimonioProps> = ({
  videoId,
  portada,
  title,
  delay,
}) => {
  const [reproducir, setReproducir] = useState(false);

  return (
    <motion.div
      onClick={() => setReproducir(true)}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.2 }}
      className="bg-black border border-gray-800 rounded-2xl overflow-hidden cursor-pointer max-w-[320px] w-full mx-auto shadow-md"
    >
      <div className="relative pb-[177.78%] bg-gray-900 group">
        {reproducir ? (
          <iframe
            src={`https://player.vimeo.com/video/${videoId}?autoplay=1&muted=0&title=0&byline=0&portrait=0`}
            className="absolute top-0 left-0 w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={title}
          ></iframe>
        ) : (
          <>
            <motion.img
              src={portada}
              alt={`Portada del testimonio: ${title}`}
              className="absolute top-0 left-0 w-full h-full object-cover filter brightness-90 group-hover:brightness-110 transition-all duration-500"
              loading="lazy"
              decoding="async"
              width={320}
              height={570}
              sizes="(min-width: 768px) 320px, 85vw"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0.8 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <FaRegPlayCircle className="text-white text-6xl drop-shadow-lg" />
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default function TestimoniosSection() {
  const videos = [
    {
      id: "1132992189",
      portada: "/testimonios/complexportada.webp",
      title: "Complex Ditaires",
    },
    {
      id: "1132992197",
      portada: "/testimonios/divaportada.webp",
      title: "Dra. Diva Marín",
    },
    {
      id: "1132992215",
      portada: "/testimonios/xtremeportada.webp",
      title: "Xtreme Force",
    },
  ];

  return (
    <section className="py-20 bg-fondobody text-center text-white overflow-hidden">
      <motion.h2
        className="text-3xl font-semibold mb-12 tracking-wide"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        TESTIMONIOS
      </motion.h2>

      <div className="flex flex-wrap justify-center gap-10 max-w-6xl mx-auto">
        {videos.map((v, index) => (
          <Testimonio
            key={v.id}
            videoId={v.id}
            portada={v.portada}
            title={v.title}
            delay={index * 0.4} // 👈 cada testimonio entra 0.4s después del anterior
          />
        ))}
      </div>
    </section>
  );
}
