import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Star, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Business {
  id: string;
  name: string;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  address: string;
  isOpen?: boolean;
  coordinates: { lng: number; lat: number };
}

interface BusinessMapProps {
  businesses: Business[];
}

export function BusinessMap({ businesses }: BusinessMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState(() => 
    localStorage.getItem('mapbox-token') || ''
  );
  const [isTokenSet, setIsTokenSet] = useState(() => 
    !!localStorage.getItem('mapbox-token')
  );
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const handleSetToken = () => {
    if (mapboxToken.trim()) {
      localStorage.setItem('mapbox-token', mapboxToken.trim());
      setIsTokenSet(true);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !isTokenSet || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-122.4294, 37.7599],
        zoom: 12,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );

      // Add markers for each business
      businesses.forEach((business) => {
        const el = document.createElement('div');
        el.className = 'business-marker';
        // SECURITY: This innerHTML is safe because it contains only static SVG content.
        // DO NOT include user-controlled data (business.name, business.description, etc.) in this HTML.
        // If dynamic content is needed in the future, use proper DOM methods or sanitization.
        el.innerHTML = `
          <div class="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        `;
        el.style.cursor = 'pointer';
        
        el.addEventListener('click', () => {
          setSelectedBusiness(business);
          map.current?.flyTo({
            center: [business.coordinates.lng, business.coordinates.lat],
            zoom: 14,
          });
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([business.coordinates.lng, business.coordinates.lat])
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setIsTokenSet(false);
      localStorage.removeItem('mapbox-token');
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [isTokenSet, mapboxToken, businesses]);

  if (!isTokenSet) {
    return (
      <div className="h-[500px] rounded-xl bg-muted/50 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold mb-2">Enable Map View</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Enter your Mapbox public token to view business locations on the map. 
            Get your token at{' '}
            <a 
              href="https://mapbox.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              mapbox.com
            </a>
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="pk.eyJ1..."
              value={mapboxToken}
              onChange={(e) => setMapboxToken(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSetToken}>Enable</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[500px] rounded-xl overflow-hidden shadow-card">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Selected business popup */}
      {selectedBusiness && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card rounded-xl shadow-lg p-4 animate-fade-in">
          <button
            onClick={() => setSelectedBusiness(null)}
            className="absolute top-2 right-2 p-1 hover:bg-muted rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex gap-3">
            <img
              src={selectedBusiness.image}
              alt={selectedBusiness.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold truncate">{selectedBusiness.name}</h4>
              <p className="text-sm text-muted-foreground">{selectedBusiness.category}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{selectedBusiness.rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({selectedBusiness.reviewCount})
                </span>
              </div>
              <Link
                to={`/business/${selectedBusiness.id}`}
                className="text-sm text-primary hover:underline mt-1 inline-block"
              >
                View Details →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
