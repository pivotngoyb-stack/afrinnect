import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Heart, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

export default function StoryViewer({ stories, currentIndex, onClose, onNext, onPrev, myProfileId }) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showHeart, setShowHeart] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [touchStart, setTouchStart] = useState(null);
  
  const videoRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const story = stories?.[currentIndex];
  const STORY_DURATION = 5000; // 5 seconds for photos

  // Reset progress on story change
  useEffect(() => {
    setProgress(0);
    setIsPaused(false);
    
    // Mark story as viewed
    if (story && myProfileId && story.user_profile_id !== myProfileId) {
      if (!story.views?.includes(myProfileId)) {
        base44.entities.Story.update(story.id, {
          views: [...(story.views || []), myProfileId]
        }).catch(() => {});
      }
    }
  }, [currentIndex, story?.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose]);

  // Auto-progress timer for photos
  useEffect(() => {
    if (isPaused) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    if (story?.media_type === 'video' && videoRef.current) return;

    const startTime = Date.now() - (progress / 100) * STORY_DURATION;
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      
      if (newProgress >= 100) {
        clearInterval(progressIntervalRef.current);
        onNext();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, isPaused, story?.media_type]);

  // Video progress
  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current?.duration) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    onNext();
  }, [onNext]);

  // Double tap to like
  const lastTap = useRef(0);
  const handleTap = useCallback((e) => {
    const now = Date.now();
    const screenWidth = window.innerWidth;
    const tapX = e.clientX || e.changedTouches?.[0]?.clientX || screenWidth / 2;
    
    // Double tap detection
    if (now - lastTap.current < 300) {
      setShowHeart(true);
      if (navigator.vibrate) navigator.vibrate([50, 50]);
      setTimeout(() => setShowHeart(false), 1000);
    } else {
      // Single tap navigation
      if (tapX < screenWidth * 0.3) {
        onPrev();
      } else if (tapX > screenWidth * 0.7) {
        onNext();
      }
    }
    lastTap.current = now;
  }, [onPrev, onNext]);

  // Touch handling for hold-to-pause and swipe-to-close
  const handleTouchStart = (e) => {
    setIsPaused(true);
    setTouchStart({ 
      x: e.touches[0].clientX, 
      y: e.touches[0].clientY, 
      time: Date.now() 
    });
  };

  const handleTouchEnd = (e) => {
    setIsPaused(false);
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    
    // Quick tap (not hold)
    if (deltaTime < 200 && Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) {
      handleTap(e);
    }
    // Swipe down to close
    else if (deltaY > 100 && Math.abs(deltaX) < 50) {
      onClose();
    }
    
    setTouchStart(null);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !story) return;
    
    // Here you'd typically send a DM to the story owner
    // For now, just clear and show feedback
    setReplyText('');
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  if (!story) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center select-none"
    >
      {/* Progress bars */}
      <div className="absolute top-2 left-2 right-2 flex gap-1 z-20 pt-safe">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white rounded-full"
              style={{
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-3 right-3 flex items-center justify-between z-20 pt-safe">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/80">
            <img
              src={story.user_profile?.primary_photo || 'https://via.placeholder.com/100'}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{story.user_profile?.display_name || 'User'}</p>
            <p className="text-white/70 text-xs">{timeAgo(story.created_date)}</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10"
        >
          <X size={26} className="text-white" />
        </button>
      </div>

      {/* Story content */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onClick={handleTap}
      >
        {story.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={story.media_url}
            autoPlay
            playsInline
            muted={isMuted}
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain pointer-events-none"
          />
        ) : (
          <img
            src={story.media_url}
            alt="Story"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        )}
      </div>

      {/* Double tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
          >
            <Heart size={100} className="text-white fill-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause indicator */}
      <AnimatePresence>
        {isPaused && !showHeart && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-black/50 p-5 rounded-full pointer-events-none"
          >
            <Pause className="text-white w-8 h-8" fill="white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caption */}
      {story.caption && (
        <div className="absolute bottom-24 left-4 right-4 z-20">
          <div className="bg-black/40 backdrop-blur-md px-4 py-3 rounded-2xl">
            <p className="text-white text-base">{story.caption}</p>
          </div>
        </div>
      )}

      {/* Video mute button */}
      {story.media_type === 'video' && (
        <button
          onClick={(e) => { 
            e.stopPropagation(); 
            setIsMuted(!isMuted);
          }}
          className="absolute top-20 right-4 z-30 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center pt-safe"
        >
          {isMuted ? <VolumeX className="text-white" size={20} /> : <Volume2 className="text-white" size={20} />}
        </button>
      )}

      {/* Desktop navigation */}
      <button
        onClick={onPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 hidden md:flex items-center justify-center bg-black/30 rounded-full hover:bg-black/50"
      >
        <ChevronLeft className="text-white" size={28} />
      </button>
      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 hidden md:flex items-center justify-center bg-black/30 rounded-full hover:bg-black/50"
      >
        <ChevronRight className="text-white" size={28} />
      </button>

      {/* Reply input */}
      <div className="absolute bottom-4 left-4 right-4 z-20 pb-safe">
        <div className="flex items-center gap-3">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
            placeholder="Send a message..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full px-5"
            onClick={(e) => e.stopPropagation()}
          />
          {replyText && (
            <button
              onClick={handleSendReply}
              className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center"
            >
              <Send size={18} className="text-white" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}