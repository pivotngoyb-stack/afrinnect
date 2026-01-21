import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye, MessageCircle, Send, Volume2, VolumeX, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function StoryViewer({ stories, currentIndex, onClose, onNext, onPrev, myProfileId }) {
  const [progress, setProgress] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(null);
  
  const videoRef = React.useRef(null);
  const story = stories[currentIndex];
  const DEFAULT_DURATION = 5000; // 5 seconds for photos
  const queryClient = useQueryClient();

  // Reset state on story change
  useEffect(() => {
    setProgress(0);
    setVideoDuration(null);
    setIsPaused(false);
  }, [currentIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') setIsPaused(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onClose]);

  // Progress timer
  useEffect(() => {
    if (isPaused || showComments) return;

    // If video, let video events handle progress
    if (story?.media_type === 'video' && videoRef.current) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          onNext();
          return 0;
        }
        return prev + (100 / (DEFAULT_DURATION / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, showComments, onNext, story?.media_type]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setProgress((current / total) * 100);
    }
  };

  const handleVideoEnded = () => {
    onNext();
  };

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
              {story.created_date ? new Date(story.created_date).toLocaleTimeString() : ''}
            </p>
          </div>
        </div>
        <Button onClick={onClose} variant="ghost" size="icon" className="text-white">
          <X size={24} />
        </Button>
      </div>

      {/* Story content */}
      <div 
        className="relative w-full h-full flex items-center justify-center bg-black"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {story.media_type === 'photo' ? (
          <img
            src={story.media_url}
            alt="Story"
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        ) : (
          <video
            ref={videoRef}
            src={story.media_url}
            autoPlay
            playsInline
            muted={isMuted}
            onTimeUpdate={handleVideoTimeUpdate}
            onEnded={handleVideoEnded}
            onLoadedMetadata={(e) => setVideoDuration(e.target.duration)}
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
          />
        )}
        
        {story.caption && (
          <div className="absolute bottom-24 left-0 right-0 px-6 z-20">
            <div className="bg-black/40 backdrop-blur-sm p-4 rounded-xl inline-block max-w-full">
              <p className="text-white text-center text-lg font-medium">{story.caption}</p>
            </div>
          </div>
        )}
      </div>

      {/* Video Controls */}
      {story.media_type === 'video' && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
          className="absolute top-20 right-4 z-30 bg-black/30 p-2 rounded-full hover:bg-black/50 transition"
        >
          {isMuted ? <VolumeX className="text-white" size={20} /> : <Volume2 className="text-white" size={20} />}
        </button>
      )}

      {/* Pause Indicator */}
      {isPaused && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-black/30 p-4 rounded-full">
          <Pause className="text-white w-8 h-8" />
        </div>
      )}

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

      {/* Comments button */}
      <div className="absolute bottom-6 right-6">
        <Button
          onClick={() => setShowComments(!showComments)}
          className="bg-black/50 backdrop-blur-sm hover:bg-black/70 rounded-full"
          size="icon"
        >
          <MessageCircle size={20} className="text-white" />
        </Button>
      </div>

      {/* View count (own story only) */}
      {story.user_profile_id === myProfileId && (
        <div className="absolute bottom-6 left-6">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <Eye size={16} className="text-white" />
            <span className="text-white text-sm">{story.views?.length || 0} views</span>
          </div>
        </div>
      )}

      {/* Comments Panel */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[60vh] flex flex-col"
          >
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg">Comments</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No comments yet. Be the first!</p>
              ) : (
                comments.map(comment => {
                  const commenter = commenterProfiles[comment.user_profile_id];
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <img
                        src={commenter?.primary_photo || 'https://via.placeholder.com/40'}
                        alt={commenter?.display_name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{commenter?.display_name}</p>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && commentText.trim() && commentMutation.mutate()}
                placeholder="Add a comment..."
                className="flex-1"
              />
              <Button
                onClick={() => commentMutation.mutate()}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="bg-purple-600"
              >
                <Send size={18} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}