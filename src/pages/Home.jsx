import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Grid3X3, Layers, Globe, MapPin, Sparkles, Crown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileCard from '@/components/profile/ProfileCard';
import ProfileMini from '@/components/profile/ProfileMini';
import FilterDrawer from '@/components/discovery/FilterDrawer';
import Logo from '@/components/shared/Logo';
import AfricanPattern from '@/components/shared/AfricanPattern';
import LikesLimitPaywall from '@/components/paywall/LikesLimitPaywall';

export default function Home() {
  const [viewMode, setViewMode] = useState('swipe');
  const [discoveryMode, setDiscoveryMode] = useState('global');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState({});
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [showLimitPaywall, setShowLimitPaywall] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user's profile and redirect if needed
  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          // If admin, redirect to admin dashboard
          if (user.email === 'pivotngoyb@gmail.com') {
            window.location.href = createPageUrl('AdminDashboard');
            return;
          }
          
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            setMyProfile(profiles[0]);
          }
        }
      } catch (e) {
        // Not logged in, redirect to landing
        window.location.href = createPageUrl('Landing');
      }
    };
    fetchMyProfile();
  }, []);

  // Fetch profiles for discovery
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['discovery-profiles', filters, discoveryMode],
    queryFn: async () => {
      let filterQuery = { is_active: true };
      
      if (filters.relationship_goals?.length > 0) {
        filterQuery.relationship_goal = { $in: filters.relationship_goals };
      }
      if (filters.religions?.length > 0) {
        filterQuery.religion = { $in: filters.religions };
      }
      if (filters.countries_of_origin?.length > 0) {
        filterQuery.country_of_origin = { $in: filters.countries_of_origin };
      }
      if (filters.states?.length > 0) {
        filterQuery.current_state = { $in: filters.states };
      }

      const allProfiles = await base44.entities.UserProfile.filter(filterQuery, '-last_active', 50);

      // Filter out own profile and apply age and verification filters
      return allProfiles.filter(p => {
        if (myProfile && p.id === myProfile.id) return false;
        if (p.birth_date && filters.age_min && filters.age_max) {
          const age = calculateAge(p.birth_date);
          if (age < filters.age_min || age > filters.age_max) return false;
        }
        if (filters.verified_only && !p.verification_status?.photo_verified) return false;
        return true;
      });
    },
  });

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Check daily like limit
  const canLike = () => {
    if (myProfile?.is_premium) return true;
    
    const today = new Date().toISOString().split('T')[0];
    const resetDate = myProfile?.daily_likes_reset_date;
    const likesUsed = myProfile?.daily_likes_count || 0;
    
    if (resetDate !== today) {
      return true; // New day, reset
    }
    
    return likesUsed < 10; // Free users get 10 likes per day
  };

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async ({ likedId, isSuperLike = false }) => {
      if (!myProfile) return;

      // Check daily limit
      if (!canLike()) {
        throw new Error('daily_limit_reached');
      }
      
      // Update like count
      const today = new Date().toISOString().split('T')[0];
      const resetDate = myProfile.daily_likes_reset_date;
      const shouldReset = resetDate !== today;
      
      await base44.entities.UserProfile.update(myProfile.id, {
        daily_likes_count: shouldReset ? 1 : (myProfile.daily_likes_count || 0) + 1,
        daily_likes_reset_date: today
      });
      
      // Create like record
      await base44.entities.Like.create({
        liker_id: myProfile.id,
        liked_id: likedId,
        is_super_like: isSuperLike,
        is_seen: false
      });

      // Check for mutual like (match)
      const mutualLikes = await base44.entities.Like.filter({
        liker_id: likedId,
        liked_id: myProfile.id
      });

      if (mutualLikes.length > 0) {
        // Create match
        await base44.entities.Match.create({
          user1_id: myProfile.id,
          user2_id: likedId,
          user1_liked: true,
          user2_liked: true,
          is_match: true,
          matched_at: new Date().toISOString(),
          status: 'active'
        });
        return { isMatch: true };
      }
      return { isMatch: false };
    },
    onSuccess: (data) => {
      if (data?.isMatch) {
        // Show match animation/notification
      }
      setCurrentIndex(prev => prev + 1);
    },
    onError: (error) => {
      if (error.message === 'daily_limit_reached') {
        setShowLimitPaywall(true);
      }
    }
  });

  const handleLike = (profile) => {
    likeMutation.mutate({ likedId: profile.id });
  };

  const handleSuperLike = (profile) => {
    likeMutation.mutate({ likedId: profile.id, isSuperLike: true });
  };

  const handlePass = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const currentProfile = profiles[currentIndex];
  const hasMoreProfiles = currentIndex < profiles.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 relative">
      <AfricanPattern className="text-purple-600" opacity={0.03} />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Logo />
            
            <div className="flex items-center gap-3">
              {/* Discovery Mode Toggle */}
              <Tabs value={discoveryMode} onValueChange={setDiscoveryMode}>
                <TabsList className="bg-gray-100">
                  <TabsTrigger value="local" className="gap-1 text-xs sm:text-sm">
                    <MapPin size={14} />
                    <span className="hidden sm:inline">Local</span>
                  </TabsTrigger>
                  <TabsTrigger value="global" className="gap-1 text-xs sm:text-sm">
                    <Globe size={14} />
                    <span className="hidden sm:inline">Global</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList className="bg-gray-100">
                  <TabsTrigger value="swipe">
                    <Layers size={18} />
                  </TabsTrigger>
                  <TabsTrigger value="grid">
                    <Grid3X3 size={18} />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Filters */}
              <FilterDrawer 
                filters={filters} 
                onFiltersChange={setFilters}
                isPremium={myProfile?.is_premium}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
          </div>
        ) : viewMode === 'swipe' ? (
          /* Swipe Mode */
          <div className="flex items-center justify-center min-h-[70vh]">
            <AnimatePresence mode="wait">
              {hasMoreProfiles && currentProfile ? (
                <ProfileCard
                  key={currentProfile.id}
                  profile={currentProfile}
                  onLike={() => handleLike(currentProfile)}
                  onPass={handlePass}
                  onSuperLike={() => handleSuperLike(currentProfile)}
                />
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16 px-6"
                >
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-amber-100 flex items-center justify-center">
                    <Sparkles size={40} className="text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">That's everyone for now!</h2>
                  <p className="text-gray-500 mb-6">
                    Adjust your filters or check back later for new members
                  </p>
                  <Button 
                    onClick={() => setFilters({})}
                    variant="outline"
                    className="border-purple-600 text-purple-600"
                  >
                    Reset Filters
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Grid Mode */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {profiles.map(profile => (
              <ProfileMini
                key={profile.id}
                profile={profile}
                onClick={() => setSelectedProfile(profile)}
              />
            ))}
            {profiles.length === 0 && (
              <div className="col-span-full text-center py-16">
                <p className="text-gray-500">No profiles found. Try adjusting your filters.</p>
              </div>
            )}
          </div>
        )}

        {/* Selected Profile Modal (Grid Mode) */}
        <AnimatePresence>
          {selectedProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setSelectedProfile(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ProfileCard
                  profile={selectedProfile}
                  onLike={() => {
                    handleLike(selectedProfile);
                    setSelectedProfile(null);
                  }}
                  onPass={() => setSelectedProfile(null)}
                  onSuperLike={() => {
                    handleSuperLike(selectedProfile);
                    setSelectedProfile(null);
                  }}
                  expanded
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Upsell Banner */}
        {!myProfile?.is_premium && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-30"
          >
            <Link to={createPageUrl('PricingPlans')}>
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 shadow-lg text-white flex items-center gap-3 hover:shadow-xl transition-shadow">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Crown size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold">Upgrade to Premium</h4>
                  <p className="text-sm text-white/80">Unlimited likes & advanced filters</p>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Likes Limit Paywall */}
        <AnimatePresence>
          {showLimitPaywall && (
            <LikesLimitPaywall onClose={() => setShowLimitPaywall(false)} />
          )}
        </AnimatePresence>
        </main>
        </div>
        );
        }