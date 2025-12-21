import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { PhoneOff } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function VideoChat() {
  const [myProfile, setMyProfile] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
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

  useEffect(() => {
    if (!myProfile || !matchId) return;

    // Load Jitsi Meet External API script
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => {
      initializeJitsi();
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup Jitsi
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
      document.body.removeChild(script);
    };
  }, [myProfile, matchId]);

  const initializeJitsi = () => {
    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;

    const domain = 'meet.jit.si';
    const options = {
      roomName: `afrinnect-${matchId}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: myProfile?.display_name || 'User'
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'hangup', 'settings', 
          'videoquality', 'filmstrip', 'tileview'
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false
      }
    };

    jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
    setCallStartTime(new Date());

    // Log video call start
    base44.entities.VideoCall.create({
      match_id: matchId,
      caller_profile_id: myProfile?.id,
      receiver_profile_id: 'other', // This should be set from match data
      status: 'connected',
      start_time: new Date().toISOString()
    });

    // Handle when user leaves
    jitsiApiRef.current.addListener('readyToClose', () => {
      handleEndCall();
    });
  };

  const handleEndCall = async () => {
    const endTime = new Date();
    const durationSeconds = callStartTime 
      ? Math.floor((endTime - callStartTime) / 1000) 
      : 0;

    // Log video call end
    try {
      await base44.entities.VideoCall.create({
        match_id: matchId,
        caller_profile_id: myProfile?.id,
        receiver_profile_id: 'other',
        status: 'ended',
        end_time: endTime.toISOString(),
        duration_seconds: durationSeconds
      });
    } catch (e) {}

    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
    }
    
    navigate(createPageUrl(`Chat?matchId=${matchId}`));
  };

  return (
    <div className="fixed inset-0 bg-gray-900">
      {/* Jitsi Container */}
      <div 
        ref={jitsiContainerRef} 
        className="w-full h-full"
      />

      {/* End Call Button Overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50">
        <Button
          size="icon"
          className="rounded-full w-16 h-16 bg-red-600 hover:bg-red-700 shadow-2xl"
          onClick={handleEndCall}
        >
          <PhoneOff size={24} className="text-white" />
        </Button>
      </div>
    </div>
  );
}