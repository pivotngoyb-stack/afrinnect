import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Video } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function VideoCallButton({ matchId, isPremium }) {
  if (!isPremium) {
    return (
      <Link to={createPageUrl('Premium')}>
        <Button variant="outline" size="sm" className="gap-1">
          <Video size={16} />
          <span className="hidden sm:inline">Video Call (Premium)</span>
        </Button>
      </Link>
    );
  }

  return (
    <Link to={createPageUrl(`VideoChat?matchId=${matchId}`)}>
      <Button variant="outline" size="sm" className="gap-1 border-purple-200 text-purple-600 hover:bg-purple-50">
        <Video size={16} />
        <span className="hidden sm:inline">Video Call</span>
      </Button>
    </Link>
  );
}