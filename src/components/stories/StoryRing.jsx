import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export default function StoryRing({ profile, hasStory, isViewed, onClick, isOwnProfile, storyCount = 1 }) {
  const photoUrl = profile?.primary_photo || profile?.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100';
  
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(10);
        onClick();
      }}
      className="flex-shrink-0 flex flex-col items-center gap-1.5 touch-manipulation focus:outline-none"
    >
      <div className="relative">
        {/* Animated gradient ring for unviewed stories */}
        <div className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center ${
          hasStory && !isViewed 
            ? 'p-[3px]' 
            : hasStory && isViewed
            ? 'p-[2px] bg-gray-300'
            : 'p-[2px] bg-gray-200'
        }`}
        style={hasStory && !isViewed ? {
          background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888, #8a3ab9, #4c68d7)',
          backgroundSize: '400% 400%',
          animation: 'gradient-spin 3s ease infinite'
        } : {}}>
          <div className="bg-white p-[2px] rounded-full w-full h-full">
            <img
              src={photoUrl}
              alt={profile?.display_name || 'User'}
              className="w-full h-full rounded-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
        
        {/* Add story button for own profile */}
        {isOwnProfile && (
          <motion.div 
            whileTap={{ scale: 0.9 }}
            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center border-[3px] border-white shadow-lg"
          >
            <Plus size={14} className="text-white" strokeWidth={3} />
          </motion.div>
        )}
        
        {/* Story count badge for multiple stories */}
        {hasStory && storyCount > 1 && !isOwnProfile && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center border-2 border-white text-[10px] font-bold text-white">
            {storyCount}
          </div>
        )}
      </div>
      
      <span className={`text-[11px] font-medium truncate w-[72px] text-center ${
        hasStory && !isViewed ? 'text-gray-900' : 'text-gray-500'
      }`}>
        {isOwnProfile ? 'Your story' : (profile?.display_name || 'User')}
      </span>
      
      <style>{`
        @keyframes gradient-spin {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </motion.button>
  );
}