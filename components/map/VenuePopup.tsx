"use client";

import { Popup } from "react-map-gl/mapbox";
import { X } from "lucide-react";
import type { Business } from "@/types";
import VenueCard from "@/components/search/VenueCard";

interface Props {
  business: Business;
  onClose: () => void;
}

export default function VenuePopup({ business, onClose }: Props) {
  return (
    <Popup
      longitude={business.lng!}
      latitude={business.lat!}
      anchor="bottom"
      onClose={onClose}
      closeButton={false}
      closeOnClick={false}
      offset={16}
      style={{ padding: 0 }}
    >
      <div className="relative w-64">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white transition-all"
        >
          <X className="w-3 h-3" />
        </button>
        <VenueCard business={business} />
      </div>
    </Popup>
  );
}
