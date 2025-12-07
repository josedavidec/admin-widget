import { useEffect, useLayoutEffect, useRef } from "react";

const brands = [
  { src: "/AKT-motos-logo.webp", name: "AKT Motos", width: 254, height: 88 },
  { src: "/logo-agaval.webp", name: "Agaval", width: 196, height: 88 },
  {
    src: "/LOGO-COVIPACIFICO.webp",
    name: "Covipacífico",
    width: 320,
    height: 80,
  },
  { src: "/logo_explomin.webp", name: "Explomin", width: 251, height: 88 },
  { src: "/logorutan.webp", name: "Ruta N", width: 150, height: 88 },
  { src: "/Recurso-1@4x-2.webp", name: "Marca Aliada", width: 184, height: 88 },
  { src: "/Recurso-1@4x-3.webp", name: "Marca Aliada", width: 184, height: 88 },
  { src: "/Recurso-1@4x-4.webp", name: "Marca Aliada", width: 184, height: 88 },
  { src: "/Recurso-1@4x-6.webp", name: "Marca Aliada", width: 184, height: 88 },
  { src: "/Recurso-1@4x-7.webp", name: "Marca Aliada", width: 184, height: 88 },
  { src: "/Recurso-1@4x-8.webp", name: "Marca Aliada", width: 184, height: 88 },
  { src: "/Recurso-1@4x-9.webp", name: "Marca Aliada", width: 184, height: 88 },
  {
    src: "/Recurso-1@4x-11.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-12.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-13.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-14.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-15.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-16.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-17.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-18.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-19.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-22.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-25.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-26.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-27.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
  {
    src: "/Recurso-1@4x-28.webp",
    name: "Marca Aliada",
    width: 184,
    height: 88,
  },
];

export default function BrandSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const totalWidthRef = useRef(0);
  const speed = 1.5; // Velocidad del slider

  useLayoutEffect(() => {
    const updateTotalWidth = () => {
      if (containerRef.current) {
        totalWidthRef.current = containerRef.current.scrollWidth / 2;
      }
    };

    updateTotalWidth();

    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      const observer = new ResizeObserver(updateTotalWidth);
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }

    return undefined;
  }, []);

  useEffect(() => {
    let animationId: number;

    const animate = () => {
      const node = containerRef.current;
      const totalWidth = totalWidthRef.current;

      if (node && totalWidth) {
        offsetRef.current += speed;
        if (offsetRef.current >= totalWidth) {
          offsetRef.current = 0;
        }

        node.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <section
      id="marcas"
      className="relative py-14 overflow-hidden bg-linear-to-t from-fondobody via-fondobody/95 to-transparent"
    >
      <div className="relative max-w-2xl mx-auto px-16 overflow-hidden">
        {/* Slider */}
        <div
          ref={containerRef}
          className="flex space-x-3 will-change-transform transition-none"
        >
          {[...brands, ...brands].map((brand, index) => (
            <img
              key={index}
              src={brand.src}
              alt={brand.name}
              width={brand.width}
              height={brand.height}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 1024px) 180px, (min-width: 640px) 160px, 140px"
              className="h-14 sm:h-18 md:h-22 shrink-0 object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
            />
          ))}
        </div>

        {/* Fade izquierda */}
        <div className="absolute left-0 top-0 h-full w-24 bg-linear-to-r from-fondobody via-fondobody/70 to-transparent pointer-events-none" />

        {/* Fade derecha */}
        <div className="absolute right-0 top-0 h-full w-24 bg-linear-to-l from-fondobody via-fondobody/70 to-transparent pointer-events-none" />
      </div>
    </section>
  );
}
