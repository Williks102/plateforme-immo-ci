'use client';
import { useEffect, useRef } from 'react';
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';

interface Listing {
  id: string;
  title: string;
  prix_nuitee: number;
  lat: number | null;
  lng: number | null;
  commune: string;
}

interface Props {
  listings: Listing[];
  hoveredId?: string | null;
}

export default function MapView({ listings, hoveredId }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<MapboxMap | null>(null);
  const markersRef      = useRef<Map<string, MapboxMarker>>(new Map());

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !mapContainerRef.current || mapRef.current) return;

    let map: MapboxMap | null = null;

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = token;

      const geoListing = listings.find(l => l.lat && l.lng);
      const center: [number, number] = geoListing
        ? [geoListing.lng!, geoListing.lat!]
        : [-4.0167, 5.3167]; // Abidjan

      map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 11,
      });

      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        listings
          .filter(l => l.lat && l.lng)
          .forEach(listing => {
            const el = document.createElement('div');
            el.innerHTML = `<div style="background:#ea580c;color:white;font-size:12px;font-weight:bold;padding:4px 8px;border-radius:999px;box-shadow:0 2px 4px rgba(0,0,0,.3);cursor:pointer;white-space:nowrap">${Math.round(Number(listing.prix_nuitee) / 1000)}k</div>`;

            const marker = new mapboxgl.Marker({ element: el })
              .setLngLat([listing.lng!, listing.lat!])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                  `<div style="padding:8px">
                    <p style="font-weight:600;font-size:14px;margin:0 0 4px">${listing.title}</p>
                    <p style="color:#6b7280;font-size:12px;margin:0 0 4px">${listing.commune}</p>
                    <p style="font-weight:700;color:#ea580c;font-size:13px;margin:0 0 6px">${Number(listing.prix_nuitee).toLocaleString('fr-CI')} FCFA/nuit</p>
                    <a href="/listings/${listing.id}" style="color:#2563eb;font-size:12px">Voir le bien →</a>
                  </div>`
                )
              )
              .addTo(map!);

            markersRef.current.set(listing.id, marker);
          });
      });
    });

    return () => {
      map?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Highlight marker on hover
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el    = marker.getElement();
      const inner = el.querySelector('div') as HTMLDivElement | null;
      if (!inner) return;
      inner.style.background = id === hoveredId ? '#9a3412' : '#ea580c';
      inner.style.transform  = id === hoveredId ? 'scale(1.15)' : 'scale(1)';
    });
  }, [hoveredId]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-2xl">
          <p className="text-gray-500 text-sm">Carte non disponible — NEXT_PUBLIC_MAPBOX_TOKEN manquant</p>
        </div>
      )}
    </div>
  );
}
