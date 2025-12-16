import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, Mic, Image, Languages, AlertTriangle, MoreVertical, Flag, Sparkles } from 'lucide-react';
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
import ReadReceipt from '@/components/chat/ReadReceipt';
import QuestionGame from '@/components/chat/QuestionGame';
import LocationShare from '@/components/chat/LocationShare';

export default function Chat() {
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
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showQuestionGame, setShowQuestionGame] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();

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

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', matchId],
    queryFn: () => base44.entities.Message.filter({ match_id: matchId }, 'created_date', 500),
    enabled: !!matchId,
    refetchInterval: 3000 // Poll every 3 seconds
  });

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (messages.length > 0 && myProfile) {
      messages
        .filter(m => m.receiver_id === myProfile.id && !m.is_read)
        .forEach(m => {
          base44.entities.Message.update(m.id, {
            is_read: true,
            read_at: new Date().toISOString()
          });
        });
    }
  }, [messages, myProfile]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, type = 'text', mediaUrl = null }) => {
      // First message filtering
      if (messages.length === 0) {
        const aiCheck = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this first message for harassment, explicit content, or inappropriate language: "${content}". Return JSON with is_appropriate (boolean) and reason (string if inappropriate).`,
          response_json_schema: {
            type: "object",
            properties: {
              is_appropriate: { type: "boolean" },
              reason: { type: "string" }
            }
          }
        });

        if (!aiCheck.is_appropriate) {
          throw new Error('Message blocked: ' + aiCheck.reason);
        }
      }

      await base44.entities.Message.create({
        match_id: matchId,
        sender_id: myProfile.id,
        receiver_id: otherProfile.id,
        content,
        message_type: type,
        media_url: mediaUrl,
        is_read: false,
        is_deleted: false,
        is_flagged: false
      });

      // Send notification
      await base44.entities.Notification.create({
        user_profile_id: otherProfile.id,
        type: 'message',
        title: `New message from ${myProfile.display_name}`,
        message: content.substring(0, 50),
        from_profile_id: myProfile.id,
        link_to: createPageUrl(`Chat?matchId=${matchId}`)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', matchId]);
      setMessageText('');
    },
    onError: (error) => {
      alert(error.message);
    }
  });

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

  const handleSend = () => {
    if (!messageText.trim()) return;
    sendMessageMutation.mutate({ content: messageText });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      sendImageMutation.mutate(file);
    }
  };

  // Typing indicator handler
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // In real app, send typing status to other user via websocket
    }
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  // Simulate other user typing (in real app, this would come from websocket)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.95) {
        setOtherUserTyping(true);
        setTimeout(() => setOtherUserTyping(false), 3000);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!otherProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSkeleton variant="chat" />
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setShowReport(true)}>
              <Flag size={16} className="mr-2" />
              Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => blockMutation.mutate()} className="text-red-600">
              <AlertTriangle size={16} className="mr-2" />
              Block User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
          const isMine = msg.sender_id === myProfile?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md ${isMine ? 'bg-purple-600 text-white' : 'bg-white'} rounded-2xl px-4 py-2 shadow`}>
                {msg.message_type === 'voice_note' ? (
                  <audio controls src={msg.media_url} className="w-full" />
                ) : msg.message_type === 'image' ? (
                  <img src={msg.media_url} alt="Shared" className="rounded-lg" />
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
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
        </div>
        );
        }