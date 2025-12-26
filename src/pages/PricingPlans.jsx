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
import { useConversionTracker, CONVERSION_EVENTS, trackRevenue } from '@/components/shared/ConversionTracker';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AfricanPattern from '@/components/shared/AfricanPattern';
import BraintreeDropIn from '@/components/payment/BraintreeDropIn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
      { text: 'Advanced filters (country, state, religion)', included: true, icon: Filter },
      { text: '1 profile boost/month', included: true, icon: Zap }
    ],
    color: 'purple'
  },
  elite: {
    name: 'Elite',
    subtitle: 'Video Calls & Virtual Gifts',
    prices: {
      monthly: { amount: 19.99, period: 'month', total: 19.99 },
      quarterly: { amount: 16.66, period: 'month', total: 49.99, save: '17%' }
    },
    features: [
      { text: 'Everything in Premium', included: true },
      { text: 'Video calls', included: true, icon: MessageCircle },
      { text: 'Virtual gifts', included: true, icon: Heart },
      { text: 'Elite verified badge', included: true, icon: Verified },
      { text: 'Profile priority ranking', included: true, icon: Award },
      { text: 'Unlimited profile boosts', included: true, icon: Zap },
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
      { text: 'VIP verified badge', included: true, icon: Crown },
      { text: 'Priority customer support', included: true, icon: Shield },
      { text: 'Exclusive VIP events access', included: true, icon: Users },
      { text: 'Featured profile placement', included: true, icon: Star }
    ],
    color: 'rose'
  }
};

export default function PricingPlans() {
  const { trackEvent } = useConversionTracker();
  const [selectedTier, setSelectedTier] = useState('premium');
  const [selectedBilling, setSelectedBilling] = useState('yearly');
  const [myProfile, setMyProfile] = useState(null);
  const [userCountry, setUserCountry] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

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

  const handlePaymentSuccess = (data) => {
    trackRevenue(price.total * regionalDiscount, 'USD', `${selectedTier}_subscription`, myProfile.id);
    trackEvent(CONVERSION_EVENTS.PREMIUM_PURCHASE, {
      tier: selectedTier,
      billing: selectedBilling,
      amount: price.total * regionalDiscount
    });
    window.location.href = createPageUrl('Home');
  };

  const handlePaymentError = (error) => {
    alert(`Payment failed: ${error}`);
  };

  const currentTier = PRICING_TIERS[selectedTier];
  const price = currentTier?.prices?.[selectedBilling];

  if (!currentTier || !currentTier.prices) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Invalid tier selected. Please go back and try again.</p>
      </div>
    );
  }

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

      <main className="max-w-7xl mx-auto px-4 py-8 pb-48">
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
                {tier.prices && tier.prices[selectedBilling] && (
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

      {/* Bottom CTA - Fixed with safe area padding */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t shadow-lg p-4 pb-24 z-50 safe-area-inset-bottom">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={() => {
              trackEvent(CONVERSION_EVENTS.PREMIUM_CLICK, {
                tier: selectedTier,
                billing: selectedBilling,
                price: price.total * regionalDiscount
              });
              setShowPayment(true);
            }}
            disabled={!myProfile}
            className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-xl"
          >
            {!myProfile ? (
              'Please log in to subscribe'
            ) : price ? (
              <>
                Subscribe - ${(price.total * regionalDiscount).toFixed(2)}
              </>
            ) : (
              `Subscribe to ${currentTier.name}`
            )}
          </Button>
          <p className="text-center text-xs text-gray-500 mt-2">
            {myProfile ? 'Secure payment via Braintree • Cancel anytime' : 'Sign in required'}
          </p>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Purchase</DialogTitle>
          </DialogHeader>
          <BraintreeDropIn
            amount={(price?.total || 0) * regionalDiscount}
            planName={currentTier.name}
            billingPeriod={selectedBilling}
            tier={selectedTier}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}