import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, Clock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TrialExpiryBanner({ userProfile }) {
  if (!userProfile?.subscription_tier === 'premium' || !userProfile?.premium_until) {
    return null;
  }

  const expiresAt = new Date(userProfile.premium_until);
  const now = new Date();
  const hoursLeft = Math.floor((expiresAt - now) / (1000 * 60 * 60));
  const daysLeft = Math.floor(hoursLeft / 24);
  
  // Don't show if more than 24 hours left
  if (hoursLeft > 24) {
    return null;
  }

  // Already expired
  if (hoursLeft <= 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4"
      >
        <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300">
          <Crown className="h-5 w-5 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Your Premium trial has ended</p>
              <p className="text-sm text-gray-600 mt-1">
                Upgrade now to keep unlimited likes, profile boosts, and more!
              </p>
            </div>
            <Link to={createPageUrl('PricingPlans')}>
              <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 ml-4">
                <Sparkles size={16} className="mr-2" />
                Upgrade
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  }

  // Less than 24 hours left
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4"
    >
      <Alert className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-300">
        <Clock className="h-5 w-5 text-purple-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">
              Premium trial ends in {hoursLeft < 24 ? `${hoursLeft} hours` : `${daysLeft} days`}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Don't lose access to unlimited likes and profile boosts!
            </p>
          </div>
          <Link to={createPageUrl('PricingPlans')}>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 ml-4">
              <Crown size={16} className="mr-2" />
              Upgrade Now
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}