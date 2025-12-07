import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AppLoaderProps {
  fallback: React.ReactNode;
  minDuration?: number;
  children: React.ReactNode;
}

export default function AppLoader({
  fallback,
  minDuration = 2000,
  children,
}: AppLoaderProps) {
  const [isReady, setIsReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const minTimer = new Promise((resolve) => setTimeout(resolve, minDuration));

    // Esperamos a que React haya cargado el DOM
    const whenDOMReady = new Promise((resolve) => {
      const checkDOM = () => {
        if (document.readyState === "complete") {
          resolve(true);
        } else {
          requestAnimationFrame(checkDOM);
        }
      };
      checkDOM();
    });

    // Cuando ambas promesas terminan, activamos el fade-out
    Promise.all([minTimer, whenDOMReady]).then(() => {
      setIsReady(true);
      setTimeout(() => {
        setShowLoader(false);
        // ✅ Recalcular layout tras desmontar loader
        window.dispatchEvent(new Event("resize"));
      }, 900);
    });
  }, [minDuration]);

  return (
    <>
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="app-loader"
            initial={{ opacity: 1 }}
            animate={{ opacity: isReady ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-9999 flex items-center justify-center bg-fondobody"
          >
            {fallback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* El contenido se renderiza mientras el loader hace fade-out */}
      <motion.div
        key="app-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: isReady ? 1 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </>
  );
}
