import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StoryRing from '@/components/stories/StoryRing';
import StoryViewer from '@/components/stories/StoryViewer';

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

  // Fetch all non-expired stories with filters applied
  const { data: allStories = [] } = useQuery({
    queryKey: ['stories', myProfile?.id],
    queryFn: async () => {
      const now = new Date().toISOString();
      const stories = await base44.entities.Story.filter({
        is_expired: false,
        expires_at: { $gte: now }
      }, '-created_date', 100);
      
      // Fetch user profiles for each story
      const profileIds = [...new Set(stories.map(s => s.user_profile_id))];
      const profiles = await Promise.all(
        profileIds.map(id => base44.entities.UserProfile.filter({ id }))
      );
      
      const storiesWithProfiles = stories.map(story => ({
        ...story,
        user_profile: profiles.find(p => p[0]?.id === story.user_profile_id)?.[0]
      }));
      
      // Apply user's saved filters
      if (!myProfile?.filters) return storiesWithProfiles;
      
      const userFilters = myProfile.filters;
      return storiesWithProfiles.filter(story => {
        const profile = story.user_profile;
        if (!profile || profile.id === myProfile.id) return true; // Show own stories
        
        // Apply filter checks
        if (userFilters.relationship_goals?.length > 0 && !userFilters.relationship_goals.includes(profile.relationship_goal)) {
          return false;
        }
        if (userFilters.religions?.length > 0 && !userFilters.religions.includes(profile.religion)) {
          return false;
        }
        if (userFilters.countries_of_origin?.length > 0 && !userFilters.countries_of_origin.includes(profile.country_of_origin)) {
          return false;
        }
        if (userFilters.states?.length > 0 && !userFilters.states.includes(profile.current_state)) {
          return false;
        }
        
        // Age filter
        if (profile.birth_date && (userFilters.age_min || userFilters.age_max)) {
          const age = Math.floor((Date.now() - new Date(profile.birth_date)) / (365.25 * 24 * 60 * 60 * 1000));
          if (userFilters.age_min && age < userFilters.age_min) return false;
          if (userFilters.age_max && age > userFilters.age_max) return false;
        }
        
        return true;
      });
    },
    enabled: !!myProfile,
    refetchInterval: 30000
  });

  // Group stories by user
  const storyGroups = allStories.reduce((acc, story) => {
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
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {/* Own story */}
          <div className="relative">
            <StoryRing
              profile={myProfile}
              hasStory={myStories.length > 0}
              isViewed={false}
              onClick={() => myStories.length > 0 ? handleStoryClick(myProfile.id) : setUploadingStory(true)}
              isOwnProfile
            />
          </div>

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
      </main>
    </div>
  );
}