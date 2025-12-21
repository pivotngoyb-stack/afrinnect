import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Zap, Crown, Clock, Users, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BOOST_OPTIONS = [
  {
    type: '1_hour',
    duration: '1 Hour',
    price: 4.99,
    multiplier: '3x',
    description: 'Get 3x more profile views for 1 hour'
  },
  {
    type: '3_hours',
    duration: '3 Hours',
    price: 9.99,
    multiplier: '5x',
    description: 'Get 5x more profile views for 3 hours',
    popular: true
  },
  {
    type: '24_hours',
    duration: '24 Hours',
    price: 19.99,
    multiplier: '10x',
    description: 'Get 10x more profile views for 24 hours'
  }
];

export default function BoostProfile() {
  const [myProfile, setMyProfile] = useState(null);
  const [selectedBoost, setSelectedBoost] = useState('3_hours');

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

  const activateBoostMutation = useMutation({
    mutationFn: async (boostType) => {
      const tier = myProfile?.subscription_tier || 'free';
      
      // Check boost limits by tier
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = today.substring(0, 7); // YYYY-MM
      
      const existingBoosts = await base44.entities.ProfileBoost.filter({
        user_profile_id: myProfile.id,
        started_at: { $gte: `${thisMonth}-01T00:00:00.000Z` }
      });
      
      // Premium: 1 boost per month, Elite/VIP: unlimited
      if (tier === 'premium' && existingBoosts.length >= 1) {
        throw new Error('Premium users get 1 boost per month. Upgrade to Elite for unlimited boosts!');
      } else if (tier === 'free' && existingBoosts.length >= 0) {
        throw new Error('Boosts require Premium or higher subscription');
      }
      
      const now = new Date();
      const expiresAt = new Date(now);
      
      if (boostType === '1_hour') expiresAt.setHours(expiresAt.getHours() + 1);
      else if (boostType === '3_hours') expiresAt.setHours(expiresAt.getHours() + 3);
      else expiresAt.setHours(expiresAt.getHours() + 24);

      await base44.entities.ProfileBoost.create({
        user_profile_id: myProfile.id,
        boost_type: boostType,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
        views_gained: 0,
        likes_gained: 0
      });

      // Update profile boost status
      await base44.entities.UserProfile.update(myProfile.id, {
        profile_boost_active: true
      });

      // Log purchase
      const boost = BOOST_OPTIONS.find(b => b.type === boostType);
      await base44.entities.InAppPurchase.create({
        user_profile_id: myProfile.id,
        item_type: 'boost',
        item_quantity: 1,
        amount_usd: boost.price,
        payment_provider: 'stripe',
        status: 'completed'
      });
    },
    onSuccess: () => {
      alert('Profile boost activated! Your profile is now more visible.');
      window.location.href = createPageUrl('Profile');
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Boost Your Profile</h1>
            <p className="text-gray-600 mt-2">
              Get up to 10x more profile views and matches
            </p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Users size={32} className="mx-auto text-purple-600 mb-2" />
                <p className="text-2xl font-bold">10x</p>
                <p className="text-sm text-gray-600">More Visibility</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Eye size={32} className="mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold">5x</p>
                <p className="text-sm text-gray-600">Profile Views</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Crown size={32} className="mx-auto text-amber-600 mb-2" />
                <p className="text-2xl font-bold">Top</p>
                <p className="text-sm text-gray-600">Priority Ranking</p>
              </CardContent>
            </Card>
          </div>

          {/* Boost Options */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {BOOST_OPTIONS.map(boost => (
              <Card
                key={boost.type}
                className={`cursor-pointer transition-all ${
                  selectedBoost === boost.type
                    ? 'ring-2 ring-purple-600 scale-105'
                    : 'hover:shadow-lg'
                }`}
                onClick={() => setSelectedBoost(boost.type)}
              >
                <CardHeader>
                  {boost.popular && (
                    <Badge className="w-fit mb-2 bg-amber-500">Most Popular</Badge>
                  )}
                  <CardTitle className="flex items-center gap-2">
                    <Clock size={20} />
                    {boost.duration}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-3xl font-bold text-purple-600">${boost.price}</p>
                    <Badge className="mt-2" variant="outline">{boost.multiplier} Visibility</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{boost.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* How it Works */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>How Profile Boost Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Top of the Stack</p>
                    <p className="text-sm text-gray-600">Your profile appears first for other users</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Priority Visibility</p>
                    <p className="text-sm text-gray-600">Shown to more people in your area</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium">More Matches</p>
                    <p className="text-sm text-gray-600">Get up to 10x more likes and matches</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => activateBoostMutation.mutate(selectedBoost)}
            disabled={!myProfile || activateBoostMutation.isPending}
            className="w-full py-6 text-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          >
            <Zap size={20} className="mr-2" />
            Activate Boost - ${BOOST_OPTIONS.find(b => b.type === selectedBoost)?.price}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}