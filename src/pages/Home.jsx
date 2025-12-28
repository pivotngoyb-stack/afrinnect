import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Grid3X3, Layers, Globe, MapPin, Sparkles, Crown, Heart as HeartIcon, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProfileCard from '@/components/profile/ProfileCard';
import ProfileMini from '@/components/profile/ProfileMini';
import FilterDrawer from '@/components/discovery/FilterDrawer';
import Logo from '@/components/shared/Logo';
import AfricanPattern from '@/components/shared/AfricanPattern';
import LikesLimitPaywall from '@/components/paywall/LikesLimitPaywall';
import AdBanner from '@/components/ads/AdBanner';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import TutorialTooltip from '@/components/shared/TutorialTooltip';
import MessageWithLikeModal from '@/components/home/MessageWithLikeModal';
import UbuntuAIButton from '@/components/shared/UbuntuAIButton';
import confetti from 'canvas-confetti';
import { usePerformanceMonitor } from '@/components/shared/usePerformanceMonitor';
import EmptyState from '@/components/shared/EmptyState';
import { useConversionTracker, CONVERSION_EVENTS } from '@/components/shared/ConversionTracker';
import PullToRefresh from '@/components/shared/PullToRefresh';
import LazyImage from '@/components/shared/LazyImage';
import { useUpgradePrompts, UpgradePromptBanner } from '@/components/monetization/UpgradePrompts';
import { ProfileCardSkeleton } from '@/components/shared/SkeletonLoader';

export default function Home() {
  usePerformanceMonitor('Home');
  const { trackEvent } = useConversionTracker();
  
  const [viewMode, setViewMode] = useState('swipe');
  const [discoveryMode, setDiscoveryMode] = useState('global');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState({});
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [showLimitPaywall, setShowLimitPaywall] = useState(false);
  const [swipeHistory, setSwipeHistory] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [pendingLikeProfile, setPendingLikeProfile] = useState(null);
  const queryClient = useQueryClient();
  const { prompt: upgradePrompt, dismissPrompt } = useUpgradePrompts(myProfile);

  // Fetch user's profile and redirect if needed
  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          // Not logged in - do nothing, let layout handle redirect
          return;
        }

        const user = await base44.auth.me();
        if (!user) {
          // Not logged in - do nothing
          return;
        }

        // If admin, redirect to admin dashboard
        if (user.email === 'pivotngoyb@gmail.com' || user.role === 'admin') {
          window.location.href = createPageUrl('AdminDashboard');
          return;
        }

        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          const profile = profiles[0];
          setMyProfile(profile);

          // Update login streak
          const today = new Date().toISOString().split('T')[0];
          const lastLogin = profile.last_login_date;
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          
          if (lastLogin !== today) {
            try {
              let newStreak = profile.login_streak || 0;
              if (lastLogin === yesterday) {
                newStreak += 1; // Consecutive day
              } else if (lastLogin !== today) {
                newStreak = 1; // Reset streak
              }
              
              await base44.entities.UserProfile.update(profile.id, {
                login_streak: newStreak,
                last_login_date: today,
                last_active: new Date().toISOString()
              });
            } catch (error) {
              console.error('Failed to update login streak:', error);
            }
          }
        } else {
          window.location.href = createPageUrl('Onboarding');
        }
      } catch (e) {
        // Not logged in - do nothing, let them see landing
      }
    };
    fetchMyProfile();
  }, []);

  // Calculate age helper function
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

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

  // Enhanced AI-powered match score calculation with personalization
  const calculateMatchScore = async (user1, user2) => {
    if (!user1 || !user2) return 0;
    
    let score = 0;
    
    // Cultural compatibility (25 points)
    if (user1.country_of_origin === user2.country_of_origin) score += 10;
    if (user1.tribe_ethnicity === user2.tribe_ethnicity) score += 8;
    if (user1.languages?.some(l => user2.languages?.includes(l))) score += 7;
    
    // Cultural values alignment (20 points) - ENHANCED
    const sharedCulturalValues = user1.cultural_values?.filter(v => user2.cultural_values?.includes(v))?.length || 0;
    score += Math.min(sharedCulturalValues * 4, 20);
    
    // Relationship goals & religion (20 points)
    if (user1.religion === user2.religion) score += 10;
    if (user1.relationship_goal === user2.relationship_goal) score += 10;
    
    // Interests alignment (15 points) - ENHANCED
    const sharedInterests = user1.interests?.filter(i => user2.interests?.includes(i))?.length || 0;
    score += Math.min(sharedInterests * 3, 15);
    
    // Location proximity (10 points)
    if (user1.current_country === user2.current_country) score += 5;
    if (user1.current_city === user2.current_city) score += 5;
    
    // Preference match (10 points)
    const user1Gender = user1.gender;
    const user2Gender = user2.gender;
    if (user1.looking_for?.includes(user2Gender)) score += 5;
    if (user2.looking_for?.includes(user1Gender)) score += 5;
    
    // Lifestyle compatibility (bonus)
    if (user1.lifestyle?.smoking === user2.lifestyle?.smoking) score += 3;
    if (user1.lifestyle?.drinking === user2.lifestyle?.drinking) score += 3;
    if (user1.lifestyle?.fitness === user2.lifestyle?.fitness) score += 4;
    
    return Math.min(Math.round(score), 100);
  };

  // Fetch profiles for discovery
  const { data: profiles = [], isLoading, refetch } = useQuery({
    queryKey: ['discovery-profiles', filters, discoveryMode, myProfile?.filters],
    queryFn: async () => {
      // Merge manual filters with saved filters from profile
      const savedFilters = myProfile?.filters || {};
      const combinedFilters = { ...savedFilters, ...filters };

      let filterQuery = { is_active: true };

      // CRITICAL: Only show USA and Canada users
      filterQuery.current_country = { 
        $in: ['USA', 'United States', 'Canada', 'United States of America', 'US'] 
      };
      
      if (combinedFilters.relationship_goals?.length > 0) {
        filterQuery.relationship_goal = { $in: combinedFilters.relationship_goals };
      }
      if (combinedFilters.religions?.length > 0) {
        filterQuery.religion = { $in: combinedFilters.religions };
      }
      if (combinedFilters.countries_of_origin?.length > 0) {
        filterQuery.country_of_origin = { $in: combinedFilters.countries_of_origin };
      }
      if (combinedFilters.states?.length > 0) {
        filterQuery.current_state = { $in: combinedFilters.states };
      }

      try {
        const allProfiles = await base44.entities.UserProfile.filter(filterQuery, '-last_active', 50); // Reduced from 200 to 50

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
          const maxDistance = combinedFilters.distance_km || 100; // Default 100km
          if (distance > maxDistance) return false;
        }

        // In global mode, prioritize same country if no location
        if (discoveryMode === 'global' && !myProfile?.location?.lat) {
          // Still show matches, but same country preferred in sorting
          return true;
        }

        // Age filter
        if (p.birth_date && (combinedFilters.age_min || combinedFilters.age_max)) {
          const age = calculateAge(p.birth_date);
          if (combinedFilters.age_min && age < combinedFilters.age_min) return false;
          if (combinedFilters.age_max && age > combinedFilters.age_max) return false;
        }

        // Height filter
        if (combinedFilters.height_min && p.height_cm && p.height_cm < combinedFilters.height_min) return false;
        if (combinedFilters.height_max && p.height_cm && p.height_cm > combinedFilters.height_max) return false;

        // Lifestyle filters
        if (combinedFilters.smoking?.length > 0 && !combinedFilters.smoking.includes(p.lifestyle?.smoking)) return false;
        if (combinedFilters.drinking?.length > 0 && !combinedFilters.drinking.includes(p.lifestyle?.drinking)) return false;
        if (combinedFilters.fitness?.length > 0 && !combinedFilters.fitness.includes(p.lifestyle?.fitness)) return false;

        // Languages filter
        if (combinedFilters.languages?.length > 0) {
          const hasMatchingLanguage = combinedFilters.languages.some(lang => p.languages?.includes(lang));
          if (!hasMatchingLanguage) return false;
        }

        // Tribe/ethnicity filter
        if (combinedFilters.tribe_ethnicity && !p.tribe_ethnicity?.toLowerCase().includes(combinedFilters.tribe_ethnicity.toLowerCase())) {
          return false;
        }

        // Verification filter
        if (combinedFilters.verified_only && !p.verification_status?.photo_verified) return false;

        // Cultural values filter - ENHANCED
        if (combinedFilters.cultural_values?.length > 0) {
          const hasMatchingValue = combinedFilters.cultural_values.some(value => p.cultural_values?.includes(value));
          if (!hasMatchingValue) return false;
        }

        // Interests filter - ENHANCED
        if (combinedFilters.interests?.length > 0) {
          const hasMatchingInterest = combinedFilters.interests.some(interest => p.interests?.includes(interest));
          if (!hasMatchingInterest) return false;
        }

        // Preferred language filter - ENHANCED
        if (combinedFilters.preferred_language && p.preferred_language !== combinedFilters.preferred_language) {
          return false;
        }

        // Hide incognito users unless they liked you
        if (p.incognito_mode) return false;

        // Filter by gender preference - only show genders you're interested in
        if (myProfile?.looking_for?.length > 0 && !myProfile.looking_for.includes(p.gender)) {
          return false;
        }

        return true;
      });

      // Calculate distance and AI match scores for top profiles - optimized
      const profilesWithScores = await Promise.all(
        filteredProfiles.slice(0, 30).map(async (p) => { // Reduced from 50 to 30
          try {
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
          } catch (error) {
            console.error('Failed to calculate match score:', error);
            return { ...p, matchScore: 0, distance: null };
          }
        })
      );

      // Feature profiles based on tier (VIP > Elite > Premium)
      const featuredProfiles = profilesWithScores.filter(p => 
        p.subscription_tier === 'vip' || p.subscription_tier === 'elite'
      );
      const regularProfiles = profilesWithScores.filter(p =>
        p.subscription_tier !== 'vip' && p.subscription_tier !== 'elite'
      );
      
      // Sort both groups
      if (discoveryMode === 'local') {
        featuredProfiles.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
        regularProfiles.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));
      } else {
        featuredProfiles.sort((a, b) => b.matchScore - a.matchScore);
        regularProfiles.sort((a, b) => b.matchScore - a.matchScore);
      }
      
        // Featured profiles appear first
        return [...featuredProfiles, ...regularProfiles];
      } catch (error) {
        console.error('Failed to fetch profiles:', error);
        return [];
      }
    },
    enabled: !!myProfile,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 300000, // Cache for 5 minutes
    cacheTime: 600000, // Keep in cache for 10 minutes
    retry: 1,
    retryDelay: 5000
  });

  // Check daily like limit
  const canLike = () => {
    if (myProfile?.subscription_tier && myProfile.subscription_tier !== 'free') return true;
    
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
    mutationFn: async ({ likedId, isSuperLike = false, likeNote = null }) => {
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

      // If there's a note, create initial message
      if (likeNote) {
        // Check if match exists first
        const existingMatch = await base44.entities.Match.filter({
          $or: [
            { user1_id: myProfile.id, user2_id: likedId },
            { user1_id: likedId, user2_id: myProfile.id }
          ]
        });

        if (existingMatch.length > 0) {
          await base44.entities.Message.create({
            match_id: existingMatch[0].id,
            sender_id: myProfile.id,
            receiver_id: likedId,
            content: likeNote,
            message_type: 'text',
            like_note: likeNote
          });
        }
      }

      // Check for mutual like (match)
      const mutualLikes = await base44.entities.Like.filter({
        liker_id: likedId,
        liked_id: myProfile.id
      });

      if (mutualLikes.length > 0) {
        // Track first match
        if (!myProfile.has_matched_before) {
          trackEvent(CONVERSION_EVENTS.FIRST_MATCH);
          await base44.entities.UserProfile.update(myProfile.id, {
            has_matched_before: true
          });
        }

        // Mark both likes as seen
        await base44.entities.Like.update(mutualLikes[0].id, { is_seen: true });
        const myNewLike = await base44.entities.Like.filter({
          liker_id: myProfile.id,
          liked_id: likedId
        });
        if (myNewLike.length > 0) {
          await base44.entities.Like.update(myNewLike[0].id, { is_seen: true });
        }

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
        // Celebrate match with confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setShowMatchCelebration(true);
        setTimeout(() => setShowMatchCelebration(false), 3000);
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
    // Show message modal
    setPendingLikeProfile(profile);
    setShowMessageModal(true);
  };

  const handleLikeWithMessage = (message) => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    setSwipeHistory([...swipeHistory, { profile: pendingLikeProfile, action: 'like', index: currentIndex }]);
    likeMutation.mutate({ likedId: pendingLikeProfile.id, likeNote: message });
    setShowMessageModal(false);
    setPendingLikeProfile(null);
  };

  const handleSuperLike = async (profile) => {
    const tier = myProfile?.subscription_tier || 'free';
    
    // Check super like limits by tier
    const today = new Date().toISOString().split('T')[0];
    const superLikesToday = await base44.entities.Like.filter({
      liker_id: myProfile.id,
      is_super_like: true,
      created_date: { $gte: `${today}T00:00:00.000Z` }
    });
    
    // Free: 1 per week, Premium: 5 per day, Elite/VIP: unlimited
    const limits = {
      free: { count: 1, period: 'week' },
      premium: { count: 5, period: 'day' },
      elite: { count: 999, period: 'day' },
      vip: { count: 999, period: 'day' }
    };
    
    const limit = limits[tier] || limits.free;
    
    if (tier === 'free') {
      // Check weekly limit
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const superLikesThisWeek = await base44.entities.Like.filter({
        liker_id: myProfile.id,
        is_super_like: true,
        created_date: { $gte: weekAgo }
      });
      
      if (superLikesThisWeek.length >= 1) {
        alert('Free users get 1 Super Like per week. Upgrade to Premium for more!');
        return;
      }
    } else if (tier === 'premium' && superLikesToday.length >= 5) {
      alert('Premium users get 5 Super Likes per day. Upgrade to Elite for unlimited!');
      return;
    }
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
    setSwipeHistory([...swipeHistory, { profile, action: 'superlike', index: currentIndex }]);
    likeMutation.mutate({ likedId: profile.id, isSuperLike: true });
  };

  const handlePass = () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
    setSwipeHistory([...swipeHistory, { profile: currentProfile, action: 'pass', index: currentIndex }]);
    setCurrentIndex(prev => prev + 1);
  };

  const handleRewind = async () => {
    if (swipeHistory.length === 0 || !myProfile?.is_premium) return;
    
    const lastAction = swipeHistory[swipeHistory.length - 1];
    
    // If last action was a like, delete it
    if (lastAction.action === 'like' || lastAction.action === 'superlike') {
      const existingLikes = await base44.entities.Like.filter({
        liker_id: myProfile.id,
        liked_id: lastAction.profile.id
      });
      
      for (const like of existingLikes) {
        await base44.entities.Like.delete(like.id);
      }
    }
    
    setCurrentIndex(lastAction.index);
    setSwipeHistory(swipeHistory.slice(0, -1));
    
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  const tutorialSteps = [
    { icon: '👋', title: 'Welcome to Afrinnect!', description: 'Swipe right to like, left to pass. Let\'s find your perfect match!' },
    { icon: '⭐', title: 'Super Like', description: 'Tap the star to super like someone special. They\'ll know you\'re really interested!' },
    { icon: '🔥', title: 'Daily Matches', description: 'Check your daily curated matches for the best compatibility!' },
    { icon: '💎', title: 'Premium Features', description: 'Upgrade to see who likes you, get unlimited likes, and more!' }
  ];

  const completeTutorial = async () => {
    if (myProfile) {
      await base44.entities.UserProfile.update(myProfile.id, {
        tutorial_completed: true
      });
    }
  };

  const currentProfile = profiles[currentIndex];
  const hasMoreProfiles = currentIndex < profiles.length;

  return (
    <PullToRefresh onRefresh={refetch}>
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
                userTier={myProfile?.subscription_tier || 'free'}
              />

              {/* Communities */}
              <Link to={createPageUrl('Communities')}>
                <Button variant="outline" className="gap-1">
                  <span className="text-lg">👥</span>
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
          <div className="flex items-center justify-center min-h-[70vh]">
            <ProfileCardSkeleton />
          </div>
        ) : viewMode === 'swipe' ? (
          /* Swipe Mode */
          <div className="flex items-center justify-center min-h-[60vh] sm:min-h-[70vh] relative">
            {/* Rewind Button (Premium) */}
            {myProfile?.is_premium && swipeHistory.length > 0 && (
              <Button
                onClick={handleRewind}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full w-14 h-14 bg-amber-500 hover:bg-amber-600"
                title="Rewind last swipe"
              >
                <RotateCcw size={24} />
              </Button>
            )}
            
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
                <EmptyState
                  icon={Sparkles}
                  title="That's everyone for now!"
                  description="Adjust your filters or check back later for new members"
                  actionLabel="Reset Filters"
                  onAction={() => setFilters({})}
                />
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

        {/* Smart Upgrade Prompts */}
        <UpgradePromptBanner prompt={upgradePrompt} onDismiss={dismissPrompt} />

        {/* Likes Limit Paywall */}
        <AnimatePresence>
          {showLimitPaywall && (
            <LikesLimitPaywall onClose={() => setShowLimitPaywall(false)} />
          )}
        </AnimatePresence>

        {/* Tutorial */}
        {showTutorial && (
          <TutorialTooltip steps={tutorialSteps} onComplete={completeTutorial} />
        )}

        {/* Match Celebration */}
        <AnimatePresence>
          {showMatchCelebration && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="text-center">
                <div className="text-8xl mb-4">💕</div>
                <h2 className="text-4xl font-bold text-white drop-shadow-lg">It's a Match!</h2>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message with Like Modal */}
        <MessageWithLikeModal
          profile={pendingLikeProfile}
          open={showMessageModal}
          onSend={handleLikeWithMessage}
          onClose={() => {
            setShowMessageModal(false);
            setPendingLikeProfile(null);
          }}
          />
          </main>

          {/* Ubuntu AI Button */}
          <UbuntuAIButton />
          </div>
    </PullToRefresh>
          );
          }