import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Crown, X, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConversionTracker, CONVERSION_EVENTS } from '@/components/shared/ConversionTracker';

export default function PaywallModal({ 
  isOpen, 
  onClose, 
  feature, 
  description,
  benefits = [] 
}) {
  const { trackEvent } = useConversionTracker();

  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    trackEvent(CONVERSION_EVENTS.PREMIUM_CLICK, { 
      feature,
      source: 'paywall_modal' 
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
            <Crown size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Upgrade to Premium</h2>
          <p className="text-gray-600">
            {description || `${feature} is a premium feature`}
          </p>
        </div>

        {benefits.length > 0 && (
          <div className="mb-6 space-y-3">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-0.5 p-1 bg-green-100 rounded-full">
                  <Check size={14} className="text-green-600" />
                </div>
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-gradient-to-br from-purple-50 to-amber-50 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Premium Monthly</span>
            <Badge className="bg-amber-500">Most Popular</Badge>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">$9.99</span>
            <span className="text-gray-600">/month</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Cancel anytime</p>
        </div>

        <Link to={createPageUrl('PricingPlans')} onClick={handleUpgradeClick}>
          <Button className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white py-6 text-lg rounded-full shadow-lg">
            <Sparkles size={20} className="mr-2" />
            See All Plans
          </Button>
        </Link>

        <p className="text-center text-xs text-gray-500 mt-4">
          Join thousands of premium members finding love
        </p>
      </motion.div>
    </motion.div>
  );
}