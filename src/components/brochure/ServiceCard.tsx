import { motion } from "motion/react";
import type { ReactNode } from "react";

interface ServiceCardProps {
  id: string;
  title: string;
  children: ReactNode;
  badge?: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.44 },
  },
};

export default function ServiceCard({
  id,
  title,
  children,
  badge,
}: ServiceCardProps) {
  return (
    <motion.div
      data-section-id={id}
      variants={itemVariants}
      className="bg-white/5 p-6 rounded-xl border-l-4 border-orange-500/40 scroll-mt-32"
    >
      <motion.h3
        variants={itemVariants}
        className="font-medium text-lg flex items-center justify-between"
      >
        {title}
      </motion.h3>
      {badge && (
        <div className="mt-2">
          <span className="inline-block bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
            {badge}
          </span>
        </div>
      )}
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}
