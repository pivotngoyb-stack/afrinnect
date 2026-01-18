import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Crown, Heart, Eye, Filter, Sparkles, Zap, Globe, Shield, 
  Check, Star, Infinity, Users, MessageCircle, Award, Verified, X
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useConversionTracker, CONVERSION_EVENTS, trackRevenue } from '@/components/shared/ConversionTracker';
import { Badge } from "@/components/ui/badge";
import AfricanPattern from '@/components/shared/AfricanPattern';
import StripePaymentModal from '@/components/payment/StripePaymentModal';

const PRICING_TIERS = {
  premium: {
    name: 'Premium',
    label: 'Get Premium',
    icon: Heart,
    mainFeature: 'Unlimited Likes',
    subFeature: 'Send as many likes as you want.',
    gradient: 'from-green-400 to-green-600',
    buttonColor: 'bg-green-500 hover:bg-green-600',
    textColor: 'text-green-600',
    borderColor: 'border-green-500',
    prices: {
      monthly: { amount: 14.99, period: 'month', total: 14.99 },
      quarterly: { amount: 11.66, period: 'month', total: 34.99, save: '22%' },
      yearly: { amount: 9.99, period: 'month', total: 119.99, save: '33%' }
    },
    features: [
      'Unlimited likes',
      'See who liked you',
      'Unlimited messaging',
      'Advanced filters',
      '1 free Boost a month'
    ]
  },
  elite: {
    name: 'Elite',
    label: 'Get Elite',
    icon: Star,
    mainFeature: 'See Who Likes You',
    subFeature: 'Match with them instantly.',
    gradient: 'from-amber-400 to-amber-600',
    buttonColor: 'bg-amber-500 hover:bg-amber-600',
    textColor: 'text-amber-600',
    borderColor: 'border-amber-500',
    prices: {
      monthly: { amount: 24.99, period: 'month', total: 24.99 },
      quarterly: { amount: 19.99, period: 'month', total: 59.99, save: '20%' },
      yearly: { amount: 14.99, period: 'month', total: 179.99, save: '40%' }
    },
    features: [
      'Everything in Premium',
      'Video calls',
      'Virtual gifts',
      'Elite verified badge',
      'Priority ranking'
    ]
  },
  vip: {
    name: 'VIP',
    label: 'Get VIP',
    icon: Crown,
    mainFeature: 'Priority & Status',
    subFeature: 'Stand out from the crowd.',
    gradient: 'from-slate-800 to-black',
    buttonColor: 'bg-slate-900 hover:bg-black',
    textColor: 'text-slate-900',
    borderColor: 'border-slate-900',
    prices: {
      monthly: { amount: 99.99, period: 'month', total: 99.99 },
      '6months': { amount: 83.33, period: 'month', total: 499.99, save: '17%' },
      yearly: { amount: 75.00, period: 'month', total: 900.00, save: '25%' }
    },
    features: [
      'Everything in Elite',
      'VIP verified badge',
      'Priority support',
      'Exclusive events',
      'Featured placement'
    ]
  }
};

const PlanCard = ({ tierKey, tier, selectedPlan, onSelect, pricingData, regionalDiscount }) => {
  const isSelected = selectedPlan.tier === tierKey;
  
  // Merge dynamic pricing if available
  const prices = pricingData?.[tierKey]?.prices || tier.prices;

  // Periods to display (ensure order: 12mo, 6mo/quarterly, 1mo)
  const periods = ['yearly', '6months', 'quarterly', 'monthly'].filter(p => prices[p]);

  return (
    <div className={`relative flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 transform ${isSelected ? 'scale-105 z-20 ring-4 ring-offset-4 ' + tier.borderColor : 'scale-100 opacity-90 hover:opacity-100 hover:scale-[1.02] z-10'}`}>
      
      {/* Header */}
      <div className={`bg-gradient-to-b ${tier.gradient} pt-8 pb-12 px-4 text-center text-white relative`}>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
            <tier.icon size={32} className={tier.textColor} fill="currentColor" fillOpacity={0.2} />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-wide uppercase opacity-90 mb-1">{tier.label}</h2>
        <h3 className="text-2xl font-black mb-2">{tier.mainFeature}</h3>
        <p className="text-sm opacity-90">{tier.subFeature}</p>
        
        {/* Pagination Dots (Visual Only) */}
        <div className="flex justify-center gap-1.5 mt-6">
          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-100" />
          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="px-2 -mt-6 grid grid-cols-3 gap-2 relative z-10">
        {periods.map((period) => {
          const price = prices[period];
          const isPlanSelected = isSelected && selectedPlan.period === period;
          
          let durationLabel = '1';
          let unitLabel = 'month';
          if (period === 'yearly') { durationLabel = '12'; unitLabel = 'months'; }
          if (period === '6months') { durationLabel = '6'; unitLabel = 'months'; }
          if (period === 'quarterly') { durationLabel = '3'; unitLabel = 'months'; }

          return (
            <button
              key={period}
              onClick={() => onSelect(tierKey, period)}
              className={`relative flex flex-col items-center justify-center p-2 pt-6 pb-3 rounded-xl border-2 transition-all bg-white
                ${isPlanSelected 
                  ? `${tier.borderColor} shadow-lg` 
                  : 'border-gray-100 text-gray-400 hover:border-gray-200'
                }`}
            >
              {price.save && (
                <div className={`absolute -top-3 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${period === 'yearly' || period === '6months' ? 'bg-amber-500' : 'bg-gray-400'}`}>
                   {period === 'yearly' ? 'Best Value' : 'Most Popular'}
                </div>
              )}
              
              <div className={`text-2xl font-bold leading-none mb-1 ${isPlanSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                {durationLabel}
              </div>
              <div className={`text-[10px] font-medium uppercase mb-2 ${isPlanSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                {unitLabel}
              </div>
              <div className={`text-sm font-semibold mb-0.5 ${isPlanSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                ${(price.amount * regionalDiscount).toFixed(2)}/mo
              </div>
              {price.save && (
                <div className={`text-[10px] font-bold ${isPlanSelected ? tier.textColor : 'text-gray-400'}`}>
                  Save {price.save}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Features List (Collapsible or just small list) */}
      <div className="p-6 pb-24 text-center">
         <div className="space-y-3">
            {tier.features.slice(0, 3).map((feat, i) => (
                <div key={i} className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Check size={14} className={tier.textColor} /> {feat}
                </div>
            ))}
         </div>
      </div>

      {/* Floating Select Button */}
      <div className="absolute bottom-6 left-6 right-6">
        <Button 
          className={`w-full rounded-full py-6 text-lg font-bold shadow-xl transition-transform active:scale-95 ${isSelected ? tier.buttonColor + ' text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          onClick={() => onSelect(tierKey, selectedPlan.period || 'yearly')}
        >
           Select
        </Button>
      </div>
    </div>
  );
};

export default function PricingPlans() {
  const { trackEvent } = useConversionTracker();
  const [selectedPlan, setSelectedPlan] = useState({ tier: 'elite', period: '6months' }); // Default selection
  const [myProfile, setMyProfile] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [pricingData, setPricingData] = useState(null);
  const [stripeConfig, setStripeConfig] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

  useEffect(() => {
    // Basic setup: Auth, Stripe Config, Dynamic Pricing
    const init = async () => {
      try {
        const [user, stripeRes, plans] = await Promise.all([
          base44.auth.me().catch(() => null),
          base44.functions.invoke('getStripeConfig', {}).catch(() => ({ data: {} })),
          base44.entities.PricingPlan.filter({ is_active: true }).catch(() => [])
        ]);

        if (stripeRes.data?.publicKey) setStripeConfig(stripeRes.data);
        
        if (user) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles[0]) setMyProfile(profiles[0]);
        }

        if (plans.length > 0) {
            // Transform dynamic plans logic (kept from original)
            const dynamicPricing = {};
            plans.forEach(plan => {
              const { tier, billing_period: period, price_usd, discount_percentage } = plan;
              if (!dynamicPricing[tier]) dynamicPricing[tier] = { prices: {} };
              
              let total = price_usd;
              if (period === 'yearly') total = price_usd * 12;
              if (period === 'quarterly') total = price_usd * 3;
              if (period === '6months') total = price_usd * 6;
              
              dynamicPricing[tier].prices[period] = {
                amount: price_usd,
                period: 'month',
                total,
                save: discount_percentage ? `${discount_percentage}%` : null
              };
            });
            setPricingData(dynamicPricing);
        }

      } catch (e) {
        console.error("Init error", e);
      }
    };
    init();
  }, []);

  const regionalDiscount = 1;

  const currentTier = PRICING_TIERS[selectedPlan.tier];
  const currentPrices = pricingData?.[selectedPlan.tier]?.prices || currentTier.prices;
  const currentPrice = currentPrices?.[selectedPlan.period];

  const handleSelect = (tier, period) => {
    setSelectedPlan({ tier, period });
  };

  const handleSubscribe = () => {
    if (!myProfile) {
        // Redirect to login or show modal
        base44.auth.redirectToLogin(window.location.href);
        return;
    }
    if (!currentPrice) return;
    
    trackEvent(CONVERSION_EVENTS.PREMIUM_CLICK, {
        tier: selectedPlan.tier,
        billing: selectedPlan.period,
        price: currentPrice.total
    });
    setShowPayment(true);
  };

  // Payment Intent Creation
  useEffect(() => {
    const createIntent = async () => {
        if (showPayment && currentPrice && stripeConfig) {
            try {
                const response = await base44.functions.invoke('createStripePaymentIntent', {
                    amount: currentPrice.total * regionalDiscount,
                    currency: 'usd',
                    planType: `${selectedPlan.tier}_${selectedPlan.period}`,
                    billingPeriod: selectedPlan.period
                });
                if (response.data?.clientSecret) setClientSecret(response.data.clientSecret);
            } catch (e) {
                console.error("Payment intent error", e);
            }
        }
    };
    createIntent();
  }, [showPayment, selectedPlan, currentPrice, stripeConfig]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-gray-50 to-gray-50 -z-10" />
      <AfricanPattern className="text-purple-900" opacity={0.03} />

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft size={20} />
              <span className="font-semibold">Back</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl tracking-tight">
              <span className="text-purple-600">Afrinnect</span> Premium
            </span>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
                Upgrade Your Love Life
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Unlock exclusive features to find your perfect match faster.
            </p>
        </div>

        {/* Pricing Cards Container */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-center">
            <PlanCard 
                tierKey="premium" 
                tier={PRICING_TIERS.premium} 
                selectedPlan={selectedPlan} 
                onSelect={handleSelect} 
                pricingData={pricingData}
                regionalDiscount={regionalDiscount}
            />
            
            <div className="relative md:-mt-8 md:mb-8 z-20"> 
               {/* Elevate the middle card (Elite) */}
               <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider whitespace-nowrap z-30">
                  Most Popular
               </div>
               <PlanCard 
                    tierKey="elite" 
                    tier={PRICING_TIERS.elite} 
                    selectedPlan={selectedPlan} 
                    onSelect={handleSelect} 
                    pricingData={pricingData}
                    regionalDiscount={regionalDiscount}
                />
            </div>

            <PlanCard 
                tierKey="vip" 
                tier={PRICING_TIERS.vip} 
                selectedPlan={selectedPlan} 
                onSelect={handleSelect} 
                pricingData={pricingData}
                regionalDiscount={regionalDiscount}
            />
        </div>

        {/* Action Button Area */}
        <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 mb-4">
                Recurring billing, cancel anytime.
            </p>
            <Button 
                size="lg"
                onClick={handleSubscribe}
                className={`px-12 py-8 text-xl rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 ${PRICING_TIERS[selectedPlan.tier].buttonColor}`}
            >
                {selectedPlan ? (
                     `Get ${PRICING_TIERS[selectedPlan.tier].name} - $${(currentPrice?.total * regionalDiscount).toFixed(2)}`
                ) : 'Select a Plan'}
            </Button>
        </div>

        {/* Trust/Social Proof */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
            <div className="flex flex-col items-center gap-2">
                <Shield className="w-8 h-8 text-gray-400" />
                <span className="font-semibold text-gray-600">Secure Payment</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Globe className="w-8 h-8 text-gray-400" />
                <span className="font-semibold text-gray-600">Global Access</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Zap className="w-8 h-8 text-gray-400" />
                <span className="font-semibold text-gray-600">Instant Activation</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Users className="w-8 h-8 text-gray-400" />
                <span className="font-semibold text-gray-600">24/7 Support</span>
            </div>
        </div>

      </main>

      <StripePaymentModal
        isOpen={showPayment}
        onClose={() => { setShowPayment(false); setClientSecret(null); }}
        clientSecret={clientSecret}
        amount={(currentPrice?.total || 0) * regionalDiscount}
        planName={`${PRICING_TIERS[selectedPlan.tier].name} (${selectedPlan.period})`}
        stripePublicKey={stripeConfig?.publicKey}
        onSuccess={() => {
            setShowPayment(false);
            trackRevenue((currentPrice?.total || 0), 'USD', `${selectedPlan.tier}_subscription`, myProfile?.id);
            window.location.href = createPageUrl('Home');
        }}
      />
    </div>
  );
}