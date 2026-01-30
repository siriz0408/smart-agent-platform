import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark, Bed, Bath, Square, MapPin } from "lucide-react";
import type { ResidentialProperty } from "@/hooks/usePropertySearch";

// Fix for default marker icons in React-Leaflet
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
    popupAnchor: [0, -32],
  });
};

// Component to auto-fit map bounds to markers
function FitBounds({ properties }: { properties: ResidentialProperty[] }): null {
  const map = useMap();
  
  useEffect(() => {
    const validProperties = properties.filter(
      (p) => p.address.latitude && p.address.longitude
    );
    
    if (validProperties.length === 0) return;
    
    const bounds = L.latLngBounds(
      validProperties.map((p) => [p.address.latitude!, p.address.longitude!])
    );
    
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [properties, map]);
  
  return null;
}

interface PropertyMapProps {
  properties: ResidentialProperty[];
  onSave: (property: ResidentialProperty) => void;
  isSaving: boolean;
  className?: string;
}

export function PropertyMap({ properties, onSave, isSaving, className = "" }: PropertyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerIcon = useMemo(() => createMarkerIcon(), []);
  
  // Filter properties with valid coordinates
  const propertiesWithCoords = useMemo(() => 
    properties.filter((p) => p.address.latitude && p.address.longitude),
    [properties]
  );
  
  // Calculate center based on properties or default to US center
  const center = useMemo(() => {
    if (propertiesWithCoords.length === 0) {
      return { lat: 39.8283, lng: -98.5795 }; // Center of US
    }
    const avgLat = propertiesWithCoords.reduce((sum, p) => sum + p.address.latitude!, 0) / propertiesWithCoords.length;
    const avgLng = propertiesWithCoords.reduce((sum, p) => sum + p.address.longitude!, 0) / propertiesWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [propertiesWithCoords]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (propertiesWithCoords.length === 0 && properties.length > 0) {
    return (
      <Card className={`flex items-center justify-center ${className}`}>
        <CardContent className="py-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg">No map data available</h3>
          <p className="text-muted-foreground mt-1">
            Properties in this search don't have location coordinates
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border ${className}`}>
      {/* Info badge showing how many properties are on map */}
      {properties.length > propertiesWithCoords.length && (
        <div className="absolute top-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border">
          {propertiesWithCoords.length} of {properties.length} shown on map
        </div>
      )}
      
      <MapContainer
        ref={mapRef}
        center={[center.lat, center.lng]}
        zoom={10}
        scrollWheelZoom={true}
        className="h-full w-full min-h-[400px]"
        style={{ zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds properties={properties} />
        
        {propertiesWithCoords.map((property) => (
          <Marker
            key={property.zpid}
            position={[property.address.latitude!, property.address.longitude!]}
            icon={markerIcon}
          >
            <Popup className="property-popup" maxWidth={280} minWidth={240}>
              <div className="p-1">
                {property.imgSrc && (
                  <img
                    src={property.imgSrc}
                    alt={property.address.streetAddress}
                    className="w-full h-32 object-cover rounded-md mb-2"
                  />
                )}
                
                <div className="space-y-2">
                  <div className="font-bold text-lg text-primary">
                    {formatPrice(property.price)}
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Bed className="h-3.5 w-3.5" />
                      {property.bedrooms}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="h-3.5 w-3.5" />
                      {property.bathrooms}
                    </span>
                    {property.livingArea > 0 && (
                      <span className="flex items-center gap-1">
                        <Square className="h-3.5 w-3.5" />
                        {property.livingArea.toLocaleString()} sqft
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm">
                    {property.address.streetAddress}
                    <br />
                    {property.address.city}, {property.address.state} {property.address.zipcode}
                  </p>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => onSave(property)}
                    disabled={isSaving}
                  >
                    <Bookmark className="h-4 w-4 mr-1" />
                    {isSaving ? "Saving..." : "Save Property"}
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
