"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ChevronDown, Star, MapPin, Phone, Globe2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { GeneratedWebsite, Business } from "@/types";
import { COUNTRY_FLAGS } from "@/types";

// Load canvas client-only
const WebsiteCanvas = dynamic(() => import("./WebsiteCanvas"), { ssr: false });

// ─── scroll-triggered section wrapper ────────────────────────────────────────

function RevealSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon, title, description, index, palette,
}: {
  icon: string; title: string; description: string;
  index: number; palette: GeneratedWebsite["color_palette"];
}) {
  const ref    = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-2xl p-6 flex flex-col gap-3 hover:border-white/15 transition-all"
      style={{ borderColor: `${palette?.primary ?? "#10B981"}20` }}
    >
      <span className="text-3xl">{icon}</span>
      <h3 className="font-display font-semibold text-white text-lg">{title}</h3>
      <p className="text-sm text-white/60 leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  website: GeneratedWebsite;
  business: Business;
}

export default function GeneratedWebsiteView({ website, business }: Props) {
  const { scene_type, tagline, about_text, opening_message, features, color_palette } = website;
  const pal  = color_palette;
  const flag = COUNTRY_FLAGS[business.country] ?? "🌏";

  const primary    = pal?.primary    ?? "#10B981";
  const accent     = pal?.accent     ?? "#F59E0B";
  const bgColor    = pal?.background ?? "#0A0A0F";
  const textColor  = pal?.text       ?? "#F8F8FF";

  return (
    <div style={{ backgroundColor: bgColor, color: textColor }} className="min-h-screen font-sans">

      {/* ── HERO — Three.js full screen ──────────────────────────────────── */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Canvas background */}
        <WebsiteCanvas
          sceneType={scene_type}
          colorPalette={pal}
          className="absolute inset-0 w-full h-full"
        />

        {/* Dark gradient overlay so text is legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60 pointer-events-none" />

        {/* Text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">

          {/* Opening message */}
          {opening_message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.8, duration: 0.6 }}
              className="mb-6 px-4 py-1.5 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${primary}25`,
                border: `1px solid ${primary}60`,
                color: primary,
              }}
            >
              {opening_message}
            </motion.div>
          )}

          {/* Business name */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.0, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-bold text-white mb-4"
            style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1.1 }}
          >
            {business.name}
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.2, duration: 0.8 }}
            className="text-white/80 max-w-xl mb-8"
            style={{ fontSize: "clamp(1rem, 2.5vw, 1.4rem)" }}
          >
            {tagline}
          </motion.p>

          {/* Location chip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.5, duration: 0.6 }}
            className="flex items-center gap-2 text-white/50 text-sm"
          >
            <MapPin className="w-4 h-4" />
            <span>{flag} {business.city}{business.city ? ", " : ""}{business.country}</span>
            {business.rating && (
              <>
                <span>·</span>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-white/70">{business.rating}</span>
              </>
            )}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.0 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30"
        >
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── ABOUT SECTION ─────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <RevealSection>
          <div
            className="text-xs uppercase tracking-[0.25em] font-semibold mb-4"
            style={{ color: accent }}
          >
            Our Story
          </div>
          <h2
            className="font-display font-bold mb-6"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: textColor }}
          >
            Welcome to {business.name}
          </h2>
          <p
            className="leading-relaxed text-lg"
            style={{ color: `${textColor}99`, maxWidth: "60ch" }}
          >
            {about_text}
          </p>
        </RevealSection>

        {/* NEW OPENING badge */}
        <RevealSection delay={0.15}>
          <div
            className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{ backgroundColor: `${primary}15`, border: `1px solid ${primary}30` }}
          >
            <span className="text-xl">✨</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: primary }}>Now Open</p>
              {business.opening_label && (
                <p className="text-xs" style={{ color: `${textColor}50` }}>{business.opening_label}</p>
              )}
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── FEATURES SECTION ──────────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{ backgroundColor: `${primary}08` }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <RevealSection>
            <div
              className="text-xs uppercase tracking-[0.25em] font-semibold mb-4 text-center"
              style={{ color: accent }}
            >
              What We Offer
            </div>
            <h2
              className="font-display font-bold text-center mb-12"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", color: textColor }}
            >
              Experience the Difference
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {(features ?? []).map((f, i) => (
              <FeatureCard
                key={i}
                icon={f.icon}
                title={f.title}
                description={f.description}
                index={i}
                palette={pal}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── GALLERY SECTION ───────────────────────────────────────────────── */}
      {business.photo_urls && business.photo_urls.length > 0 && (
        <section className="py-24 max-w-5xl mx-auto px-6">
          <RevealSection>
            <div
              className="text-xs uppercase tracking-[0.25em] font-semibold mb-4"
              style={{ color: accent }}
            >
              Gallery
            </div>
            <h2
              className="font-display font-bold mb-10"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", color: textColor }}
            >
              A Glimpse Inside
            </h2>
          </RevealSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {business.photo_urls.slice(0, 6).map((url, i) => (
              <RevealSection key={i} delay={i * 0.07}>
                <div className="aspect-square rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${business.name} photo ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </RevealSection>
            ))}
          </div>
        </section>
      )}

      {/* ── CONTACT SECTION ───────────────────────────────────────────────── */}
      <section
        className="py-24"
        style={{
          background: `linear-gradient(135deg, ${primary}22 0%, ${accent}11 100%)`,
          borderTop: `1px solid ${primary}20`,
        }}
      >
        <div className="max-w-2xl mx-auto px-6 text-center">
          <RevealSection>
            <h2
              className="font-display font-bold mb-4"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", color: textColor }}
            >
              Visit Us
            </h2>
            <div className="space-y-3 text-sm" style={{ color: `${textColor}70` }}>
              {business.address && (
                <div className="flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: primary }} />
                  <span>{business.address}</span>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" style={{ color: primary }} />
                  <a href={`tel:${business.phone}`} style={{ color: primary }}>{business.phone}</a>
                </div>
              )}
              {!business.has_website && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Globe2 className="w-4 h-4" style={{ color: accent }} />
                  <span style={{ color: accent }}>Website coming soon</span>
                </div>
              )}
            </div>
          </RevealSection>

          {/* Rating display */}
          {business.rating && (
            <RevealSection delay={0.2}>
              <div className="mt-10 flex items-center justify-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5"
                    style={{
                      fill:  i < Math.round(business.rating!) ? accent : "transparent",
                      color: i < Math.round(business.rating!) ? accent : `${textColor}20`,
                    }}
                  />
                ))}
                <span className="ml-2 font-semibold" style={{ color: textColor }}>
                  {business.rating}
                </span>
                <span style={{ color: `${textColor}40` }}>
                  ({business.review_count} reviews)
                </span>
              </div>
            </RevealSection>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        className="text-center py-6 text-xs"
        style={{
          backgroundColor: bgColor,
          color: `${textColor}25`,
          borderTop: `1px solid ${textColor}08`,
        }}
      >
        © {new Date().getFullYear()} {business.name} · Built with SEA New Openings
      </footer>
    </div>
  );
}
