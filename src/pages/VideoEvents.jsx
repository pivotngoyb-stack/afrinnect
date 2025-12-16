import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Video, Calendar, Users, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function VideoEvents() {
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

  const { data: events = [] } = useQuery({
    queryKey: ['video-events'],
    queryFn: async () => {
      const now = new Date().toISOString();
      return await base44.entities.VideoEvent.filter({
        start_time: { $gte: now },
        status: 'upcoming'
      }, 'start_time', 20);
    }
  });

  const joinMutation = useMutation({
    mutationFn: async (eventId) => {
      const event = events.find(e => e.id === eventId);
      await base44.entities.VideoEvent.update(eventId, {
        participants: [...(event.participants || []), myProfile.id]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['video-events']);
      alert('🎉 Registered! Check your email for the video link before the event.');
    }
  });

  const EventCard = ({ event }) => {
    const isJoined = event.participants?.includes(myProfile?.id);
    const isFull = event.participants?.length >= event.max_participants;
    const spotsLeft = event.max_participants - (event.participants?.length || 0);
    const hasPremium = myProfile?.subscription_tier && myProfile.subscription_tier !== 'free';
    const canJoin = !isJoined && !isFull && (!event.is_premium_only || hasPremium);

    return (
      <Card className="hover:shadow-lg transition">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg mb-2">{event.title}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{event.event_type.replace('_', ' ')}</Badge>
                {event.is_premium_only && (
                  <Badge className="bg-amber-500 text-white">
                    <Crown size={12} className="mr-1" />
                    Premium
                  </Badge>
                )}
                {isJoined && (
                  <Badge className="bg-green-100 text-green-700">Registered</Badge>
                )}
              </div>
            </div>
            <Video size={32} className="text-purple-600" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">{event.description}</p>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar size={14} />
              <span>{format(new Date(event.start_time), 'PPp')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Users size={14} />
              <span>{event.participants?.length || 0} / {event.max_participants} joined</span>
            </div>
          </div>

          {spotsLeft <= 5 && spotsLeft > 0 && (
            <Badge variant="outline" className="border-orange-300 text-orange-700">
              Only {spotsLeft} spots left!
            </Badge>
          )}

          <Button
            onClick={() => joinMutation.mutate(event.id)}
            disabled={!canJoin || joinMutation.isPending}
            className="w-full"
            variant={isJoined ? 'outline' : 'default'}
          >
            {isJoined ? 'Registered ✓' : isFull ? 'Event Full' : event.is_premium_only && !hasPremium ? 'Premium Only' : 'Join Event'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Events')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Video Events</h1>
              <p className="text-sm text-gray-500">Virtual speed dating & mixers</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {events.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Video size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
              <p className="text-gray-600">Check back soon for virtual dating events!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}