import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export default function StoryRing({ profile, hasStory, isViewed, onClick, isOwnProfile }) {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer"
    >
      <div className={`relative ${
        hasStory && !isViewed 
          ? 'p-[3px] bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500' 
          : hasStory && isViewed
          ? 'p-[3px] bg-gray-300'
          : 'p-[3px] bg-gray-200'
      } rounded-full`}>
        <div className="bg-white p-[2px] rounded-full">
          <img
            src={profile?.primary_photo || profile?.photos?.[0]}
            alt={profile?.display_name}
            className="w-16 h-16 rounded-full object-cover"
          />
        </div>
        {isOwnProfile && !hasStory && (
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center border-2 border-white">
            <Plus size={12} className="text-white" />
          </div>
        )}
      </div>
      <span className="text-xs text-gray-700 font-medium truncate w-16 text-center">
        {isOwnProfile ? 'Your Story' : profile?.display_name}
      </span>
    </motion.div>
  );
}