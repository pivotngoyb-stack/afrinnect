import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeMessages(matchId, myProfileId, enabled = true) {
  const [isConnected, setIsConnected] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !matchId || !myProfileId) return;

    // Create WebSocket connection with fallback
    const connectWebSocket = () => {
      try {
        const wsUrl = window.location.origin.replace('http', 'ws') + '/api/functions/realtimeChat';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          
          // Authenticate
          ws.send(JSON.stringify({
            type: 'auth',
            userId: myProfileId,
            matchId: matchId
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle typing indicator
            if (data.type === 'user_typing') {
              setOtherUserTyping(data.isTyping);
              if (data.isTyping) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  setOtherUserTyping(false);
                }, 3000);
              }
            }

            // Handle new message
            if (data.type === 'new_message') {
              queryClient.invalidateQueries(['messages', matchId]);
            }

            // Handle read receipt
            if (data.type === 'message_read') {
              queryClient.invalidateQueries(['messages', matchId]);
            }
          } catch (error) {
            console.error('WebSocket message parse error:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.log('WebSocket closed, reconnecting...');
          setIsConnected(false);
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        socketRef.current = ws;
      } catch (error) {
        console.error('WebSocket connection error:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      clearTimeout(typingTimeoutRef.current);
    };
  }, [matchId, myProfileId, enabled, queryClient]);

  const sendTypingIndicator = (isTyping) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        userId: myProfileId,
        isTyping
      }));
    }
  };

  const notifyNewMessage = (message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'message',
        message
      }));
    }
  };

  const sendReadReceipt = (messageId) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'read',
        messageId
      }));
    }
  };

  return {
    isConnected,
    otherUserTyping,
    sendTypingIndicator,
    notifyNewMessage,
    sendReadReceipt
  };
}