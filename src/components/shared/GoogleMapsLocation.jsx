import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from 'lucide-react';

// Google Maps integration component
export default function GoogleMapsLocation({ 
  onLocationSelect, 
  initialLocation = null,
  height = '300px',
  showSearch = true 
}) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchBox, setSearchBox] = useState(null);

  useEffect(() => {
    loadGoogleMaps();
  }, []);

  const loadGoogleMaps = () => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initializeMap;
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    if (!mapRef.current) return;

    const defaultCenter = initialLocation || { lat: 6.5244, lng: 3.3792 }; // Lagos, Nigeria

    const mapInstance = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 12,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    const markerInstance = new google.maps.Marker({
      map: mapInstance,
      position: defaultCenter,
      draggable: true
    });

    // Add click listener to map
    mapInstance.addListener('click', (e) => {
      const location = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      markerInstance.setPosition(location);
      onLocationSelect?.(location);
    });

    // Add drag listener to marker
    markerInstance.addListener('dragend', (e) => {
      const location = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      onLocationSelect?.(location);
    });

    if (showSearch) {
      const input = document.getElementById('map-search-input');
      const searchBoxInstance = new google.maps.places.SearchBox(input);
      
      mapInstance.addListener('bounds_changed', () => {
        searchBoxInstance.setBounds(mapInstance.getBounds());
      });

      searchBoxInstance.addListener('places_changed', () => {
        const places = searchBoxInstance.getPlaces();
        if (places.length === 0) return;

        const place = places[0];
        if (!place.geometry || !place.geometry.location) return;

        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };

        mapInstance.setCenter(location);
        markerInstance.setPosition(location);
        onLocationSelect?.(location);
      });

      setSearchBox(searchBoxInstance);
    }

    setMap(mapInstance);
    setMarker(markerInstance);
    setLoading(false);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        if (map && marker) {
          map.setCenter(location);
          marker.setPosition(location);
          onLocationSelect?.(location);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location');
        setLoading(false);
      }
    );
  };

  return (
    <div className="relative">
      {showSearch && (
        <div className="mb-3 flex gap-2">
          <input
            id="map-search-input"
            type="text"
            placeholder="Search for a place..."
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <MapPin size={18} />
            )}
          </Button>
        </div>
      )}
      
      <div
        ref={mapRef}
        style={{ height, width: '100%' }}
        className="rounded-lg border"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      )}
    </div>
  );
}

// Hook for geocoding address to coordinates
export function useGeocoding() {
  const [loading, setLoading] = useState(false);

  const geocodeAddress = async (address) => {
    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps not loaded');
    }

    setLoading(true);
    
    return new Promise((resolve, reject) => {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ address }, (results, status) => {
        setLoading(false);
        
        if (status === 'OK' && results[0]) {
          const location = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
            formatted_address: results[0].formatted_address
          };
          resolve(location);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  };

  return { geocodeAddress, loading };
}

// Calculate distance between two points
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}