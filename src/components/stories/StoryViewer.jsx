import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function StoryViewer({ stories, currentIndex, onClose, onNext, onPrev, myProfileId }) {
  const [progress, setProgress] = useState(0);
  const story = stories[currentIndex];
  const DURATION = 5000; // 5 seconds per story

  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          onNext();
          return 0;
        }
        return prev + (100 / (DURATION / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, onNext]);

  useEffect(() => {
    // Mark story as viewed
    if (story && myProfileId && !story.views?.includes(myProfileId)) {
      const markViewed = async () => {
        await base44.entities.Story.update(story.id, {
          views: [...(story.views || []), myProfileId]
        });
      };
      markViewed();
    }
  }, [story, myProfileId]);

  if (!story) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
    >
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <Progress 
              value={idx === currentIndex ? progress : idx < currentIndex ? 100 : 0} 
              className="h-full"
            />
          </div>
        ))}
      </div>

      {/* Story header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img
            src={story.user_profile?.primary_photo}
            alt={story.user_profile?.display_name}
            className="w-10 h-10 rounded-full border-2 border-white"
          />
          <div>
            <p className="text-white font-semibold">{story.user_profile?.display_name}</p>
            <p className="text-white/80 text-xs">
              {new Date(story.created_date).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <Button onClick={onClose} variant="ghost" size="icon" className="text-white">
          <X size={24} />
        </Button>
      </div>

      {/* Story content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {story.media_type === 'photo' ? (
          <img
            src={story.media_url}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            src={story.media_url}
            autoPlay
            className="max-w-full max-h-full object-contain"
          />
        )}
        
        {story.caption && (
          <div className="absolute bottom-20 left-0 right-0 px-6">
            <p className="text-white text-center text-lg">{story.caption}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <button
        onClick={onPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/30 rounded-full backdrop-blur-sm"
      >
        <ChevronLeft className="text-white" size={28} />
      </button>
      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-black/30 rounded-full backdrop-blur-sm"
      >
        <ChevronRight className="text-white" size={28} />
      </button>

      {/* View count (own story only) */}
      {story.user_profile_id === myProfileId && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <Eye size={16} className="text-white" />
            <span className="text-white text-sm">{story.views?.length || 0} views</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}