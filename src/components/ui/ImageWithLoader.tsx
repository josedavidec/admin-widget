import { useState } from "react";
import { motion } from "motion/react";
import type { MotionProps } from "motion/react";

interface ImageWithLoaderProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

// Combinamos las props de HTMLImageElement con las de MotionProps
type CombinedProps = ImageWithLoaderProps & MotionProps;

export default function ImageWithLoader({
  src,
  alt,
  className,
  containerClassName,
  ...props
}: CombinedProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      className={`relative overflow-hidden bg-gray-900 ${
        containerClassName || ""
      }`}
    >
      {/* Placeholder / Skeleton Loader */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 animate-pulse z-10">
          <svg
            className="w-10 h-10 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* Imagen Real */}
      <motion.img
        src={src}
        alt={alt}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        onLoad={() => setIsLoaded(true)}
        className={`block w-full ${className}`}
        {...props}
      />
    </div>
  );
}
