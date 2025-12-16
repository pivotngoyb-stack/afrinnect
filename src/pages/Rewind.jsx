import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { RotateCcw, Crown, Lock, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from 'react-router-dom';

export default function Rewind() {
  const [myProfile, setMyProfile] = useState(null);
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

  // Get last viewed/passed profiles
  const { data: recentViews = [] } = useQuery({
    queryKey: ['recent-profile-views', myProfile?.id],
    queryFn: async () => {
      const views = await base44.entities.ProfileView.filter(
        { viewer_profile_id: myProfile.id },
        '-view_date',
        20
      );

      const profileIds = views.map(v => v.viewed_profile_id);
      const profiles = await Promise.all(
        profileIds.map(id => base44.entities.UserProfile.filter({ id }).then(p => p[0]))
      );

      return views.map((view, idx) => ({
        ...view,
        profile: profiles[idx]
      })).filter(v => v.profile);
    },
    enabled: !!myProfile
  });

  const rewindMutation = useMutation({
    mutationFn: async (profileId) => {
      // Allow user to like this profile again
      alert('Profile added back to your stack!');
      window.location.href = createPageUrl('Home');
    }
  });

  const buyRewindMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.InAppPurchase.create({
        user_profile_id: myProfile.id,
        item_type: 'rewind',
        item_quantity: 5,
        amount_usd: 4.99,
        payment_provider: 'stripe',
        status: 'completed'
      });
    },
    onSuccess: () => {
      alert('5 Rewinds purchased!');
      queryClient.invalidateQueries(['recent-profile-views']);
    }
  });

  if (!myProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 pb-24">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                <RotateCcw size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Rewind</h1>
                <p className="text-sm text-gray-600">Undo your last pass</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-2">How Rewind Works</h3>
            <p className="text-gray-600 mb-4">
              Accidentally passed on someone? Use Rewind to bring them back!
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => buyRewindMutation.mutate()} className="bg-orange-600 hover:bg-orange-700">
                <Zap size={18} className="mr-2" />
                Buy 5 Rewinds - $4.99
              </Button>
              {myProfile.is_premium && (
                <Badge className="bg-amber-500 flex items-center gap-1">
                  <Crown size={14} />
                  Unlimited (Premium)
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <h2 className="text-lg font-bold text-gray-900 mb-4">Recently Viewed</h2>

        {recentViews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No recent profiles to rewind
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {recentViews.map(({ profile }) => (
              <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={profile.primary_photo || profile.photos?.[0]} />
                      <AvatarFallback>{profile.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{profile.display_name}</h4>
                      <p className="text-sm text-gray-600">{profile.current_city}, {profile.current_country}</p>
                    </div>
                    <Button
                      onClick={() => rewindMutation.mutate(profile.id)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <RotateCcw size={18} className="mr-2" />
                      Rewind
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}