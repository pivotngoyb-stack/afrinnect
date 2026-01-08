import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { PhoneOff, Loader2, Video, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function VideoChat() {
  const [myProfile, setMyProfile] = useState(null);
  const [callState, setCallState] = useState({ loading: true, error: null, roomId: null, callId: null });
  const [callStartTime, setCallStartTime] = useState(null);
  
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('matchId');

  // 1. Initialize & Join
  useEffect(() => {
    const initCall = async () => {
      try {
        // Get user first
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length === 0) throw new Error("Profile not found");
        const profile = profiles[0];
        setMyProfile(profile);

        // Initiate or Join Call via Backend
        // This handles "Find existing OR Create new" logic securely
        const response = await base44.functions.invoke('initiateVideoCall', { match_id: matchId });
        
        if (response.data.error) {
            throw new Error(response.data.error);
        }

        const { room_id, call_id } = response.data;
        setCallState({ loading: false, error: null, roomId: room_id, callId: call_id });

      } catch (err) {
        console.error("Call init failed:", err);
        setCallState({ 
            loading: false, 
            error: err.message || "Failed to connect to video service", 
            roomId: null, 
            callId: null 
        });
      }
    };

    if (matchId) {
        initCall();
    }
  }, [matchId]);

  // 2. Launch Jitsi when Room ID is ready
  useEffect(() => {
    if (!callState.roomId || !myProfile || jitsiApiRef.current) return;

    // Load Script
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => {
        setupJitsi(callState.roomId);
    };
    document.body.appendChild(script);

    return () => {
        if (jitsiApiRef.current) {
            jitsiApiRef.current.dispose();
            jitsiApiRef.current = null;
        }
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }
    };
  }, [callState.roomId, myProfile]);

  const setupJitsi = (roomId) => {
    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;

    // Time Limits
    const tier = myProfile?.subscription_tier || 'free';
    const maxDuration = (tier === 'vip') ? 120 : (tier === 'elite' ? 60 : 5); // 5 min fallback/free grace?
    
    // Bitrate
    const isAfrica = ['Nigeria', 'Ghana', 'Kenya', 'South Africa'].includes(myProfile?.current_country);
    const videoBitrate = isAfrica ? 500 : 1500;

    const domain = 'meet.jit.si';
    const options = {
      roomName: roomId, // Secure, generated ID
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: myProfile.display_name
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true, 
        videoQuality: {
          maxBitratesVideo: {
            low: videoBitrate * 0.3,
            standard: videoBitrate,
            high: videoBitrate * 1.5
          }
        }
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'hangup', 'settings', 
          'videoquality', 'filmstrip', 'tileview', 'chat'
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        MOBILE_APP_PROMO: false
      }
    };

    const api = new window.JitsiMeetExternalAPI(domain, options);
    jitsiApiRef.current = api;
    setCallStartTime(new Date());

    // Update status to 'connected' if it was just initiated
    // (We do this silently)
    base44.entities.VideoCall.update(callState.callId, { status: 'connected' }).catch(() => {});

    // Time Limit Enforcement
    const timeoutId = setTimeout(() => {
        alert(`Time limit reached for ${tier} plan. Ending call.`);
        handleEndCall();
    }, maxDuration * 60 * 1000);

    api.addListener('videoConferenceLeft', () => {
        clearTimeout(timeoutId);
        handleEndCall();
    });
    
    api.addListener('readyToClose', () => {
        clearTimeout(timeoutId);
        handleEndCall();
    });
  };

  const handleEndCall = async () => {
    if (callState.callId) {
        // Calculate duration
        const duration = callStartTime ? Math.floor((new Date() - callStartTime) / 1000) : 0;
        
        // Notify backend to close call
        try {
            await base44.functions.invoke('endVideoCall', {
                call_id: callState.callId,
                duration_seconds: duration
            });
        } catch(e) {
            console.error("Error closing call record", e);
        }
    }

    if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
    }
    
    navigate(createPageUrl(`Chat?matchId=${matchId}`));
  };

  if (callState.loading) {
      return (
          <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center text-white">
              <Loader2 size={48} className="animate-spin text-purple-500 mb-4" />
              <h2 className="text-xl font-semibold">Connecting securely...</h2>
              <p className="text-gray-400">Setting up your private room</p>
          </div>
      );
  }

  if (callState.error) {
      return (
          <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
              <Card className="w-full max-w-md bg-white">
                  <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertTriangle size={32} className="text-red-600" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">Call Failed</h2>
                      <p className="text-gray-600 mb-6">{callState.error}</p>
                      <Button onClick={() => navigate(createPageUrl(`Chat?matchId=${matchId}`))} className="w-full">
                          Return to Chat
                      </Button>
                  </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 relative">
      <div ref={jitsiContainerRef} className="w-full h-full" />
      
      {/* Fallback End Button (if Jitsi toolbar fails or overlay needed) */}
      {/* We rely on Jitsi toolbar 'hangup' button mostly, but this is a failsafe */}
    </div>
  );
}