import { motion } from "motion/react";
import { Link } from "react-router-dom";

export default function ServiciosSection() {
  const cardTransition = {
    duration: 0.6,
    ease: [0.16, 1, 0.3, 1],
  } as const;

  const textContainerVariants = {
    initial: { opacity: 0, y: 24, scale: 1.06, filter: "blur(16px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  } as const;

  const textVariants = {
    initial: {
      opacity: 0,
      filter: "blur(18px)",
      rotateX: 18,
      rotateY: -6,
      y: 14,
    },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      rotateX: 0,
      rotateY: 0,
      y: 0,
    },
  } as const;

  const textTransition = {
    duration: 0.95,
    ease: [0.19, 1, 0.22, 1],
  } as const;

  const servicios = [
    {
      img: "/servicios/administracion-redes-sociales.webp",
      link: "/brochure#diseno-branding",
      text: "Administración de redes sociales",
    },
    {
      img: "/servicios/fotografia-video-profesional.webp",
      link: "/brochure#produccion-audiovisual",
      text: "Fotografía & vídeo profesional",
    },
    {
      img: "/servicios/diseno-grafico.webp",
      link: "/brochure#fotografia",
      text: "Diseño Gráfico",
    },
    {
      img: "/servicios/creacion-de-marca.webp",
      link: "/brochure#transmisiones",
      text: "Creación de marca",
    },
    {
      img: "/servicios/desarrollo-apps-paginas-web.png",
      link: "/brochure#desarrollo-web",
      text: "Desarrollo de apps & páginas web",
    },
    {
      img: "/servicios/pauta-digital.webp",
      link: "/brochure#pauta-digital",
      text: "Pauta Digital",
    },
    {
      img: "/servicios/logistica-de-eventos.png",
      link: "/brochure#publicidad-exterior",
      text: "Logística de eventos",
    },
  ];

  const pyramidRows: Array<typeof servicios> = [
    servicios.slice(0, 1),
    servicios.slice(1, 3),
    servicios.slice(3, 7),
  ];

  let animationIndex = 0;
  return (
    <section className="py-24  text-center overflow-hidden">
      <h2 className="text-2xl font-semibold mb-16 text-white tracking-wide">
        NUESTROS SERVICIOS
      </h2>

      <div className="flex flex-col items-center gap-12 max-w-6xl mx-auto px-6">
        {pyramidRows.map((row, rowIndex) => {
          const rowLength = row.length;
          const rowClass =
            rowLength === 1
              ? "grid grid-cols-1 place-items-center gap-10 w-full max-w-sm"
              : rowLength === 2
              ? "grid grid-cols-1 sm:grid-cols-2 place-items-center gap-10 w-full max-w-3xl"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 place-items-center gap-10 w-full";

          return (
            <div key={`servicios-row-${rowIndex}`} className={`${rowClass}`}>
              {row.map((item) => {
                const delay = animationIndex * 0.1;
                const card = (
                  <motion.div
                    key={item.text}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ ...cardTransition, delay }}
                    className="relative group overflow-hidden rounded-3xl shadow-lg"
                  >
                    <Link to={item.link} className="block h-full w-full">
                      <div className="relative">
                        <motion.img
                          src={item.img}
                          alt={`Representación del servicio ${item.text}`}
                          className="h-40 w-full object-contain transition-transform duration-500 group-hover:scale-105 sm:h-52 md:h-60"
                          loading="lazy"
                          decoding="async"
                          whileHover={{ scale: 1.05 }}
                        />

                        <div className="absolute inset-0 bg-black/0 transition-all duration-500 group-hover:bg-black/10" />
                      </div>

                      <motion.div
                        className="px-4 pt-3 text-center"
                        variants={textContainerVariants}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, amount: 0.35 }}
                        transition={{ ...textTransition, delay: 0.12 }}
                      >
                        <motion.p
                          className="text-xl font-black text-white uppercase font-['MADE_TOMMY'] drop-shadow-[0_8px_22px_rgba(0,0,0,0.75)] sm:text-2xl"
                          variants={textVariants}
                          initial="initial"
                          whileInView="animate"
                          viewport={{ once: true, amount: 0.35 }}
                          transition={{ ...textTransition, delay: 0.24 }}
                        >
                          {item.text}
                        </motion.p>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
                animationIndex += 1;
                return card;
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
