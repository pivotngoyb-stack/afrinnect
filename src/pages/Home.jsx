import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Grid3X3, Layers, Globe, MapPin, Sparkles, Crown, Heart as HeartIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileCard from '@/components/profile/ProfileCard';
import ProfileMini from '@/components/profile/ProfileMini';
import FilterDrawer from '@/components/discovery/FilterDrawer';
import Logo from '@/components/shared/Logo';
import AfricanPattern from '@/components/shared/AfricanPattern';
import LikesLimitPaywall from '@/components/paywall/LikesLimitPaywall';
import AdBanner from '@/components/ads/AdBanner';

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
          if (user.email === 'pivotngoyb@gmail.com' || user.role === 'admin') {
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

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

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

      const allProfiles = await base44.entities.UserProfile.filter(filterQuery, '-last_active', 200);

      // Apply AI matching and comprehensive filters
      const filteredProfiles = allProfiles.filter(p => {
        if (myProfile && p.id === myProfile.id) return false;

        // Distance filter (local mode)
        if (discoveryMode === 'local' && myProfile?.location?.lat && p.location?.lat) {
          const distance = calculateDistance(
            myProfile.location.lat,
            myProfile.location.lng,
            p.location.lat,
            p.location.lng
          );
          const maxDistance = filters.distance_km || 50; // Default 50km
          if (distance > maxDistance) return false;
        }

        // Age filter
        if (p.birth_date && filters.age_min && filters.age_max) {
          const age = calculateAge(p.birth_date);
          if (age < filters.age_min || age > filters.age_max) return false;
        }

        // Height filter
        if (filters.height_min && p.height_cm && p.height_cm < filters.height_min) return false;
        if (filters.height_max && p.height_cm && p.height_cm > filters.height_max) return false;

        // Lifestyle filters
        if (filters.smoking?.length > 0 && !filters.smoking.includes(p.lifestyle?.smoking)) return false;
        if (filters.drinking?.length > 0 && !filters.drinking.includes(p.lifestyle?.drinking)) return false;
        if (filters.fitness?.length > 0 && !filters.fitness.includes(p.lifestyle?.fitness)) return false;

        // Languages filter
        if (filters.languages?.length > 0) {
          const hasMatchingLanguage = filters.languages.some(lang => p.languages?.includes(lang));
          if (!hasMatchingLanguage) return false;
        }

        // Tribe/ethnicity filter
        if (filters.tribe_ethnicity && !p.tribe_ethnicity?.toLowerCase().includes(filters.tribe_ethnicity.toLowerCase())) {
          return false;
        }

        // Verification filter
        if (filters.verified_only && !p.verification_status?.photo_verified) return false;

        // Hide incognito users unless they liked you
        if (p.incognito_mode) return false;

        return true;
      });

      // Calculate distance and AI match scores for top profiles
      const profilesWithScores = await Promise.all(
        filteredProfiles.slice(0, 50).map(async (p) => {
          const score = await calculateMatchScore(myProfile, p);
          let distance = null;
          if (myProfile?.location?.lat && p.location?.lat) {
            distance = calculateDistance(
              myProfile.location.lat,
              myProfile.location.lng,
              p.location.lat,
              p.location.lng
            );
          }
          return { ...p, matchScore: score, distance };
        })
      );

      // Sort by distance (local mode) or match score (global mode)
      if (discoveryMode === 'local') {
        return profilesWithScores.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
      } else {
        return profilesWithScores.sort((a, b) => b.matchScore - a.matchScore);
      }
    },
    enabled: !!myProfile
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

  // AI-powered match score calculation
  const calculateMatchScore = async (user1, user2) => {
    if (!user1 || !user2) return 0;
    
    let score = 0;
    
    // Cultural compatibility (30 points)
    if (user1.country_of_origin === user2.country_of_origin) score += 15;
    if (user1.tribe_ethnicity === user2.tribe_ethnicity) score += 10;
    if (user1.languages?.some(l => user2.languages?.includes(l))) score += 5;
    
    // Values alignment (30 points)
    if (user1.religion === user2.religion) score += 10;
    if (user1.relationship_goal === user2.relationship_goal) score += 15;
    const sharedValues = user1.cultural_values?.filter(v => user2.cultural_values?.includes(v))?.length || 0;
    score += Math.min(sharedValues * 2, 5);
    
    // Location proximity (20 points)
    if (user1.current_country === user2.current_country) score += 10;
    if (user1.current_city === user2.current_city) score += 10;
    
    // Preference match (20 points)
    const user1Gender = user1.gender;
    const user2Gender = user2.gender;
    if (user1.looking_for?.includes(user2Gender)) score += 10;
    if (user2.looking_for?.includes(user1Gender)) score += 10;
    
    // Lifestyle compatibility (bonus)
    if (user1.lifestyle?.smoking === user2.lifestyle?.smoking) score += 3;
    if (user1.lifestyle?.drinking === user2.lifestyle?.drinking) score += 3;
    if (user1.lifestyle?.fitness === user2.lifestyle?.fitness) score += 2;
    const sharedInterests = user1.interests?.filter(i => user2.interests?.includes(i))?.length || 0;
    score += Math.min(sharedInterests * 2, 8);
    
    return Math.min(Math.round(score), 100);
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

        // Send notifications to both users
        const likedProfiles = await base44.entities.UserProfile.filter({ id: likedId });
        if (likedProfiles.length > 0) {
          await base44.entities.Notification.create({
            user_profile_id: likedId,
            type: 'match',
            title: "It's a Match! 💕",
            message: `You and ${myProfile.display_name} liked each other!`,
            from_profile_id: myProfile.id,
            link_to: createPageUrl('Matches')
          });

          await base44.entities.Notification.create({
            user_profile_id: myProfile.id,
            type: 'match',
            title: "It's a Match! 💕",
            message: `You and ${likedProfiles[0].display_name} liked each other!`,
            from_profile_id: likedId,
            link_to: createPageUrl('Matches')
          });
        }

        return { isMatch: true };
      } else {
        // Send like notification
        await base44.entities.Notification.create({
          user_profile_id: likedId,
          type: isSuperLike ? 'super_like' : 'like',
          title: isSuperLike ? "You got a Super Like! ⭐" : "Someone likes you!",
          message: `${myProfile.display_name} ${isSuperLike ? 'super liked' : 'liked'} your profile`,
          from_profile_id: myProfile.id,
          link_to: createPageUrl('Matches')
        });
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

              {/* Daily Matches */}
              <Link to={createPageUrl('DailyMatches')}>
                <Button variant="outline" className="gap-1 border-amber-200 text-amber-600">
                  <Sparkles size={18} />
                </Button>
              </Link>

              {/* Who Likes You Button */}
              <Link to={createPageUrl('WhoLikesYou')}>
                <Button variant="outline" className="gap-1">
                  <HeartIcon size={18} className="text-pink-600" />
                </Button>
              </Link>
              </div>
              </div>
              </div>
              </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Ad Banner */}
        <AdBanner placement="discovery" userProfile={myProfile} />

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
                  matchScore={currentProfile.matchScore}
                  matchReasons={[
                    `${Math.round(currentProfile.matchScore * 0.3)}% cultural compatibility`,
                    `${Math.round(currentProfile.matchScore * 0.3)}% values alignment`,
                    `${Math.round(currentProfile.matchScore * 0.2)}% location match`
                  ]}
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