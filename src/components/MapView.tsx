'use client';
import { useEffect, useRef } from 'react';

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
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<Map<string, unknown>>(new Map());

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !mapContainerRef.current || mapRef.current) return;

    let map: { remove: () => void; on: (e: string, cb: () => void) => void; addControl: (c: unknown, pos: string) => void } | null = null;

    import('mapbox-gl').then(({ default: mapboxgl }) => {
      mapboxgl.accessToken = token;

      const center: [number, number] = listings.find(l => l.lat && l.lng)
        ? [listings.find(l => l.lat && l.lng)!.lng!, listings.find(l => l.lat && l.lng)!.lat!]
        : [-4.0167, 5.3167]; // Abidjan

      map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: 11,
      });

      // @ts-expect-error mapboxgl typing
      mapRef.current = map;

      map.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.on('load', () => {
        listings
          .filter(l => l.lat && l.lng)
          .forEach(listing => {
            const el = document.createElement('div');
            el.className = 'map-marker';
            el.innerHTML = `<div class="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md whitespace-nowrap cursor-pointer">${Math.round(Number(listing.prix_nuitee) / 1000)}k</div>`;

            // @ts-expect-error mapboxgl typing
            const marker = new mapboxgl.Marker({ element: el })
              .setLngLat([listing.lng!, listing.lat!])
              // @ts-expect-error mapboxgl typing
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<div class="p-2">
                  <p class="font-semibold text-sm">${listing.title}</p>
                  <p class="text-xs text-gray-500">${listing.commune}</p>
                  <p class="text-sm font-bold text-orange-600 mt-1">${Number(listing.prix_nuitee).toLocaleString('fr-CI')} FCFA/nuit</p>
                  <a href="/listings/${listing.id}" class="text-blue-600 text-xs mt-1 inline-block">Voir le bien →</a>
                </div>`
              ))
              // @ts-expect-error mapboxgl typing
              .addTo(map!);

            markersRef.current.set(listing.id, marker);
          });
      });
    });

    return () => { map?.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker highlight when hoveredId changes
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = (marker as { getElement: () => HTMLElement }).getElement();
      const inner = el.querySelector('div');
      if (!inner) return;
      if (id === hoveredId) {
        inner.classList.remove('bg-orange-600');
        inner.classList.add('bg-orange-800', 'scale-110');
      } else {
        inner.classList.add('bg-orange-600');
        inner.classList.remove('bg-orange-800', 'scale-110');
      }
    });
  }, [hoveredId]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <p className="text-gray-500 text-sm">Carte non disponible (NEXT_PUBLIC_MAPBOX_TOKEN manquant)</p>
        </div>
      )}
    </div>
  );
}
