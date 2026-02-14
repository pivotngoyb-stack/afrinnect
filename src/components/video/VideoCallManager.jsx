import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, 
  Volume2, VolumeX, RotateCcw, Shield, Flag,
  Loader2, X, AlertTriangle, WifiOff, Maximize2, Crown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CALL_TIMEOUT = 30000; // 30 seconds
const RECONNECT_TIMEOUT = 10000;
const BACKGROUND_TIMEOUT = 60000; // 1 minute before auto-disconnect

const TASTE_MODE_DURATION = 5000; // 5 seconds for Premium users

function UpgradeOverlay({ onUpgrade, onClose, isFoundingMember = false }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center max-w-sm"
      >
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
        >
          <Video size={36} className="text-white" />
        </motion.div>
        
        <h2 className="text-2xl font-bold text-white mb-3">
          {isFoundingMember ? "Founding Member Preview 🎁" : "Enjoying the connection? 💜"}
        </h2>
        
        <p className="text-white/70 mb-6">
          {isFoundingMember ? (
            <>
              As a <span className="text-amber-400 font-semibold">Founding Member</span>, you got a taste of video calls! 
              Upgrade to <span className="text-purple-400 font-semibold">Elite</span> for unlimited video chats.
            </>
          ) : (
            <>
              Upgrade to <span className="text-amber-400 font-semibold">Elite</span> or <span className="text-purple-400 font-semibold">VIP</span> for unlimited video calls and deeper connections.
            </>
          )}
        </p>
        
        <div className="space-y-3">
          <Button
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-6"
          >
            <Crown size={18} className="mr-2" />
            Upgrade to Elite
          </Button>
          
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-white/60 hover:text-white hover:bg-white/10"
          >
            End Call
          </Button>
        </div>
        
        {isFoundingMember && (
          <p className="text-xs text-amber-400/70 mt-4">
            ✨ Founding Members get exclusive 5-second video previews
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function VideoCallManager({ 
  matchId, 
  callId: initialCallId,
  otherProfile,
  onClose,
  isIncoming = false,
  isTasteMode = false,
  onUpgradeRequired
}) {
  // State
  const [callState, setCallState] = useState(isIncoming ? 'ringing' : 'initiating');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const tasteModeTimerRef = useRef(null);
  const navigate = useNavigate();
  const [callId, setCallId] = useState(initialCallId);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [error, setError] = useState(null);
  const [isPiP, setIsPiP] = useState(false);
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const callTimerRef = useRef(null);
  const timeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const backgroundTimeoutRef = useRef(null);
  const pollingRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const networkStatsRef = useRef({ packet_loss: 0, latency_ms: 0, avg_bitrate: 0, reconnect_count: 0 });

  // ICE server config - will be populated from backend
  const [iceServers, setIceServers] = useState([]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (backgroundTimeoutRef.current) clearTimeout(backgroundTimeoutRef.current);
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    if (tasteModeTimerRef.current) clearTimeout(tasteModeTimerRef.current);
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  }, []);

  // End call
  const endCall = useCallback(async (reason = 'completed') => {
    cleanup();
    
    if (callId) {
      try {
        await base44.functions.invoke('videoCallSignaling', {
          action: 'end',
          call_id: callId,
          duration_seconds: callDuration,
          network_stats: networkStatsRef.current,
          end_reason: reason
        });
      } catch (e) {
        console.error('Error ending call:', e);
      }
    }
    
    onClose?.();
  }, [callId, callDuration, cleanup, onClose]);

  // Initialize media
  const initializeMedia = useCallback(async (videoEnabled = true) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: videoEnabled ? {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (err) {
      console.error('Media access error:', err);
      setError('Camera/microphone access denied. Please enable permissions.');
      throw err;
    }
  }, [isFrontCamera]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ 
      iceServers,
      iceCandidatePoolSize: 10
    });
    
    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    
    // Handle remote tracks
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    // ICE candidate handling
    pc.onicecandidate = async (event) => {
      if (event.candidate && callId) {
        try {
          await base44.functions.invoke('videoCallSignaling', {
            action: 'ice_candidate',
            call_id: callId,
            candidate: event.candidate.toJSON(),
            is_caller: !isIncoming
          });
        } catch (e) {
          console.error('Error sending ICE candidate:', e);
        }
      }
    };
    
    // Connection state changes
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('Connection state:', state);
      
      switch (state) {
        case 'connecting':
          setCallState('connecting');
          break;
        case 'connected':
          setCallState('connected');
          if (!callStartTimeRef.current) {
            callStartTimeRef.current = Date.now();
            startCallTimer();
            
            // Start taste mode timer for Premium users
            if (isTasteMode) {
              tasteModeTimerRef.current = setTimeout(() => {
                setShowUpgradePrompt(true);
                // Pause/mute the call but keep connection for dramatic effect
                if (localStreamRef.current) {
                  localStreamRef.current.getTracks().forEach(track => track.enabled = false);
                }
              }, TASTE_MODE_DURATION);
            }
          }
          break;
        case 'disconnected':
          setCallState('reconnecting');
          networkStatsRef.current.reconnect_count++;
          reconnectTimeoutRef.current = setTimeout(() => {
            endCall('network_error');
          }, RECONNECT_TIMEOUT);
          break;
        case 'failed':
          setError('Connection failed. Please try again.');
          endCall('network_error');
          break;
        case 'closed':
          break;
      }
    };
    
    // ICE connection state for quality monitoring
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        setConnectionQuality('poor');
      } else if (pc.iceConnectionState === 'connected') {
        setConnectionQuality('good');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      }
    };
    
    peerConnectionRef.current = pc;
    return pc;
  }, [iceServers, callId, isIncoming, endCall]);

  // Start call timer
  const startCallTimer = useCallback(() => {
    callTimerRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  // Monitor network stats
  const startStatsMonitoring = useCallback(() => {
    statsIntervalRef.current = setInterval(async () => {
      if (!peerConnectionRef.current) return;
      
      try {
        const stats = await peerConnectionRef.current.getStats();
        let totalPacketsLost = 0;
        let totalPackets = 0;
        let currentBitrate = 0;
        let roundTripTime = 0;
        
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            totalPacketsLost += report.packetsLost || 0;
            totalPackets += report.packetsReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            currentBitrate = (report.availableOutgoingBitrate || 0) / 1000;
            roundTripTime = report.currentRoundTripTime * 1000 || 0;
          }
        });
        
        const packetLoss = totalPackets > 0 ? (totalPacketsLost / totalPackets) * 100 : 0;
        
        networkStatsRef.current = {
          ...networkStatsRef.current,
          packet_loss: packetLoss,
          latency_ms: roundTripTime,
          avg_bitrate: currentBitrate
        };
        
        // Update quality indicator
        if (packetLoss > 5 || roundTripTime > 300) {
          setConnectionQuality('poor');
        } else if (packetLoss > 2 || roundTripTime > 150) {
          setConnectionQuality('fair');
        } else {
          setConnectionQuality('good');
        }
        
        // Auto-switch to audio if bandwidth is too low
        if (currentBitrate > 0 && currentBitrate < 100 && !isVideoOff) {
          console.log('Low bandwidth detected, suggesting audio-only');
          // Could auto-disable video here
        }
      } catch (e) {
        console.error('Stats error:', e);
      }
    }, 3000);
  }, [isVideoOff]);

  // Poll for call updates (signaling)
  const startPolling = useCallback(() => {
    pollingRef.current = setInterval(async () => {
      if (!callId) return;
      
      try {
        const response = await base44.functions.invoke('videoCallSignaling', {
          action: 'get_call',
          call_id: callId
        });
        
        const { call } = response.data;
        if (!call) return;
        
        // Handle call ended by other party
        if (['ended', 'declined', 'missed'].includes(call.status)) {
          endCall(call.status);
          return;
        }
        
        // Handle incoming SDP/ICE from remote
        if (peerConnectionRef.current) {
          // Set remote description if available
          if (call.remote_sdp && !peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.setRemoteDescription(
              new RTCSessionDescription(call.remote_sdp)
            );
          }
          
          // Add ICE candidates
          if (call.remote_ice_candidates) {
            for (const candidate of call.remote_ice_candidates) {
              try {
                await peerConnectionRef.current.addIceCandidate(
                  new RTCIceCandidate(candidate)
                );
              } catch (e) {
                // Ignore duplicate candidates
              }
            }
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 1000);
  }, [callId, endCall]);

  // Initiate outgoing call
  const initiateCall = useCallback(async () => {
    try {
      setCallState('initiating');
      
      // Get ICE servers and initiate call
      const response = await base44.functions.invoke('videoCallSignaling', {
        action: 'initiate',
        match_id: matchId,
        call_type: 'video'
      });
      
      if (response.data.status === 'busy') {
        setCallState('busy');
        setTimeout(() => endCall('busy'), 3000);
        return;
      }
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      setCallId(response.data.call_id);
      setIceServers(response.data.ice_servers);
      
      // Initialize media
      await initializeMedia(true);
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Create and send offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      
      // Send SDP to server
      await base44.functions.invoke('videoCallSignaling', {
        action: 'update_status',
        call_id: response.data.call_id,
        status: 'ringing',
        sdp: offer
      });
      
      setCallState('calling');
      
      // Start timeout
      timeoutRef.current = setTimeout(() => {
        if (['initiating', 'calling', 'ringing'].includes(callState)) {
          base44.functions.invoke('videoCallSignaling', {
            action: 'end',
            call_id: response.data.call_id,
            end_reason: 'timeout'
          });
          setCallState('missed');
          setTimeout(() => endCall('timeout'), 2000);
        }
      }, CALL_TIMEOUT);
      
      // Start polling for answer
      startPolling();
      
    } catch (err) {
      console.error('Call initiation error:', err);
      setError(err.message);
      setCallState('failed');
    }
  }, [matchId, initializeMedia, createPeerConnection, startPolling, endCall, callState]);

  // Answer incoming call
  const answerCall = useCallback(async () => {
    try {
      setCallState('connecting');
      
      // Get call details
      const response = await base44.functions.invoke('videoCallSignaling', {
        action: 'get_call',
        call_id: callId
      });
      
      if (!response.data.call) {
        throw new Error('Call no longer available');
      }
      
      setIceServers(response.data.ice_servers);
      
      // Initialize media
      await initializeMedia(true);
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Set remote offer
      if (response.data.call.remote_sdp) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(response.data.call.remote_sdp)
        );
      }
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer to server
      await base44.functions.invoke('videoCallSignaling', {
        action: 'answer',
        call_id: callId,
        sdp: answer
      });
      
      // Start polling and stats
      startPolling();
      startStatsMonitoring();
      
    } catch (err) {
      console.error('Answer error:', err);
      setError(err.message);
      setCallState('failed');
    }
  }, [callId, initializeMedia, createPeerConnection, startPolling, startStatsMonitoring]);

  // Decline incoming call
  const declineCall = useCallback(async () => {
    try {
      await base44.functions.invoke('videoCallSignaling', {
        action: 'decline',
        call_id: callId
      });
    } catch (e) {
      console.error('Decline error:', e);
    }
    onClose?.();
  }, [callId, onClose]);

  // Toggle functions
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
        setIsVideoOff(!isVideoOff);
      }
    }
  }, [isVideoOff]);

  const toggleSpeaker = useCallback(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  }, [isSpeakerOn]);

  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    
    // Stop current video track
    const currentTrack = localStreamRef.current.getVideoTracks()[0];
    if (currentTrack) {
      currentTrack.stop();
    }
    
    // Get new stream with flipped camera
    const newFacing = !isFrontCamera;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing ? 'user' : 'environment' }
      });
      
      const newTrack = stream.getVideoTracks()[0];
      
      // Replace track in peer connection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => 
          s.track?.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      }
      
      // Update local stream
      localStreamRef.current.removeTrack(currentTrack);
      localStreamRef.current.addTrack(newTrack);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      
      setIsFrontCamera(newFacing);
    } catch (e) {
      console.error('Camera flip error:', e);
    }
  }, [isFrontCamera]);

  // Picture in Picture
  const togglePiP = useCallback(async () => {
    if (!remoteVideoRef.current) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiP(false);
      } else if (document.pictureInPictureEnabled) {
        await remoteVideoRef.current.requestPictureInPicture();
        setIsPiP(true);
      }
    } catch (e) {
      console.error('PiP error:', e);
    }
  }, []);

  // Report user
  const reportUser = useCallback(async () => {
    try {
      await base44.functions.invoke('videoCallSignaling', {
        action: 'report',
        call_id: callId,
        reason: 'inappropriate_behavior'
      });
      alert('Report submitted. Thank you for keeping our community safe.');
    } catch (e) {
      console.error('Report error:', e);
    }
  }, [callId]);

  // Block user
  const blockUser = useCallback(async () => {
    if (!confirm('Block this user? The call will end immediately.')) return;
    
    try {
      await base44.functions.invoke('videoCallSignaling', {
        action: 'block',
        call_id: callId
      });
      onClose?.();
    } catch (e) {
      console.error('Block error:', e);
    }
  }, [callId, onClose]);

  // Handle visibility change (app backgrounded)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && callState === 'connected') {
        setIsBackgrounded(true);
        backgroundTimeoutRef.current = setTimeout(() => {
          endCall('backgrounded');
        }, BACKGROUND_TIMEOUT);
      } else {
        setIsBackgrounded(false);
        if (backgroundTimeoutRef.current) {
          clearTimeout(backgroundTimeoutRef.current);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [callState, endCall]);

  // Initialize call on mount
  useEffect(() => {
    if (isIncoming) {
      // Incoming call - wait for user to answer
      setCallState('ringing');
    } else {
      // Outgoing call - initiate immediately
      initiateCall();
    }
    
    return cleanup;
  }, []);

  // Start stats monitoring when connected
  useEffect(() => {
    if (callState === 'connected') {
      startStatsMonitoring();
    }
  }, [callState, startStatsMonitoring]);

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Connection quality indicator
  const QualityIndicator = () => {
    const colors = {
      good: 'bg-green-500',
      fair: 'bg-yellow-500',
      poor: 'bg-red-500'
    };
    
    return (
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${colors[connectionQuality]}`} />
        <span className="text-xs text-white/70 capitalize">{connectionQuality}</span>
      </div>
    );
  };

  const handleUpgrade = () => {
    endCall('upgrade_required');
    navigate(createPageUrl('PricingPlans'));
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Upgrade Overlay for Founding Members after taste */}
      {showUpgradePrompt && (
        <UpgradeOverlay 
          onUpgrade={handleUpgrade}
          onClose={() => endCall('upgrade_declined')}
          isFoundingMember={isTasteMode}
        />
      )}
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={otherProfile?.primary_photo || '/default-avatar.png'} 
              alt={otherProfile?.display_name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
            />
            <div>
              <h3 className="text-white font-semibold">{otherProfile?.display_name || 'Unknown'}</h3>
              <div className="flex items-center gap-2">
                {callState === 'connected' && (
                  <>
                    <span className="text-white/80 text-sm">{formatDuration(callDuration)}</span>
                    <QualityIndicator />
                  </>
                )}
                {callState !== 'connected' && (
                  <span className="text-white/70 text-sm capitalize">
                    {callState === 'calling' ? 'Calling...' :
                     callState === 'ringing' ? 'Incoming call...' :
                     callState === 'connecting' ? 'Connecting...' :
                     callState === 'reconnecting' ? 'Reconnecting...' :
                     callState === 'busy' ? 'User busy' :
                     callState === 'missed' ? 'No answer' :
                     callState}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Safety Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Shield size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
              <DropdownMenuItem onClick={reportUser} className="text-white hover:bg-gray-800">
                <Flag size={16} className="mr-2 text-orange-500" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={blockUser} className="text-red-500 hover:bg-gray-800">
                <X size={16} className="mr-2" />
                Block & End Call
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Connection warning */}
        <AnimatePresence>
          {connectionQuality === 'poor' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg text-sm"
            >
              <WifiOff size={14} />
              Poor connection - video quality may be affected
            </motion.div>
          )}
          {isBackgrounded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-2 flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm"
            >
              <AlertTriangle size={14} />
              Call will end if you stay away
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Remote Video (Full screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {/* Placeholder for non-connected states */}
        {callState !== 'connected' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
            <img 
              src={otherProfile?.primary_photo || '/default-avatar.png'} 
              alt={otherProfile?.display_name}
              className="w-32 h-32 rounded-full object-cover border-4 border-white/20 mb-6"
            />
            <h2 className="text-white text-2xl font-bold mb-2">{otherProfile?.display_name}</h2>
            
            {callState === 'calling' && (
              <div className="flex items-center gap-2 text-white/70">
                <Loader2 size={20} className="animate-spin" />
                <span>Calling...</span>
              </div>
            )}
            
            {callState === 'ringing' && (
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-green-400 text-lg"
              >
                Incoming video call...
              </motion.div>
            )}
            
            {callState === 'connecting' && (
              <div className="flex items-center gap-2 text-white/70">
                <Loader2 size={20} className="animate-spin" />
                <span>Connecting...</span>
              </div>
            )}
            
            {callState === 'reconnecting' && (
              <div className="flex items-center gap-2 text-yellow-400">
                <WifiOff size={20} />
                <span>Reconnecting...</span>
              </div>
            )}
            
            {callState === 'busy' && (
              <div className="text-red-400">User is on another call</div>
            )}
            
            {callState === 'missed' && (
              <div className="text-gray-400">No answer</div>
            )}
            
            {error && (
              <div className="text-red-400 text-center px-4 mt-4">{error}</div>
            )}
          </div>
        )}
        
        {/* Local Video (Picture-in-picture style) */}
        <motion.div
          drag
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          className="absolute top-20 right-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <VideoOff size={24} className="text-white/50" />
            </div>
          )}
        </motion.div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        {/* Incoming call actions */}
        {callState === 'ringing' && (
          <div className="flex items-center justify-center gap-8 mb-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={declineCall}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg"
            >
              <PhoneOff size={28} className="text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={answerCall}
              className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center shadow-lg"
            >
              <Phone size={28} className="text-white" />
            </motion.button>
          </div>
        )}
        
        {/* Connected call controls */}
        {['connecting', 'connected', 'reconnecting', 'calling'].includes(callState) && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full ${isMuted ? 'bg-red-600' : 'bg-white/20'} hover:bg-white/30`}
            >
              {isMuted ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full ${isVideoOff ? 'bg-red-600' : 'bg-white/20'} hover:bg-white/30`}
            >
              {isVideoOff ? <VideoOff size={22} className="text-white" /> : <Video size={22} className="text-white" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={flipCamera}
              className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30"
            >
              <RotateCcw size={22} className="text-white" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSpeaker}
              className={`w-12 h-12 rounded-full ${!isSpeakerOn ? 'bg-red-600' : 'bg-white/20'} hover:bg-white/30`}
            >
              {isSpeakerOn ? <Volume2 size={22} className="text-white" /> : <VolumeX size={22} className="text-white" />}
            </Button>
            
            {document.pictureInPictureEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePiP}
                className={`w-12 h-12 rounded-full ${isPiP ? 'bg-purple-600' : 'bg-white/20'} hover:bg-white/30`}
              >
                <Maximize2 size={22} className="text-white" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => endCall('user_left')}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 ml-2"
            >
              <PhoneOff size={26} className="text-white" />
            </Button>
          </div>
        )}
        
        {/* Failed/ended state */}
        {['failed', 'missed', 'busy'].includes(callState) && (
          <div className="flex justify-center">
            <Button onClick={onClose} className="bg-white/20 hover:bg-white/30 text-white">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}