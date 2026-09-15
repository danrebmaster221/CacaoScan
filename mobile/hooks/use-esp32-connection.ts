/**
 * ESP32 connection — re-exports shared context.
 * Prefer importing from `@/context/ESP32Context` for connect helpers.
 */
export {
  ESP32Provider,
  useESP32Connection,
  promptConnectScanner,
  type ClassResult,
  type MachineState,
} from '@/context/ESP32Context';
