import { HashLink } from "react-router-hash-link";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Header() {
  const [open, setOpen] = useState(false);
  const { i18n, t } = useTranslation();
  const [lang, setLang] = useState(i18n.language || "es");
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("home");

  const toggleLanguage = () => {
    const newLang = lang === "es" ? "en" : "es";
    i18n.changeLanguage(newLang);
    setLang(newLang);
  };

  useEffect(() => {
    let scrollTimeout: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      const sections =
        document.querySelectorAll<HTMLElement>("[data-section-id]");
      let currentActive = "home";
      let closestSection = null;
      let closestDistance = Infinity;

      // Si estamos al inicio (scroll muy pequeño), mantener "home" activo
      if (window.scrollY < 200) {
        setActiveSection("home");
        return;
      }

      // Encontrar la sección más cercana al top del viewport
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionId = section.dataset.sectionId || section.id;
        if (!sectionId) {
          return;
        }
        const headerHeight = 80; // aproximado del header
        const distanceFromTop = Math.abs(rect.top - headerHeight);

        // Si la sección está en pantalla, calcular distancia
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          if (distanceFromTop < closestDistance) {
            closestDistance = distanceFromTop;
            closestSection = sectionId;
          }
        }
      });

      if (closestSection) {
        currentActive = closestSection;
      }

      setActiveSection(currentActive);
    };

    const throttledScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 50);
    };

    window.addEventListener("scroll", throttledScroll);
    // Ejecutar una vez al montar
    handleScroll();
    return () => {
      window.removeEventListener("scroll", throttledScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Función para link activo
  const linkClass = (id: string) =>
    activeSection === id
      ? "text-naranjavivo font-bold"
      : "hover:text-naranjavivo transition";

  const emitSectionNavigation = (id: string | null) => {
    if (typeof document === "undefined") return;
    document.dispatchEvent(
      new CustomEvent("ethan:navigate-to-section", { detail: { id } })
    );
  };

  const handleSectionClick = (id: string | null) => () => {
    emitSectionNavigation(id);
    setOpen(false);
  };

  // Detectar si estamos en blog para resaltar en otras páginas
  const isBlog = location.pathname === "/blog";

  const otherPageLinkClass = (page: string) => {
    if (page === "blog" && isBlog) return "text-naranjavivo font-bold";
    return "hover:text-naranjavivo transition";
  };

  return (
    <header
      className="
        fixed top-0 left-0 w-full z-50
        flex justify-between items-center
        px-8 md:px-20 py-5
        text-white text-sm md:text-base
        bg-black/30 backdrop-blur-md
        transition-all duration-300
      "
    >
      {/* Logo */}
      <div className="shrink-0">
        <Link to="/">
          <img
            src="/logo.png"
            alt="Ethan Comunicaciones Logo"
            className="h-12 w-auto drop-shadow-lg"
            width={120}
            height={48}
            decoding="async"
          />
        </Link>
      </div>

      {/* Botón hamburguesa (mobile) */}
      <button
        className="md:hidden text-2xl cursor-pointer z-50 relative"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? <FaTimes /> : <FaBars />}
      </button>

      {/* Navegación */}
      <nav
        className={`
          fixed inset-0 bg-black/95 md:bg-transparent md:static
          flex flex-col md:flex-row
          items-center justify-center md:justify-end
          gap-8 md:gap-10
          transition-all duration-300 ease-in-out
          ${
            open
              ? "opacity-100 visible"
              : "opacity-0 invisible md:opacity-100 md:visible"
          }
          font-medium
        `}
      >
        <HashLink
          smooth
          to="/#"
          className={linkClass("home")}
          onClick={handleSectionClick(null)}
        >
          {t("home")}
        </HashLink>

        <HashLink
          smooth
          to="/#sobre-nosotros"
          className={linkClass("sobre-nosotros")}
          onClick={handleSectionClick("sobre-nosotros")}
        >
          {t("about")}
        </HashLink>

        <HashLink
          smooth
          to="/#portafolio"
          className={linkClass("portafolio")}
          onClick={handleSectionClick("portafolio")}
        >
          {t("portfolio")}
        </HashLink>
        <HashLink
          smooth
          to="/#contacto"
          className={linkClass("contacto")}
          onClick={handleSectionClick("contacto")}
        >
          {t("contact")}
        </HashLink>
        <Link
          to="/blog"
          className={otherPageLinkClass("blog")}
          onClick={() => setOpen(false)}
        >
          {t("blog")}
        </Link>

        {/* Botón de cambio de idioma (animación slide) */}
        <motion.button
          onClick={toggleLanguage}
          whileTap={{ scale: 0.9 }}
          aria-label={
            lang === "es" ? "ES · Cambiar a inglés" : "EN · Switch to Spanish"
          }
          className="
            relative w-16 h-8 rounded-full overflow-hidden
            border border-white/20 bg-linear-to-r from-white/10 to-white/20
            cursor-pointer flex items-center justify-center
            hover:from-white/20 hover:to-white/30 transition
          "
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={lang}
              initial={{ x: lang === "es" ? -20 : 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: lang === "es" ? 20 : -20, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center text-sm font-semibold"
            >
              <span className="mr-1 text-sm" aria-hidden="true">
                {lang === "es" ? "ES" : "EN"}
              </span>
              {lang === "es" ? "ES" : "EN"}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </nav>
    </header>
  );
}
