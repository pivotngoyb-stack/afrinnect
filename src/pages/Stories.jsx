import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfinitePagination } from '@/components/shared/useInfinitePagination';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, Plus, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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

  // 1. Fetch MY active stories explicitly (fix for "cannot see my story")
  const { data: myActiveStories = [], refetch: refetchMyStories } = useQuery({
    queryKey: ['my-active-stories', myProfile?.id],
    queryFn: async () => {
      if (!myProfile?.id) return [];
      const stories = await base44.entities.Story.filter({
        user_profile_id: myProfile.id,
        is_expired: false,
        expires_at: { $gte: new Date().toISOString() }
      }, '-created_date');
      // Attach profile for viewer
      return stories.map(s => ({ ...s, user_profile: myProfile }));
    },
    enabled: !!myProfile
  });

  // 2. Fetch MY upload history (for the "Right Side" view)
  const { data: myUploadHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ['my-upload-history', myProfile?.id],
    queryFn: async () => {
      if (!myProfile?.id) return [];
      const stories = await base44.entities.Story.filter({
        user_profile_id: myProfile.id
      }, '-created_date', 20); // Last 20 uploads
      return stories.map(s => ({ ...s, user_profile: myProfile }));
    },
    enabled: !!myProfile
  });

  // Server-side filtered stories with pagination (The Feed)
  const [filterDate, setFilterDate] = useState(new Date().toISOString());
  
  const filters = React.useMemo(() => ({
    is_expired: false,
    expires_at: { $gte: filterDate }
  }), [filterDate]);

  const { 
    items: allStories, 
    loadMore, 
    hasMore, 
    isLoadingMore,
    refetch 
  } = useInfinitePagination('Story', filters, {
    pageSize: 30,
    sortBy: '-created_date',
    enabled: !!myProfile,
    refetchInterval: false,
    retry: 1,
    staleTime: 300000
  });

  // Fetch profiles for feed stories
  const storyUserIds = React.useMemo(() => {
    return allStories
      .map(s => s.user_profile_id)
      .filter(id => id && typeof id === 'string')
      .sort()
      .join(',');
  }, [allStories]);
  
  const { data: storyProfiles = {}, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['story-profiles', storyUserIds],
    queryFn: async () => {
      try {
        if (!allStories || allStories.length === 0) return {};
        
        const profileIds = [...new Set(
          allStories
            .map(s => s.user_profile_id)
            .filter(id => id && typeof id === 'string')
        )];

        if (profileIds.length === 0) return {};

        // Batch fetch logic
        const chunkSize = 10;
        const profileMap = {};
        for (let i = 0; i < profileIds.length; i += chunkSize) {
          const chunk = profileIds.slice(i, i + chunkSize);
          if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));
          
          try {
             // Fetch profiles in parallel but handle failures gracefully
             const promises = chunk.map(id => 
               base44.entities.UserProfile.filter({ id }).catch(() => [])
             );
             
             const results = await Promise.all(promises);
             
             results.forEach(profiles => {
               if (profiles && profiles.length > 0) {
                 const profile = profiles[0];
                 if (profile && profile.id) {
                   profileMap[profile.id] = profile;
                 }
               }
             });
          } catch (e) {
            console.error('Error fetching chunk:', e);
          }
        }
        return profileMap;
      } catch (error) {
        console.error('Profile fetch error:', error);
        return {};
      }
    },
    enabled: !!allStories && allStories.length > 0 && storyUserIds.length > 0,
    staleTime: 300000
  });

  const storiesWithProfiles = allStories.map(story => ({
    ...story,
    user_profile: storyProfiles[story.user_profile_id]
  })).filter(s => s.user_profile);

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

  const otherStoryGroups = Object.entries(storyGroups).filter(([id]) => id !== myProfile?.id);

  // Upload story mutation
  const uploadStoryMutation = useMutation({
    mutationFn: async (file) => {
      try {
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
      } catch (error) {
        throw new Error(error.message || 'Failed to upload story');
      }
    },
    onSuccess: () => {
      refetch(); // Refetch feed
      refetchMyStories(); // Refetch my active stories
      refetchHistory(); // Refetch history sidebar
      setUploadingStory(false);
      setCaption('');
    },
    onError: (error) => {
      alert('Failed to upload story: ' + (error.message || 'Unknown error'));
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadStoryMutation.mutate(file);
    }
  };

  const handleStoryClick = (stories) => {
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

  const handleDeleteStory = async (storyId) => {
    if (confirm('Delete this story?')) {
      await base44.entities.Story.delete(storyId);
      refetchMyStories();
      refetchHistory();
    }
  };

  const handleRefresh = async () => {
    setFilterDate(new Date().toISOString());
    await Promise.all([
      refetch(),
      refetchMyStories(),
      refetchHistory()
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
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
              <Button 
                onClick={() => setUploadingStory(true)} 
                variant="default"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                <Plus size={16} />
                Add Story
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column: Feed (Stories) */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold mb-4 px-1">Recent Stories</h2>
              
              {!myProfile || (allStories.length > 0 && isLoadingProfiles) ? (
                <ListItemSkeleton count={3} />
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide">
                  {/* My Story Ring */}
                  <StoryRing
                    profile={myProfile}
                    hasStory={myActiveStories.length > 0}
                    isViewed={false}
                    onClick={() => {
                      if (myActiveStories.length > 0) {
                        handleStoryClick(myActiveStories);
                      } else {
                        setUploadingStory(true);
                      }
                    }}
                    isOwnProfile
                  />

                  {/* Other users' stories */}
                  {otherStoryGroups.map(([profileId, { profile, stories }]) => {
                    const hasViewed = stories.every(s => s.views?.includes(myProfile?.id));
                    return (
                      <StoryRing
                        key={profileId}
                        profile={profile}
                        hasStory
                        isViewed={hasViewed}
                        onClick={() => handleStoryClick(stories)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Feed continues here if we wanted a vertical feed, but stories are usually rings */}
              {otherStoryGroups.length === 0 && myActiveStories.length === 0 && !isLoadingProfiles && (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-500 mb-4">No recent stories</p>
                  <Button variant="outline" onClick={() => setUploadingStory(true)}>
                    Be the first to post!
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column: My Uploads History */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">My Uploads</h3>
                  <Badge variant="secondary">{myUploadHistory.length}</Badge>
                </div>
                
                <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {myUploadHistory.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      You haven't uploaded any stories yet.
                    </p>
                  ) : (
                    myUploadHistory.map((story) => (
                      <div key={story.id} className="flex gap-3 group">
                        <div 
                          className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer bg-gray-100 border border-gray-200"
                          onClick={() => handleStoryClick([story])}
                        >
                          {story.media_type === 'video' ? (
                            <video src={story.media_url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <p className="text-sm text-gray-900 font-medium truncate">
                              {story.caption || 'No caption'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {story.created_date ? new Date(story.created_date).toLocaleDateString() : ''}
                            </p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Eye size={12} />
                              <span>{story.views?.length || 0}</span>
                            </div>
                            <button 
                              onClick={() => handleDeleteStory(story.id)}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile "My Uploads" Section (visible below rings on small screens) */}
          <div className="lg:hidden mt-8">
            <h3 className="font-bold text-gray-900 mb-4 px-1">My Uploads</h3>
            <div className="grid grid-cols-3 gap-3">
              {myUploadHistory.map((story) => (
                <div 
                  key={story.id} 
                  className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                  onClick={() => handleStoryClick([story])}
                >
                  {story.media_type === 'video' ? (
                    <video src={story.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                  {/* View count overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <div className="flex items-center gap-1 text-white text-xs">
                      <Eye size={10} />
                      <span>{story.views?.length || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {myUploadHistory.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No uploads yet</p>
            )}
          </div>

          {/* Load More Button */}
          {hasMore && !isLoadingMore && (
            <div className="text-center py-8">
              <Button onClick={loadMore} variant="outline">
                Load More Stories
              </Button>
            </div>
          )}
        </main>

        {/* Upload dialog */}
        {uploadingStory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add to Your Story</h2>
                <Button variant="ghost" size="icon" onClick={() => setUploadingStory(false)}>
                  <span className="text-xl">×</span>
                </Button>
              </div>
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
      </div>
    </PullToRefresh>
  );
}