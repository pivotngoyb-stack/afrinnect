import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Send, Mic, Image, MoreVertical, 
  Shield, Flag, Ban, Sparkles, Phone, Video 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ChatBubble from '@/components/messaging/ChatBubble';
import VerificationBadge from '@/components/shared/VerificationBadge';

const ICE_BREAKERS = [
  "What's your favorite traditional dish from home?",
  "Where in Africa would you love to visit?",
  "What cultural tradition do you cherish the most?",
  "What languages do you speak at home?",
  "What's your favorite African music genre?",
];

export default function Chat() {
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('matchId');
  
  const [myProfile, setMyProfile] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showIceBreakers, setShowIceBreakers] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            setMyProfile(profiles[0]);
          }
        }
      } catch (e) {
        console.log('Not logged in');
      }
    };
    fetchMyProfile();
  }, []);

  // Fetch match details
  const { data: match } = useQuery({
    queryKey: ['match', matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const matches = await base44.entities.Match.filter({ id: matchId });
      return matches[0];
    },
    enabled: !!matchId
  });

  // Fetch other user's profile
  const { data: otherProfile } = useQuery({
    queryKey: ['other-profile', match, myProfile?.id],
    queryFn: async () => {
      if (!match || !myProfile) return null;
      const otherId = match.user1_id === myProfile.id ? match.user2_id : match.user1_id;
      const profiles = await base44.entities.UserProfile.filter({ id: otherId });
      return profiles[0];
    },
    enabled: !!match && !!myProfile
  });

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', matchId],
    queryFn: async () => {
      if (!matchId) return [];
      return base44.entities.Message.filter({ match_id: matchId }, 'created_date');
    },
    enabled: !!matchId,
    refetchInterval: 3000 // Poll for new messages
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, type = 'text' }) => {
      return base44.entities.Message.create({
        match_id: matchId,
        sender_id: myProfile.id,
        receiver_id: otherProfile.id,
        content,
        message_type: type,
        is_read: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', matchId]);
      setNewMessage('');
      setShowIceBreakers(false);
    }
  });

  // Block user mutation
  const blockMutation = useMutation({
    mutationFn: async () => {
      // Update match status
      await base44.entities.Match.update(matchId, { status: 'blocked' });
      // Add to blocked list
      const blockedUsers = myProfile.blocked_users || [];
      await base44.entities.UserProfile.update(myProfile.id, {
        blocked_users: [...blockedUsers, otherProfile.id]
      });
    },
    onSuccess: () => {
      window.location.href = createPageUrl('Matches');
    }
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({ content: newMessage });
  };

  const handleSendIceBreaker = (question) => {
    sendMessageMutation.mutate({ content: question, type: 'ice_breaker' });
  };

  const photo = otherProfile?.primary_photo || otherProfile?.photos?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100';

  if (!matchId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No conversation selected</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link to={createPageUrl('Matches')}>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <ArrowLeft size={24} />
          </Button>
        </Link>
        
        <Link to={createPageUrl(`Profile?id=${otherProfile?.id}`)} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <img 
              src={photo}
              alt={otherProfile?.display_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
            />
            {otherProfile?.is_active && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold truncate">{otherProfile?.display_name}</h2>
              <VerificationBadge verification={otherProfile?.verification_status} size="small" />
            </div>
            <p className="text-xs text-gray-500">
              {otherProfile?.is_active ? 'Online' : 'Last seen recently'}
            </p>
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
              <Flag size={16} className="mr-2 text-amber-600" />
              Report User
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowBlockDialog(true)} className="text-red-600">
              <Ban size={16} className="mr-2" />
              Block User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        {/* Match Header */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8 mb-4"
          >
            <img 
              src={photo}
              alt={otherProfile?.display_name}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-purple-100 shadow-lg"
            />
            <h3 className="font-bold text-lg text-gray-800">
              You matched with {otherProfile?.display_name}!
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Start a conversation or use an ice breaker below
            </p>
            
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Shield size={14} />
              <span>Messages are encrypted and private</span>
            </div>
          </motion.div>
        )}

        {/* Message List */}
        {messages.map((message, idx) => (
          <ChatBubble
            key={message.id || idx}
            message={message}
            isOwn={message.sender_id === myProfile?.id}
            senderPhoto={message.sender_id === myProfile?.id ? myProfile?.primary_photo : photo}
          />
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Ice Breakers */}
      {showIceBreakers && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white border-t p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Cultural Ice Breakers</span>
          </div>
          <div className="space-y-2">
            {ICE_BREAKERS.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleSendIceBreaker(question)}
                className="w-full text-left p-3 bg-gradient-to-r from-purple-50 to-amber-50 rounded-xl text-sm text-gray-700 hover:from-purple-100 hover:to-amber-100 transition"
              >
                {question}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowIceBreakers(!showIceBreakers)}
            className={showIceBreakers ? 'text-purple-600' : ''}
          >
            <Sparkles size={20} />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 border-0 focus-visible:ring-purple-500"
          />
          
          {newMessage.trim() ? (
            <Button 
              type="submit" 
              size="icon"
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              disabled={sendMessageMutation.isPending}
            >
              <Send size={20} />
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="icon">
              <Mic size={20} />
            </Button>
          )}
        </form>
      </div>

      {/* Block Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {otherProfile?.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to see your profile or send you messages. You can unblock them anytime in settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blockMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Dialog */}
      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report {otherProfile?.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Help us keep Ubuntu safe. Your report will be reviewed by our team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowReportDialog(false);
                window.location.href = createPageUrl(`Report?userId=${otherProfile?.id}`);
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}