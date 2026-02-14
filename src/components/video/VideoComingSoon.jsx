import React from 'react';
import { Video, Crown, Bell, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoComingSoon({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-sm w-full text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>

          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <Video size={36} className="text-purple-600" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Video Calls Coming Soon! 🎥
          </h2>

          <p className="text-gray-600 mb-6">
            We're working on bringing you high-quality video calls to connect 
            with your matches face-to-face. Stay tuned!
          </p>

          <div className="bg-purple-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Crown size={20} className="text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-purple-900">Elite & VIP Feature</p>
                <p className="text-sm text-purple-700">Available with premium memberships</p>
              </div>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Got it!
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Placeholder component for future video call service abstraction
export const CallService = {
  isAvailable: () => false,
  getStatus: () => 'coming_soon',
  
  // Future methods to be implemented:
  // initiate: async (matchId) => {},
  // answer: async (callId) => {},
  // decline: async (callId) => {},
  // end: async (callId) => {},
  // getIceServers: async () => {},
};