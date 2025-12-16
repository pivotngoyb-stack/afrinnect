import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Users, Trash2, Crown } from 'lucide-react';
import { format } from 'date-fns';

export default function VideoEventManagement() {
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['admin-video-events'],
    queryFn: () => base44.entities.VideoEvent.list('-start_time', 100)
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      base44.entities.VideoEvent.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['admin-video-events'])
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VideoEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-video-events'])
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Events ({events.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Video size={24} className="text-purple-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{event.title}</h3>
                  {event.is_premium_only && (
                    <Crown size={14} className="text-amber-500" />
                  )}
                </div>
                <p className="text-sm text-gray-600">{format(new Date(event.start_time), 'PPp')}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary">{event.event_type}</Badge>
                  <Badge variant="outline">
                    <Users size={12} className="mr-1" />
                    {event.participants?.length || 0}/{event.max_participants}
                  </Badge>
                  <Badge
                    className={
                      event.status === 'live'
                        ? 'bg-green-100 text-green-700'
                        : event.status === 'upcoming'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }
                  >
                    {event.status}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                {event.status === 'upcoming' && (
                  <Button
                    onClick={() =>
                      updateStatusMutation.mutate({ id: event.id, status: 'live' })
                    }
                    variant="outline"
                    size="sm"
                  >
                    Start
                  </Button>
                )}
                <Button
                  onClick={() => deleteMutation.mutate(event.id)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}