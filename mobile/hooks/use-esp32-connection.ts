import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/services/supabase';

/**
 * Hook to manage the WebSocket connection to the ESP32 hardware
 * Defaults to localhost when testing in simulator/web.
 */

// Default to IPv4 loopback for the mock simulator to bypass Windows IPv6 resolution issues
const ESP32_WS_URL = 'ws://127.0.0.1:8080';

export type MachineState = 'STOPPED' | 'RUNNING' | 'PAUSED';

export interface HardwareHealth {
  connected: boolean;
  pingMs: number;
}

export function useESP32Connection(
  activeBatchId?: string | null,
  incrementBean?: (variety: string, quality: string) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [machineState, setMachineState] = useState<MachineState>('STOPPED');
  const [ping] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(ESP32_WS_URL);

      ws.onopen = () => {
        setIsConnected(true);
        console.log('✅ Connected to ESP32 WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'STATUS') {
            setMachineState(message.state);
          } else if (message.type === 'BEAN_DETECTED') {
            const { variety, variety_confidence, quality, quality_confidence } = message.data;
            console.log('Bean Detected:', { variety, quality });
            
            // Instantly update UI without waiting for database
            if (incrementBean) {
              incrementBean(variety, quality);
            }
            
            // If we have an active batch, save the classification to the database immediately
            if (activeBatchId) {
              supabase
                .from('classifications')
                .insert({
                  batch_id: activeBatchId,
                  variety,
                  variety_confidence,
                  quality,
                  quality_confidence,
                })
                .then(({ error }) => {
                  if (error) console.error('Failed to save bean classification:', error);
                });
            }
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('❌ Disconnected from ESP32 WebSocket. Attempting reconnect...');
        
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connect, 3000) as unknown as NodeJS.Timeout;
      };

      ws.onerror = (error) => {
        console.warn('ESP32 WebSocket Error:', error);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Failed to initialize WebSocket:', e);
    }
  }, [activeBatchId, incrementBean]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Command transmitters
  const sendCommand = useCallback((command: 'START' | 'PAUSE' | 'STOP') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }));
    } else {
      console.warn('Cannot send command. WebSocket is not connected.');
    }
  }, []);

  return {
    isConnected,
    machineState,
    health: {
      connected: isConnected,
      pingMs: ping,
    },
    sendCommand,
  };
}
