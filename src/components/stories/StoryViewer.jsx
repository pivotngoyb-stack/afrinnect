import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye, MessageCircle, Send, Volume2, VolumeX, Pause, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function StoryViewer({ stories, currentIndex, onClose, onNext, onPrev, myProfileId }) {
  const [progress, setProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [showHeart, setShowHeart] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const story = stories[currentIndex];
  const STORY_DURATION = 5000; // 5 seconds for photos
  const queryClient = useQueryClient();

  // Reset state on story change
  useEffect(() => {
    setProgress(0);
    setIsPaused(false);
    setShowComments(false);
    
    // Haptic feedback on story change
    if (navigator.vibrate) navigator.vibrate(5);
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showComments) return;
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
  }, [onNext, onPrev, onClose, showComments]);

  // Progress timer - smoother animation
  useEffect(() => {
    if (isPaused || showComments) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    // If video, let video events handle progress
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
    }, 16); // ~60fps for smooth animation

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, isPaused, showComments, onNext, story?.media_type, progress]);

  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress((current / total) * 100);
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    onNext();
  }, [onNext]);
  
  // Double tap to like
  const lastTap = useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setShowHeart(true);
      if (navigator.vibrate) navigator.vibrate([50, 50]);
      setTimeout(() => setShowHeart(false), 1000);
      // Could add like functionality here
    }
    lastTap.current = now;
  }, []);
  
  // Touch navigation (tap left/right sides)
  const handleTouchEnd = useCallback((e) => {
    if (showComments) return;
    
    const touch = e.changedTouches[0];
    const screenWidth = window.innerWidth;
    const tapX = touch.clientX;
    
    // Left third = prev, right third = next
    if (tapX < screenWidth * 0.3) {
      onPrev();
    } else if (tapX > screenWidth * 0.7) {
      onNext();
    }
  }, [onPrev, onNext, showComments]);

  useEffect(() => {
    // Mark story as viewed (only if not my own story)
    if (story && myProfileId && story.user_profile_id !== myProfileId && !story.views?.includes(myProfileId)) {
      const markViewed = async () => {
        try {
          await base44.entities.Story.update(story.id, {
            views: [...(story.views || []), myProfileId]
          });
        } catch (e) {
          console.warn('Failed to mark story as viewed:', e);
        }
      };
      markViewed();
    }
  }, [story, myProfileId]);

  // Fetch comments for this story
  const { data: comments = [] } = useQuery({
    queryKey: ['story-comments', story?.id],
    queryFn: async () => {
      const cmts = await base44.entities.StoryComment.filter(
        { story_id: story.id },
        '-created_date',
        50
      );
      return cmts;
    },
    enabled: !!story?.id && showComments
  });

  // Fetch commenter profiles
  const { data: commenterProfiles = {} } = useQuery({
    queryKey: ['commenter-profiles', comments.length],
    queryFn: async () => {
      const profileIds = [...new Set(comments.map(c => c.user_profile_id))];
      const profiles = await Promise.all(
        profileIds.map(id => base44.entities.UserProfile.filter({ id }).then(p => p[0]))
      );
      return profiles.reduce((acc, p) => {
        if (p) acc[p.id] = p;
        return acc;
      }, {});
    },
    enabled: comments.length > 0
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.StoryComment.create({
        story_id: story.id,
        user_profile_id: myProfileId,
        content: commentText
      });
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries(['story-comments', story.id]);
    }
  });

  if (!story) return null;

  const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center select-none"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Progress bars - Instagram style */}
      <div className="absolute top-2 left-2 right-2 flex gap-1 z-20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-white rounded-full"
              initial={{ width: idx < currentIndex ? '100%' : '0%' }}
              animate={{ 
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%'
              }}
              transition={{ duration: 0.05, ease: 'linear' }}
            />
          </div>
        ))}
      </div>

      {/* Story header */}
      <div className="absolute top-4 left-3 right-3 flex items-center justify-between z-20" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/80">
            <img
              src={story.user_profile?.primary_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
              alt={story.user_profile?.display_name}
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
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10 transition touch-manipulation"
        >
          <X size={26} className="text-white" />
        </button>
      </div>

      {/* Story content - Full screen with touch areas */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        onTouchStart={(e) => {
          setIsPaused(true);
          setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() });
        }}
        onTouchEnd={(e) => {
          setIsPaused(false);
          if (!touchStart) return;
          
          const touch = e.changedTouches[0];
          const deltaX = touch.clientX - touchStart.x;
          const deltaY = touch.clientY - touchStart.y;
          const deltaTime = Date.now() - touchStart.time;
          
          // Short tap (not a hold or swipe)
          if (deltaTime < 200 && Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30) {
            handleDoubleTap();
            
            const screenWidth = window.innerWidth;
            if (touch.clientX < screenWidth * 0.3) {
              onPrev();
            } else if (touch.clientX > screenWidth * 0.7) {
              onNext();
            }
          }
          // Swipe down to close
          else if (deltaY > 100 && Math.abs(deltaX) < 50) {
            onClose();
          }
          
          setTouchStart(null);
        }}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
      >
        {story.media_type === 'photo' || story.media_type !== 'video' ? (
          <motion.img
            key={story.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            src={story.media_url}
            alt="Story"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        ) : (
          <video
            ref={videoRef}
            src={story.media_url}
            autoPlay
            playsInline
            loop={false}
            muted={isMuted}
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain pointer-events-none"
          />
        )}
      </div>
      
      {/* Double tap heart animation */}
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
        
      {/* Caption */}
      {story.caption && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-28 left-4 right-4 z-20"
        >
          <div className="bg-black/40 backdrop-blur-md px-4 py-3 rounded-2xl">
            <p className="text-white text-base font-medium leading-relaxed">{story.caption}</p>
          </div>
        </motion.div>
      )}

      {/* Video Controls */}
      {story.media_type === 'video' && (
        <button
          onClick={(e) => { 
            e.stopPropagation(); 
            setIsMuted(!isMuted);
            if (navigator.vibrate) navigator.vibrate(10);
          }}
          className="absolute top-20 right-4 z-30 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center active:bg-black/60 transition touch-manipulation"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          {isMuted ? <VolumeX className="text-white" size={20} /> : <Volume2 className="text-white" size={20} />}
        </button>
      )}

      {/* Pause Indicator */}
      <AnimatePresence>
        {isPaused && !showHeart && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-black/50 backdrop-blur-sm p-5 rounded-full pointer-events-none"
          >
            <Pause className="text-white w-8 h-8" fill="white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Navigation Arrows (hidden on mobile) */}
      <button
        onClick={onPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 hidden md:flex items-center justify-center bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition"
      >
        <ChevronLeft className="text-white" size={28} />
      </button>
      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 hidden md:flex items-center justify-center bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition"
      >
        <ChevronRight className="text-white" size={28} />
      </button>

      {/* Bottom Actions Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-20" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
        {/* View count (own story only) */}
        {story.user_profile_id === myProfileId ? (
          <button className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-full active:bg-black/60 transition touch-manipulation">
            <Eye size={18} className="text-white" />
            <span className="text-white text-sm font-medium">{story.views?.length || 0}</span>
          </button>
        ) : (
          <div /> // Spacer
        )}

        {/* Reply / Comment button */}
        <button
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(10);
            setShowComments(!showComments);
          }}
          className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full active:bg-white/30 transition touch-manipulation"
        >
          <MessageCircle size={18} className="text-white" />
          <span className="text-white text-sm font-medium">Reply</span>
        </button>
      </div>

      {/* Comments Panel - Instagram style bottom sheet */}
      <AnimatePresence>
        {showComments && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 z-30"
              onClick={() => setShowComments(false)}
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[70vh] flex flex-col z-40"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-bold text-lg text-center">Replies</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No replies yet</p>
                    <p className="text-gray-400 text-xs mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  comments.map(comment => {
                    const commenter = commenterProfiles[comment.user_profile_id];
                    return (
                      <div key={comment.id} className="flex gap-3">
                        <img
                          src={commenter?.primary_photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'}
                          alt={commenter?.display_name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{commenter?.display_name || 'User'}</p>
                            <p className="text-xs text-gray-400">
                              {comment.created_date ? new Date(comment.created_date).toLocaleDateString() : ''}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 mt-0.5">{comment.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Input area */}
              <div className="p-4 border-t border-gray-100 flex items-center gap-3 bg-white">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && commentText.trim() && commentMutation.mutate()}
                  placeholder="Send a reply..."
                  className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2.5 text-base focus-visible:ring-1"
                />
                <button
                  onClick={() => commentMutation.mutate()}
                  disabled={!commentText.trim() || commentMutation.isPending}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition touch-manipulation ${
                    commentText.trim() 
                      ? 'bg-purple-600 text-white active:bg-purple-700' 
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}