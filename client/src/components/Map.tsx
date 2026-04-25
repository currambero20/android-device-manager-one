import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DEFAULT_ICON;

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  markers?: Array<{
    id?: string | number;
    position: { lat: number; lng: number };
    title?: string;
    icon?: "default" | "online" | "offline";
  }>;
  onMapReady?: (map: L.Map) => void;
  onMarkerClick?: (markerId: string | number) => void;
  selectedMarkerId?: string | number;
  circles?: Array<{
    id?: string | number;
    center: { lat: number; lng: number };
    radius: number;
    color?: string;
    fillColor?: string;
  }>;
  polyline?: Array<{ lat: number; lng: number }>;
  showControls?: boolean;
}

export function MapView({
  className,
  initialCenter = { lat: 4.6097, lng: -74.0817 },
  initialZoom = 13,
  markers = [],
  onMapReady,
  onMarkerClick,
  selectedMarkerId,
  circles = [],
  polyline = [],
  showControls = true,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const circlesLayer = useRef<L.LayerGroup | null>(null);
  const polylineLayer = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialZoom,
      zoomControl: showControls,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map.current);

    markersLayer.current = L.layerGroup().addTo(map.current);
    circlesLayer.current = L.layerGroup().addTo(map.current);

    if (onMapReady && map.current) {
      onMapReady(map.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!map.current || !markersLayer.current) return;

    markersLayer.current.clearLayers();

    markers.forEach((marker) => {
      const isSelected = marker.id === selectedMarkerId;
      const icon = marker.icon === "offline" 
        ? L.divIcon({
            className: "custom-marker offline",
            html: `<div style="background: ${isSelected ? '#3B82F6' : '#6B7280'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })
        : L.divIcon({
            className: "custom-marker online",
            html: `<div style="background: ${isSelected ? '#22C55E' : '#10B981'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

      const leafletMarker = L.marker([marker.position.lat, marker.position.lng], { icon })
        .bindPopup(marker.title || `Marker ${marker.id}`);

      if (onMarkerClick && marker.id !== undefined) {
        leafletMarker.on("click", () => onMarkerClick(marker.id!));
      }

      markersLayer.current!.addLayer(leafletMarker);
    });
  }, [markers, selectedMarkerId, onMarkerClick]);

  useEffect(() => {
    if (!map.current || !circlesLayer.current) return;

    circlesLayer.current.clearLayers();

    circles.forEach((circle) => {
      const leafletCircle = L.circle([circle.center.lat, circle.center.lng], {
        radius: circle.radius,
        color: circle.color || "#3B82F6",
        fillColor: circle.fillColor || "#3B82F6",
        fillOpacity: 0.15,
        weight: 2,
      });

      if (circle.id) {
        leafletCircle.bindPopup(`Geofence ${circle.id}`);
      }

      circlesLayer.current!.addLayer(leafletCircle);
    });
  }, [circles]);

  useEffect(() => {
    if (!map.current) return;

    if (polylineLayer.current) {
      map.current.removeLayer(polylineLayer.current);
      polylineLayer.current = null;
    }

    if (polyline.length > 1) {
      const latLngs = polyline.map((p) => [p.lat, p.lng] as [number, number]);
      polylineLayer.current = L.polyline(latLngs, {
        color: "#3B82F6",
        weight: 3,
        opacity: 0.8,
      }).addTo(map.current);
    }
  }, [polyline]);

  return (
    <div 
      ref={mapContainer} 
      className={cn("w-full h-[500px] rounded-lg overflow-hidden", className)} 
      style={{ zIndex: 0 }}
    />
  );
}

export default MapView;
