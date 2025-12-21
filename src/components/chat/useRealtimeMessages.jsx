import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// Optimized real-time messaging with long polling
export function useRealtimeMessages(matchId) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const lastTimestampRef = useRef(new Date().toISOString());
  const pollingIntervalRef = useRef(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!matchId) return;

    // Initial fetch
    const fetchInitialMessages = async () => {
      const msgs = await base44.entities.Message.filter(
        { match_id: matchId },
        'created_date',
        100
      );
      setMessages(msgs);
      if (msgs.length > 0) {
        lastTimestampRef.current = msgs[msgs.length - 1].created_date;
      }
    };

    fetchInitialMessages();

    // Optimized polling - only fetch new messages
    const poll = async () => {
      if (isPollingRef.current) return; // Prevent concurrent polls
      isPollingRef.current = true;

      try {
        const response = await base44.functions.invoke('realtimeChat', {
          matchId,
          lastTimestamp: lastTimestampRef.current
        });

        if (response.data.messages?.length > 0) {
          setMessages(prev => [...prev, ...response.data.messages]);
          lastTimestampRef.current = response.data.messages[response.data.messages.length - 1].created_date;
        }

        setIsTyping(response.data.typingStatus?.isTyping || false);
      } catch (error) {
        console.error('Polling error:', error);
      } finally {
        isPollingRef.current = false;
      }
    };

    // Start polling - adaptive interval based on activity
    let interval = 3000; // Start with 3s
    pollingIntervalRef.current = setInterval(() => {
      poll();
      // Increase interval if no activity (save resources)
      interval = Math.min(interval + 500, 10000);
    }, interval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [matchId]);

  return { messages, isTyping };
}