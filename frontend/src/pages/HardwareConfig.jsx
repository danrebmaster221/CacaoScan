import { useEffect, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

function rssiToQuality(rssi) {
  if (rssi == null || rssi === 0) return { label: 'N/A', color: 'text-gray-400' };
  if (rssi >= -50) return { label: 'Excellent', color: 'text-green-600' };
  if (rssi >= -60) return { label: 'Good', color: 'text-green-500' };
  if (rssi >= -70) return { label: 'Fair', color: 'text-amber-500' };
  return { label: 'Weak', color: 'text-red-500' };
}

function formatHeartbeat(iso) {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function HardwareConfig() {
  const { user } = useAuth();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actuatorStatus, setActuatorStatus] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setMachines([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('machines')
          .select('*')
          .order('machine_id', { ascending: true });

        if (error) throw error;
        if (!cancelled) setMachines(data || []);
      } catch (err) {
        console.warn('HardwareConfig load failed:', err.message);
        if (!cancelled) setMachines([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  const onlineCount = machines.filter((m) => m.is_online).length;

  function handleActuator(name) {
    setActuatorStatus((prev) => ({ ...prev, [name]: 'pulsed' }));
    setTimeout(() => setActuatorStatus((prev) => ({ ...prev, [name]: 'done' })), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="dashboard-fade-in dashboard-stagger-1 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <Activity className="h-4 w-4" /> Fleet Status
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">
            {loading ? '—' : onlineCount > 0 ? 'Online' : 'Idle'}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${onlineCount > 0 ? 'animate-pulse bg-green-500' : 'bg-gray-400'}`} />
            <span className={`text-xs font-semibold ${onlineCount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
              {onlineCount > 0 ? 'Machines reporting' : 'No live heartbeats'}
            </span>
          </div>
        </div>

        <div className="dashboard-fade-in dashboard-stagger-2 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <Cpu className="h-4 w-4" /> Active Scanners
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">
            {loading ? '—' : `${onlineCount}/${machines.length}`}
          </p>
          <p className="mt-1 text-xs text-[#A1887F]">Scanners online</p>
        </div>

        <div className="dashboard-fade-in dashboard-stagger-3 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <Camera className="h-4 w-4" /> Cameras Active
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">
            {loading ? '—' : onlineCount}
          </p>
          <p className="mt-1 text-xs text-[#A1887F]">Derived from online machines</p>
        </div>
      </div>

      <div className="dashboard-fade-in dashboard-stagger-4 overflow-hidden rounded-xl border border-[#A1887F]/10 bg-white shadow-sm">
        <div className="border-b border-[#A1887F]/10 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1887F]">Connected Machines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF0E6]/40 text-xs uppercase tracking-wider text-[#A1887F]">
              <tr>
                <th className="px-5 py-3 font-semibold">Machine Name</th>
                <th className="px-5 py-3 font-semibold">Owner</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Wi-Fi Signal</th>
                <th className="px-5 py-3 font-semibold">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#A1887F]/10">
              {machines.map((node) => {
                const signal = rssiToQuality(null);
                return (
                  <tr key={node.machine_id} className="hover:bg-[#FFFBF7]">
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#3E2723]">{node.machine_id}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#8D6E63]">{node.owner_id?.slice(0, 8) || '—'}</td>
                    <td className="px-5 py-3.5">
                      {node.is_online ? (
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
                        <span className={`text-xs font-semibold ${signal.color}`}>{signal.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#8D6E63]">{formatHeartbeat(node.last_heartbeat)}</td>
                  </tr>
                );
              })}
              {!loading && machines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-[#BCAAA4]">
                    No machines registered yet.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-[#BCAAA4]">
                    Loading machines…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="dashboard-fade-in dashboard-stagger-5 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
              <Camera className="h-4 w-4" /> Vision Preview
            </div>
          </div>
          <div className="mt-4 flex h-32 items-center justify-center rounded-lg border border-dashed border-[#A1887F]/20 bg-[#FAF0E6]/30">
            <div className="text-center">
              <Camera className="mx-auto h-8 w-8 text-[#BCAAA4]" />
              <p className="mt-1 text-xs text-[#BCAAA4]">No live camera feed connected</p>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-[#8D6E63]">
            <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Waiting for device telemetry</span>
          </div>
        </div>
      </div>

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
