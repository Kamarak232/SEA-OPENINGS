import type { Metadata } from "next";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "SEA New Openings — Freshly Opened Venues in Southeast Asia",
  description:
    "Discover newly opened hotels, hostels, and restaurants in Thailand, Vietnam & Cambodia. Build 3D websites for fresh prospects.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0A0A0F] text-[#F8F8FF] antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#12121A",
              color: "#F8F8FF",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
            },
          }}
        />
      </body>
    </html>
  );
}
