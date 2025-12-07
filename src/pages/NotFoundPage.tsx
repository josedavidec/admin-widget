import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import SEO from "@/components/SEO";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-6 text-center">
      <SEO
        title="404 - Página no encontrada"
        description="La página que buscas no existe."
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-linear-to-r from-orange-500 to-red-600 mb-4">
          404
        </h1>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-2xl md:text-4xl font-semibold mb-6"
      >
        {t("notFound.title", "Página no encontrada")}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-gray-400 mb-8 max-w-md mx-auto"
      >
        {t(
          "notFound.description",
          "Lo sentimos, la página que estás buscando no existe o ha sido movida."
        )}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <Link
          to="/"
          className="px-8 py-3 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-orange-500/20"
        >
          {t("notFound.button", "Volver al inicio")}
        </Link>
      </motion.div>
    </div>
  );
}
