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
  video_calls_taste: ['premium'], // 5-sec taste for premium/founding members
  virtual_gifts: ['elite', 'vip'],
  read_receipts: ['premium', 'elite', 'vip'],
  rewind: ['premium', 'elite', 'vip'],
  unlimited_boosts: ['elite', 'vip'],
  priority_ranking: ['elite', 'vip'],
  concierge_support: ['vip'],
  featured_profile: ['vip']
};

// Check if user is a founding member with taste mode access
export function isFoundingMemberWithTasteAccess(profile) {
  if (!profile) return false;
  return profile.is_founding_member && 
         profile.subscription_tier === 'premium' &&
         new Date(profile.founding_member_trial_ends_at) > new Date();
}

export function hasAccess(userTier, feature) {
  const tier = userTier || 'free';
  const requiredTiers = TIER_FEATURES[feature] || [];
  return requiredTiers.includes(tier);
}

import { useLanguage } from '@/components/i18n/LanguageContext';

export default function TierGate({ 
  userTier, 
  requiredFeature, 
  children,
  fallback = null,
  showUpgradePrompt = true 
}) {
  const { t } = useLanguage();
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
  const tierName = lowestTier.charAt(0).toUpperCase() + lowestTier.slice(1);

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-purple-50">
      <CardContent className="p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Crown size={32} className="text-white" />
        </div>
        <h3 className="text-lg font-bold mb-2">{t('admin.tierGate.premiumFeature')}</h3>
        <p className="text-gray-600 mb-4">
          {t('admin.tierGate.upgradeToUnlock').replace('{tier}', tierName)}
        </p>
        <Link to={createPageUrl('PricingPlans')}>
          <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
            <Crown size={18} className="mr-2" />
            {t('admin.tierGate.upgradeNow')}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}