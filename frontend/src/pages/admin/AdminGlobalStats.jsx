import { useEffect, useMemo, useState } from 'react';
import { Activity, ServerCrash, Cpu } from 'lucide-react';
import { LineChart, Line, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../services/supabase';

export default function AdminGlobalStats() {
  const [batches, setBatches] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [batchRes, machineRes] = await Promise.all([
          supabase.from('batches').select('total_beans, export_grade_count, created_at, completed_at'),
          supabase.from('machines').select('machine_id, is_online, last_heartbeat'),
        ]);

        if (batchRes.error) throw batchRes.error;
        if (machineRes.error) throw machineRes.error;

        if (!cancelled) {
          setBatches(batchRes.data || []);
          setMachines(machineRes.data || []);
        }
      } catch (err) {
        console.warn('AdminGlobalStats load failed:', err.message);
        if (!cancelled) {
          setBatches([]);
          setMachines([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const totalBeans = batches.reduce((s, b) => s + (b.total_beans || 0), 0);
  const exportBeans = batches.reduce((s, b) => s + (b.export_grade_count || 0), 0);
  const accuracy = totalBeans > 0 ? ((exportBeans / totalBeans) * 100).toFixed(1) : '—';
  const onlineNodes = machines.filter((m) => m.is_online).length;

  const latencyData = useMemo(() => {
    // No dedicated latency telemetry table yet — chart stays empty until real metrics exist.
    return [];
  }, []);

  return (
    <div className="dashboard-fade-in space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3E2723]">Global System Stats</h1>
          <p className="text-sm text-[#A1887F]">Fleet overview and ecosystem operational health.</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            {onlineNodes > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${onlineNodes > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
          </span>
          <span className={`text-sm font-bold ${onlineNodes > 0 ? 'text-green-700' : 'text-gray-500'}`}>
            {loading ? 'Loading…' : onlineNodes > 0 ? 'System Healthy' : 'No active nodes'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="dashboard-card-hover bg-white p-5 rounded-xl border border-[#A1887F]/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Processed</p>
            <p className="text-3xl font-extrabold text-[#3E2723]">
              {loading ? '—' : totalBeans.toLocaleString()}{' '}
              <span className="text-sm text-gray-400 font-normal">beans</span>
            </p>
          </div>
          <div className="bg-[#FAF0E6] p-3 rounded-full">
            <Activity className="w-6 h-6 text-[#6D4C41]" />
          </div>
        </div>

        <div className="dashboard-card-hover bg-white p-5 rounded-xl border border-[#A1887F]/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Global Export Rate</p>
            <p className="text-3xl font-extrabold text-green-600">{loading ? '—' : accuracy === '—' ? '—' : `${accuracy}%`}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-full">
            <ServerCrash className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div className="dashboard-card-hover bg-white p-5 rounded-xl border border-[#A1887F]/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Active Nodes</p>
            <p className="text-3xl font-extrabold text-[#3E2723]">
              {loading ? '—' : onlineNodes}{' '}
              <span className="text-sm text-gray-400 font-normal">/ {machines.length} ESP32</span>
            </p>
          </div>
          <div className="bg-[#FAF0E6] p-3 rounded-full">
            <Cpu className="w-6 h-6 text-[#6D4C41]" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#A1887F]/20 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#A1887F] uppercase tracking-wider mb-6">API Latency Tracker</h3>
        {latencyData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-[#BCAAA4]">
            No latency telemetry recorded yet.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A1887F' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val) => [`${val}ms`, 'Response Time']}
                />
                <Line type="monotone" dataKey="latency" stroke="#D97706" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#D97706' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
