import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Crown, Heart, Infinity } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LikesLimitPaywall({ onClose }) {
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
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md"
      >
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl">
              <Heart size={40} className="text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Out of Likes
            </h2>
            <p className="text-gray-500 mb-6">
              You've used your 15 daily likes. Upgrade to Premium for unlimited likes!
            </p>

            <div className="bg-gradient-to-br from-purple-50 to-amber-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Infinity size={24} className="text-purple-600" />
                <span className="font-bold text-lg">Unlimited Likes</span>
              </div>
              <p className="text-sm text-gray-600">
                Plus see who likes you, advanced filters & more
              </p>
            </div>

            <Link to={createPageUrl('PricingPlans')}>
              <Button className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 mb-3">
                <Crown size={24} className="mr-2" />
                Upgrade to Premium
              </Button>
            </Link>

            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full"
            >
              Maybe Later
            </Button>

            <p className="text-xs text-gray-400 mt-4">
              Your likes reset tomorrow
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}