import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Sparkles, Crown, Eye, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ConversationItem from '@/components/messaging/ConversationItem';
import ProfileMini from '@/components/profile/ProfileMini';
import ProfileCard from '@/components/profile/ProfileCard';
import CountdownTimer from '@/components/shared/CountdownTimer';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';

export default function Matches() {
  
  const [myProfile, setMyProfile] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('matches');
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

  // Fetch matches
  const { data: matchesData = [], isLoading: loadingMatches } = useQuery({
    queryKey: ['matches', myProfile?.id],
    queryFn: async () => {
      if (!myProfile) return [];
      const matches1 = await base44.entities.Match.filter({ user1_id: myProfile.id, is_match: true, status: 'active' });
      const matches2 = await base44.entities.Match.filter({ user2_id: myProfile.id, is_match: true, status: 'active' });
      return [...matches1, ...matches2];
    },
    enabled: !!myProfile
  });

  // Fetch profiles for matches
  const { data: matchedProfiles = [] } = useQuery({
    queryKey: ['matched-profiles', matchesData],
    queryFn: async () => {
      if (!matchesData.length || !myProfile) return [];
      
      const profileIds = matchesData.map(m => 
        m.user1_id === myProfile.id ? m.user2_id : m.user1_id
      );
      
      const profiles = await Promise.all(
        profileIds.map(id => base44.entities.UserProfile.filter({ id }))
      );
      
      return profiles.flat().map((profile, idx) => ({
        ...profile,
        match: matchesData[idx]
      }));
    },
    enabled: matchesData.length > 0
  });

  // Fetch likes received
  const { data: likesReceived = [], isLoading: loadingLikes } = useQuery({
    queryKey: ['likes-received', myProfile?.id],
    queryFn: async () => {
      if (!myProfile) return [];
      return base44.entities.Like.filter({ liked_id: myProfile.id, is_seen: false }, '-created_date');
    },
    enabled: !!myProfile
  });

  // Fetch profiles of people who liked me
  const { data: likerProfiles = [] } = useQuery({
    queryKey: ['liker-profiles', likesReceived],
    queryFn: async () => {
      if (!likesReceived.length) return [];
      const profiles = await Promise.all(
        likesReceived.map(like => base44.entities.UserProfile.filter({ id: like.liker_id }))
      );
      return profiles.flat();
    },
    enabled: likesReceived.length > 0
  });

  // Fetch messages for each match
  const { data: messagesMap = {} } = useQuery({
    queryKey: ['last-messages', matchesData],
    queryFn: async () => {
      const map = {};
      for (const match of matchesData) {
        const messages = await base44.entities.Message.filter(
          { match_id: match.id },
          '-created_date',
          1
        );
        if (messages.length > 0) {
          map[match.id] = messages[0];
        }
      }
      return map;
    },
    enabled: matchesData.length > 0
  });

  const newMatches = matchedProfiles.filter(p => !messagesMap[p.match?.id] && !p.match?.is_expired);
  const conversations = matchedProfiles.filter(p => messagesMap[p.match?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-amber-50/20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-amber-600 bg-clip-text text-transparent">
              Connections
            </h1>
            <div className="flex items-center gap-2">
              {likesReceived.length > 0 && (
                <Badge className="bg-purple-600 text-white">
                  {likesReceived.length} likes
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="matches" className="gap-2">
              <Heart size={16} />
              Matches
            </TabsTrigger>
            <TabsTrigger value="likes" className="gap-2 relative">
              <Eye size={16} />
              Likes
              {likesReceived.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">
                  {likesReceived.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageCircle size={16} />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-6">
            {newMatches.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  New Matches
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                  {newMatches.map(profile => {
                    const expiresAt = profile.match?.expires_at || new Date(Date.now() + 86400000).toISOString();
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
                className="text-center py-16"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-100 to-amber-100 flex items-center justify-center">
                  <Users size={40} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">No matches yet</h2>
                <p className="text-gray-500 mb-6">
                  Keep swiping to find your perfect match!
                </p>
                <Link to={createPageUrl('Home')}>
                  <Button className="bg-gradient-to-r from-purple-600 to-purple-700">
                    Discover People
                  </Button>
                </Link>
              </motion.div>
            )}
          </TabsContent>

          {/* Likes Tab */}
          <TabsContent value="likes">
            {!myProfile?.is_premium ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 bg-gradient-to-br from-amber-50 to-purple-50 rounded-3xl"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <Crown size={36} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  {likesReceived.length} people like you!
                </h2>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Upgrade to Premium to see who's interested in you
                </p>
                
                {/* Blurred preview */}
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-[3/4] rounded-xl bg-gray-200 overflow-hidden relative">
                      <div className="absolute inset-0 backdrop-blur-xl bg-white/60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Heart className="text-purple-300" size={24} />
                      </div>
                    </div>
                  ))}
                </div>

                <Link to={createPageUrl('PricingPlans')}>
                  <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700">
                    <Crown size={18} className="mr-2" />
                    Upgrade to Premium
                  </Button>
                </Link>
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
                  <div className="col-span-full text-center py-16">
                    <p className="text-gray-500">No new likes yet</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="space-y-2">
                {conversations.map(profile => (
                  <Link key={profile.id} to={createPageUrl(`Chat?matchId=${profile.match?.id}`)}>
                    <ConversationItem
                      match={profile.match}
                      profile={profile}
                      lastMessage={messagesMap[profile.match?.id]}
                    />
                  </Link>
                ))}
                {conversations.length === 0 && (
                  <div className="text-center py-16">
                    <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No conversations yet</p>
                    <p className="text-gray-400 text-sm">Match with someone to start chatting!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

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
      </main>
    </div>
  );
}