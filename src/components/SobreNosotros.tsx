import { motion } from "motion/react";

export default function SobreNosotros() {
  return (
    <section className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-fondobody py-10 text-center text-white">
      <div className="relative flex w-full max-w-6xl flex-col items-center px-4">
        <motion.h3
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="mb-2 text-4xl text-gray-300 md:text-6xl"
          style={{ fontFamily: "'Allura', cursive" }}
        >
          ¿Quiénes somos?
        </motion.h3>

        <div className="relative w-full py-14">
          <div
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
            aria-hidden
          >
            <div className="h-[90%] w-[90%] rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0)_0%,rgba(0,0,0,0.35)_48%,rgba(0,0,0,0.82)_78%,rgba(0,0,0,0.94)_100%)] blur-2xl" />
          </div>

          <motion.h2
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            viewport={{ once: true }}
            className="relative z-30 text-4xl font-black uppercase tracking-tight text-white md:text-6xl lg:text-8xl"
          >
            SOMOS LA CHISPA
          </motion.h2>

          <motion.h2
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            viewport={{ once: true }}
            className="relative z-30 mt-4 text-4xl font-black uppercase tracking-tight text-white md:text-6xl lg:text-8xl"
          >
            QUE <span className="text-naranjavivo">ENCIENDE</span> LA
          </motion.h2>

          <motion.h3
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: "easeOut" }}
            viewport={{ once: true }}
            className="relative z-30 mt-6 text-5xl text-white drop-shadow-lg md:text-7xl lg:text-9xl"
            style={{ fontFamily: "'Allura', cursive" }}
          >
            Revolución Creativa
          </motion.h3>
        </div>
      </div>
    </section>
  );
}
