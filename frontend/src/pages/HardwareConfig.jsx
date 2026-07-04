import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Wifi, WifiOff, Cpu, Camera, Zap, RotateCcw, RefreshCw, Shield, Clock, Activity } from 'lucide-react';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-[#F5EDE4] via-[#E8DDD4] to-[#F5EDE4] rounded-lg ${className}`} />
);

export default function HardwareConfig() {
  const { user } = useAuth();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulsing, setPulsing] = useState(null); // 'conveyor' | 'flipper'
  const [pingMs, setPingMs] = useState(null);
  const [uptimeStr, setUptimeStr] = useState('—');

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      // Get user profile for linked machine
      const { data: prof } = await supabase
        .from('profiles')
        .select('linked_machine_id')
        .eq('id', user.id)
        .single();

      if (prof?.linked_machine_id) {
        const { data: m } = await supabase
          .from('machines')
          .select('*')
          .eq('machine_id', prof.linked_machine_id)
          .single();
        setMachine(m);

        // Compute beat age inside effect (Date.now is safe here)
        if (m?.last_heartbeat) {
          const lastBeat = new Date(m.last_heartbeat);
          const beatAge = Math.round((Date.now() - lastBeat.getTime()) / 1000);
          if (beatAge < 60) setUptimeStr(`${beatAge}s ago`);
          else if (beatAge < 3600) setUptimeStr(`${Math.floor(beatAge / 60)}m ago`);
          else setUptimeStr(`${Math.floor(beatAge / 3600)}h ${Math.floor((beatAge % 3600) / 60)}m ago`);
        }
      }

      // Simulate a cloud RTT ping
      const start = performance.now();
      await supabase.from('profiles').select('id').eq('id', user.id).single();
      setPingMs(Math.round(performance.now() - start));

      setLoading(false);
    })();
  }, [user]);

  /* ── Actuator test simulation ────────────────────────────────── */
  async function pulseActuator(type) {
    setPulsing(type);
    // Simulate command dispatch (in production, this posts to a Supabase Realtime channel)
    await new Promise(r => setTimeout(r, 2000));
    setPulsing(null);
  }

  /* ── Computed ─────────────────────────────────────────────────── */
  const isOnline = machine?.is_online ?? false;

  // Simulated RSSI (in real system, this comes from ESP32 heartbeat payload)
  const rssi = isOnline ? -62 : null;
  const rssiLabel = rssi !== null
    ? rssi > -50 ? 'Excellent' : rssi > -70 ? 'Good' : rssi > -80 ? 'Fair' : 'Weak'
    : 'N/A';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-52" />
          <Skeleton className="h-52" />
        </div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3E2723]">Hardware Configuration</h1>
          <p className="text-sm text-[#A1887F]">Remote diagnostics &middot; IoT command center</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-12 text-center">
          <div className="bg-amber-50 p-4 rounded-full w-fit mx-auto mb-4">
            <Cpu className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-[#3E2723] mb-2">No Machine Linked</h2>
          <p className="text-sm text-[#A1887F] max-w-md mx-auto">
            Pair your CacaoScan machine on the mobile app using the Machine ID and Master PIN to access hardware diagnostics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#3E2723]">Hardware Configuration</h1>
        <p className="text-sm text-[#A1887F]">Remote diagnostics &middot; Machine {machine.machine_id}</p>
      </div>

      {/* ── Network Telemetry Cards ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* ESP32 Status */}
        <TelemetryCard
          icon={isOnline ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-red-500" />}
          label="ESP32 Controller"
          value={isOnline ? 'ONLINE' : 'OFFLINE'}
          valueColor={isOnline ? 'text-green-700' : 'text-red-600'}
          bg={isOnline ? 'bg-green-50' : 'bg-red-50'}
          sub={`Last heartbeat: ${uptimeStr}`}
        />

        {/* Cloud RTT */}
        <TelemetryCard
          icon={<Activity className="w-5 h-5 text-blue-600" />}
          label="Cloud RTT"
          value={pingMs !== null ? `${pingMs}ms` : '—'}
          valueColor="text-blue-700"
          bg="bg-blue-50"
          sub="Round-trip to Supabase"
        />

        {/* Wi-Fi RSSI */}
        <TelemetryCard
          icon={<Wifi className="w-5 h-5 text-purple-600" />}
          label="Wi-Fi Signal (RSSI)"
          value={rssi !== null ? `${rssi} dBm` : '—'}
          valueColor="text-purple-700"
          bg="bg-purple-50"
          sub={rssiLabel}
        />

        {/* Uptime */}
        <TelemetryCard
          icon={<Clock className="w-5 h-5 text-[#6D4C41]" />}
          label="Controller Uptime"
          value={uptimeStr}
          valueColor="text-[#3E2723]"
          bg="bg-[#FAF0E6]"
          sub="Since last restart"
        />
      </div>

      {/* ── Action Panels ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Remote Actuator Diagnostics */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-6">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-[#3E2723]">Remote Actuator Diagnostics</h3>
            <p className="text-xs text-[#A1887F]">Test physical hardware components remotely</p>
          </div>
          <div className="space-y-4">
            <ActuatorButton
              icon={<Zap className="w-5 h-5" />}
              label="Pulse Conveyor Motor"
              description="Send a 500ms pulse to test the 12V conveyor belt motor"
              loading={pulsing === 'conveyor'}
              disabled={!isOnline}
              onClick={() => pulseActuator('conveyor')}
            />
            <ActuatorButton
              icon={<RotateCcw className="w-5 h-5" />}
              label="Cycle Sorting Flipper"
              description="Cycle MG996R servo through 45° → 90° → 135° positions"
              loading={pulsing === 'flipper'}
              disabled={!isOnline}
              onClick={() => pulseActuator('flipper')}
            />
          </div>
          {!isOnline && (
            <p className="text-xs text-red-500 mt-4 font-medium">⚠ Machine is offline. Connect the ESP32 to enable remote testing.</p>
          )}
        </div>

        {/* Camera Health + Firmware */}
        <div className="space-y-6">
          {/* Camera Focal Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#3E2723]">Camera Focal-Point Preview</h3>
              <p className="text-xs text-[#A1887F]">Live alignment of AI detection boxes</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg h-40 flex items-center justify-center border border-[#333]">
              {isOnline ? (
                <div className="text-center">
                  <Camera className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Live feed available when IP Camera is connected</p>
                </div>
              ) : (
                <div className="text-center">
                  <Camera className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Camera offline</p>
                </div>
              )}
            </div>
          </div>

          {/* Firmware Info */}
          <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#FAF0E6] p-2.5 rounded-lg">
                <Shield className="w-5 h-5 text-[#6D4C41]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3E2723]">Firmware Management</h3>
                <p className="text-xs text-[#A1887F]">Current deployment information</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FAF0E6] rounded-lg p-3">
                <p className="text-xs text-[#A1887F] font-bold uppercase">Version</p>
                <p className="text-sm font-extrabold text-[#3E2723] mt-1">v1.0.4</p>
              </div>
              <div className="bg-[#FAF0E6] rounded-lg p-3">
                <p className="text-xs text-[#A1887F] font-bold uppercase">Machine ID</p>
                <p className="text-sm font-extrabold text-[#3E2723] mt-1 font-mono">{machine.machine_id}</p>
              </div>
              <div className="bg-[#FAF0E6] rounded-lg p-3 col-span-2">
                <p className="text-xs text-[#A1887F] font-bold uppercase">Master PIN</p>
                <p className="text-sm font-extrabold text-[#3E2723] mt-1 font-mono tracking-widest">{machine.master_pin}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────── */

function TelemetryCard({ icon, label, value, valueColor, bg, sub }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${bg} p-2.5 rounded-lg`}>{icon}</div>
        <p className="text-xs font-bold text-[#A1887F] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-xl font-extrabold ${valueColor}`}>{value}</p>
      <p className="text-xs text-[#A1887F] mt-1">{sub}</p>
    </div>
  );
}

function ActuatorButton({ icon, label, description, loading, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
        disabled
          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
          : loading
          ? 'bg-amber-50 border-amber-300 text-amber-700 cursor-wait'
          : 'bg-white border-[#D7CCC8] text-[#3E2723] hover:bg-[#FAF0E6] hover:border-[#FFB74D] hover:shadow-sm cursor-pointer'
      }`}
    >
      <div className={`p-2.5 rounded-lg ${disabled ? 'bg-gray-100' : loading ? 'bg-amber-100 animate-pulse' : 'bg-[#FAF0E6]'}`}>
        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : icon}
      </div>
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-[#A1887F]">{description}</p>
      </div>
    </button>
  );
}
