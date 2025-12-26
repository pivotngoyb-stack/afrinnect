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

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;
    let heartbeatInterval;

    // Create WebSocket connection with advanced reconnection
    const connectWebSocket = () => {
      if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        return;
      }

      try {
        const wsUrl = window.location.origin.replace('http', 'ws') + '/api/functions/realtimeChat';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          reconnectAttempts = 0;
          
          // Authenticate
          ws.send(JSON.stringify({
            type: 'auth',
            userId: myProfileId,
            matchId: matchId
          }));

          // Send heartbeat every 30 seconds to keep connection alive
          heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000);
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

        ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          clearInterval(heartbeatInterval);
          
          // Only reconnect if it wasn't a clean close
          if (event.code !== 1000) {
            reconnectAttempts++;
            const delay = Math.min(reconnectDelay * reconnectAttempts, 30000);
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
            setTimeout(connectWebSocket, delay);
          }
        };

        socketRef.current = ws;
      } catch (error) {
        console.error('WebSocket connection error:', error);
        reconnectAttempts++;
        setTimeout(connectWebSocket, reconnectDelay);
      }
    };

    connectWebSocket();

    return () => {
      reconnectAttempts = maxReconnectAttempts; // Prevent reconnection on unmount
      clearInterval(heartbeatInterval);
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounted');
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