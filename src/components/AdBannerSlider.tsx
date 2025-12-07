import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

const banners = [
  "/banners publicidad/BANNER-CATEGORIA-AGENCIA.webp",
  "/banners publicidad/BANNER-CATEGORIA-LE-BEAUTE.webp",
  "/banners publicidad/Banner-Cumpleanos-HC.webp",
  "/banners publicidad/Banner-Dra.-Diva-Marin.webp",
  "/banners publicidad/Banner-Hablemos-Claro-Paute-aqui-Categoria.webp",
  "/banners publicidad/Banner-home-Complex-Ditaires.webp",
];

export default function AdBannerSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:grid w-full grid-cols-1 relative shadow-lg bg-gray-900">
      <AnimatePresence>
        <motion.img
          key={currentIndex}
          src={banners[currentIndex]}
          alt={`Publicidad ${currentIndex + 1}`}
          className="col-start-1 row-start-1 w-full h-auto object-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      </AnimatePresence>

      {/* Indicadores (opcional) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? "bg-white" : "bg-white/50"
            }`}
            aria-label={`Ir al banner ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
