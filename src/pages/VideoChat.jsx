import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Video, VideoOff, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function VideoChat() {
  const [myProfile, setMyProfile] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('matchId');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          const profile = profiles[0];
          setMyProfile(profile);
          
          // Restrict video calls to Elite and VIP only
          const tier = profile.subscription_tier;
          if (tier !== 'elite' && tier !== 'vip') {
            alert('Video calls are only available for Elite and VIP members');
            navigate(createPageUrl(`Chat?matchId=${matchId}`));
          }
        }
      } catch (e) {}
    };
    fetchProfile();
  }, [matchId, navigate]);

  const handleEndCall = async () => {
    // Log video call
    await base44.entities.VideoCall.create({
      match_id: matchId,
      initiator_id: myProfile?.id,
      receiver_id: 'other',
      status: 'ended',
      ended_at: new Date().toISOString()
    });
    navigate(createPageUrl(`Chat?matchId=${matchId}`));
  };

  return (
    <div className="fixed inset-0 bg-gray-900">
      {/* Video Container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full bg-gray-800 relative">
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <Video size={64} className="mx-auto mb-4 text-purple-400" />
              <p className="text-lg">Video chat in progress...</p>
              <p className="text-sm text-gray-400 mt-2">
                This is a demo. Real video chat requires WebRTC integration.
              </p>
            </div>
          </div>

          {/* Local video preview */}
          <div className="absolute top-4 right-4 w-32 h-40 bg-gray-700 rounded-lg overflow-hidden border-2 border-white">
            <div className="w-full h-full flex items-center justify-center text-white text-xs">
              You
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-lg rounded-full px-6 py-4">
          <Button
            size="icon"
            variant="ghost"
            className={`rounded-full ${!isAudioOn ? 'bg-red-600' : 'bg-white/20'} hover:bg-white/30`}
            onClick={() => setIsAudioOn(!isAudioOn)}
          >
            {isAudioOn ? (
              <Mic size={20} className="text-white" />
            ) : (
              <MicOff size={20} className="text-white" />
            )}
          </Button>

          <Button
            size="icon"
            className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700"
            onClick={handleEndCall}
          >
            <PhoneOff size={24} className="text-white" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className={`rounded-full ${!isVideoOn ? 'bg-red-600' : 'bg-white/20'} hover:bg-white/30`}
            onClick={() => setIsVideoOn(!isVideoOn)}
          >
            {isVideoOn ? (
              <Video size={20} className="text-white" />
            ) : (
              <VideoOff size={20} className="text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}