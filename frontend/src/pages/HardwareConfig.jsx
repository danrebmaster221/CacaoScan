import { useState } from 'react';
import {
  Wifi,
  Activity,
  Camera,
  Cpu,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

/* ── mock data ─────────────────────────────── */
const MACHINES = [
  { id: 'MACHINE-A1', ip: 'X-101', status: 'online', rssi: -42, firmware: 'v2.4.1', lastPing: '120ms', uptime: '14d 6h' },
  { id: 'MACHINE-B2', ip: 'X-102', status: 'online', rssi: -58, firmware: 'v2.4.1', lastPing: '95ms', uptime: '7d 11h' },
  { id: 'MACHINE-C3', ip: 'X-103', status: 'offline', rssi: 0, firmware: 'v2.3.8', lastPing: '—', uptime: '—' },
];

const CAMERAS = [
  { id: 'CAM-01', resolution: '1920×1080', fps: 30, status: 'active', model: 'OV5640' },
];

function rssiToQuality(rssi) {
  if (rssi === 0) return { label: 'N/A', color: 'text-gray-400' };
  if (rssi >= -50) return { label: 'Excellent', color: 'text-green-600' };
  if (rssi >= -60) return { label: 'Good', color: 'text-green-500' };
  if (rssi >= -70) return { label: 'Fair', color: 'text-amber-500' };
  return { label: 'Weak', color: 'text-red-500' };
}

/* ── component ─────────────────────────────── */
export default function HardwareConfig() {
  const [actuatorStatus, setActuatorStatus] = useState({});

  function handleActuator(name) {
    setActuatorStatus((prev) => ({ ...prev, [name]: 'pulsed' }));
    setTimeout(() => setActuatorStatus((prev) => ({ ...prev, [name]: 'done' })), 1500);
  }

  return (
    <div className="space-y-6">

      {/* Top Cards — Network Telemetry */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Cloud RTT */}
        <div className="dashboard-fade-in dashboard-stagger-1 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <Activity className="h-4 w-4" /> Data Sync Speed
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">108ms</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-green-600">Healthy</span>
          </div>
        </div>

        {/* Active Nodes */}
        <div className="dashboard-fade-in dashboard-stagger-2 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <Cpu className="h-4 w-4" /> Active Scanners
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">
            {MACHINES.filter((n) => n.status === 'online').length}/{MACHINES.length}
          </p>
          <p className="mt-1 text-xs text-[#A1887F]">Scanners online</p>
        </div>

        {/* Camera Status */}
        <div className="dashboard-fade-in dashboard-stagger-3 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <Camera className="h-4 w-4" /> Cameras Active
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">
            {CAMERAS.filter((c) => c.status === 'active').length}/{CAMERAS.length}
          </p>
          <p className="mt-1 text-xs text-[#A1887F]">Streaming feeds</p>
        </div>
      </div>

      {/* ESP32 Node Table */}
      <div className="dashboard-fade-in dashboard-stagger-4 overflow-hidden rounded-xl border border-[#A1887F]/10 bg-white shadow-sm">
        <div className="border-b border-[#A1887F]/10 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1887F]">Connected Machines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF0E6]/40 text-xs uppercase tracking-wider text-[#A1887F]">
              <tr>
                <th className="px-5 py-3 font-semibold">Machine Name</th>
                <th className="px-5 py-3 font-semibold">Device ID</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Wi-Fi Signal</th>
                <th className="px-5 py-3 font-semibold">Sync Speed</th>
                <th className="px-5 py-3 font-semibold">Time Active</th>
                <th className="px-5 py-3 font-semibold">Software Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#A1887F]/10">
              {MACHINES.map((node) => {
                const signal = rssiToQuality(node.rssi);
                return (
                  <tr key={node.id} className="hover:bg-[#FFFBF7]">
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#3E2723]">{node.id}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#8D6E63]">{node.ip}</td>
                    <td className="px-5 py-3.5">
                      {node.status === 'online' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                          <AlertTriangle className="h-3 w-3" /> Offline
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Wifi className={`h-4 w-4 ${signal.color}`} />
                        <span className={`text-xs font-semibold ${signal.color}`}>
                          {node.rssi !== 0 ? `${node.rssi} dBm` : '—'} ({signal.label})
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-[#8D6E63]">{node.lastPing}</td>
                    <td className="px-5 py-3.5 text-xs text-[#8D6E63]">{node.uptime}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-md bg-[#FAF0E6] px-2 py-0.5 text-xs font-mono font-semibold text-[#6D4C41]">{node.firmware}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Camera Cards + Actuators */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Camera Preview Cards */}
        {CAMERAS.map((cam, i) => (
          <div key={cam.id} className={`dashboard-fade-in dashboard-stagger-${i + 5} dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
                <Camera className="h-4 w-4" /> {cam.id}
              </div>
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-semibold text-green-700">{cam.status}</span>
            </div>
            <div className="mt-4 flex h-32 items-center justify-center rounded-lg border border-dashed border-[#A1887F]/20 bg-[#FAF0E6]/30">
              <div className="text-center">
                <Camera className="mx-auto h-8 w-8 text-[#BCAAA4]" />
                <p className="mt-1 text-xs text-[#BCAAA4]">Live preview — {cam.model}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-[#8D6E63]">
              <span className="flex items-center gap-1"><Info className="h-3 w-3" /> {cam.resolution}</span>
              <span>{cam.fps} FPS</span>
              <span>{cam.model}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Remote Actuators */}
      <div className="dashboard-fade-in dashboard-stagger-7 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#A1887F]">Manual Machine Controls</h2>
        <div className="flex flex-wrap gap-3">
          {['Test Conveyor', 'Test Sorter Arm', 'Restart Camera', 'Manual Cloud Sync'].map((action) => (
            <button
              key={action}
              onClick={() => handleActuator(action)}
              disabled={actuatorStatus[action] === 'pulsed'}
              className="inline-flex items-center gap-2 rounded-xl border border-[#A1887F]/20 bg-gradient-to-br from-white to-[#FFFBF7] px-5 py-3 text-sm font-semibold text-[#6D4C41] shadow-sm transition-all hover:border-[#FFB74D]/40 hover:shadow-md disabled:opacity-50"
            >
              {actuatorStatus[action] === 'pulsed' ? (
                <RotateCcw className="h-4 w-4 animate-spin" />
              ) : actuatorStatus[action] === 'done' ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
