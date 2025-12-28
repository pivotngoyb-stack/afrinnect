import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfinitePagination } from '@/components/shared/useInfinitePagination';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StoryRing from '@/components/stories/StoryRing';
import StoryViewer from '@/components/stories/StoryViewer';
import { ListItemSkeleton } from '@/components/shared/SkeletonLoader';

export default function Stories() {
  const [myProfile, setMyProfile] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [caption, setCaption] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      if (profiles.length > 0) setMyProfile(profiles[0]);
    };
    fetchProfile();
  }, []);

  // Server-side filtered stories with pagination
  const buildStoryFilters = () => {
    const now = new Date().toISOString();
    return {
      is_expired: false,
      expires_at: { $gte: now }
    };
  };

  const { 
    items: allStories, 
    loadMore, 
    hasMore, 
    isLoadingMore,
    refetch 
  } = useInfinitePagination('Story', buildStoryFilters(), {
    pageSize: 30,
    sortBy: '-created_date',
    enabled: !!myProfile,
    refetchInterval: false,
    retry: 1,
    staleTime: 300000
  });

  // Fetch profiles for stories (optimized)
  const { data: storyProfiles = {} } = useQuery({
    queryKey: ['story-profiles', allStories.length],
    queryFn: async () => {
      try {
        const profileIds = [...new Set(allStories.map(s => s.user_profile_id))];
        const profiles = await Promise.all(
          profileIds.map(async (id) => {
            try {
              const p = await base44.entities.UserProfile.filter({ id });
              return p[0];
            } catch (error) {
              console.error(`Failed to fetch profile ${id}:`, error);
              return null;
            }
          })
        );
        return profiles.reduce((acc, p) => {
          if (p) acc[p.id] = p;
          return acc;
        }, {});
      } catch (error) {
        console.error('Failed to fetch story profiles:', error);
        return {};
      }
    },
    enabled: allStories.length > 0,
    staleTime: 120000, // Increased to 2 minutes
    retry: 1,
    retryDelay: 5000
  });

  const storiesWithProfiles = allStories.map(story => ({
    ...story,
    user_profile: storyProfiles[story.user_profile_id]
  })).filter(s => s.user_profile); // Only include stories with loaded profiles

  // Group stories by user
  const storyGroups = storiesWithProfiles.reduce((acc, story) => {
    if (!acc[story.user_profile_id]) {
      acc[story.user_profile_id] = {
        profile: story.user_profile,
        stories: []
      };
    }
    acc[story.user_profile_id].stories.push(story);
    return acc;
  }, {});

  const myStories = storyGroups[myProfile?.id]?.stories || [];
  const otherStoryGroups = Object.entries(storyGroups).filter(([id]) => id !== myProfile?.id);

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
        views: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stories']);
      setUploadingStory(false);
      setCaption('');
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadStoryMutation.mutate(file);
    }
  };

  const handleStoryClick = (profileId) => {
    const stories = storyGroups[profileId]?.stories || [];
    setViewing(stories);
    setCurrentStoryIndex(0);
  };

  const handleNext = () => {
    if (currentStoryIndex < viewing.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      setViewing(null);
    }
  };

  const handlePrev = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft size={20} />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Stories</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Story Rings */}
        {!myProfile ? (
          <ListItemSkeleton count={3} />
        ) : (
        <>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {/* Own story - Add new */}
          <div className="relative">
            <button
              onClick={() => setUploadingStory(true)}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center border-4 border-white shadow-lg">
                <Upload className="text-white" size={24} />
              </div>
              <span className="text-xs font-medium text-gray-700">Add Story</span>
            </button>
          </div>

          {/* Own story - View existing */}
          {myStories.length > 0 && (
            <div className="relative">
              <StoryRing
                profile={myProfile}
                hasStory={true}
                isViewed={false}
                onClick={() => handleStoryClick(myProfile.id)}
                isOwnProfile
              />
            </div>
          )}

          {/* Other stories */}
          {otherStoryGroups.map(([profileId, { profile, stories }]) => {
            const hasViewed = stories.every(s => s.views?.includes(myProfile?.id));
            return (
              <StoryRing
                key={profileId}
                profile={profile}
                hasStory
                isViewed={hasViewed}
                onClick={() => handleStoryClick(profileId)}
              />
            );
          })}
        </div>

        {/* My Stories Section */}
        {myStories.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-bold mb-4">My Stories ({myStories.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {myStories.map(story => (
                <div key={story.id} className="relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer group" onClick={() => {
                  setViewing([story]);
                  setCurrentStoryIndex(0);
                }}>
                  {story.media_type === 'video' ? (
                    <video src={story.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={story.media_url} alt="Story" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                    <div className="text-white text-xs">
                      <p>{story.views?.length || 0} views</p>
                      {story.caption && <p className="text-sm mt-1">{story.caption}</p>}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/10 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}
        </>
        )}

        {/* Upload dialog */}
        {uploadingStory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Add to Your Story</h2>
              <div className="space-y-4">
                <div>
                  <Label>Caption (optional)</Label>
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Say something..."
                  />
                </div>
                <div>
                  <Label htmlFor="story-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition">
                      <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                      <p className="text-sm text-gray-600">
                        {uploadStoryMutation.isPending ? 'Uploading...' : 'Click to upload photo or video'}
                      </p>
                    </div>
                  </Label>
                  <input
                    id="story-upload"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploadStoryMutation.isPending}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setUploadingStory(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Story viewer */}
        <AnimatePresence>
          {viewing && (
            <StoryViewer
              stories={viewing}
              currentIndex={currentStoryIndex}
              onClose={() => setViewing(null)}
              onNext={handleNext}
              onPrev={handlePrev}
              myProfileId={myProfile?.id}
            />
          )}
        </AnimatePresence>

        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent" />
          </div>
        )}

        {hasMore && !isLoadingMore && (
          <div className="text-center py-4">
            <Button onClick={loadMore} variant="outline">
              Load More Stories
            </Button>
          </div>
        )}
      </main>
    </div>
    </PullToRefresh>
  );
}