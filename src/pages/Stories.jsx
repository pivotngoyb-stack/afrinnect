import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Upload, Plus, X, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StoryRing from '@/components/stories/StoryRing';
import StoryViewer from '@/components/stories/StoryViewer';

export default function Stories() {
  const [myProfile, setMyProfile] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // All story groups (including mine)
  const [storyGroups, setStoryGroups] = useState([]);
  const queryClient = useQueryClient();

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
      }
    };
    fetchProfile();
  }, []);

  // Fetch all stories and group by user
  const fetchStories = async () => {
    if (!myProfile) return;
    setIsLoading(true);
    
    try {
      // Fetch all non-expired stories
      const now = new Date().toISOString();
      const stories = await base44.entities.Story.filter(
        { is_expired: false },
        '-created_date',
        200
      );
      
      // Filter out actually expired ones (client-side check)
      const validStories = stories.filter(s => {
        if (!s.expires_at) return true;
        return new Date(s.expires_at) > new Date();
      });

      // Get unique profile IDs
      const profileIds = [...new Set(validStories.map(s => s.user_profile_id).filter(Boolean))];
      
      // Fetch all profiles in one batch
      const profileMap = {};
      if (profileIds.length > 0) {
        for (const id of profileIds) {
          try {
            const profiles = await base44.entities.UserProfile.filter({ id });
            if (profiles.length > 0) {
              profileMap[id] = profiles[0];
            }
          } catch (e) {
            // Skip failed profile fetches
          }
        }
      }

      // Group stories by user
      const groups = {};
      
      validStories.forEach(story => {
        const profile = profileMap[story.user_profile_id];
        if (!profile) return; // Skip if no profile found
        
        if (!groups[story.user_profile_id]) {
          groups[story.user_profile_id] = {
            profileId: story.user_profile_id,
            profile: profile,
            stories: [],
            latestStory: story.created_date
          };
        }
        groups[story.user_profile_id].stories.push({
          ...story,
          user_profile: profile
        });
      });

      // Convert to array and sort: my story first, then unviewed, then viewed
      const groupArray = Object.values(groups);
      
      groupArray.sort((a, b) => {
        // My story always first
        if (a.profileId === myProfile.id) return -1;
        if (b.profileId === myProfile.id) return 1;
        
        // Then sort by whether all stories are viewed
        const aAllViewed = a.stories.every(s => s.views?.includes(myProfile.id));
        const bAllViewed = b.stories.every(s => s.views?.includes(myProfile.id));
        if (aAllViewed !== bAllViewed) return aAllViewed ? 1 : -1;
        
        // Finally by latest story date
        return new Date(b.latestStory) - new Date(a.latestStory);
      });

      setStoryGroups(groupArray);
    } catch (error) {
      console.error('Error fetching stories:', error);
      toast.error('Failed to load stories');
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (myProfile) {
      fetchStories();
    }
  }, [myProfile]);

  // Upload story mutation
  const uploadStoryMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await base44.entities.Story.create({
        user_profile_id: myProfile.id,
        media_url: file_url,
        media_type: file.type.startsWith('video/') ? 'video' : 'photo',
        caption: caption,
        expires_at: expiresAt.toISOString(),
        is_expired: false,
        views: []
      });
    },
    onSuccess: () => {
      fetchStories();
      setUploadingStory(false);
      setCaption('');
      toast.success("Story posted! 🎉");
    },
    onError: (error) => {
      toast.error('Failed to upload: ' + (error.message || 'Unknown error'));
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadStoryMutation.mutate(file);
    }
  };

  const handleStoryGroupClick = (groupIndex) => {
    setViewingIndex(groupIndex);
    setCurrentStoryIndex(0);
    setViewing(storyGroups[groupIndex]);
  };

  const handleNextStory = () => {
    const currentGroup = storyGroups[viewingIndex];
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      // More stories in current group
      setCurrentStoryIndex(prev => prev + 1);
    } else if (viewingIndex < storyGroups.length - 1) {
      // Move to next user's stories
      setViewingIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
      setViewing(storyGroups[viewingIndex + 1]);
    } else {
      // No more stories
      setViewing(null);
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (viewingIndex > 0) {
      // Move to previous user's last story
      const prevGroup = storyGroups[viewingIndex - 1];
      setViewingIndex(prev => prev - 1);
      setCurrentStoryIndex(prevGroup.stories.length - 1);
      setViewing(prevGroup);
    }
  };

  const handleCloseViewer = () => {
    setViewing(null);
    setViewingIndex(0);
    setCurrentStoryIndex(0);
  };

  // Get my story group
  const myStoryGroup = storyGroups.find(g => g.profileId === myProfile?.id);
  const otherStoryGroups = storyGroups.filter(g => g.profileId !== myProfile?.id);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black sticky top-0 z-40 border-b border-gray-800">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-white">Stories</h1>
            </div>
            <Button 
              onClick={() => setUploadingStory(true)} 
              variant="ghost"
              size="icon"
              className="text-white hover:bg-gray-800"
            >
              <Camera size={22} />
            </Button>
          </div>
        </div>
      </header>

      {/* Stories Grid - Tinder Style */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full bg-gray-800 animate-pulse" />
                <div className="w-14 h-3 bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Horizontal Story Rings Row */}
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
              {/* My Story - Always First */}
              <StoryRing
                profile={myProfile}
                hasStory={myStoryGroup?.stories.length > 0}
                isViewed={false}
                storyCount={myStoryGroup?.stories.length || 0}
                onClick={() => {
                  if (myStoryGroup?.stories.length > 0) {
                    const myIndex = storyGroups.findIndex(g => g.profileId === myProfile?.id);
                    handleStoryGroupClick(myIndex);
                  } else {
                    setUploadingStory(true);
                  }
                }}
                isOwnProfile
              />

              {/* Other Users' Stories */}
              {otherStoryGroups.map((group) => {
                const allViewed = group.stories.every(s => s.views?.includes(myProfile?.id));
                const groupIndex = storyGroups.findIndex(g => g.profileId === group.profileId);
                
                return (
                  <StoryRing
                    key={group.profileId}
                    profile={group.profile}
                    hasStory={true}
                    isViewed={allViewed}
                    storyCount={group.stories.length}
                    onClick={() => handleStoryGroupClick(groupIndex)}
                  />
                );
              })}
            </div>

            {/* Empty State */}
            {storyGroups.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Camera className="text-white" size={32} />
                </div>
                <h2 className="text-white text-lg font-semibold mb-2">No Stories Yet</h2>
                <p className="text-gray-400 text-sm mb-6">Be the first to share your moment!</p>
                <Button 
                  onClick={() => setUploadingStory(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  <Plus size={18} className="mr-2" />
                  Add Story
                </Button>
              </div>
            )}

            {/* Story Grid Preview (optional - shows thumbnails) */}
            {storyGroups.length > 0 && (
              <div className="mt-4">
                <h3 className="text-gray-400 text-sm font-medium mb-3">Recent</h3>
                <div className="grid grid-cols-3 gap-2">
                  {storyGroups.slice(0, 9).map((group, idx) => (
                    <motion.button
                      key={group.profileId}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleStoryGroupClick(idx)}
                      className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-900"
                    >
                      <img 
                        src={group.stories[0]?.media_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="flex items-center gap-2">
                          <img 
                            src={group.profile?.primary_photo} 
                            alt=""
                            className="w-6 h-6 rounded-full border-2 border-white object-cover"
                          />
                          <span className="text-white text-xs font-medium truncate">
                            {group.profile?.display_name}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Upload Modal - Full Screen Camera Style */}
      <AnimatePresence>
        {uploadingStory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pt-safe">
              <button 
                onClick={() => setUploadingStory(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full active:bg-white/10"
              >
                <X size={26} className="text-white" />
              </button>
              <h2 className="text-white font-semibold text-lg">Add Story</h2>
              <div className="w-10" />
            </div>
            
            {/* Upload Area */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <Label htmlFor="story-upload" className="cursor-pointer w-full">
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  className="border-2 border-dashed border-white/30 rounded-3xl p-12 text-center hover:border-white/50 transition bg-white/5"
                >
                  {uploadStoryMutation.isPending ? (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-white/80">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <Upload className="text-white" size={36} />
                      </div>
                      <p className="text-white text-lg font-medium mb-2">Tap to upload</p>
                      <p className="text-white/60 text-sm">Photo or video</p>
                    </>
                  )}
                </motion.div>
              </Label>
              <input
                id="story-upload"
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploadStoryMutation.isPending}
              />
              
              {/* Caption input */}
              <div className="w-full mt-6">
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-full px-5 py-3"
                />
              </div>
            </div>
            
            {/* Bottom hint */}
            <div className="p-6 pb-safe text-center">
              <p className="text-white/50 text-xs">Stories disappear after 24 hours</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story Viewer */}
      <AnimatePresence>
        {viewing && (
          <StoryViewer
            stories={viewing.stories}
            currentIndex={currentStoryIndex}
            onClose={handleCloseViewer}
            onNext={handleNextStory}
            onPrev={handlePrevStory}
            myProfileId={myProfile?.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}