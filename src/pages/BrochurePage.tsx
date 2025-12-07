import { useLayoutEffect } from "react";
import { motion } from "motion/react";
import { useTranslation, Trans } from "react-i18next";
import SEO from "@/components/SEO";
// Scroll gestionado globalmente por ScrollManager
import ContactForm from "@/components/brochure/ContactForm";
import ServiceCard from "@/components/brochure/ServiceCard";
import TeamSection from "@/components/brochure/TeamSection";

export default function BrochurePage() {
  const { t } = useTranslation();
  // Scroll gestionado globalmente por ScrollManager en MainLayout

  // Helper para obtener arrays de traducción de forma segura
  const getList = (key: string) => {
    const items = t(key, { returnObjects: true });
    return Array.isArray(items) ? (items as string[]) : [];
  };

  // Scroll al inicio al montar el componente para evitar ver el footer antes de tiempo
  useLayoutEffect(() => {
    // Desactivar restauración automática del navegador para evitar el salto inicial
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    return () => {
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "auto";
      }
    };
  }, []);

  // Unified animation variants for cleaner, consistent motion
  const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.44 },
    },
  };

  type StreamingPlan = {
    id: string;
    label: string;
    price: string;
  };

  type WebPlan = {
    id: string;
    label: string;
    price: string;
    features?: string[];
  };

  type OutdoorPrice = {
    label: string;
    value: string;
  };

  type OutdoorPlan = {
    id: string;
    label: string;
    prices: OutdoorPrice[];
  };

  const streamingPlans: StreamingPlan[] = [
    {
      id: "1h",
      label: t("brochure.services.streaming.pricing.1h"),
      price: "$2'000.000",
    },
    {
      id: "2h",
      label: t("brochure.services.streaming.pricing.2h"),
      price: "$2'500.000",
    },
    {
      id: "3h",
      label: t("brochure.services.streaming.pricing.3h"),
      price: "$3'000.000",
    },
  ];

  const webPlansRaw = t("brochure.services.web.plans", {
    returnObjects: true,
  }) as unknown;
  const webPlans: WebPlan[] = Array.isArray(webPlansRaw)
    ? (webPlansRaw as WebPlan[])
    : [];

  const outdoorPlansRaw = t("brochure.services.outdoor.plans", {
    returnObjects: true,
  }) as unknown;
  const outdoorPlans: OutdoorPlan[] = Array.isArray(outdoorPlansRaw)
    ? (outdoorPlansRaw as OutdoorPlan[])
    : [];

  return (
    <div className="bg-linear-to-b from-black via-[#040617] to-black text-white min-h-screen pt-28 px-6 md:px-16">
      <SEO
        title={t("brochure.seo.title")}
        description={t("brochure.seo.description")}
        keywords={t("brochure.seo.keywords")}
        url="https://www.agenciaethancomunicaciones.com/brochure"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 text-center"
      >
        <div className="inline-block mb-4 px-3 py-1 rounded-full bg-white/5 text-sm text-white/80 tracking-widest">
          {t("brochure.header.agencyName")}
        </div>

        <h1 className="leading-tight mx-auto max-w-4xl text-center">
          <div className="text-3xl md:text-5xl lg:text-7xl font-extrabold uppercase bg-linear-to-b from-white via-slate-300 to-slate-500 text-transparent bg-clip-text">
            {t("brochure.header.title.line1")}
          </div>
          <div className="text-5xl md:text-[4.6rem] lg:text-[7rem] font-extrabold uppercase bg-linear-to-b from-white via-slate-200 to-slate-400 text-transparent bg-clip-text">
            {t("brochure.header.title.line2")}
          </div>
          <div className="text-xl md:text-[2rem] lg:text-5xl font-extrabold uppercase bg-linear-to-b from-slate-300 via-slate-100 to-slate-300 text-transparent bg-clip-text">
            {t("brochure.header.title.line3")}
          </div>
        </h1>
      </motion.div>

      <div className="max-w-3xl mx-auto text-center mb-8">
        <div className="mt-6 flex items-center justify-center gap-3">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 rounded-full shadow-lg"
          >
            {t("brochure.header.cta")}
          </a>
          <a
            href="/Brochure-Actualizado-2024.pdf"
            className="underline text-gray-300"
          >
            {t("brochure.header.downloadPdf")}
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto text-gray-200 leading-relaxed space-y-8 py-12">
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className=""
        >
          <h2 className="text-2xl font-semibold mb-3">
            {t("brochure.about.title")}
          </h2>
          <motion.p variants={itemVariants} className="">
            <Trans i18nKey="brochure.about.description">
              La <strong>Agencia Ethan Comunicaciones</strong> cuenta con amplia
              trayectoria, un equipo humano calificado y experiencia en el
              mercado de las comunicaciones y los medios. Con domicilio en la
              ciudad de Itagüí, Antioquia, tenemos altas expectativas de ser una
              de las agencias líderes en comunicaciones en el Valle de Aburrá.
              Nos caracterizamos por facilitar los procesos de nuestras marcas
              aliadas para aportar al cumplimiento de sus objetivos comerciales
              y digitales en el mercado.
            </Trans>
          </motion.p>
        </motion.section>

        <TeamSection />

        {/* CTA banner before services */}
        <div className="max-w-4xl mx-auto my-6">
          <div className="bg-linear-to-r from-slate-900/60 to-black/40 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <div className="text-sm text-indigo-300 uppercase tracking-wider">
                {t("brochure.plansBanner.subtitle")}
              </div>
              <div className="text-xl md:text-2xl font-semibold">
                {t("brochure.plansBanner.title")}
              </div>
            </div>
            <div className="flex gap-3">
              <a
                className="px-4 py-2 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-md text-white shadow"
                href="#contact"
              >
                {t("brochure.plansBanner.ctaQuote")}
              </a>
              <a
                className="px-4 py-2 border border-white/10 rounded-md text-gray-200"
                href="#services"
              >
                {t("brochure.plansBanner.ctaServices")}
              </a>
            </div>
          </div>
        </div>

        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.12 }}
          className="space-y-6"
        >
          <motion.h2
            variants={itemVariants}
            className="text-2xl font-semibold mb-3"
          >
            {t("brochure.services.title")}
          </motion.h2>

          <div className="space-y-6">
            <ServiceCard
              id="diseno-branding"
              title={t("brochure.services.branding.title")}
              badge={t("brochure.services.branding.badge")}
            >
              <motion.ul
                variants={itemVariants}
                className="list-disc list-inside text-gray-300 mb-4 space-y-1 mt-3"
              >
                {getList("brochure.services.branding.items").map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </motion.ul>
            </ServiceCard>

            <ServiceCard
              id="produccion-audiovisual"
              title={t("brochure.services.audiovisual.title")}
            >
              <motion.ul
                variants={itemVariants}
                className="list-disc list-inside text-gray-300 mb-4 space-y-1 mt-3"
              >
                {getList("brochure.services.audiovisual.items").map(
                  (item, i) => (
                    <li key={i}>{item}</li>
                  )
                )}
              </motion.ul>
            </ServiceCard>

            <ServiceCard
              id="fotografia"
              title={t("brochure.services.photography.title")}
            >
              <div className="grid gap-4 text-gray-300 mb-4 mt-3 md:grid-cols-3">
                <div className="bg-white/6 p-5 rounded-xl border border-white/10 hover:border-orange-500/40 transition-colors duration-300">
                  <div className="text-white font-semibold tracking-wide">
                    {t("brochure.services.photography.birthday.title")}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-orange-400">
                      {t("brochure.services.photography.birthday.price")}
                    </span>
                    <span className="text-xs bg-orange-500/10 text-orange-300 px-2 py-0.5 rounded-full">
                      {t("brochure.services.photography.birthday.badge")}
                    </span>
                  </div>
                  <ul className="mt-4 text-sm text-gray-300 space-y-1 list-disc list-inside leading-relaxed">
                    {getList(
                      "brochure.services.photography.birthday.items"
                    ).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white/6 p-5 rounded-xl border border-white/10 hover:border-orange-500/40 transition-colors duration-300">
                  <div className="text-white font-semibold tracking-wide">
                    {t("brochure.services.photography.product.title")}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-orange-400">
                      {t("brochure.services.photography.product.price")}
                    </span>
                    <span className="text-xs bg-orange-500/10 text-orange-300 px-2 py-0.5 rounded-full">
                      {t("brochure.services.photography.product.badge")}
                    </span>
                  </div>
                  <ul className="mt-4 text-sm text-gray-300 space-y-1 list-disc list-inside leading-relaxed">
                    {getList("brochure.services.photography.product.items").map(
                      (item, i) => (
                        <li key={i}>{item}</li>
                      )
                    )}
                  </ul>
                </div>
                <div className="bg-white/6 p-5 rounded-xl border border-white/10 hover:border-orange-500/40 transition-colors duration-300">
                  <div className="text-white font-semibold tracking-wide">
                    {t("brochure.services.photography.wedding.title")}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-orange-400">
                      {t("brochure.services.photography.wedding.price")}
                    </span>
                    <span className="text-xs bg-orange-500/10 text-orange-300 px-2 py-0.5 rounded-full">
                      {t("brochure.services.photography.wedding.badge")}
                    </span>
                  </div>
                  <ul className="mt-4 text-sm text-gray-300 space-y-1 list-disc list-inside leading-relaxed">
                    {getList("brochure.services.photography.wedding.items").map(
                      (item, i) => (
                        <li key={i}>{item}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </ServiceCard>

            <ServiceCard
              id="transmisiones"
              title={t("brochure.services.streaming.title")}
            >
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div>
                  <div className="text-gray-300">
                    <strong className="text-white block mb-2 text-lg">
                      {t("brochure.services.streaming.subtitle")}
                    </strong>
                    <ul className="list-disc list-inside space-y-1 mb-6 text-gray-300">
                      {getList("brochure.services.streaming.items").map(
                        (item, i) => (
                          <li key={i}>{item}</li>
                        )
                      )}
                    </ul>
                    <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                      {streamingPlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="flex-1 min-w-[180px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center md:text-left hover:border-orange-500/40 transition-colors duration-300"
                        >
                          <div className="text-xs uppercase tracking-wider text-gray-400">
                            {plan.label}
                          </div>
                          <div className="mt-1 text-2xl font-extrabold text-orange-400">
                            {plan.price}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <img
                    src="https://images.unsplash.com/photo-1598550476439-6847785fcea6?q=80&w=800&auto=format&fit=crop"
                    alt="Transmisión en vivo - Sala de control"
                    className="rounded-lg shadow-lg w-full h-48 object-cover bg-black/20 hover:scale-[1.02] transition-transform duration-300"
                  />
                  <img
                    src="https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800&auto=format&fit=crop"
                    alt="Transmisión en vivo - Auditorio"
                    className="rounded-lg shadow-lg w-full h-48 object-cover bg-black/20 hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
              </div>
            </ServiceCard>

            <ServiceCard
              id="desarrollo-web"
              title={t("brochure.services.web.title")}
            >
              <div className="mt-3 grid gap-4 text-gray-300 md:grid-cols-3">
                {webPlans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    variants={itemVariants}
                    className="rounded-xl border border-white/10 bg-white/6 p-5 transition-colors duration-300 hover:border-orange-500/40"
                  >
                    <div className="text-white font-semibold tracking-wide">
                      {plan.label}
                    </div>
                    <div className="mt-2 text-2xl font-extrabold text-orange-400">
                      {plan.price}
                    </div>
                    <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-gray-300 leading-relaxed">
                      {(plan.features ?? []).map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </ServiceCard>

            <ServiceCard
              id="pauta-digital"
              title={t("brochure.services.ads.title")}
            >
              <motion.p
                variants={itemVariants}
                className="text-gray-300 mb-2 mt-3"
              >
                {t("brochure.services.ads.description")}
              </motion.p>
            </ServiceCard>

            <ServiceCard
              id="publicidad-exterior"
              title={t("brochure.services.outdoor.title")}
            >
              <div className="mt-3 grid gap-4 text-gray-300 md:grid-cols-2">
                {outdoorPlans.map((plan) => (
                  <motion.div
                    key={plan.id}
                    variants={itemVariants}
                    className="rounded-xl border border-white/10 bg-white/6 p-5 transition-colors duration-300 hover:border-orange-500/40"
                  >
                    <div className="text-white font-semibold tracking-wide">
                      {plan.label}
                    </div>
                    <div className="mt-3 space-y-3">
                      {plan.prices.map((price, index) => (
                        <div
                          key={`${plan.id}-price-${index}`}
                          className="flex flex-col gap-1 rounded-lg bg-white/5 p-3"
                        >
                          <span className="text-sm text-gray-300 leading-tight">
                            {price.label}
                          </span>
                          <span className="text-xl font-extrabold text-orange-400">
                            {price.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </ServiceCard>

            <ServiceCard
              id="sonido-iluminacion"
              title={t("brochure.services.sound.title")}
            >
              <motion.p variants={itemVariants} className="text-gray-300 mb-2">
                {t("brochure.services.sound.description1")}
              </motion.p>
              <motion.p variants={itemVariants} className="text-gray-300">
                {t("brochure.services.sound.description2")}
              </motion.p>
            </ServiceCard>

            <ServiceCard
              id="asesorias"
              title={t("brochure.services.consulting.title")}
            >
              <motion.p variants={itemVariants} className="text-gray-300 mb-2">
                {t("brochure.services.consulting.description")}
              </motion.p>
            </ServiceCard>
          </div>
        </motion.section>

        <ContactForm />
      </div>
    </div>
  );
}
