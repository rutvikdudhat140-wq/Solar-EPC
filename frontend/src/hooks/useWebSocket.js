import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3000/reminders';

export const useWebSocket = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connect = useCallback(() => {
    if (!user?.id) return;

    const token = localStorage.getItem('solar_token') || localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) {
      console.warn('[WebSocket] No token available');
      return;
    }

    try {
      // For Socket.IO (if using socket.io-client)
      // For now, using native WebSocket for compatibility
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Send authentication
        ws.send(JSON.stringify({
          event: 'auth',
          data: { token }
        }));

        // Subscribe to reminders
        ws.send(JSON.stringify({
          event: 'subscribe-reminders',
          data: {}
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message);
          setLastMessage(message);
        } catch (err) {
          console.log('[WebSocket] Raw message:', event.data);
          setLastMessage({ type: 'raw', data: event.data });
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        socketRef.current = null;

        // Attempt reconnection
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      socketRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
    }
  }, [user?.id]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((event, data) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event, data }));
    } else {
      console.warn('[WebSocket] Cannot send - not connected');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    connect,
    disconnect,
  };
};

export default useWebSocket;
