import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  RadialBarChart, RadialBar
} from 'recharts';
import { Wifi, WifiOff, Cpu, Camera, TrendingUp, AlertTriangle, DollarSign, BarChart3, Leaf } from 'lucide-react';

/* ── colour tokens ─────────────────────────────────────────────── */
const VARIETY_COLORS = ['#FFB74D', '#8D6E63', '#A1887F'];
const QUALITY_COLORS = { export_grade: '#4CAF50', needs_drying: '#FFA726', rejected: '#E53935' };

/* ── helper: simple linear regression ──────────────────────────── */
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  points.forEach(({ x, y }) => { sx += x; sy += y; sxy += x * y; sxx += x * x; });
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

/* ── Skeleton shimmer ──────────────────────────────────────────── */
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-[#F5EDE4] via-[#E8DDD4] to-[#F5EDE4] rounded-lg ${className}`} />
);

export default function DashboardAnalytics() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [machineStatus, setMachineStatus] = useState({ esp32: false, camera: false });

  /* ── fetch batches ───────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setBatches(data);

      // Check machine heartbeat
      const { data: machine } = await supabase
        .from('machines')
        .select('is_online, last_heartbeat')
        .limit(1)
        .maybeSingle();

      if (machine) {
        const lastBeat = machine.last_heartbeat ? new Date(machine.last_heartbeat) : null;
        const isRecent = lastBeat && (Date.now() - lastBeat.getTime()) < 120000;
        setMachineStatus({ esp32: machine.is_online && isRecent, camera: machine.is_online && isRecent });
      }
      setLoading(false);
    })();
  }, [user]);

  /* ── derived stats ───────────────────────────────────────────── */
  const totalBeans = batches.reduce((s, b) => s + (b.total_beans || 0), 0);
  const totalExport = batches.reduce((s, b) => s + (b.export_grade_count || 0), 0);
  const totalDrying = batches.reduce((s, b) => s + (b.needs_drying_count || 0), 0);
  const totalRejected = batches.reduce((s, b) => s + (b.rejected_count || 0), 0);
  const exportRatio = totalBeans > 0 ? ((totalExport / totalBeans) * 100) : 0;

  // Variety distribution
  const criolloTotal = batches.reduce((s, b) => s + (b.criollo_count || 0), 0);
  const forasteroTotal = batches.reduce((s, b) => s + (b.forastero_count || 0), 0);
  const trinitarioTotal = batches.reduce((s, b) => s + (b.trinitario_count || 0), 0);
  const varietyData = [
    { name: 'Criollo', value: criolloTotal },
    { name: 'Forastero', value: forasteroTotal },
    { name: 'Trinitario', value: trinitarioTotal },
  ].filter(d => d.value > 0);

  // Weekly throughput (last 7 days)
  const now = new Date();
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const dayBeans = batches
      .filter(b => b.created_at && b.created_at.slice(0, 10) === dayStr)
      .reduce((s, b) => s + (b.total_beans || 0), 0);
    return { date: dayLabel, beans: dayBeans };
  });

  // Throughput per batch (beans/min)
  const throughputData = batches.slice(0, 15).reverse().map((b, i) => {
    const mins = (b.duration_seconds || 1) / 60;
    return {
      name: b.batch_name || `Batch ${i + 1}`,
      beansPerMin: Math.round((b.total_beans || 0) / (mins || 1)),
    };
  });

  // Revenue projection (PHP 350/kg export grade, ~100 beans = 1kg estimate)
  const exportKg = totalExport / 100;
  const revenueEstimate = Math.round(exportKg * 350);

  // Anomalies (>20% rejected)
  const anomalies = batches.filter(b => {
    const total = b.total_beans || 0;
    return total > 0 && ((b.rejected_count || 0) / total) > 0.20;
  }).slice(0, 5);

  // Quality gauge
  const qualityGauge = [{ name: 'Export', value: Math.round(exportRatio), fill: '#4CAF50' }];

  /* ── Skeleton State ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        {/* Pulse bar skeleton */}
        <Skeleton className="h-14 w-full" />
        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Machine Pulse Bar ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl shadow-sm border border-[#A1887F]/20 px-6 py-3">
        <span className="text-sm font-bold text-[#3E2723] uppercase tracking-wider mr-2">System Pulse</span>
        <StatusBadge label="ESP32 Controller" online={machineStatus.esp32} icon={<Cpu className="w-4 h-4" />} />
        <StatusBadge label="IP Camera" online={machineStatus.camera} icon={<Camera className="w-4 h-4" />} />
      </div>

      {/* ── KPI Scorecards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<BarChart3 />} label="Season Total" value={totalBeans.toLocaleString()} sub="beans sorted" color="text-[#6D4C41]" bg="bg-[#FAF0E6]" />
        <KpiCard icon={<Leaf />} label="Export Quality" value={`${exportRatio.toFixed(1)}%`} sub={`${totalExport.toLocaleString()} beans`} color="text-green-700" bg="bg-green-50" />
        <KpiCard icon={<DollarSign />} label="Revenue Projection" value={`₱${revenueEstimate.toLocaleString()}`} sub="estimated value" color="text-amber-700" bg="bg-amber-50" />
        <KpiCard icon={<AlertTriangle />} label="Anomalies" value={anomalies.length} sub="batches >20% rejected" color="text-red-600" bg="bg-red-50" />
      </div>

      {/* ── Charts Row 1 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Global Quality Score Gauge */}
        <ChartCard title="Global Quality Score" subtitle="Export Grade percentage this season">
          <div className="flex items-center justify-center h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" startAngle={180} endAngle={0} barSize={18} data={qualityGauge}>
                <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-3xl font-extrabold text-[#3E2723]">{exportRatio.toFixed(1)}%</p>
              <p className="text-xs text-[#A1887F] font-medium">Export Grade</p>
            </div>
          </div>
        </ChartCard>

        {/* Variety Distribution Pie */}
        <ChartCard title="Variety Distribution" subtitle="Criollo · Forastero · Trinitario">
          {varietyData.length === 0 ? (
            <EmptyState text="No variety data available yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={varietyData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} strokeWidth={2} stroke="#fff">
                  {varietyData.map((_, i) => <Cell key={i} fill={VARIETY_COLORS[i % VARIETY_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v} beans`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Weekly Throughput */}
        <ChartCard title="Weekly Throughput Trend" subtitle="Beans sorted per day (last 7 days)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD4" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8D6E63' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8D6E63' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D7CCC8' }} />
              <Line type="monotone" dataKey="beans" stroke="#FFB74D" strokeWidth={3} dot={{ fill: '#FF8F00', r: 4 }} activeDot={{ r: 6 }} name="Beans" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Production Throughput */}
        <ChartCard title="Production Throughput" subtitle="Beans per minute across recent batches">
          {throughputData.length === 0 ? (
            <EmptyState text="No batch throughput data yet." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD4" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8D6E63' }} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: '#8D6E63' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D7CCC8' }} />
                <Line type="monotone" dataKey="beansPerMin" stroke="#6D4C41" strokeWidth={2.5} dot={{ fill: '#3E2723', r: 3 }} name="Beans/min" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Anomalies Table ────────────────────────────────────── */}
      <ChartCard title="Recent Anomalies" subtitle="Batches with >20% rejection rate">
        {anomalies.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <div className="bg-green-50 p-3 rounded-full mb-3">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-[#A1887F] font-medium">All batches are within acceptable quality thresholds.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D7CCC8]">
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">Batch</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">Date</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">Rejected</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">Rate</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((b) => {
                  const rate = ((b.rejected_count / (b.total_beans || 1)) * 100).toFixed(1);
                  return (
                    <tr key={b.id} className="border-b border-[#F5EDE4] hover:bg-[#FFF8F0] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#3E2723]">{b.batch_name || 'Unnamed'}</td>
                      <td className="py-3 px-4 text-[#8D6E63]">{b.harvest_date}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-600">{b.rejected_count}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">{rate}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────── */

function StatusBadge({ label, online, icon }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${online ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
      {icon}
      <span>{label}:</span>
      <span className="uppercase tracking-wide">{online ? 'LIVE' : 'OFFLINE'}</span>
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color, bg }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${bg} p-2.5 rounded-lg`}>
          {React.cloneElement(icon, { className: `w-5 h-5 ${color}` })}
        </div>
        <p className="text-xs font-bold text-[#A1887F] uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-xs text-[#A1887F] mt-1">{sub}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-6 relative overflow-hidden">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-[#3E2723]">{title}</h3>
        {subtitle && <p className="text-xs text-[#A1887F] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex items-center justify-center h-48">
      <p className="text-sm text-[#A1887F] font-medium">{text}</p>
    </div>
  );
}
