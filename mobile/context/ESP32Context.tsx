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
const EDGE_PORT = 5000;
const CONNECT_TIMEOUT_MS = 5000;
const COMMAND_TIMEOUT_MS = 12000;
const HEALTH_RETRY_MS = 4000;

export type EdgeIdentityStatus =
  | 'unknown'
  | 'checking'
  | 'matched'
  | 'mismatch'
  | 'unpaired'
  | 'unreachable';

function hostOnly(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  return withoutScheme.split('/')[0].split(':')[0];
}

export type MachineState = 'UNKNOWN' | 'STOPPED' | 'RUNNING' | 'PAUSED';

export type CommandResult = { ok: true } | { ok: false; message: string };

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
  edgeIdentity: EdgeIdentityStatus;
  connect: (hostOverride?: string) => Promise<boolean>;
  disconnect: () => void;
  enableDemoMode: () => void;
  sendCommand: (command: 'START' | 'PAUSE' | 'STOP') => Promise<CommandResult>;
  currentClassification: ClassResult | null;
  recentClassifications: ClassResult[];
  /** Bind active batch + optional counter callback (dashboard / vision). */
  bindBatch: (batchId: string | null, onBean?: BeanHandler) => void;
}

const ESP32Context = createContext<ESP32ContextValue | null>(null);

function wsUrlFor(host: string) {
  const cleaned = hostOnly(host) || DEFAULT_HOST;
  return `ws://${cleaned}:${WS_PORT}`;
}

export function ESP32Provider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [machineState, setMachineState] = useState<MachineState>('UNKNOWN');
  const [serverHost, setServerHostState] = useState(DEFAULT_HOST);
  const [edgeIdentity, setEdgeIdentity] = useState<EdgeIdentityStatus>('unknown');
  const [currentClassification, setCurrentClassification] = useState<ClassResult | null>(null);
  const [recentClassifications, setRecentClassifications] = useState<ClassResult[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalCloseRef = useRef(false);
  const demoRef = useRef(false);
  const batchIdRef = useRef<string | null>(null);
  const beanHandlerRef = useRef<BeanHandler | undefined>(undefined);
  const hostRef = useRef(DEFAULT_HOST);
  const identitySeq = useRef(0);
  const edgeIdentityRef = useRef<EdgeIdentityStatus>('unknown');
  const linkedMachineIdRef = useRef('');
  const lastStreamIdRef = useRef<string | null>(null);
  const lastEventIdRef = useRef(0);
  const pollInFlightRef = useRef(false);
  const healthRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHealthRetry = useCallback(() => {
    if (healthRetryRef.current) {
      clearTimeout(healthRetryRef.current);
      healthRetryRef.current = null;
    }
  }, []);

  const refreshEdgeIdentity = useCallback(async (host: string) => {
    clearHealthRetry();
    const cleaned = hostOnly(host);
    const seq = ++identitySeq.current;
    const healthUrl = cleaned ? `http://${cleaned}:${EDGE_PORT}/health` : '';
    const scheduleHealthRetry = () => {
      if (seq !== identitySeq.current) return;
      const nextHost = hostOnly(hostRef.current);
      if (!nextHost || !linkedMachineIdRef.current.trim()) return;
      clearHealthRetry();
      healthRetryRef.current = setTimeout(() => {
        healthRetryRef.current = null;
        void refreshEdgeIdentity(hostRef.current);
      }, HEALTH_RETRY_MS);
    };
    console.log('[edge-health] host', cleaned || '(empty)');
    console.log('[edge-health] url', healthUrl || '(none)');
    if (!cleaned) {
      setEdgeIdentity('unpaired');
      return;
    }
    if (edgeIdentityRef.current !== 'matched') setEdgeIdentity('checking');
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (seq !== identitySeq.current) return;
      if (!user) {
        console.log('[edge-health] linked_machine_id', '(none)');
        setEdgeIdentity('unpaired');
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('linked_machine_id')
        .eq('id', user.id)
        .maybeSingle();
      if (seq !== identitySeq.current) return;
      const linked =
        !error && typeof data?.linked_machine_id === 'string' ? data.linked_machine_id.trim() : '';
      console.log('[edge-health] linked_machine_id', linked || '(none)');
      linkedMachineIdRef.current = linked;
      if (!linked) {
        setEdgeIdentity('unpaired');
        return;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 4000);
      let res: Response;
      let body: string;
      try {
        res = await fetch(healthUrl, {
          signal: controller.signal,
        });
        body = (await res.text()).trim();
      } finally {
        clearTimeout(timeoutId);
      }
      console.log('[edge-health] status', res.status);
      console.log('[edge-health] body', body);
      if (seq !== identitySeq.current) return;
      if (res.ok && body === linked) setEdgeIdentity('matched');
      else if (res.ok) setEdgeIdentity('mismatch');
      else setEdgeIdentity('unreachable');
      scheduleHealthRetry();
    } catch (error) {
      const name = error instanceof Error ? error.name : 'unknown';
      const message = error instanceof Error ? error.message : String(error);
      console.log('[edge-health] error', name);
      console.log('[edge-health] message', message);
      if (seq !== identitySeq.current) return;
      setEdgeIdentity('unreachable');
      scheduleHealthRetry();
    }
  }, [clearHealthRetry]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      const next = saved ? hostOnly(saved) || DEFAULT_HOST : DEFAULT_HOST;
      hostRef.current = next;
      setServerHostState(next);
      refreshEdgeIdentity(next);
    });
  }, [refreshEdgeIdentity]);

  useEffect(() => {
    return () => {
      identitySeq.current += 1;
      clearHealthRetry();
    };
  }, [clearHealthRetry]);

  const setServerHost = useCallback((host: string) => {
    const next = hostOnly(host) || DEFAULT_HOST;
    hostRef.current = next;
    setServerHostState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    refreshEdgeIdentity(next);
  }, [refreshEdgeIdentity]);

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
    const wasDemo = demoRef.current;
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
    if (wasDemo) setMachineState('UNKNOWN');
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
              if (
                demoRef.current &&
                (message.type === 'BEAN_DETECTED' ||
                  message.type === 'classification_result')
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

  useEffect(() => {
    edgeIdentityRef.current = edgeIdentity;
  }, [edgeIdentity]);

  const applyEventList = useCallback(
    (events: Array<{ event_id?: number; operational_class?: string }>) => {
      let highest = lastEventIdRef.current;
      for (const event of events) {
        const eventId = event.event_id;
        const operationalClass = event.operational_class;
        if (typeof eventId !== 'number' || eventId <= highest) continue;
        if (!operationalClass || operationalClass === 'EMPTY') continue;
        handleBeanMessage({
          data: { operational_class: operationalClass, confidence: 0 },
          timestamp: new Date().toISOString(),
        });
        highest = eventId;
        lastEventIdRef.current = highest;
      }
    },
    [handleBeanMessage]
  );

  useEffect(() => {
    if (edgeIdentity !== 'matched' || isDemoMode) return;
    let stopped = false;

    const fetchEvents = async (after: number) => {
      const host = hostOnly(hostRef.current);
      const machineId = linkedMachineIdRef.current;
      if (!host || !machineId) return null;
      const url =
        `http://${host}:${EDGE_PORT}/events?after=${after}` +
        `&machine_id=${encodeURIComponent(machineId)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        const body = await res.json();
        if (!body || typeof body.stream_id !== 'string' || !Array.isArray(body.events)) return null;
        return body as {
          stream_id: string;
          events: Array<{ event_id?: number; operational_class?: string }>;
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const pollOnce = async () => {
      if (stopped || pollInFlightRef.current || demoRef.current) return;
      if (edgeIdentityRef.current !== 'matched') return;
      pollInFlightRef.current = true;
      try {
        const after = lastStreamIdRef.current == null ? 0 : lastEventIdRef.current;
        const payload = await fetchEvents(after);
        if (stopped || !payload || demoRef.current || edgeIdentityRef.current !== 'matched') return;

        const streamId = payload.stream_id;
        const remembered = lastStreamIdRef.current;
        if (remembered == null || streamId === remembered) {
          lastStreamIdRef.current = streamId;
          applyEventList(payload.events);
          return;
        }

        lastStreamIdRef.current = streamId;
        lastEventIdRef.current = 0;
        const refetch = await fetchEvents(0);
        if (stopped || !refetch || demoRef.current || edgeIdentityRef.current !== 'matched') return;
        if (refetch.stream_id === streamId) {
          applyEventList(refetch.events);
          return;
        }
        lastStreamIdRef.current = refetch.stream_id;
        lastEventIdRef.current = 0;
      } finally {
        pollInFlightRef.current = false;
      }
    };

    void pollOnce();
    const timer = setInterval(() => {
      void pollOnce();
    }, 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [applyEventList, edgeIdentity, isDemoMode]);

  const sendCommand = useCallback(async (command: 'START' | 'PAUSE' | 'STOP'): Promise<CommandResult> => {
    const expected = command === 'START' ? 'RUNNING' : command === 'PAUSE' ? 'PAUSED' : 'STOPPED';
    if (demoRef.current) {
      setMachineState(expected);
      return { ok: true };
    }
    if (edgeIdentityRef.current !== 'matched') {
      return { ok: false, message: 'Edge not verified' };
    }
    const machineId = linkedMachineIdRef.current.trim();
    const host = hostOnly(hostRef.current);
    if (!machineId || !host) {
      return { ok: false, message: 'Edge not verified' };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), COMMAND_TIMEOUT_MS);
    try {
      const res = await fetch(`http://${host}:${EDGE_PORT}/machine/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: machineId, command }),
        signal: controller.signal,
      });
      let body: { machine_id?: string; status?: string; result_state?: string } | null = null;
      try {
        body = await res.json();
      } catch {
        return { ok: false, message: 'Machine did not confirm' };
      }
      if (res.status === 403) return { ok: false, message: 'Wrong machine' };
      if (typeof body?.machine_id === 'string' && body.machine_id !== machineId) {
        return { ok: false, message: 'Wrong machine' };
      }
      if (body?.status === 'timeout') return { ok: false, message: 'Command timed out' };
      if (body?.status === 'rejected') return { ok: false, message: 'Command rejected' };
      if (
        res.ok &&
        body?.status === 'acknowledged' &&
        body.result_state === expected &&
        body.machine_id === machineId
      ) {
        setMachineState(expected);
        return { ok: true };
      }
      return { ok: false, message: 'Machine did not confirm' };
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'AbortError') return { ok: false, message: 'Command timed out' };
      return { ok: false, message: 'Edge not verified' };
    } finally {
      clearTimeout(timeoutId);
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
      edgeIdentity,
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
      edgeIdentity,
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
