import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.06 },
  },
};

export default function TeamSection() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>("camilo");
  const [hoverId, setHoverId] = useState<string | null>(null);

  const team = [
    {
      id: "camilo",
      name: "Juan Camilo Holguín",
      role: t("brochure.team.members.camilo.role"),
      bio: t("brochure.team.members.camilo.bio"),
      imgSrc: "/brochure-pages/camilobrochure.png",
    },
    {
      id: "jhonathan",
      name: "Jhonathan Restrepo",
      role: t("brochure.team.members.jhonathan.role"),
      bio: t("brochure.team.members.jhonathan.bio"),
      imgSrc: "/brochure-pages/jhonathanbrochure.png",
    },
    {
      id: "jose",
      name: "Jose David Espinal",
      role: t("brochure.team.members.jose.role"),
      bio: t("brochure.team.members.jose.bio"),
      imgSrc: "/brochure-pages/josebrochure.png",
    },
    {
      id: "sara",
      name: "Sara Cartagena",
      role: t("brochure.team.members.sara.role"),
      bio: t("brochure.team.members.sara.bio"),
      imgSrc: "/brochure-pages/sarabrochure.png",
    },
  ];

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.12 }}
      className=""
    >
      <h2 className="text-2xl font-semibold mb-3">
        {t("brochure.team.title")}
      </h2>

      <div className="grid md:grid-cols-5 items-stretch gap-8 text-center md:text-left">
        {/* Left spacer (kept for layout balance on md+) */}
        <div className="hidden md:block" />

        {/* Center: preview + thumbnails (span two columns on md+) */}
        <div className="col-span-2 flex items-center">
          <div className="relative bg-transparent rounded w-full max-w-md md:max-w-none">
            <div className="flex items-center justify-center relative w-full py-6 md:py-0">
              <AnimatePresence mode="wait">
                {(() => {
                  const active =
                    team.find((t) => t.id === (hoverId ?? selectedId)) ||
                    team[0];
                  const base = active.imgSrc.replace(/\.png$/i, "");
                  return (
                    <motion.div
                      key={active.id}
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.96 }}
                      transition={{ duration: 0.32 }}
                      className="w-full max-w-[760px] aspect-square mx-auto"
                    >
                      <picture>
                        <source
                          srcSet={`${base}-480.webp 480w, ${base}-800.webp 800w, ${base}.webp 1200w`}
                          type="image/webp"
                          sizes="(min-width:1600px) 760px, (min-width:1280px) 640px, (min-width:768px) 520px, 360px"
                        />
                        <img
                          src={active.imgSrc}
                          alt={active.name}
                          loading="lazy"
                          decoding="async"
                          sizes="(min-width:1600px) 760px, (min-width:1280px) 640px, (min-width:768px) 520px, 360px"
                          className="w-full h-full rounded-lg object-contain shadow-2xl pointer-events-none bg-black/5"
                        />
                      </picture>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            <div className="mt-6 flex items-center justify-center md:justify-center -space-x-6">
              {team.map((m) => {
                const isSelected = selectedId === m.id;
                const base = m.imgSrc.replace(/\.png$/i, "");
                return (
                  <motion.div
                    key={m.id}
                    role="button"
                    aria-pressed={isSelected}
                    tabIndex={0}
                    onMouseEnter={() => setHoverId(m.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onFocus={() => setHoverId(m.id)}
                    onBlur={() => setHoverId(null)}
                    onClick={() => setSelectedId(m.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setSelectedId(m.id);
                    }}
                    whileHover={{ scale: 1.12, y: -4 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 26,
                    }}
                    className={`relative transition-transform duration-200 transform ${
                      isSelected
                        ? "-translate-y-2 scale-110 z-40"
                        : "hover:-translate-y-2 z-20"
                    } w-16 h-16 md:w-24 md:h-24 overflow-visible cursor-pointer shadow-sm  ${
                      isSelected ? "brightness-110 shadow-2xl" : ""
                    }`}
                  >
                    <picture>
                      <source
                        srcSet={`${base}-480.webp 480w, ${base}.webp 800w`}
                        type="image/webp"
                        sizes="48px"
                      />
                      <img
                        src={m.imgSrc}
                        alt={m.name}
                        className="w-full h-full object-contain rounded-full bg-black/5"
                        loading="lazy"
                        decoding="async"
                      />
                    </picture>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: info (wider) */}
        <div className="col-span-2 mt-6 md:mt-0 flex items-center justify-center">
          <div className="text-gray-300 md:pl-10 lg:pl-2 md:border-l md:border-white/5">
            {(() => {
              const activeId = hoverId ?? selectedId;
              const sel = team.find((t) => t.id === activeId) || team[0];
              return (
                <div key={sel.id} className="space-y-3 max-w-lg text-left">
                  <h3 className="text-xl md:text-2xl font-semibold text-white">
                    {sel.name} —{" "}
                    <span className="font-medium text-gray-300">
                      {sel.role}
                    </span>
                  </h3>
                  <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                    {sel.bio}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
