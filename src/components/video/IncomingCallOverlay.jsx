import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';

export default function IncomingCallOverlay({ 
  caller, 
  callType = 'video',
  onAnswer, 
  onDecline 
}) {
  const [ringTime, setRingTime] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setRingTime(t => t + 1);
    }, 1000);
    
    // Auto-decline after 30 seconds
    const timeout = setTimeout(() => {
      onDecline?.();
    }, 30000);
    
    // Play ringtone
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(() => {}); // Browser may block autoplay
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      audio.pause();
    };
  }, [onDecline]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-b from-purple-900/95 to-black/95 z-[100] flex flex-col items-center justify-center"
      >
        {/* Ripple animation */}
        <div className="relative mb-8">
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-purple-500"
            style={{ width: 160, height: 160, marginLeft: -16, marginTop: -16 }}
          />
          <motion.div
            animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            className="absolute inset-0 rounded-full bg-purple-500"
            style={{ width: 160, height: 160, marginLeft: -16, marginTop: -16 }}
          />
          
          <img 
            src={caller?.primary_photo || '/default-avatar.png'}
            alt={caller?.display_name}
            className="w-32 h-32 rounded-full object-cover border-4 border-white/30 relative z-10"
          />
        </div>
        
        <h2 className="text-white text-2xl font-bold mb-2">{caller?.display_name || 'Unknown'}</h2>
        
        <div className="flex items-center gap-2 text-white/70 mb-8">
          <Video size={18} />
          <span>{callType === 'video' ? 'Incoming video call' : 'Incoming call'}...</span>
        </div>
        
        <div className="text-white/50 text-sm mb-12">
          Ringing for {ringTime}s
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-16">
          <motion.div className="flex flex-col items-center">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg mb-2"
            >
              <PhoneOff size={28} className="text-white" />
            </motion.button>
            <span className="text-white/70 text-sm">Decline</span>
          </motion.div>
          
          <motion.div className="flex flex-col items-center">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              onClick={onAnswer}
              className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center shadow-lg mb-2"
            >
              <Phone size={28} className="text-white" />
            </motion.button>
            <span className="text-white/70 text-sm">Answer</span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}