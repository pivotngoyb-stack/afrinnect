import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Check, X } from 'lucide-react';

export default function VideoProfileManagement() {
  const queryClient = useQueryClient();

  const { data: videoProfiles = [] } = useQuery({
    queryKey: ['admin-video-profiles'],
    queryFn: () => base44.entities.VideoProfile.filter({ status: 'pending' }, '-created_date', 100)
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ videoId, status }) => {
      await base44.entities.VideoProfile.update(videoId, { status });
    },
    onSuccess: () => queryClient.invalidateQueries(['admin-video-profiles'])
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video size={20} />
          Video Profile Moderation ({videoProfiles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {videoProfiles.map(video => (
            <div key={video.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <video 
                  src={video.video_url} 
                  className="w-32 h-24 object-cover rounded"
                  controls
                />
                <div>
                  <p className="text-sm text-gray-600">
                    Duration: {video.duration_seconds}s
                  </p>
                  <Badge variant="outline">Pending Review</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600"
                  onClick={() => moderateMutation.mutate({ videoId: video.id, status: 'approved' })}
                >
                  <Check size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600"
                  onClick={() => moderateMutation.mutate({ videoId: video.id, status: 'rejected' })}
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          ))}
          {videoProfiles.length === 0 && (
            <p className="text-center text-gray-500 py-8">No pending video profiles</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}