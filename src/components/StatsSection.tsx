import { motion, useInView } from "motion/react";
import CountUp from "react-countup";
import { useRef } from "react";

export default function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const stats = [
    { num: 150, text: "Clientes satisfechos", suffix: "+" },
    { num: 180, text: "Proyectos terminados", suffix: "+" },
    { num: 6, text: "Años de experiencia", suffix: "+" },
  ];

  return (
    <section
      ref={ref}
      className="relative py-20 bg-linear-to-t from-fondobody via-fondobody/95 to-transparent"
    >
      <motion.div
        className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-center gap-12"
        initial={{ opacity: 0, y: 60 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {stats.map((item, i) => (
          <motion.div
            key={i}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.25, duration: 0.6 }}
          >
            <p className="text-5xl md:text-6xl font-extrabold text-naranjavivo tracking-tight">
              {isInView && (
                <CountUp
                  start={0}
                  end={item.num}
                  duration={2.5}
                  suffix={item.suffix}
                />
              )}
            </p>
            <p className="text-lg md:text-xl text-gray-300 mt-2 font-medium">
              {item.text}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
