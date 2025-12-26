import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Crown, Heart, Eye, Filter, Sparkles, Zap,
  Globe, Shield, Check, Star, Infinity
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AfricanPattern from '@/components/shared/AfricanPattern';

const FEATURES = [
  { icon: Infinity, title: 'Unlimited Likes', description: 'Like as many profiles as you want', free: false },
  { icon: Eye, title: 'See Who Likes You', description: 'Know who\'s interested before you swipe', free: false },
  { icon: Filter, title: 'Advanced Filters', description: 'Filter by heritage, tribe, religion & more', free: false },
  { icon: Sparkles, title: 'Super Likes', description: '5 super likes per day to stand out', free: false },
  { icon: Zap, title: 'Profile Boost', description: 'Get seen by more people', free: false },
  { icon: Globe, title: 'Travel Mode', description: 'Connect with people anywhere in the world', free: false },
  { icon: Shield, title: 'Priority Support', description: 'Get help faster when you need it', free: false },
  { icon: Star, title: 'No Ads', description: 'Enjoy an ad-free experience', free: false }
];

const PLANS = {
  monthly: { price: 14.99, period: 'month', save: null },
  yearly: { price: 119.99, period: 'year', save: '33%' },
  lifetime: { price: 299.99, period: 'lifetime', save: 'Best Value' }
};

export default function Premium() {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            setMyProfile(profiles[0]);
          }
        }
      } catch (e) {
        console.log('Not logged in');
      }
    };
    fetchProfile();
  }, []);

  const handleSubscribe = () => {
    // Redirect to pricing page with Braintree payment
    window.location.href = createPageUrl('PricingPlans');
  };

  if (myProfile?.is_premium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-purple-50 relative">
        <AfricanPattern className="text-amber-600" opacity={0.03} />
        
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Link to={createPageUrl('Profile')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft size={24} />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">Premium</h1>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl"
          >
            <Crown size={48} className="text-white" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You're a Premium Member!</h2>
          <p className="text-gray-500 mb-8">Enjoy all the exclusive features</p>

          <div className="grid gap-3">
            {FEATURES.map((feature, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <feature.icon size={20} className="text-amber-600" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                  </div>
                  <Check size={20} className="text-green-500 ml-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-amber-900 relative overflow-hidden">
      <AfricanPattern className="text-white" opacity={0.05} />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to={createPageUrl('Profile')}>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <ArrowLeft size={24} />
            </Button>
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl rotate-12"
          >
            <Crown size={40} className="text-white -rotate-12" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-white mb-3">
            Ubuntu Premium
          </h1>
          <p className="text-white/70 text-lg">
            Find your perfect match faster
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-8"
        >
          <h3 className="text-white font-semibold mb-4">Premium Features</h3>
          <div className="space-y-4">
            {FEATURES.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <feature.icon size={18} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white text-sm">{feature.title}</h4>
                </div>
                <Check size={18} className="text-amber-400" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Plan Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4 mb-8"
        >
          {Object.entries(PLANS).map(([key, plan]) => (
            <button
              key={key}
              onClick={() => setSelectedPlan(key)}
              className={`w-full p-4 rounded-2xl border-2 transition-all ${
                selectedPlan === key
                  ? 'bg-white border-amber-400 shadow-lg'
                  : 'bg-white/10 border-white/20 hover:bg-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold capitalize ${selectedPlan === key ? 'text-gray-900' : 'text-white'}`}>
                      {key}
                    </h4>
                    {plan.save && (
                      <Badge className={`text-xs ${key === 'lifetime' ? 'bg-amber-500' : 'bg-green-500'} text-white`}>
                        {plan.save}
                      </Badge>
                    )}
                  </div>
                  <p className={`text-sm ${selectedPlan === key ? 'text-gray-500' : 'text-white/60'}`}>
                    Billed {plan.period === 'lifetime' ? 'once' : `per ${plan.period}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${selectedPlan === key ? 'text-gray-900' : 'text-white'}`}>
                    ${plan.price}
                  </p>
                  {key === 'yearly' && (
                    <p className={`text-xs ${selectedPlan === key ? 'text-gray-500' : 'text-white/60'}`}>
                      $9.99/month
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={handleSubscribe}
            className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-xl shadow-amber-500/30"
          >
            Subscribe Now
          </Button>
          
          <p className="text-center text-white/50 text-xs mt-4">
            Cancel anytime. Terms & conditions apply.
          </p>
        </motion.div>
      </main>
    </div>
  );
}