// import { HashLink } from "react-router-hash-link";
import { motion } from "motion/react";
import { useTranslation, Trans } from "react-i18next";

export default function WhyUs() {
  const { t } = useTranslation();

  return (
    <section className="relative py-20 bg-naranjavivo text-white text-center overflow-hidden">
      {/* Capa sutil de iluminación */}
      <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-6">
        {/* Título animado */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight drop-shadow-sm"
        >
          {t("whyUs.title")}
        </motion.h2>

        {/* Texto animado */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-lg md:text-xl leading-relaxed font-sans text-white/90"
        >
          <Trans
            i18nKey="whyUs.description"
            components={{
              1: <span className="font-semibold text-white" />,
            }}
          />
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          viewport={{ once: true }}
          className="mt-10 flex flex-col items-center gap-3"
        >
          {/* CTA: dirigir al formulario de contacto */}
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 bg-black/15 hover:bg-black/25 text-white px-6 py-3 rounded-full transition-all shadow-md"
          >
            {t("whyUs.cta.primary", "Contáctanos")}
            <span aria-hidden>→</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
