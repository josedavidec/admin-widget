import {
  forwardRef,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { motion, useInView } from "motion/react";
// import { useScrollToHash } from "@/hooks/useScrollToHash";
import HeroVideo from "@/components/HeroVideo";
import BrandSlider from "@/components/BrandSlider";
import WhatsAppButton from "@/components/WhatsAppButton";
import StatsSection from "@/components/StatsSection";
import ServiciosSection from "@/components/ServiciosSection";
import SEO from "@/components/SEO";
import { Helmet } from "react-helmet-async";

const loadTestimonios = () => import("@/components/Testimonios");
const loadPortafolio = () => import("@/components/PortafolioSection");
const loadSobreNosotros = () => import("@/components/SobreNosotros");
const loadEquipo = () => import("@/components/EquipoSection");
const loadWhyUs = () => import("@/components/PorQueNosotros");
const loadContactForm = () => import("@/components/brochure/ContactForm");
const loadDerechos = () => import("@/components/DerechosReservados");

const TestimoniosSection = lazy(loadTestimonios);
const PortafolioSection = lazy(loadPortafolio);
const SobreNosotros = lazy(loadSobreNosotros);
const EquipoSection = lazy(loadEquipo);
const WhyUs = lazy(loadWhyUs);
const ContactForm = lazy(loadContactForm);
const DerechosReservados = lazy(loadDerechos);

type SectionKey =
  | "testimonios"
  | "portafolio"
  | "sobreNosotros"
  | "whyUs"
  | "equipo"
  | "contacto"
  | "derechos";

const SECTION_KEYS: SectionKey[] = [
  "testimonios",
  "portafolio",
  "sobreNosotros",
  "whyUs",
  "equipo",
  "contacto",
  "derechos",
];

const SECTION_LOADERS: Record<SectionKey, () => Promise<unknown>> = {
  testimonios: loadTestimonios,
  portafolio: loadPortafolio,
  sobreNosotros: loadSobreNosotros,
  whyUs: loadWhyUs,
  equipo: loadEquipo,
  contacto: loadContactForm,
  derechos: loadDerechos,
};

const SECTION_ANCHORS: Record<SectionKey, string> = {
  testimonios: "testimonios",
  portafolio: "portafolio",
  sobreNosotros: "sobre-nosotros",
  whyUs: "por-que-nosotros",
  equipo: "equipo",
  contacto: "contacto",
  derechos: "derechos",
};

const SECTION_FROM_ANCHOR: Record<string, SectionKey> = Object.entries(
  SECTION_ANCHORS
).reduce((map, [section, anchor]) => {
  map[anchor] = section as SectionKey;
  return map;
}, {} as Record<string, SectionKey>);

const DEFAULT_HEIGHT: Record<SectionKey, number> = {
  testimonios: 480,
  portafolio: 640,
  sobreNosotros: 520,
  whyUs: 520,
  equipo: 560,
  contacto: 720,
  derechos: 160,
};

const HEIGHT_STORAGE_KEY = "ethan:section-heights";

const readStoredHeights = (): Record<SectionKey, number> => {
  if (typeof window === "undefined") {
    return { ...DEFAULT_HEIGHT };
  }

  try {
    const raw = window.sessionStorage.getItem(HEIGHT_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_HEIGHT };
    }
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const restored: Record<SectionKey, number> = { ...DEFAULT_HEIGHT };
    SECTION_KEYS.forEach((key) => {
      const value = parsed[key];
      if (typeof value === "number" && value > 0) {
        restored[key] = value;
      }
    });
    return restored;
  } catch (error) {
    console.warn("Unable to restore section height cache", error);
    return { ...DEFAULT_HEIGHT };
  }
};

export default function EthanLanding() {
  const sliderRef = useRef(null);
  const isInView = useInView(sliderRef, { once: true, margin: "-100px" });

  const [loadedSections, setLoadedSections] = useState<
    Record<SectionKey, boolean>
  >({
    testimonios: false,
    portafolio: false,
    sobreNosotros: false,
    whyUs: false,
    equipo: false,
    contacto: false,
    derechos: false,
  });

  const pendingLoads = useRef<Record<SectionKey, Promise<unknown> | null>>({
    testimonios: null,
    portafolio: null,
    sobreNosotros: null,
    whyUs: null,
    equipo: null,
    contacto: null,
    derechos: null,
  });

  const requestSection = useCallback(
    (section: SectionKey) => {
      if (loadedSections[section] || pendingLoads.current[section]) {
        return;
      }

      const loader = SECTION_LOADERS[section];
      pendingLoads.current[section] = loader()
        .then(() => {
          setLoadedSections((prev) =>
            prev[section] ? prev : { ...prev, [section]: true }
          );
        })
        .catch((error) => {
          console.error(`Error loading section ${section}`, error);
        })
        .finally(() => {
          pendingLoads.current[section] = null;
        });
    },
    [loadedSections]
  );

  const [sectionHeights, setSectionHeights] = useState<
    Record<SectionKey, number>
  >(() => readStoredHeights());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(
        HEIGHT_STORAGE_KEY,
        JSON.stringify(sectionHeights)
      );
    } catch (error) {
      console.warn("Unable to persist section height cache", error);
    }
  }, [sectionHeights]);

  const registerSectionHeight = useCallback(
    (section: SectionKey, height: number) => {
      setSectionHeights((prev) => {
        const previous = prev[section];
        if (previous && Math.abs(previous - height) < 8) {
          return prev;
        }
        return { ...prev, [section]: height };
      });
    },
    []
  );

  const ensureSectionLoaded = useCallback(
    (anchor: string | null) => {
      if (!anchor) return;
      const section = SECTION_FROM_ANCHOR[anchor];
      if (section) {
        requestSection(section);
      }
    },
    [requestSection]
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleDeferredLoad = (event: Event) => {
      const { detail } = event as CustomEvent<{ id?: string | null }>;
      ensureSectionLoaded(detail?.id ?? null);
    };

    document.addEventListener("ethan:navigate-to-section", handleDeferredLoad);

    return () => {
      document.removeEventListener(
        "ethan:navigate-to-section",
        handleDeferredLoad
      );
    };
  }, [ensureSectionLoaded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    ensureSectionLoaded(window.location.hash.replace(/^#/, "") || null);
  }, [ensureSectionLoaded]);

  const testimoniosRef = useRef<HTMLDivElement | null>(null);
  const testimoniosInView = useInView(testimoniosRef, {
    margin: "200px 0px",
  });
  useEffect(() => {
    if (testimoniosInView) requestSection("testimonios");
  }, [testimoniosInView, requestSection]);

  const portafolioRef = useRef<HTMLDivElement | null>(null);
  const portafolioInView = useInView(portafolioRef, {
    margin: "200px 0px",
  });
  useEffect(() => {
    if (portafolioInView) requestSection("portafolio");
  }, [portafolioInView, requestSection]);

  const sobreNosotrosRef = useRef<HTMLDivElement | null>(null);
  const sobreNosotrosInView = useInView(sobreNosotrosRef, {
    margin: "200px 0px",
  });
  useEffect(() => {
    if (sobreNosotrosInView) requestSection("sobreNosotros");
  }, [sobreNosotrosInView, requestSection]);

  const whyUsRef = useRef<HTMLDivElement | null>(null);
  const whyUsInView = useInView(whyUsRef, {
    margin: "200px 0px",
  });
  useEffect(() => {
    if (whyUsInView) requestSection("whyUs");
  }, [whyUsInView, requestSection]);

  const equipoRef = useRef<HTMLDivElement | null>(null);
  const equipoInView = useInView(equipoRef, {
    margin: "200px 0px",
  });
  useEffect(() => {
    if (equipoInView) requestSection("equipo");
  }, [equipoInView, requestSection]);

  const contactRef = useRef<HTMLDivElement | null>(null);
  const contactInView = useInView(contactRef, {
    margin: "200px 0px",
  });
  useEffect(() => {
    if (contactInView) requestSection("contacto");
  }, [contactInView, requestSection]);

  const derechosRef = useRef<HTMLDivElement | null>(null);
  const derechosInView = useInView(derechosRef, {
    margin: "200px 0px",
  });
  useEffect(() => {
    if (derechosInView) requestSection("derechos");
  }, [derechosInView, requestSection]);

  // Scroll gestionado globalmente por ScrollManager en MainLayout

  return (
    <div className="bg-fondobody text-white">
      <SEO
        title="Agencia Ethan Comunicaciones"
        description="Agencia Ethan Comunicaciones: expertos en marketing digital, fotografía, video y desarrollo web. Creamos estrategias que posicionan tu marca en el mundo digital."
        keywords="agencia de marketing, marketing digital Colombia, producción audiovisual, diseño gráfico, redes sociales, desarrollo web, Ethan Comunicaciones"
        url="https://www.agenciaethancomunicaciones.com/"
        schema={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Agencia Ethan Comunicaciones",
          url: "https://www.agenciaethancomunicaciones.com",
          logo: "https://www.agenciaethancomunicaciones.com/Recurso-1.webp",
          sameAs: [
            "https://www.facebook.com/ethancomunicaciones",
            "https://www.instagram.com/ethancomunicaciones",
            "https://www.behance.net/ethancomunic",
          ],
          description:
            "Agencia Ethan Comunicaciones: expertos en marketing digital, fotografía, video y desarrollo web.",
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+57-320-874-7317",
            contactType: "customer service",
            areaServed: "CO",
            availableLanguage: ["es", "en"],
          },
        }}
      />
      <Helmet>
        <link rel="preload" href="/web-equipo_1_layer.webp" as="image" />
      </Helmet>

      {/* Hero Video */}
      <HeroVideo />

      {/* Brand Slider con animación */}
      <Suspense fallback={<div className="h-50 bg-black" />}>
        <motion.div
          ref={sliderRef}
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-30 mt-0 xl:-mt-24"
        >
          <BrandSlider />
        </motion.div>
      </Suspense>

      <SectionContainer
        ref={testimoniosRef}
        section="testimonios"
        anchorId={SECTION_ANCHORS.testimonios}
        loaded={loadedSections.testimonios}
        fallbackHeight={DEFAULT_HEIGHT.testimonios}
        storedHeight={sectionHeights.testimonios}
        onHeightReport={registerSectionHeight}
      >
        {loadedSections.testimonios ? (
          <Suspense fallback={null}>
            {/* Testimonios */}
            <TestimoniosSection />
          </Suspense>
        ) : null}
      </SectionContainer>

      <StatsSection />

      <SectionContainer
        ref={portafolioRef}
        section="portafolio"
        anchorId={SECTION_ANCHORS.portafolio}
        loaded={loadedSections.portafolio}
        fallbackHeight={DEFAULT_HEIGHT.portafolio}
        storedHeight={sectionHeights.portafolio}
        onHeightReport={registerSectionHeight}
      >
        {loadedSections.portafolio ? (
          <Suspense fallback={null}>
            {/* Portafolio */}
            <PortafolioSection />
          </Suspense>
        ) : null}
      </SectionContainer>

      <SectionContainer
        ref={sobreNosotrosRef}
        section="sobreNosotros"
        anchorId={SECTION_ANCHORS.sobreNosotros}
        loaded={loadedSections.sobreNosotros}
        fallbackHeight={DEFAULT_HEIGHT.sobreNosotros}
        storedHeight={sectionHeights.sobreNosotros}
        onHeightReport={registerSectionHeight}
      >
        {loadedSections.sobreNosotros ? (
          <Suspense fallback={null}>
            {/* Sección Sobre Nosotros */}
            <SobreNosotros />
          </Suspense>
        ) : null}
      </SectionContainer>

      <ServiciosSection />

      <SectionContainer
        ref={whyUsRef}
        section="whyUs"
        anchorId={SECTION_ANCHORS.whyUs}
        loaded={loadedSections.whyUs}
        fallbackHeight={DEFAULT_HEIGHT.whyUs}
        storedHeight={sectionHeights.whyUs}
        onHeightReport={registerSectionHeight}
      >
        {loadedSections.whyUs ? (
          <Suspense fallback={null}>
            {/* ¿Por qué elegirnos? */}
            <WhyUs />
          </Suspense>
        ) : null}
      </SectionContainer>

      <SectionContainer
        ref={equipoRef}
        section="equipo"
        anchorId={SECTION_ANCHORS.equipo}
        loaded={loadedSections.equipo}
        fallbackHeight={DEFAULT_HEIGHT.equipo}
        storedHeight={sectionHeights.equipo}
        onHeightReport={registerSectionHeight}
      >
        {loadedSections.equipo ? (
          <Suspense fallback={null}>
            {/* Equipo */}
            <EquipoSection />
          </Suspense>
        ) : null}
      </SectionContainer>

      <SectionContainer
        ref={contactRef}
        section="contacto"
        anchorId={SECTION_ANCHORS.contacto}
        loaded={loadedSections.contacto}
        fallbackHeight={DEFAULT_HEIGHT.contacto}
        storedHeight={sectionHeights.contacto}
        onHeightReport={registerSectionHeight}
      >
        {loadedSections.contacto ? (
          <Suspense fallback={null}>
            <ContactForm sectionId={null} />
          </Suspense>
        ) : null}
      </SectionContainer>

      {/* Contacto */}
      <footer className="text-center border-t border-gray-800">
        {/* Derechos reservados*/}
        <SectionContainer
          ref={derechosRef}
          section="derechos"
          anchorId={SECTION_ANCHORS.derechos}
          loaded={loadedSections.derechos}
          fallbackHeight={DEFAULT_HEIGHT.derechos}
          storedHeight={sectionHeights.derechos}
          onHeightReport={registerSectionHeight}
        >
          {loadedSections.derechos ? (
            <Suspense fallback={null}>
              <DerechosReservados />
            </Suspense>
          ) : null}
        </SectionContainer>
      </footer>

      <WhatsAppButton />
    </div>
  );
}

interface SectionContainerProps {
  section: SectionKey;
  anchorId: string;
  loaded: boolean;
  fallbackHeight: number;
  storedHeight: number;
  onHeightReport: (section: SectionKey, height: number) => void;
  children: ReactNode;
}

const SectionContainer = forwardRef<HTMLDivElement, SectionContainerProps>(
  (
    {
      section,
      anchorId,
      loaded,
      fallbackHeight,
      storedHeight,
      onHeightReport,
      children,
    },
    ref
  ) => {
    const internalRef = useRef<HTMLDivElement | null>(null);

    const combinedRef = useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    useEffect(() => {
      if (!loaded) {
        return;
      }

      const element = internalRef.current;
      if (!element) {
        return;
      }

      const reportHeight = () => {
        const measured = element.getBoundingClientRect().height;
        if (measured > 0) {
          onHeightReport(section, Math.round(measured));
        }
      };

      reportHeight();

      if (typeof ResizeObserver === "undefined") {
        return;
      }

      const observer = new ResizeObserver(() => {
        reportHeight();
      });

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    }, [loaded, onHeightReport, section]);

    const placeholderHeight = Math.max(
      0,
      Math.round(storedHeight || fallbackHeight)
    );

    return (
      <div
        ref={combinedRef}
        id={anchorId}
        data-section-id={anchorId}
        style={
          loaded
            ? {
                minHeight: `${placeholderHeight}px`,
              }
            : {
                minHeight: `${placeholderHeight}px`,
                width: "100%",
              }
        }
        aria-busy={!loaded || undefined}
      >
        {loaded ? children : <div aria-hidden="true" />}
      </div>
    );
  }
);
SectionContainer.displayName = "SectionContainer";
