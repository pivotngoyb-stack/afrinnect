import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import VerificationBadge from '../shared/VerificationBadge';

export default function ConversationItem({ match, profile, lastMessage, unreadCount = 0, onClick }) {
  const formatMessageDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isToday(d)) return format(d, 'HH:mm');
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  };

  const truncateMessage = (text, maxLength = 40) => {
    if (!text) return 'Say hello! 👋';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const photo = profile?.primary_photo || profile?.photos?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100';

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition rounded-xl ${
        unreadCount > 0 ? 'bg-purple-50/50' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        <img 
          src={photo}
          alt={profile?.display_name}
          className="w-14 h-14 rounded-full object-cover border-2 border-white shadow"
        />
        {profile?.is_active && (
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold truncate ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
              {profile?.display_name}
            </h3>
            <VerificationBadge verification={profile?.verification_status} size="small" />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatMessageDate(lastMessage?.created_date || match?.matched_at)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
            {truncateMessage(lastMessage?.content)}
          </p>
          {unreadCount > 0 && (
            <Badge className="bg-purple-600 text-white text-xs ml-2 flex-shrink-0">
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}