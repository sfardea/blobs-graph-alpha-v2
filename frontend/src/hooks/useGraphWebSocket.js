/**
 * useGraphWebSocket - Custom hook for WebSocket communication
 * Handles real-time graph updates, viewport streaming, and node focus
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useGraphWebSocket(onMessage) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    try {
      // Determine WebSocket URL
      let wsUrl;
      if (import.meta.env.VITE_API_URL) {
        // Production: use Railway backend URL
        const apiUrl = import.meta.env.VITE_API_URL;
        const wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
        const host = apiUrl.replace(/^https?:\/\//, '');
        wsUrl = `${wsProtocol}//${host}/ws/graph`;
      } else {
        // Development: use proxy
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws/graph`;
      }
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) {
            onMessage(data);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Failed to connect after multiple attempts');
        }
      };
    } catch (e) {
      console.error('Error creating WebSocket:', e);
      setError(e.message);
    }
  }, [onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  /**
   * Request viewport data
   */
  const requestViewport = useCallback((viewport) => {
    return send({
      type: 'viewport',
      payload: viewport,
    });
  }, [send]);

  /**
   * Focus on a specific node
   */
  const focusNode = useCallback((nodeId, depth = 3) => {
    return send({
      type: 'focus_node',
      node_id: nodeId,
      depth: depth,
    });
  }, [send]);

  /**
   * Send ping to keep connection alive
   */
  const ping = useCallback(() => {
    return send({ type: 'ping' });
  }, [send]);

  // Connect on mount
  useEffect(() => {
    connect();

    // Ping every 30 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (isConnected) {
        ping();
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect, ping, isConnected]);

  return {
    isConnected,
    error,
    send,
    requestViewport,
    focusNode,
    reconnect: connect,
  };
}

export default useGraphWebSocket;
