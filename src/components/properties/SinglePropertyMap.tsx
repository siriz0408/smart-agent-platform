import { useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import "leaflet/dist/leaflet.css";

// Create custom marker icon
const createMarkerIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

interface SinglePropertyMapProps {
  latitude: number;
  longitude: number;
  address: string;
  className?: string;
}

export function SinglePropertyMap({
  latitude,
  longitude,
  address: _address,
  className = "",
}: SinglePropertyMapProps) {
  const markerIcon = useMemo(() => createMarkerIcon(), []);

  // Validate coordinates
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return (
      <Card className={`flex items-center justify-center ${className}`}>
        <CardContent className="py-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg">No map data available</h3>
          <p className="text-muted-foreground mt-1">
            Location coordinates not available for this property
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}
