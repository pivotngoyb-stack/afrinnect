import React, { useState } from 'react';
import { Video, Phone, Loader2, Crown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { base44 } from '@/api/base44Client';

export default function CallButton({ 
  matchId, 
  otherProfile,
  userProfile,
  onCallStart,
  variant = 'video', // 'video' or 'audio'
  size = 'default'
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const isPremiumTier = ['elite', 'vip'].includes(userProfile?.subscription_tier);
  
  const handleCall = async () => {
    if (!isPremiumTier) {
      setError('Video calls require Elite or VIP membership');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if other user is busy
      const busyCheck = await base44.functions.invoke('videoCallSignaling', {
        action: 'check_busy',
        profile_id: otherProfile?.id
      });
      
      if (busyCheck.data.busy) {
        setError('User is currently on another call');
        setLoading(false);
        return;
      }
      
      // Start the call
      onCallStart?.({
        matchId,
        otherProfile,
        callType: variant
      });
      
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  const Icon = variant === 'video' ? Video : Phone;
  
  if (!isPremiumTier) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size={size === 'small' ? 'sm' : 'default'}
              className="text-gray-400 cursor-not-allowed"
              disabled
            >
              <Crown size={16} className="mr-1 text-amber-500" />
              <Icon size={size === 'small' ? 16 : 20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Video calls require Elite or VIP membership</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size === 'small' ? 'icon' : 'default'}
            onClick={handleCall}
            disabled={loading}
            className={`${size === 'small' ? 'h-8 w-8' : ''} text-purple-600 hover:text-purple-700 hover:bg-purple-50`}
          >
            {loading ? (
              <Loader2 size={size === 'small' ? 16 : 20} className="animate-spin" />
            ) : (
              <Icon size={size === 'small' ? 16 : 20} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{variant === 'video' ? 'Start video call' : 'Start voice call'}</p>
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}