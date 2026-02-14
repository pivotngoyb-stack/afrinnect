import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import VideoCallManager from '@/components/video/VideoCallManager';

export default function VideoChat(props) {
  const [myProfile, setMyProfile] = useState(null);
  const [otherProfile, setOtherProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = props.matchId || urlParams.get('matchId');
  const callId = props.callId || urlParams.get('callId');
  const isIncoming = urlParams.get('incoming') === 'true' || !!callId;

  useEffect(() => {
    const init = async () => {
      try {
        // Get current user profile
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length === 0) {
          setError('Profile not found');
          setLoading(false);
          return;
        }
        setMyProfile(profiles[0]);

        // Get match to find other user
        if (matchId) {
          const matches = await base44.entities.Match.filter({ id: matchId });
          if (matches.length > 0) {
            const match = matches[0];
            const otherProfileId = match.user1_id === profiles[0].id ? match.user2_id : match.user1_id;
            
            const otherProfiles = await base44.entities.UserProfile.filter({ id: otherProfileId });
            if (otherProfiles.length > 0) {
              setOtherProfile(otherProfiles[0]);
            }
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Init error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (matchId) {
      init();
    } else {
      setError('No match specified');
      setLoading(false);
    }
  }, [matchId]);

  const handleClose = () => {
    if (props.onClose) {
      props.onClose();
    } else {
      navigate(createPageUrl(`Chat?matchId=${matchId}`));
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Preparing call...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center text-white p-6">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={handleClose}
            className="px-6 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <VideoCallManager
      matchId={matchId}
      callId={callId}
      otherProfile={otherProfile}
      onClose={handleClose}
      isIncoming={isIncoming}
    />
  );
}