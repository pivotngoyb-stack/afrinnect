import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Heart, Sparkles, MapPin, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AfricanPattern from '@/components/shared/AfricanPattern';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { Badge } from "@/components/ui/badge";

export default function WeddingMarketplace() {
  const [myProfile, setMyProfile] = useState(null);

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
    queryKey: ['wedding-vendors'],
    queryFn: () => base44.entities.WeddingVendor.list('-is_featured', 50),
    staleTime: 300000,
    retry: 1
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

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Your Dream Wedding Starts Here</h2>
        <p className="text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          Discover and connect with top wedding vendors specializing in African and multicultural celebrations. From venues to photographers, find everything you need for your special day.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.length > 0 ? (
            vendors.map(vendor => (
              <Card key={vendor.id} className="bg-white/70 backdrop-blur-md border border-gray-200 shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <img 
                    src={vendor.image_url || 'https://images.unsplash.com/photo-1590059990212-e5628b082084?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'} 
                    alt={vendor.name} 
                    className="rounded-lg mb-4 object-cover h-40 w-full"
                  />
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-between">
                    {vendor.name}
                    {vendor.is_featured && <Badge className="bg-amber-500"><Sparkles size={14} className="mr-1" /> Featured</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-gray-700 text-sm">
                  <p className="flex items-center gap-2"><Briefcase size={16} />{vendor.category}</p>
                  <p className="flex items-center gap-2"><MapPin size={16} />{vendor.location}</p>
                  <p className="line-clamp-3">{vendor.description}</p>
                  <Button variant="outline" className="w-full mt-4">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Heart size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No wedding vendors found at the moment.</p>
              <p className="text-gray-500 text-sm">Check back later or suggest a vendor!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}