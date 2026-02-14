import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useIncomingCalls(myProfileId) {
  const [incomingCall, setIncomingCall] = useState(null);
  const [callerProfile, setCallerProfile] = useState(null);

  const checkIncomingCalls = useCallback(async () => {
    if (!myProfileId) return;
    
    try {
      // Check for calls where I'm the receiver and status is initiated/ringing
      const calls = await base44.entities.VideoCall.filter({
        receiver_profile_id: myProfileId,
        status: { $in: ['initiated', 'ringing'] }
      }, '-created_date', 1);
      
      if (calls.length > 0) {
        const call = calls[0];
        
        // Check if call is too old (>30s)
        const callAge = Date.now() - new Date(call.start_time).getTime();
        if (callAge > 30000) {
          // Mark as missed
          await base44.functions.invoke('videoCallSignaling', {
            action: 'end',
            call_id: call.id,
            end_reason: 'timeout'
          });
          return;
        }
        
        // Get caller profile
        const profiles = await base44.entities.UserProfile.filter({ id: call.caller_profile_id });
        if (profiles.length > 0) {
          setCallerProfile(profiles[0]);
          setIncomingCall(call);
        }
      } else {
        setIncomingCall(null);
        setCallerProfile(null);
      }
    } catch (e) {
      console.error('Error checking incoming calls:', e);
    }
  }, [myProfileId]);

  useEffect(() => {
    if (!myProfileId) return;
    
    // Initial check
    checkIncomingCalls();
    
    // Poll every 2 seconds
    const interval = setInterval(checkIncomingCalls, 2000);
    
    return () => clearInterval(interval);
  }, [myProfileId, checkIncomingCalls]);

  const answerCall = useCallback(() => {
    // Return call info for the VideoCallManager to use
    return {
      callId: incomingCall?.id,
      matchId: incomingCall?.match_id,
      callerProfile
    };
  }, [incomingCall, callerProfile]);

  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    
    try {
      await base44.functions.invoke('videoCallSignaling', {
        action: 'decline',
        call_id: incomingCall.id
      });
    } catch (e) {
      console.error('Error declining call:', e);
    }
    
    setIncomingCall(null);
    setCallerProfile(null);
  }, [incomingCall]);

  const dismissCall = useCallback(() => {
    setIncomingCall(null);
    setCallerProfile(null);
  }, []);

  return {
    incomingCall,
    callerProfile,
    answerCall,
    declineCall,
    dismissCall
  };
}