import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";

i18n
  .use(LanguageDetector) // 👈 Detecta el idioma automáticamente
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: "es", // idioma por defecto
    detection: {
      // 👇 Esto configura el detector para usar localStorage
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"], // guarda el idioma seleccionado
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
