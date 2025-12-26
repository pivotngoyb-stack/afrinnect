import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, Mic, Image, Languages, AlertTriangle, MoreVertical, Flag, Sparkles, Shield, Ban, Video, Gift } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import IceBreakerPrompts from '@/components/chat/IceBreakerPrompts';
import { AnimatePresence } from 'framer-motion';
import TypingIndicator from '@/components/shared/TypingIndicator';
import LoadingSkeleton from '@/components/shared/LoadingSkeleton';
import { useOptimisticUpdate } from '@/components/shared/useOptimisticUpdate';
import { sanitizeHTML, validateInput, rateLimiter } from '@/components/shared/InputSanitizer';
import { useInfinitePagination } from '@/components/shared/useInfinitePagination';
import { ChatSkeleton } from '@/components/shared/SkeletonLoader';
import SafetyCheckSetup from '@/components/safety/SafetyCheckSetup';
import VirtualList from '@/components/shared/VirtualList';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { usePerformanceMonitor } from '@/components/shared/usePerformanceMonitor';
import { useRealtimeMessages } from '@/components/chat/useRealtimeMessages';

export default function Chat() {
  usePerformanceMonitor('Chat');
  
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('matchId');
  
  const [myProfile, setMyProfile] = useState(null);
  const [otherProfile, setOtherProfile] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [recording, setRecording] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const [translateLang, setTranslateLang] = useState('en');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showIceBreakers, setShowIceBreakers] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuestionGame, setShowQuestionGame] = useState(false);
  const [showVirtualGifts, setShowVirtualGifts] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();

  // Real-time WebSocket connection
  const { 
    isConnected, 
    otherUserTyping, 
    sendTypingIndicator, 
    notifyNewMessage,
    sendReadReceipt 
  } = useRealtimeMessages(matchId, myProfile?.id, !!myProfile && !!matchId);

  // Screenshot detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && otherProfile) {
        // User potentially took screenshot
        base44.entities.ScreenshotAlert.create({
          user_profile_id: myProfile?.id,
          screenshot_of_profile_id: otherProfile.id,
          screenshot_location: 'chat',
          alert_sent: false
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [myProfile, otherProfile]);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const user = await base44.auth.me();
        const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setMyProfile(profiles[0]);
        }
      } catch (e) {
        window.location.href = createPageUrl('Landing');
      }
    };
    fetchProfiles();
  }, []);

  // Fetch match and other user's profile
  const { data: match } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      const matches = await base44.entities.Match.filter({ id: matchId });
      if (matches.length > 0) {
        const m = matches[0];
        const otherId = m.user1_id === myProfile?.id ? m.user2_id : m.user1_id;
        const otherProfiles = await base44.entities.UserProfile.filter({ id: otherId });
        if (otherProfiles.length > 0) {
          setOtherProfile(otherProfiles[0]);
        }
        return m;
      }
      return null;
    },
    enabled: !!matchId && !!myProfile
  });

  // Fetch messages with infinite scroll
  const { 
    items: messages, 
    loadMore: loadMoreMessages, 
    hasMore: hasMoreMessages,
    isLoadingMore: isLoadingMoreMessages,
    isLoading: messagesLoading 
  } = useInfinitePagination('Message', { match_id: matchId }, {
    pageSize: 30,
    sortBy: '-created_date',
    enabled: !!matchId,
    refetchInterval: isConnected ? 60000 : 10000
  });

  // Scroll to bottom - optimized
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]); // Only trigger on message count change

  // Mark messages as read - optimized with batch update
  useEffect(() => {
    if (messages.length > 0 && myProfile) {
      const unreadMessages = messages.filter(m => m.receiver_id === myProfile.id && !m.is_read);
      if (unreadMessages.length > 0) {
        // Batch update to reduce API calls
        Promise.all(
          unreadMessages.map(m => 
            base44.entities.Message.update(m.id, {
              is_read: true,
              read_at: new Date().toISOString()
            })
          )
        );
      }
    }
  }, [messages.length, myProfile?.id]); // Only trigger on relevant changes

  // Send message with optimistic update
  const sendMessageMutation = useOptimisticUpdate(
    ['messages', matchId],
    async ({ content, type = 'text', mediaUrl = null }) => {
      // Rate limiting
      if (!rateLimiter('chat_message', 10, 60000)) {
        throw new Error('Too many messages. Please slow down.');
      }

      // Input validation
      if (!validateInput.length(content, 1, 5000)) {
        throw new Error('Message must be between 1 and 5000 characters');
      }

      if (!validateInput.noSpam(content)) {
        throw new Error('Message appears to be spam');
      }

      // Sanitize content
      const sanitizedContent = sanitizeHTML(content);
      // Check message limit for free users (3 messages per match)
      const tier = myProfile?.subscription_tier || 'free';
      if (tier === 'free') {
        const myMessages = messages.filter(m => m.sender_id === myProfile.id);
        if (myMessages.length >= 3) {
          localStorage.setItem('message_limit_hit', 'true');
          throw new Error('upgrade_required');
        }
      }

      // AI Content Moderation - check all messages
      const aiCheck = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this message for harassment, threats, explicit sexual content, hate speech, scams, or requests for personal contact info (phone/address). Message: "${content}". Return JSON with is_safe (boolean), threat_level (0-10), and reason (string if unsafe).`,
        response_json_schema: {
          type: "object",
          properties: {
            is_safe: { type: "boolean" },
            threat_level: { type: "number" },
            reason: { type: "string" }
          }
        }
      });

      // Block high-risk messages
      if (!aiCheck.is_safe && aiCheck.threat_level >= 7) {
        // Create moderation alert
        await base44.entities.ModerationAction.create({
          user_profile_id: myProfile.id,
          action_type: 'message_blocked',
          reason: aiCheck.reason,
          severity: 'high',
          action_taken: 'pending'
        });
        throw new Error('Message blocked for safety reasons. Our team will review this.');
      }

      // Flag medium-risk messages
      const shouldFlag = !aiCheck.is_safe && aiCheck.threat_level >= 4;

      const message = await base44.entities.Message.create({
        match_id: matchId,
        sender_id: myProfile.id,
        receiver_id: otherProfile.id,
        content: sanitizedContent,
        message_type: type,
        media_url: mediaUrl,
        is_read: false,
        is_deleted: false,
        is_flagged: shouldFlag
      });

      // Log flagged message for admin review
      if (shouldFlag) {
        await base44.entities.ModerationAction.create({
          user_profile_id: myProfile.id,
          action_type: 'message_flagged',
          reason: aiCheck.reason,
          severity: aiCheck.threat_level >= 6 ? 'high' : 'medium',
          action_taken: 'pending',
          details: { messageId: message.id, content }
        });
      }

      // Send notification
      await base44.entities.Notification.create({
        user_profile_id: otherProfile.id,
        type: 'message',
        title: `New message from ${myProfile.display_name}`,
        message: content.substring(0, 50),
        from_profile_id: myProfile.id,
        link_to: createPageUrl(`Chat?matchId=${matchId}`)
      });

      // Notify via WebSocket
      notifyNewMessage(message);
      
      return message;
    }
  );

  // Handle optimistic update success/error
  useEffect(() => {
    if (sendMessageMutation.isSuccess) {
      setMessageText('');
    }
    if (sendMessageMutation.isError) {
      const error = sendMessageMutation.error;
      if (error.message === 'upgrade_required') {
        setUpgradeFeature('Unlimited Messaging');
        setShowUpgradePrompt(true);
      } else {
        alert(error.message);
      }
    }
  }, [sendMessageMutation.isSuccess, sendMessageMutation.isError]);

  // Voice note mutation
  const sendVoiceNoteMutation = useMutation({
    mutationFn: async (audioBlob) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioBlob });
      await sendMessageMutation.mutateAsync({ content: 'Voice message', type: 'voice_note', mediaUrl: file_url });
    }
  });

  // Image mutation
  const sendImageMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await sendMessageMutation.mutateAsync({ content: 'Image', type: 'image', mediaUrl: file_url });
    }
  });

  // Translation mutation
  const translateMessageMutation = useMutation({
    mutationFn: async ({ messageId, targetLang }) => {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const translated = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate this message to ${targetLang}: "${message.content}". Return only the translation.`,
        response_json_schema: {
          type: "object",
          properties: {
            translation: { type: "string" }
          }
        }
      });

      await base44.entities.MessageTranslation.create({
        message_id: messageId,
        original_language: 'unknown',
        translated_text: { [targetLang]: translated.translation }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', matchId]);
    }
  });

  // Report mutation
  const reportMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Report.create({
        reporter_id: myProfile.id,
        reported_id: otherProfile.id,
        report_type: 'harassment',
        description: reportReason,
        status: 'pending'
      });
    },
    onSuccess: () => {
      setShowReport(false);
      setReportReason('');
      alert('Report submitted. Our team will review it.');
    }
  });

  // Block user mutation
  const blockMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.UserProfile.update(myProfile.id, {
        blocked_users: [...(myProfile.blocked_users || []), otherProfile.id]
      });
      await base44.entities.Match.update(match.id, { status: 'blocked' });
    },
    onSuccess: () => {
      window.location.href = createPageUrl('Matches');
    }
  });

  const handleVideoCall = () => {
    const tier = myProfile?.subscription_tier;
    if (tier === 'elite' || tier === 'vip') {
      // Open video call
      window.location.href = createPageUrl(`VideoChat?matchId=${matchId}`);
    } else {
      setUpgradeFeature('Video Calls');
      setShowUpgradePrompt(true);
    }
  };

  const handleVirtualGifts = () => {
    const tier = myProfile?.subscription_tier;
    if (tier === 'elite' || tier === 'vip') {
      setShowVirtualGifts(true);
    } else {
      setUpgradeFeature('Virtual Gifts');
      setShowUpgradePrompt(true);
    }
  };

  const handleSend = () => {
    if (!messageText.trim()) return;
    
    // Create optimistic message
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      match_id: matchId,
      sender_id: myProfile.id,
      receiver_id: otherProfile.id,
      content: messageText,
      message_type: 'text',
      is_read: false,
      created_date: new Date().toISOString(),
      __optimistic: true
    };
    
    sendMessageMutation.mutate({ 
      content: messageText,
      optimisticUpdate: [...messages, optimisticMessage]
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      sendImageMutation.mutate(file);
    }
  };

  // Typing indicator handler
  const handleTyping = () => {
    sendTypingIndicator(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  if (!otherProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-4 py-3">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
        </header>
        <ChatSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('Matches')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <Avatar>
            <AvatarImage src={otherProfile.primary_photo || otherProfile.photos?.[0]} />
            <AvatarFallback>{otherProfile.display_name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{otherProfile.display_name}</h2>
            <p className="text-xs text-gray-500">Active now</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVideoCall}
            className="text-purple-600 hover:bg-purple-50"
            title="Video Call (Elite/VIP)"
          >
            <Video size={20} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVirtualGifts}
            className="text-pink-600 hover:bg-pink-50"
            title="Send Gift (Elite/VIP)"
          >
            <Gift size={20} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`SafetyCheckSetup?matchId=${matchId}`)}>
                <Shield size={16} className="mr-2" />
                Set Up Safety Check
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={createPageUrl(`Report?userId=${otherProfile.id}`)}>
                <Flag size={16} className="mr-2" />
                Report User
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => blockMutation.mutate()} className="text-red-600">
              <Ban size={16} className="mr-2" />
              Block User
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
          </div>
          </header>

      {/* Messages - optimized rendering */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="messages-container">
        {hasMoreMessages && !isLoadingMoreMessages && (
          <div className="text-center py-2">
            <button
              onClick={loadMoreMessages}
              className="text-sm text-purple-600 hover:underline"
            >
              Load older messages
            </button>
          </div>
        )}

        {isLoadingMoreMessages && (
          <div className="text-center py-2">
            <div className="animate-spin inline-block w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full" />
          </div>
        )}

        {messages.length === 0 && !messagesLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Start a Conversation!</h3>
            <p className="text-gray-500 text-sm mb-4">
              Say hello to {otherProfile.display_name}
            </p>
            <Button
              onClick={() => setShowIceBreakers(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles size={16} className="mr-2" />
              Try an Ice Breaker
            </Button>
          </div>
        )}
        
        {messages.map(msg => {
          const isMine = msg.sender_id === myProfile?.id;
          const isOptimistic = msg.__optimistic;

          return (
            <div 
              key={msg.id} 
              className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isOptimistic ? 'opacity-60' : ''}`}
            >
              <div className={`max-w-xs md:max-w-md ${isMine ? 'bg-purple-600 text-white' : 'bg-white'} rounded-2xl px-4 py-2 shadow`}>
                {msg.message_type === 'voice_note' ? (
                  <audio controls src={msg.media_url} className="w-full" preload="metadata" />
                ) : msg.message_type === 'image' ? (
                  <OptimizedImage src={msg.media_url} alt="Shared" className="rounded-lg max-w-full" />
                ) : (
                  <p className="text-sm break-words">{msg.content}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs opacity-70">
                    {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {isMine && (
                    <span className="text-xs opacity-70">
                      {msg.is_read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
                {!isMine && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-6 text-xs"
                    onClick={() => setShowTranslate(msg.id)}
                  >
                    <Languages size={12} className="mr-1" />
                    Translate
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        <AnimatePresence>
          {otherUserTyping && (
            <TypingIndicator name={otherProfile.display_name} />
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowIceBreakers(true)}
            title="Ice breakers"
          >
            <Sparkles size={20} className="text-purple-600" />
          </Button>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="image-input"
          />
          <label htmlFor="image-input">
            <Button variant="ghost" size="icon" asChild>
              <span>
                <Image size={20} />
              </span>
            </Button>
          </label>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRecording(!recording)}
            className={recording ? 'bg-red-100' : ''}
          >
            <Mic size={20} className={recording ? 'text-red-600' : ''} />
          </Button>

          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />

          <Button
            onClick={handleSend}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Send size={20} />
          </Button>
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please describe why you're reporting {otherProfile.display_name}
            </p>
            <Textarea
              placeholder="Describe the issue..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
            />
            <Button
              onClick={() => reportMutation.mutate()}
              disabled={!reportReason || reportMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Submit Report
            </Button>
          </div>
        </DialogContent>
        </Dialog>

        {/* Ice Breaker Prompts */}
        <AnimatePresence>
        {showIceBreakers && (
          <IceBreakerPrompts
            onSelectQuestion={(q) => setMessageText(q)}
            onClose={() => setShowIceBreakers(false)}
          />
        )}
        </AnimatePresence>

        {/* Virtual Gifts Modal */}
        {showVirtualGifts && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowVirtualGifts(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">Send a Virtual Gift 🎁</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {['🌹', '💎', '🍫', '🎂', '💐', '🎁', '⭐', '💝', '👑'].map((gift, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      sendMessageMutation.mutate({ content: `Sent you a gift ${gift}`, type: 'text' });
                      setShowVirtualGifts(false);
                    }}
                    className="p-6 text-4xl bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl hover:scale-110 transition"
                  >
                    {gift}
                  </button>
                ))}
              </div>
              <Button variant="outline" onClick={() => setShowVirtualGifts(false)} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Upgrade Prompt Modal */}
        {showUpgradePrompt && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowUpgradePrompt(false)}>
            <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-amber-100 flex items-center justify-center">
                  <Sparkles size={40} className="text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{upgradeFeature} are Exclusive!</h2>
                <p className="text-gray-600 mb-6">
                  Upgrade to Elite or VIP to unlock {upgradeFeature.toLowerCase()} and connect in new ways!
                </p>
                <div className="space-y-3">
                  <Link to={createPageUrl('PricingPlans')}>
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700">
                      Upgrade Now
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => setShowUpgradePrompt(false)} className="w-full">
                    Maybe Later
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
        );
        }