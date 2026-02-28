import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Sparkles, Crown, Eye, Users, Search, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationItem from '@/components/messaging/ConversationItem';
import ProfileMini from '@/components/profile/ProfileMini';
import ProfileCard from '@/components/profile/ProfileCard';
import CountdownTimer from '@/components/shared/CountdownTimer';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import NotificationBell from '@/components/shared/NotificationBell';
import EmptyState from '@/components/shared/EmptyState';
import MatchCountdownBanner from '@/components/monetization/MatchCountdownBanner';
import BlurredLikesTeaser from '@/components/monetization/BlurredLikesTeaser';
import SocialProofPaywall from '@/components/monetization/SocialProofPaywall';

export default function Matches() {
  
  const [myProfile, setMyProfile] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('matches');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            setMyProfile(profiles[0]);
          }
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
      }
    };
    fetchMyProfile();
  }, []);

  // Fetch matches - OPTIMIZED
  const { data: matchesData = [], isLoading: loadingMatches } = useQuery({
    queryKey: ['matches', myProfile?.id],
    queryFn: async () => {
      try {
        if (!myProfile) return [];
        // OPTIMIZED: Fetch with limits
        const [matches1, matches2] = await Promise.all([
          base44.entities.Match.filter({ user1_id: myProfile.id, is_match: true, status: 'active' }, '-matched_at', 50),
          base44.entities.Match.filter({ user2_id: myProfile.id, is_match: true, status: 'active' }, '-matched_at', 50)
        ]);
        
        const rawMatches = [...matches1, ...matches2];
        
        // DEDUPLICATE: Ensure only one match per partner is shown
        const uniqueMatches = new Map();
        
        rawMatches.forEach(m => {
          const partnerId = m.user1_id === myProfile.id ? m.user2_id : m.user1_id;
          
          if (!uniqueMatches.has(partnerId)) {
            uniqueMatches.set(partnerId, m);
          } else {
            // If duplicate exists, keep the most recent or robust one
            const existing = uniqueMatches.get(partnerId);
            const currentObjDate = new Date(m.matched_at || m.created_date);
            const existingDate = new Date(existing.matched_at || existing.created_date);
            
            if (currentObjDate > existingDate) {
              uniqueMatches.set(partnerId, m);
            }
          }
        });

        // Sort unique matches by date
        return Array.from(uniqueMatches.values()).sort((a, b) => 
          new Date(b.matched_at || b.created_date) - new Date(a.matched_at || a.created_date)
        );
      } catch (error) {
        console.error('Failed to fetch matches:', error);
        return [];
      }
    },
    enabled: !!myProfile,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 600000, // OPTIMIZED: 10 minutes
    retry: 1,
    retryDelay: 5000
  });

  // Fetch profiles for matches
  const { data: matchedProfiles = [] } = useQuery({
    queryKey: ['matched-profiles', matchesData],
    queryFn: async () => {
      try {
        if (!matchesData.length || !myProfile) return [];
        
        const profileIds = matchesData.map(m => 
          m.user1_id === myProfile.id ? m.user2_id : m.user1_id
        );
        
        const profiles = await Promise.all(
          profileIds.map(async (id) => {
            try {
              return await base44.entities.UserProfile.filter({ id });
            } catch (error) {
              console.error(`Failed to fetch profile ${id}:`, error);
              return [];
            }
          })
        );
        
        return profiles.flat().map((profile, idx) => ({
          ...profile,
          match: matchesData[idx]
        }));
      } catch (error) {
        console.error('Failed to fetch matched profiles:', error);
        return [];
      }
    },
    enabled: matchesData.length > 0,
    refetchInterval: false,
    staleTime: 300000,
    retry: 1,
    retryDelay: 5000
  });

  // Fetch likes received - OPTIMIZED (excludes likes that became matches)
  const { data: likesReceived = [], isLoading: loadingLikes } = useQuery({
    queryKey: ['likes-received', myProfile?.id, matchesData.length],
    queryFn: async () => {
      try {
        if (!myProfile) return [];
        
        // Get all likes and matches in parallel (only 2 API calls)
        const [allLikes, allMatches] = await Promise.all([
          base44.entities.Like.filter({ liked_id: myProfile.id }, '-created_date', 50),
          base44.entities.Match.filter({
            $or: [
              { user1_id: myProfile.id, is_match: true },
              { user2_id: myProfile.id, is_match: true }
            ]
          })
        ]);
        
        // Create a Set of matched user IDs for fast lookup
        const matchedUserIds = new Set(
          allMatches.map(m => 
            m.user1_id === myProfile.id ? m.user2_id : m.user1_id
          )
        );
        
        // Filter out likes from users we already matched with
        const filteredLikes = allLikes.filter(
          like => !matchedUserIds.has(like.liker_id)
        );
        
        return filteredLikes.slice(0, 20);
      } catch (error) {
        console.error('Failed to fetch likes:', error);
        return [];
      }
    },
    enabled: !!myProfile,
    staleTime: 60000,
    retry: 1,
    retryDelay: 5000
  });

  // Fetch profiles of people who liked me - OPTIMIZED
  const { data: likerProfiles = [] } = useQuery({
    queryKey: ['liker-profiles', likesReceived],
    queryFn: async () => {
      try {
        if (!likesReceived.length) return [];
        // OPTIMIZED: Fetch only first 10
        const limitedLikes = likesReceived.slice(0, 10);
        const profiles = await Promise.all(
          limitedLikes.map(async (like) => {
            try {
              const result = await base44.entities.UserProfile.filter({ id: like.liker_id });
              return result[0];
            } catch (error) {
              console.error(`Failed to fetch liker profile ${like.liker_id}:`, error);
              return null;
            }
          })
        );
        return profiles.filter(Boolean);
      } catch (error) {
        console.error('Failed to fetch liker profiles:', error);
        return [];
      }
    },
    enabled: likesReceived.length > 0,
    staleTime: 600000, // OPTIMIZED: 10 minutes
    retry: 1,
    retryDelay: 5000
  });

  // Fetch messages and unread counts for each match
  const { data: conversationData = {} } = useQuery({
    queryKey: ['conversations-data', matchesData.map(m => m.id).join(',')],
    queryFn: async () => {
      try {
        const data = {};
        // Batch fetch messages to reduce API calls
        await Promise.all(
          matchesData.slice(0, 50).map(async (match) => {
            try {
              // Get last message
              const messages = await base44.entities.Message.filter(
                { match_id: match.id },
                '-created_date',
                1
              );
              
              // Count unread messages
              const unreadMessages = await base44.entities.Message.filter({
                match_id: match.id,
                receiver_id: myProfile.id,
                is_read: false
              });
              
              data[match.id] = {
                lastMessage: messages[0] || null,
                unreadCount: unreadMessages.length
              };
            } catch (error) {
              console.error(`Failed to fetch data for match ${match.id}:`, error);
            }
          })
        );
        
        return data;
      } catch (error) {
        console.error('Failed to fetch conversation data:', error);
        return {};
      }
    },
    enabled: matchesData.length > 0 && !!myProfile,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
    retry: 1,
    retryDelay: 5000
  });

  // Filter function for search
  const filterBySearch = (profile) => {
    if (!searchQuery) return true;
    return profile.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
  };

  // Separate new matches from active conversations
  const newMatches = matchedProfiles.filter(p => {
    const hasMessages = conversationData[p.match?.id]?.lastMessage;
    return !hasMessages && !p.match?.is_expired && filterBySearch(p);
  });
  
  // Active conversations sorted by most recent message
  const conversations = matchedProfiles
    .filter(p => conversationData[p.match?.id]?.lastMessage && filterBySearch(p))
    .sort((a, b) => {
      const dateA = new Date(conversationData[a.match?.id]?.lastMessage?.created_date || 0);
      const dateB = new Date(conversationData[b.match?.id]?.lastMessage?.created_date || 0);
      return dateB - dateA; // Most recent first
    });

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-700 to-amber-600 bg-clip-text text-transparent">
                Connections
              </h1>
              {matchedProfiles.length > 0 && (
                <p className="text-xs text-gray-500">
                  {matchedProfiles.length} match{matchedProfiles.length !== 1 ? 'es' : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden max-w-4xl mx-auto w-full" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Search Bar */}
        <div className="flex-shrink-0 px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-white border-gray-200 text-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden px-4">
          <TabsList className="w-full grid grid-cols-3 mb-3 flex-shrink-0">
            <TabsTrigger value="matches" className="gap-1 text-xs">
              <Heart size={14} />
              Matches
            </TabsTrigger>
            <TabsTrigger value="likes" className="gap-1 text-xs relative">
              <Eye size={14} />
              Likes
              {likesReceived.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                  {likesReceived.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1 text-xs">
              <MessageCircle size={14} />
              Chats
            </TabsTrigger>
          </TabsList>

          {/* Matches Tab */}
          <TabsContent value="matches" className="flex-1 overflow-y-auto space-y-4">
            {/* Expiring matches urgency banners */}
            {newMatches.filter(p => {
              const matchedAt = new Date(p.match?.matched_at || p.match?.created_date).getTime();
              const expiresAt = p.match?.expires_at || new Date(matchedAt + 24 * 60 * 60 * 1000).toISOString();
              const timeLeft = new Date(expiresAt).getTime() - Date.now();
              return timeLeft < 4 * 60 * 60 * 1000 && timeLeft > 0; // Less than 4 hours
            }).slice(0, 2).map(p => {
              const matchedAt = new Date(p.match?.matched_at || p.match?.created_date).getTime();
              const expiresAt = p.match?.expires_at || new Date(matchedAt + 24 * 60 * 60 * 1000).toISOString();
              return (
                <MatchCountdownBanner
                  key={p.id}
                  matchId={p.match?.id}
                  expiresAt={expiresAt}
                  partnerName={p.display_name}
                  partnerPhoto={p.primary_photo || p.photos?.[0]}
                  onExpire={() => queryClient.invalidateQueries(['matches'])}
                />
              );
            })}

            {newMatches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    New Matches
                    <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-700">
                      {newMatches.length}
                    </Badge>
                  </h3>
                  <p className="text-xs text-amber-600 font-medium animate-pulse">
                    ⏰ Send a message before they expire!
                  </p>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                  {newMatches.map(profile => {
                    // Use match expiry or default to 24h from match creation
                    const matchedAt = new Date(profile.match?.matched_at || profile.match?.created_date).getTime();
                    const expiresAt = profile.match?.expires_at 
                      ? new Date(profile.match.expires_at).toISOString()
                      : new Date(matchedAt + 24 * 60 * 60 * 1000).toISOString();
                    
                    return (
                      <motion.div
                        key={profile.id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex-shrink-0 w-32"
                      >
                        <Link to={createPageUrl(`Chat?matchId=${profile.match?.id}`)}>
                          <div className="relative">
                            <img
                              src={profile.primary_photo || profile.photos?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'}
                              alt={profile.display_name}
                              className="w-32 h-40 object-cover rounded-2xl shadow-md hover:shadow-lg transition"
                            />
                            <div className="absolute top-2 left-2">
                              <CountdownTimer
                                expiresAt={expiresAt}
                                onExpire={() => queryClient.invalidateQueries(['matches'])}
                              />
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent rounded-b-2xl">
                              <p className="text-white font-medium text-sm truncate">{profile.display_name}</p>
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow">
                              <Heart size={14} className="text-white fill-white" />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {loadingMatches && (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex-shrink-0 w-32">
                    <LoadingSkeleton variant="grid" />
                  </div>
                ))}
              </div>
            )}

            {matchedProfiles.length === 0 && !loadingMatches && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">💕</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Your matches will appear here</h3>
                <p className="text-gray-500 mb-4 max-w-sm mx-auto">
                  When you and someone else both like each other, you'll match and can start chatting!
                </p>
                
                {/* Social proof */}
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-sm text-green-700">847 new matches made today</span>
                </div>
                
                <Button 
                  onClick={() => window.location.href = createPageUrl('Home')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Heart size={16} className="mr-2" />
                  Start Discovering
                </Button>
                
                <p className="text-xs text-gray-400 mt-4">
                  💡 Tip: Complete profiles get 3x more matches
                </p>
              </motion.div>
            )}
          </TabsContent>

          {/* Likes Tab */}
          <TabsContent value="likes" className="flex-1 overflow-y-auto">
            {!myProfile?.is_premium && !['premium', 'elite', 'vip'].includes(myProfile?.subscription_tier) ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-6"
              >
                <BlurredLikesTeaser likesCount={likesReceived.length} className="mb-6" />
                <SocialProofPaywall className="max-w-sm mx-auto" />
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {likerProfiles.map(profile => (
                  <ProfileMini
                    key={profile.id}
                    profile={profile}
                    onClick={() => setSelectedProfile(profile)}
                  />
                ))}
                {likerProfiles.length === 0 && !loadingLikes && (
                  <div className="col-span-full">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-8"
                    >
                      <div className="w-16 h-16 mx-auto mb-4 bg-pink-100 rounded-full flex items-center justify-center">
                        <Heart size={28} className="text-pink-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">No new likes yet</h3>
                      <p className="text-gray-500 mb-4 text-sm">
                        Boost your profile to appear first and get up to 10x more visibility!
                      </p>
                      <Button 
                        onClick={() => window.location.href = createPageUrl('PricingPlans')}
                        variant="outline"
                        className="border-purple-300 text-purple-600 hover:bg-purple-50"
                      >
                        <Sparkles size={16} className="mr-2" />
                        Boost Profile
                      </Button>
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="flex-1 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
              {conversations.length > 0 ? (
                <ScrollArea className="flex-1">
                  <div className="divide-y divide-gray-100">
                    {conversations.map(profile => {
                      const convData = conversationData[profile.match?.id] || {};
                      return (
                        <Link key={profile.id} to={createPageUrl(`Chat?matchId=${profile.match?.id}`)}>
                          <ConversationItem
                            match={profile.match}
                            profile={profile}
                            lastMessage={convData.lastMessage}
                            unreadCount={convData.unreadCount || 0}
                          />
                        </Link>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageCircle size={28} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No conversations yet</h3>
                  <p className="text-gray-500 mb-4 text-sm max-w-xs mx-auto">
                    When you match with someone, send the first message to break the ice!
                  </p>
                  
                  {newMatches.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-purple-600 font-medium">
                        You have {newMatches.length} match{newMatches.length !== 1 ? 'es' : ''} waiting!
                      </p>
                      <Button 
                        onClick={() => setActiveTab('matches')}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        Say Hello 👋
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => window.location.href = createPageUrl('Home')}
                      variant="outline"
                    >
                      Find Matches
                    </Button>
                  )}
                </motion.div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

        {/* Selected Profile Modal */}
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
                  onLike={() => setSelectedProfile(null)}
                  onPass={() => setSelectedProfile(null)}
                  onSuperLike={() => setSelectedProfile(null)}
                  expanded
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}