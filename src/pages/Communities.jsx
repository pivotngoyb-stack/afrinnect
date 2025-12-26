import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInfinitePagination } from '@/components/shared/useInfinitePagination';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { ArrowLeft, Users, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ListItemSkeleton } from '@/components/shared/SkeletonLoader';

export default function Communities() {
  const [myProfile, setMyProfile] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      if (profiles.length > 0) setMyProfile(profiles[0]);
    };
    fetchProfile();
  }, []);

  const { 
    items: communities, 
    loadMore, 
    hasMore, 
    isLoadingMore,
    refetch 
  } = useInfinitePagination('Community', {}, {
    pageSize: 20,
    sortBy: '-created_date',
    enabled: !!myProfile
  });

  const joinMutation = useMutation({
    mutationFn: async (communityId) => {
      const community = communities.find(c => c.id === communityId);
      await base44.entities.Community.update(communityId, {
        members: [...(community.members || []), myProfile.id]
      });
      
      await base44.entities.UserProfile.update(myProfile.id, {
        communities: [...(myProfile.communities || []), communityId]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['communities']);
      queryClient.invalidateQueries(['profile']);
    }
  });

  const leaveMutation = useMutation({
    mutationFn: async (communityId) => {
      const community = communities.find(c => c.id === communityId);
      await base44.entities.Community.update(communityId, {
        members: (community.members || []).filter(id => id !== myProfile.id)
      });
      
      await base44.entities.UserProfile.update(myProfile.id, {
        communities: (myProfile.communities || []).filter(id => id !== communityId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['communities']);
      queryClient.invalidateQueries(['profile']);
    }
  });

  const myCommunities = communities.filter(c => c.members?.includes(myProfile?.id));
  const suggestedCommunities = communities.filter(c => !c.members?.includes(myProfile?.id));

  const CommunityCard = ({ community }) => {
    const isMember = community.members?.includes(myProfile?.id);
    
    return (
      <Card className="hover:shadow-lg transition">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{community.icon}</div>
              <div>
                <CardTitle className="text-lg">{community.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {community.category}
                  </Badge>
                  {community.is_featured && (
                    <Badge className="bg-amber-500 text-white text-xs">
                      <TrendingUp size={10} className="mr-1" />
                      Featured
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">{community.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Users size={14} />
              <span>{community.members?.length || 0} members</span>
            </div>
            <Button
              onClick={() => isMember ? leaveMutation.mutate(community.id) : joinMutation.mutate(community.id)}
              variant={isMember ? 'outline' : 'default'}
              size="sm"
            >
              {isMember ? 'Leave' : 'Join'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PullToRefresh onRefresh={refetch}>
      <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Communities</h1>
              <p className="text-sm text-gray-500">Connect with like-minded people</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!myProfile ? (
          <ListItemSkeleton count={6} />
        ) : (
        <Tabs defaultValue="discover">
          <TabsList className="mb-6">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="my-communities">My Communities ({myCommunities.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="discover">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestedCommunities.map(community => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="my-communities">
            {myCommunities.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Users size={48} className="mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No communities yet</h3>
                  <p className="text-gray-600 mb-4">Join communities to connect with others</p>
                  <Button onClick={() => document.querySelector('[value="discover"]').click()}>
                    Discover Communities
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCommunities.map(community => (
                  <CommunityCard key={community.id} community={community} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {isLoadingMore && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent" />
          </div>
        )}

        {hasMore && !isLoadingMore && (
          <div className="text-center py-4">
            <Button onClick={loadMore} variant="outline">
              Load More Communities
            </Button>
          </div>
        )}
        )}
      </main>
    </div>
    </PullToRefresh>
  );
}