"use client";
import { motion } from "motion/react";

interface VideoPlayerProps {
  url: string | null | undefined;
  label?: string;
}

export function VideoPlayer({ url, label }: VideoPlayerProps) {
  if (!url) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-xl overflow-hidden border border-warm"
    >
      {label && (
        <p className="text-xs text-text-secondary text-center py-2 bg-sand">
          {label}
        </p>
      )}
      <video
        src={url}
        autoPlay
        loop
        muted
        playsInline
        className="w-full aspect-[9/16] object-cover"
      />
    </motion.div>
  );
}
