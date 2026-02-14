import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Google Maps integration component
export default function GoogleMapsLocation({ 
  onLocationSelect, 
  initialLocation = null,
  height = '300px',
  showSearch = true 
}) {
  const mapRef = useRef(null);
  const searchInputRef = useRef(null);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGoogleMaps();
  }, []);

  const loadGoogleMaps = async () => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      initializeMap();
      return;
    }

    try {
      // Fetch API key from backend
      const response = await base44.functions.invoke('getGoogleMapsKey');
      const apiKey = response?.data?.apiKey || response?.apiKey;
      
      if (!apiKey) {
        throw new Error('Google Maps API key not found');
      }
      
      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        setLoading(false);
        alert('Failed to load Google Maps. Please check your internet connection and try again.');
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
      setLoading(false);
      alert('Failed to initialize Google Maps. Please try again later.');
    }
  };

  const initializeMap = () => {
    if (!mapRef.current) return;
    
    if (!window.google || !window.google.maps) {
      console.error('Google Maps not loaded');
      setLoading(false);
      return;
    }

    try {
      const defaultCenter = initialLocation || { lat: 6.5244, lng: 3.3792 }; // Lagos, Nigeria

      const mapInstance = new window.google.maps.Map(mapRef.current, {
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

      const markerInstance = new window.google.maps.Marker({
        map: mapInstance,
        position: defaultCenter,
        draggable: true
      });

      // Add click listener to map
      mapInstance.addListener('click', async (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const location = { lat, lng };
        markerInstance.setPosition(location);
        
        try {
          const geocoder = new window.google.maps.Geocoder();
          const { results } = await geocoder.geocode({ location: { lat, lng } });
          if (results[0]) {
            location.address = results[0].formatted_address;
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
        }
        
        onLocationSelect?.(location);
      });

      // Add drag listener to marker
      markerInstance.addListener('dragend', async (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const location = { lat, lng };
        
        try {
          const geocoder = new window.google.maps.Geocoder();
          const { results } = await geocoder.geocode({ location: { lat, lng } });
          if (results[0]) {
            location.address = results[0].formatted_address;
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
        }

        onLocationSelect?.(location);
      });

      if (showSearch) {
        const input = document.getElementById('map-search-input');
        if (input) {
          const searchBoxInstance = new window.google.maps.places.SearchBox(input);
          
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
              lng: place.geometry.location.lng(),
              address: place.formatted_address
            };

            mapInstance.setCenter(location);
            markerInstance.setPosition(location);
            onLocationSelect?.(location);
          });

          setSearchBox(searchBoxInstance);
        }
      }

      setMap(mapInstance);
      setMarker(markerInstance);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      setLoading(false);
      alert('Error initializing map. Please refresh and try again.');
    }
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