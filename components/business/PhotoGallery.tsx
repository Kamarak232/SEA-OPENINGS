"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Images } from "lucide-react";

interface Props {
  photos: string[];
  name: string;
}

export default function PhotoGallery({ photos, name }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (!photos.length) {
    return (
      <div className="h-64 bg-white/5 border border-white/[0.06] rounded-2xl flex items-center justify-center text-white/20">
        <div className="text-center">
          <Images className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No photos available</p>
        </div>
      </div>
    );
  }

  const primary   = photos[0];
  const secondary = photos.slice(1, 5);

  function prev() {
    setLightboxIdx((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }
  function next() {
    setLightboxIdx((i) => (i === null ? null : (i + 1) % photos.length));
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-4 gap-2 h-72 rounded-2xl overflow-hidden">
        {/* Primary photo — takes 2 cols and full height */}
        <div
          className="col-span-2 row-span-2 relative cursor-pointer group overflow-hidden"
          onClick={() => setLightboxIdx(0)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={primary} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
        </div>

        {/* Secondary photos */}
        {secondary.map((src, i) => (
          <div
            key={i}
            className="relative cursor-pointer group overflow-hidden"
            onClick={() => setLightboxIdx(i + 1)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${name} ${i + 2}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
            {/* "Show all" overlay on last tile if there are more */}
            {i === 3 && photos.length > 5 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">+{photos.length - 5} more</span>
              </div>
            )}
          </div>
        ))}

        {/* Empty placeholders to fill grid */}
        {secondary.length < 4 &&
          Array.from({ length: 4 - secondary.length }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white/[0.03] rounded" />
          ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxIdx(null)}
          >
            {/* Close */}
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
              onClick={() => setLightboxIdx(null)}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/40 text-sm">
              {lightboxIdx + 1} / {photos.length}
            </div>

            {/* Prev / Next */}
            <button
              className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
              onClick={(e) => { e.stopPropagation(); prev(); }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
              onClick={(e) => { e.stopPropagation(); next(); }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Image */}
            <motion.img
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              src={photos[lightboxIdx]}
              alt={`${name} photo ${lightboxIdx + 1}`}
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
