import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/services/supabase';
import {
  type OperationalClass,
  gateForClass,
  derivedGradeForClass,
  normalizeOperationalClass,
} from '@/utils/classification';

const STORAGE_KEY = 'cacaoscan.edge_host';
const DEFAULT_HOST = Platform.OS === 'web' ? '127.0.0.1' : '192.168.1.11';
const WS_PORT = 8080;
const CONNECT_TIMEOUT_MS = 5000;

export type MachineState = 'STOPPED' | 'RUNNING' | 'PAUSED';

export interface ClassResult {
  id: string;
  operationalClass: OperationalClass;
  confidence: number;
  gateActuated: number;
  derivedGrade: string;
  timestamp: string;
}

type BeanHandler = (operationalClass: OperationalClass) => void;

interface ESP32ContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  isDemoMode: boolean;
  machineState: MachineState;
  serverHost: string;
  setServerHost: (host: string) => void;
  connect: (hostOverride?: string) => Promise<boolean>;
  disconnect: () => void;
  enableDemoMode: () => void;
  sendCommand: (command: 'START' | 'PAUSE' | 'STOP') => void;
  currentClassification: ClassResult | null;
  recentClassifications: ClassResult[];
  /** Bind active batch + optional counter callback (dashboard / vision). */
  bindBatch: (batchId: string | null, onBean?: BeanHandler) => void;
}

const ESP32Context = createContext<ESP32ContextValue | null>(null);

function wsUrlFor(host: string) {
  const cleaned = host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `ws://${cleaned}:${WS_PORT}`;
}

export function ESP32Provider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [machineState, setMachineState] = useState<MachineState>('STOPPED');
  const [serverHost, setServerHostState] = useState(DEFAULT_HOST);
  const [currentClassification, setCurrentClassification] = useState<ClassResult | null>(null);
  const [recentClassifications, setRecentClassifications] = useState<ClassResult[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const demoRef = useRef(false);
  const batchIdRef = useRef<string | null>(null);
  const beanHandlerRef = useRef<BeanHandler | undefined>(undefined);
  const hostRef = useRef(DEFAULT_HOST);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        hostRef.current = saved;
        setServerHostState(saved);
      }
    });
  }, []);

  const setServerHost = useCallback((host: string) => {
    const next = host.trim() || DEFAULT_HOST;
    hostRef.current = next;
    setServerHostState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const bindBatch = useCallback((batchId: string | null, onBean?: BeanHandler) => {
    batchIdRef.current = batchId;
    if (onBean) beanHandlerRef.current = onBean;
  }, []);

  const handleBeanMessage = useCallback((message: any) => {
    const raw =
      message.data?.operational_class ??
      message.data?.class ??
      message.data?.label ??
      (message.data?.quality === 'rejected'
        ? 'Rejected'
        : message.data?.quality === 'needs_drying'
          ? 'Needs_Drying'
          : message.data?.variety);

    const operationalClass = normalizeOperationalClass(String(raw || 'Rejected'));
    const confidenceRaw =
      message.data?.confidence ??
      message.data?.quality_confidence ??
      message.data?.variety_confidence ??
      0;
    const confidence =
      typeof confidenceRaw === 'number' && confidenceRaw > 1
        ? confidenceRaw / 100
        : Number(confidenceRaw) || 0;

    const gateActuated = message.data?.gate_actuated ?? gateForClass(operationalClass);
    const derivedGrade = message.data?.derived_grade ?? derivedGradeForClass(operationalClass);

    const newResult: ClassResult = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      operationalClass,
      confidence,
      gateActuated,
      derivedGrade,
      timestamp: message.timestamp || new Date().toISOString(),
    };

    setCurrentClassification(newResult);
    setRecentClassifications((prev) => [newResult, ...prev].slice(0, 15));

    beanHandlerRef.current?.(operationalClass);

    const activeBatchId = batchIdRef.current;
    if (activeBatchId) {
      supabase
        .from('classifications')
        .insert({
          batch_id: activeBatchId,
          operational_class: operationalClass,
          confidence,
          gate_actuated: gateActuated,
          derived_grade: derivedGrade,
          model_version: message.data?.model_version ?? 'YOLOv8n-640-v1.0',
        })
        .then(({ error }) => {
          if (error) console.error('Failed to save bean classification:', error);
        });
    }
  }, []);

  const clearReconnect = () => {
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  };

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearReconnect();
    demoRef.current = false;
    setIsDemoMode(false);
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setMachineState('STOPPED');
  }, []);

  const enableDemoMode = useCallback(() => {
    intentionalCloseRef.current = true;
    clearReconnect();
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    demoRef.current = true;
    setIsDemoMode(true);
    setIsConnected(true);
    setIsConnecting(false);
    setMachineState('STOPPED');
  }, []);

  const connect = useCallback(
    (hostOverride?: string) => {
      return new Promise<boolean>((resolve) => {
        const host = (hostOverride ?? hostRef.current).trim() || DEFAULT_HOST;
        if (hostOverride) setServerHost(host);

        intentionalCloseRef.current = false;
        demoRef.current = false;
        setIsDemoMode(false);
        setIsConnecting(true);
        clearReconnect();

        if (wsRef.current) {
          try {
            wsRef.current.close();
          } catch {
            // ignore
          }
          wsRef.current = null;
        }

        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          setIsConnecting(false);
          resolve(ok);
        };

        const timeout = setTimeout(() => {
          if (settled) return;
          try {
            wsRef.current?.close();
          } catch {
            // ignore
          }
          setIsConnected(false);
          finish(false);
        }, CONNECT_TIMEOUT_MS);

        try {
          const url = wsUrlFor(host);
          const ws = new WebSocket(url);

          ws.onopen = () => {
            clearTimeout(timeout);
            setIsConnected(true);
            finish(true);
            console.log('Connected to edge WebSocket:', url);
          };

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              if (message.type === 'STATUS') {
                setMachineState(message.state);
              } else if (
                message.type === 'BEAN_DETECTED' ||
                message.type === 'classification_result'
              ) {
                handleBeanMessage(message);
              }
            } catch (e) {
              console.error('Failed to parse WebSocket message:', e);
            }
          };

          ws.onclose = () => {
            setIsConnected(false);
            if (!settled) {
              clearTimeout(timeout);
              finish(false);
            }
            if (!intentionalCloseRef.current && !demoRef.current) {
              reconnectRef.current = setTimeout(() => {
                connect(hostRef.current);
              }, 4000);
            }
          };

          ws.onerror = () => {
            console.warn('ESP32 WebSocket error for', url);
          };

          wsRef.current = ws;
        } catch (e) {
          clearTimeout(timeout);
          console.error('Failed to initialize WebSocket:', e);
          setIsConnected(false);
          finish(false);
        }
      });
    },
    [handleBeanMessage, setServerHost]
  );

  const sendCommand = useCallback((command: 'START' | 'PAUSE' | 'STOP') => {
    if (demoRef.current) {
      setMachineState(
        command === 'START' ? 'RUNNING' : command === 'PAUSE' ? 'PAUSED' : 'STOPPED'
      );
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command }));
    } else {
      console.warn('Cannot send command. WebSocket is not connected.');
    }
  }, []);

  const value = useMemo<ESP32ContextValue>(
    () => ({
      isConnected,
      isConnecting,
      isDemoMode,
      machineState,
      serverHost,
      setServerHost,
      connect,
      disconnect,
      enableDemoMode,
      sendCommand,
      currentClassification,
      recentClassifications,
      bindBatch,
    }),
    [
      isConnected,
      isConnecting,
      isDemoMode,
      machineState,
      serverHost,
      setServerHost,
      connect,
      disconnect,
      enableDemoMode,
      sendCommand,
      currentClassification,
      recentClassifications,
      bindBatch,
    ]
  );

  return <ESP32Context.Provider value={value}>{children}</ESP32Context.Provider>;
}

export function useESP32Connection(
  activeBatchId?: string | null,
  incrementBean?: BeanHandler
) {
  const ctx = useContext(ESP32Context);
  if (!ctx) {
    throw new Error('useESP32Connection must be used within ESP32Provider');
  }

  // Only Dashboard/Vision pass args — bare callers must not clear the batch binding.
  const bridgesBatch = arguments.length > 0;

  useEffect(() => {
    if (!bridgesBatch) return;
    ctx.bindBatch(activeBatchId ?? null, incrementBean);
  }, [ctx, bridgesBatch, activeBatchId, incrementBean]);

  return ctx;
}

/** Helper: attempt connect, alert on failure with Demo Mode option */
export async function promptConnectScanner(
  connect: (host?: string) => Promise<boolean>,
  enableDemoMode: () => void,
  host: string
) {
  const ok = await connect(host);
  if (ok) return true;

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Scanner unreachable',
      `Could not connect to ws://${host}:${WS_PORT}.\n\nStart the mock ESP32 (node scripts/mock-esp32.js) or check the IP. You can also use Demo Mode for UI testing.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Demo Mode',
          onPress: () => {
            enableDemoMode();
            resolve(true);
          },
        },
        {
          text: 'Retry',
          onPress: async () => {
            const retried = await connect(host);
            resolve(retried);
          },
        },
      ]
    );
  });
}
