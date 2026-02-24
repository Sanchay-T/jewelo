"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageViewerProps {
  src: string;
  alt: string;
  children?: React.ReactNode;
  className?: string;
}

export function ImageViewer({ src, alt, children, className }: ImageViewerProps) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const toggleZoom = () => {
    setScale((s) => (s === 1 ? 2 : 1));
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {children || <img src={src} alt={alt} className="w-full h-full object-cover" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
            onClick={() => { setOpen(false); setScale(1); }}
          >
            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); setScale(1); }}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Zoom toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleZoom(); }}
              className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"
            >
              {scale > 1 ? (
                <ZoomOut className="w-5 h-5 text-white" />
              ) : (
                <ZoomIn className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Image */}
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full flex items-center justify-center p-4 overflow-auto"
            >
              <motion.img
                src={src}
                alt={alt}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="max-w-full max-h-full object-contain rounded-lg"
                draggable={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
