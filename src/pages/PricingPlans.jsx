import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Crown, Heart, Eye, Filter, Sparkles, Zap, Globe, Shield, 
  Check, Star, Infinity, Users, MessageCircle, Award, Verified
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AfricanPattern from '@/components/shared/AfricanPattern';

const PRICING_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      { text: 'Profile creation', included: true },
      { text: 'Up to 3 photos', included: true },
      { text: '10 likes per day', included: true },
      { text: 'Basic filters only', included: true },
      { text: 'Match and chat', included: true },
      { text: 'See who liked you', included: false },
      { text: 'Advanced filters', included: false },
      { text: 'No ads', included: false }
    ]
  },
  premium: {
    name: 'Premium',
    subtitle: 'Most Popular',
    prices: {
      monthly: { amount: 14.99, period: 'month', total: 14.99 },
      quarterly: { amount: 11.66, period: 'month', total: 34.99, save: '22%' },
      yearly: { amount: 9.99, period: 'month', total: 119.99, save: '33%' }
    },
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Unlimited likes', included: true, icon: Infinity },
      { text: 'See who liked you', included: true, icon: Eye },
      { text: 'Unlimited messaging', included: true, icon: MessageCircle },
      { text: 'Advanced cultural filters', included: true, icon: Filter },
      { text: 'Voice notes', included: true, icon: Sparkles },
      { text: 'No ads', included: true, icon: Star },
      { text: 'AI match suggestions', included: true, icon: Sparkles },
      { text: 'Travel mode', included: true, icon: Globe },
      { text: '1 profile boost/month', included: true, icon: Zap }
    ],
    color: 'purple'
  },
  elite: {
    name: 'Elite',
    subtitle: 'For Serious Relationships',
    prices: {
      monthly: { amount: 29.99, period: 'month', total: 29.99 },
      quarterly: { amount: 26.66, period: 'month', total: 79.99, save: '11%' }
    },
    features: [
      { text: 'Everything in Premium', included: true },
      { text: 'Verified badge', included: true, icon: Verified },
      { text: 'Profile priority ranking', included: true, icon: Award },
      { text: 'Read receipts', included: true, icon: Check },
      { text: 'Unlimited profile boosts', included: true, icon: Zap },
      { text: 'Message priority delivery', included: true, icon: MessageCircle },
      { text: 'Cultural compatibility quizzes', included: true, icon: Heart },
      { text: 'Early access to events', included: true, icon: Users }
    ],
    color: 'amber'
  },
  vip: {
    name: 'VIP Matchmaker',
    subtitle: 'Concierge Service',
    prices: {
      monthly: { amount: 99.99, period: 'month', total: 99.99 },
      '6months': { amount: 83.17, period: 'month', total: 499.00, save: '17%' }
    },
    features: [
      { text: 'Everything in Elite', included: true },
      { text: 'Human matchmaker assistance', included: true, icon: Users },
      { text: 'Personalized profile optimization', included: true, icon: Star },
      { text: 'Curated introductions', included: true, icon: Heart },
      { text: 'Private concierge support', included: true, icon: Shield },
      { text: 'Invitation-only events', included: true, icon: Crown },
      { text: 'Relationship coaching access', included: true, icon: Award }
    ],
    color: 'rose'
  }
};

export default function PricingPlans() {
  const [selectedTier, setSelectedTier] = useState('premium');
  const [selectedBilling, setSelectedBilling] = useState('yearly');
  const [myProfile, setMyProfile] = useState(null);
  const [userCountry, setUserCountry] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            setMyProfile(profiles[0]);
            setUserCountry(profiles[0].current_country);
          }
        }
      } catch (e) {
        console.log('Not logged in');
      }
    };
    fetchProfile();
  }, []);

  // Regional pricing for Africa
  const isAfricanCountry = userCountry && ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Ethiopia', 'Egypt', 'Morocco'].includes(userCountry);
  const regionalDiscount = isAfricanCountry ? 0.5 : 1; // 50% off for African countries

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const tier = PRICING_TIERS[selectedTier];
      const priceInfo = tier.prices[selectedBilling];
      const finalPrice = priceInfo.total * regionalDiscount;

      const endDate = new Date();
      if (selectedBilling === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
      else if (selectedBilling === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
      else if (selectedBilling === '6months') endDate.setMonth(endDate.getMonth() + 6);
      else endDate.setMonth(endDate.getMonth() + 1);

      // Create subscription
      await base44.entities.Subscription.create({
        user_profile_id: myProfile.id,
        plan_type: `${selectedTier}_${selectedBilling}`,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        amount_paid: finalPrice,
        currency: 'USD',
        payment_provider: 'manual',
        boosts_remaining: selectedTier === 'elite' ? 999 : 5,
        super_likes_remaining: selectedTier === 'elite' ? 999 : 30,
        auto_renew: true,
        regional_pricing: isAfricanCountry
      });

      // Update profile
      await base44.entities.UserProfile.update(myProfile.id, {
        is_premium: true,
        premium_until: endDate.toISOString()
      });
    },
    onSuccess: () => {
      window.location.href = createPageUrl('Home');
    }
  });

  const currentTier = PRICING_TIERS[selectedTier];
  const price = currentTier.prices?.[selectedBilling];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 relative">
      <AfricanPattern className="text-purple-600" opacity={0.03} />

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Choose Your Plan</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
        {/* Regional Pricing Banner */}
        {isAfricanCountry && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-green-100 border border-green-300 rounded-2xl text-center"
          >
            <p className="font-semibold text-green-800">
              🎉 Special African Pricing: 50% OFF for {userCountry}
            </p>
          </motion.div>
        )}

        {/* Tier Selection */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {Object.entries(PRICING_TIERS).filter(([key]) => key !== 'free').map(([key, tier]) => (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${
                selectedTier === key
                  ? 'ring-2 ring-purple-600 shadow-xl scale-105'
                  : 'hover:shadow-lg'
              }`}
              onClick={() => setSelectedTier(key)}
            >
              <CardContent className="p-6">
                {tier.subtitle && (
                  <Badge className="mb-3 bg-purple-600">{tier.subtitle}</Badge>
                )}
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                {tier.prices && (
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-purple-600">
                      ${(tier.prices[selectedBilling].total * regionalDiscount).toFixed(2)}
                    </span>
                    <span className="text-gray-500 ml-2">
                      /{tier.prices[selectedBilling].period === 'month' ? 'mo' : '6mo'}
                    </span>
                  </div>
                )}
                <ul className="space-y-2">
                  {tier.features.slice(0, 5).map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check size={16} className="text-green-500" />
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Billing Period Selection */}
        {currentTier.prices && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Select Billing Period</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {Object.entries(currentTier.prices).map(([period, info]) => (
                  <button
                    key={period}
                    onClick={() => setSelectedBilling(period)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedBilling === period
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {info.save && (
                      <Badge className="mb-2 bg-green-500">Save {info.save}</Badge>
                    )}
                    <p className="font-bold text-lg capitalize">{period.replace('6months', '6 Months')}</p>
                    <p className="text-2xl font-bold text-purple-600 my-2">
                      ${(info.total * regionalDiscount).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      ${(info.amount * regionalDiscount).toFixed(2)}/{info.period}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feature Comparison */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">All Features</h3>
            <div className="space-y-3">
              {currentTier.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  {feature.icon && <feature.icon size={18} className="text-purple-600" />}
                  <span>{feature.text}</span>
                  <Check size={18} className="text-green-500 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={() => subscribeMutation.mutate()}
            disabled={subscribeMutation.isPending}
            className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
          >
            {subscribeMutation.isPending ? (
              'Processing...'
            ) : (
              <>
                Subscribe to {currentTier.name}
                {price && ` - $${(price.total * regionalDiscount).toFixed(2)}`}
              </>
            )}
          </Button>
          <p className="text-center text-xs text-gray-500 mt-2">
            Cancel anytime • Secure payment • Terms apply
          </p>
        </div>
      </div>
    </div>
  );
}