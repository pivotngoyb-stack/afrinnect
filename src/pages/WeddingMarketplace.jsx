import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Search, MapPin, DollarSign, Star, Phone, Mail, Globe, Heart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function WeddingMarketplace() {
  const [myProfile, setMyProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');

  useEffect(() => {
    const fetchProfile = async () => {
      const user = await base44.auth.me();
      if (user) {
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setMyProfile(profiles[0]);
      }
    };
    fetchProfile();
  }, []);

  const { data: vendors = [] } = useQuery({
    queryKey: ['wedding-vendors'],
    queryFn: () => base44.entities.WeddingVendor.filter({ is_verified: true }, '-rating')
  });

  const categories = [
    { value: 'all', label: 'All Services', icon: '💍' },
    { value: 'venue', label: 'Venues', icon: '🏛️' },
    { value: 'photographer', label: 'Photographers', icon: '📸' },
    { value: 'catering', label: 'Catering', icon: '🍽️' },
    { value: 'dj', label: 'DJ/Music', icon: '🎵' },
    { value: 'decorator', label: 'Decorators', icon: '🎨' },
    { value: 'planner', label: 'Planners', icon: '📋' },
    { value: 'clothing', label: 'Clothing', icon: '👗' },
    { value: 'jewelry', label: 'Jewelry', icon: '💎' },
    { value: 'makeup', label: 'Makeup', icon: '💄' }
  ];

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         v.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    const matchesCountry = selectedCountry === 'all' || v.country === selectedCountry;
    return matchesSearch && matchesCategory && matchesCountry;
  });

  const countries = [...new Set(vendors.map(v => v.country))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 pb-24">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Profile')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Wedding Services</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero */}
        <Card className="mb-6 bg-gradient-to-br from-pink-600 to-purple-600 text-white border-0">
          <CardContent className="p-6 text-center">
            <Heart size={48} className="mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Plan Your Dream African Wedding</h2>
            <p className="text-white/90">Connect with verified vendors across Africa for your special day</p>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => (
            <Button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              size="sm"
              className="whitespace-nowrap"
            >
              {cat.icon} {cat.label}
            </Button>
          ))}
        </div>

        {/* Vendors Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map(vendor => (
            <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                {vendor.photos?.[0] && (
                  <img
                    src={vendor.photos[0]}
                    alt={vendor.vendor_name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="capitalize">{vendor.category.replace('_', ' ')}</Badge>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-500 fill-amber-500" />
                      <span className="text-sm font-medium">{vendor.rating || 5.0}</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{vendor.vendor_name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{vendor.description}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin size={14} />
                    <span>{vendor.city}, {vendor.country}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <DollarSign size={14} />
                    <span>{vendor.price_range}</span>
                  </div>
                  <div className="flex gap-2">
                    {vendor.contact_phone && (
                      <Button size="sm" variant="outline" className="flex-1">
                        <Phone size={14} className="mr-1" />
                        Call
                      </Button>
                    )}
                    {vendor.contact_email && (
                      <Button size="sm" variant="outline" className="flex-1">
                        <Mail size={14} className="mr-1" />
                        Email
                      </Button>
                    )}
                    {vendor.website && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(vendor.website, '_blank')}>
                        <Globe size={14} className="mr-1" />
                        Site
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredVendors.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500">No vendors found. Try adjusting your filters.</p>
          </div>
        )}
      </main>
    </div>
  );
}