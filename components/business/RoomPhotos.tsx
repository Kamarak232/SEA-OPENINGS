"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BedDouble, ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  photos: string[];
  name:   string;
}

export default function RoomPhotos({ photos, name }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (!photos.length) return null;

  function prev() {
    setLightboxIdx((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }
  function next() {
    setLightboxIdx((i) => (i === null ? null : (i + 1) % photos.length));
  }

  return (
    <>
      <div className="space-y-3">
        {/* Section header */}
        <div className="flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-white/40" />
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
            Rooms &amp; Interior
          </h2>
          <span className="text-[10px] text-white/25 ml-auto">{photos.length} photos</span>
        </div>

        {/* Horizontal scroll strip */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
          {photos.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="relative flex-shrink-0 w-48 h-32 rounded-xl overflow-hidden cursor-pointer group border border-white/[0.06]"
              onClick={() => setLightboxIdx(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${name} room ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => { (e.target as HTMLImageElement).closest("div")!.style.display = "none"; }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all" />
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-full">View</span>
              </div>
            </motion.div>
          ))}
        </div>
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
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
              onClick={() => setLightboxIdx(null)}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/40 text-sm">
              <BedDouble className="w-4 h-4" />
              Room {lightboxIdx + 1} / {photos.length}
            </div>

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

            <motion.img
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              src={photos[lightboxIdx]}
              alt={`${name} room ${lightboxIdx + 1}`}
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
