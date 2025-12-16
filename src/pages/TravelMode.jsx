import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { MapPin, Plane, Search, Crown, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';

const POPULAR_CITIES = [
  { name: 'New York, USA', coords: { lat: 40.7128, lng: -74.0060 } },
  { name: 'London, UK', coords: { lat: 51.5074, lng: -0.1278 } },
  { name: 'Paris, France', coords: { lat: 48.8566, lng: 2.3522 } },
  { name: 'Lagos, Nigeria', coords: { lat: 6.5244, lng: 3.3792 } },
  { name: 'Johannesburg, South Africa', coords: { lat: -26.2041, lng: 28.0473 } },
  { name: 'Nairobi, Kenya', coords: { lat: -1.2864, lng: 36.8172 } },
  { name: 'Dubai, UAE', coords: { lat: 25.2048, lng: 55.2708 } },
  { name: 'Toronto, Canada', coords: { lat: 43.6532, lng: -79.3832 } },
  { name: 'Los Angeles, USA', coords: { lat: 34.0522, lng: -118.2437 } },
  { name: 'Accra, Ghana', coords: { lat: 5.6037, lng: -0.1870 } }
];

export default function TravelMode() {
  const [myProfile, setMyProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
        }
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    fetchProfile();
  }, []);

  const setTravelLocationMutation = useMutation({
    mutationFn: async ({ cityName, coords }) => {
      await base44.entities.UserProfile.update(myProfile.id, {
        location: coords,
        current_city: cityName.split(',')[0],
        current_country: cityName.split(',')[1]?.trim()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
      alert('Travel mode activated! You can now see matches in this city.');
      window.location.href = createPageUrl('Home');
    }
  });

  const filteredCities = POPULAR_CITIES.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!myProfile?.is_premium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md"
        >
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Premium Feature</h2>
              <p className="text-gray-600 mb-6">
                Travel Mode lets you change your location and meet people before you arrive!
              </p>
              <Link to={createPageUrl('PricingPlans')}>
                <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                  <Crown size={20} className="mr-2" />
                  Upgrade to Premium
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 pb-24">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-amber-600 rounded-full flex items-center justify-center">
                <Plane size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Travel Mode</h1>
                <p className="text-sm text-gray-600">Explore matches in a new city</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
              <Crown size={14} className="mr-1" />
              Premium
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900">Current Location</h3>
                <p className="text-gray-700">{myProfile.current_city}, {myProfile.current_country}</p>
                <p className="text-xs text-gray-600 mt-2">
                  Change your location to browse profiles and start swiping in advance of your trip!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-lg font-bold text-gray-900 mb-4">Popular Destinations</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {filteredCities.map((city, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setTravelLocationMutation.mutate({ cityName: city.name, coords: city.coords })}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <MapPin size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{city.name}</h4>
                        <p className="text-xs text-gray-500">Tap to explore</p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      Go
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}