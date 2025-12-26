import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Ban, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function BlockedUsers() {
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

  const { data: blockedProfiles = [] } = useQuery({
    queryKey: ['blocked-users', myProfile?.id],
    queryFn: async () => {
      if (!myProfile?.blocked_users?.length) return [];
      
      const profiles = await Promise.all(
        myProfile.blocked_users.map(id => 
          base44.entities.UserProfile.filter({ id }).then(p => p[0])
        )
      );
      
      return profiles.filter(Boolean);
    },
    enabled: !!myProfile
  });

  const unblockMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.UserProfile.update(myProfile.id, {
        blocked_users: myProfile.blocked_users.filter(id => id !== userId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blocked-users']);
      queryClient.invalidateQueries(['profile']);
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={createPageUrl('Settings')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={24} />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Blocked Users</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {blockedProfiles.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <UserX size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No blocked users</h3>
              <p className="text-gray-600">You haven't blocked anyone yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {blockedProfiles.map(profile => (
              <Card key={profile.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={profile.primary_photo} />
                        <AvatarFallback>{profile.display_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{profile.display_name}</p>
                        <p className="text-sm text-gray-500">Blocked</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => unblockMutation.mutate(profile.id)}
                      disabled={unblockMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      Unblock
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}