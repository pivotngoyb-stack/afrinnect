import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Tier requirements for features
export const TIER_FEATURES = {
  unlimited_likes: ['premium', 'elite', 'vip'],
  see_who_liked: ['premium', 'elite', 'vip'],
  advanced_filters: ['premium', 'elite', 'vip'],
  profile_boost: ['premium', 'elite', 'vip'],
  video_calls: ['elite', 'vip'],
  virtual_gifts: ['elite', 'vip'],
  read_receipts: ['premium', 'elite', 'vip'],
  rewind: ['premium', 'elite', 'vip'],
  unlimited_boosts: ['elite', 'vip'],
  priority_ranking: ['elite', 'vip'],
  concierge_support: ['vip'],
  featured_profile: ['vip']
};

export function hasAccess(userTier, feature) {
  const tier = userTier || 'free';
  const requiredTiers = TIER_FEATURES[feature] || [];
  return requiredTiers.includes(tier);
}

export default function TierGate({ 
  userTier, 
  requiredFeature, 
  children,
  fallback = null,
  showUpgradePrompt = true 
}) {
  const tier = userTier || 'free';
  const access = hasAccess(tier, requiredFeature);

  if (access) {
    return <>{children}</>;
  }

  if (!showUpgradePrompt) {
    return fallback;
  }

  const requiredTiers = TIER_FEATURES[requiredFeature] || [];
  const lowestTier = requiredTiers[0];

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-purple-50">
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Crown size={32} className="text-white" />
        </div>
        <h3 className="text-lg font-bold mb-2">Premium Feature</h3>
        <p className="text-gray-600 mb-4">
          Upgrade to {lowestTier.charAt(0).toUpperCase() + lowestTier.slice(1)} to unlock this feature
        </p>
        <Link to={createPageUrl('PricingPlans')}>
          <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
            <Crown size={18} className="mr-2" />
            Upgrade Now
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}