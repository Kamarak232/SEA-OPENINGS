import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Country accent colors
        thailand: "#F59E0B",
        vietnam: "#EF4444",
        cambodia: "#F97316",
        // UI colors
        "dark-base": "#0A0A0F",
        "dark-card": "#12121A",
        "dark-border": "#1E1E2E",
        "dark-hover": "#1A1A2E",
        "accent-green": "#10B981",
        "accent-blue": "#3B82F6",
        "hot-lead": "#F59E0B",
        "new-badge": "#10B981",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Playfair Display", "serif"],
      },
      animation: {
        "pulse-new": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(16,185,129,0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(16,185,129,0.8)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
export default config;
