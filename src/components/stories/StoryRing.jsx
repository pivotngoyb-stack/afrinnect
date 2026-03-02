import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export default function StoryRing({ profile, hasStory, isViewed, onClick, isOwnProfile, storyCount = 0 }) {
  const photoUrl = profile?.primary_photo || profile?.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100';
  
  // Ring color: gradient for unviewed, gray for viewed, lighter for no story
  const getRingStyle = () => {
    if (!hasStory && !isOwnProfile) {
      return { background: '#374151' }; // gray-700
    }
    if (hasStory && !isViewed) {
      return {
        background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
      };
    }
    if (hasStory && isViewed) {
      return { background: '#6b7280' }; // gray-500
    }
    return { background: '#4b5563' }; // gray-600 for own with no story
  };

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(10);
        onClick();
      }}
      className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation focus:outline-none"
    >
      <div className="relative">
        {/* Ring */}
        <div 
          className="w-20 h-20 rounded-full p-[3px] flex items-center justify-center"
          style={getRingStyle()}
        >
          <div className="bg-black p-[2px] rounded-full w-full h-full">
            <img
              src={photoUrl}
              alt={profile?.display_name || 'User'}
              className="w-full h-full rounded-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
        
        {/* Add button for own profile */}
        {isOwnProfile && (
          <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-[3px] border-black">
            <Plus size={16} className="text-white" strokeWidth={3} />
          </div>
        )}
        
        {/* Story count badge */}
        {hasStory && storyCount > 1 && !isOwnProfile && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center border-2 border-black text-[10px] font-bold text-white">
            {storyCount}
          </div>
        )}
      </div>
      
      <span className={`text-xs font-medium truncate w-20 text-center ${
        hasStory && !isViewed ? 'text-white' : 'text-gray-400'
      }`}>
        {isOwnProfile ? 'Your story' : (profile?.display_name?.split(' ')[0] || 'User')}
      </span>
    </motion.button>
  );
}