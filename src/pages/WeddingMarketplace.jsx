import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Heart, Sparkles, MapPin, Briefcase, Search, Filter, Phone, Mail, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import AfricanPattern from '@/components/shared/AfricanPattern';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { Badge } from "@/components/ui/badge";

export default function WeddingMarketplace() {
  const [myProfile, setMyProfile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    };
    fetchProfile();
  }, []);

  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ['wedding-vendors', selectedCategory, selectedState, selectedCountry],
    queryFn: async () => {
      let filters = {};
      if (selectedCategory !== 'all') filters.category = selectedCategory;
      if (selectedState !== 'all') filters.state = selectedState;
      if (selectedCountry !== 'all') filters.country = selectedCountry;
      
      const allVendors = await base44.entities.WeddingVendor.filter(filters, '-is_featured', 100);
      return allVendors;
    },
    staleTime: 300000,
    retry: 1
  });

  const categories = [
    "Venue", "Caterer", "Photographer", "Decorator", "Planner", "Music/DJ", 
    "Attire", "Tailor", "Makeup Artist", "Hair Stylist", "Officiant", "Rentals",
    "Baker", "Florist", "Henna Artist", "Traditional Dancers", "Other"
  ];

  const usStates = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
  ];

  const canadianProvinces = [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
    "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan"
  ];

  const states = selectedCountry === 'Canada' ? canadianProvinces : 
                 selectedCountry === 'USA' ? usStates : 
                 [...usStates, ...canadianProvinces];

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = searchQuery === '' || 
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loadingVendors) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 relative pb-24">
      <AfricanPattern className="text-purple-600" opacity={0.03} />

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Wedding Marketplace</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Your Dream Wedding Starts Here</h2>
        <p className="text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          Discover and connect with top wedding vendors specializing in African and multicultural celebrations. From venues to photographers, find everything you need for your special day.
        </p>

        {/* Search and Filters */}
        <Card className="mb-8 bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger>
                  <SelectValue placeholder="State/Province" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states.map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedState('all');
                  setSelectedCountry('all');
                  setSearchQuery('');
                }}
                variant="outline"
              >
                <Filter size={18} className="mr-2" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.length > 0 ? (
            filteredVendors.map(vendor => (
              <Card key={vendor.id} className="bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <img 
                    src={vendor.image_url || 'https://images.unsplash.com/photo-1590059990212-e5628b082084?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'} 
                    alt={vendor.name} 
                    className="rounded-lg mb-4 object-cover h-48 w-full"
                  />
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center justify-between flex-wrap gap-2">
                    {vendor.name}
                    {vendor.is_featured && <Badge className="bg-amber-500"><Sparkles size={14} className="mr-1" /> Featured</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-gray-700 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{vendor.category}</Badge>
                    {vendor.country && <Badge variant="secondary">{vendor.country}</Badge>}
                  </div>
                  <p className="flex items-center gap-2">
                    <MapPin size={16} className="flex-shrink-0" />
                    <span>{vendor.location}{vendor.state && `, ${vendor.state}`}</span>
                  </p>
                  {vendor.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {vendor.specialties.slice(0, 3).map((spec, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">{spec}</Badge>
                      ))}
                    </div>
                  )}
                  <p className="line-clamp-2">{vendor.description}</p>
                  
                  <div className="pt-2 space-y-2 border-t">
                    {vendor.phone && (
                      <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-purple-600 hover:underline">
                        <Phone size={14} />
                        {vendor.phone}
                      </a>
                    )}
                    {vendor.email && (
                      <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-purple-600 hover:underline">
                        <Mail size={14} />
                        {vendor.email}
                      </a>
                    )}
                    {vendor.website && (
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 hover:underline">
                        <Globe size={14} />
                        Visit Website
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Heart size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No vendors match your search criteria.</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or search terms</p>
              <Button 
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedState('all');
                  setSelectedCountry('all');
                  setSearchQuery('');
                }}
                variant="outline"
                className="mt-4"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}