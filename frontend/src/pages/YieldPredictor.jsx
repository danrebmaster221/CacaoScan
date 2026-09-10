import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Timer,
  TrendingUp,
  ShieldCheck,
  ArrowUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

function linearRegression(data) {
  const n = data.length;
  if (n < 2) return data.map((d) => ({ ...d, trend: d.grade }));
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  data.forEach((d, i) => {
    sumX += i;
    sumY += d.grade;
    sumXY += i * d.grade;
    sumXX += i * i;
  });
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return data.map((d, i) => ({ ...d, trend: Math.round(intercept + slope * i) }));
}

export default function YieldPredictor() {
  const { user, userRole } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trendTab, setTrendTab] = useState('daily');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setBatches([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let query = supabase
          .from('batches')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(100);

        if (userRole !== 'admin') query = query.eq('user_id', user.id);

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setBatches(data || []);
      } catch (err) {
        console.warn('YieldPredictor load failed:', err.message);
        if (!cancelled) setBatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, userRole]);

  const qualityTrend = useMemo(() => {
    const withBeans = batches.filter((b) => (b.total_beans || 0) > 0);
    const points = withBeans.map((b, i) => {
      const grade = Math.round(((b.export_grade_count || 0) / b.total_beans) * 100);
      const date = new Date(b.completed_at || b.created_at);
      return {
        batch: b.batch_name || `B${i + 1}`,
        grade,
        date,
      };
    });

    const daily = points.slice(-14).map((p) => ({
      batch: p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      grade: p.grade,
    }));

    const weeklyBuckets = {};
    points.forEach((p) => {
      const week = `W${Math.ceil(p.date.getDate() / 7)} ${p.date.toLocaleDateString('en-US', { month: 'short' })}`;
      if (!weeklyBuckets[week]) weeklyBuckets[week] = [];
      weeklyBuckets[week].push(p.grade);
    });
    const weekly = Object.entries(weeklyBuckets).map(([batch, grades]) => ({
      batch,
      grade: Math.round(grades.reduce((a, b) => a + b, 0) / grades.length),
    }));

    const monthlyBuckets = {};
    points.forEach((p) => {
      const month = p.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!monthlyBuckets[month]) monthlyBuckets[month] = [];
      monthlyBuckets[month].push(p.grade);
    });
    const monthly = Object.entries(monthlyBuckets).map(([batch, grades]) => ({
      batch,
      grade: Math.round(grades.reduce((a, b) => a + b, 0) / grades.length),
    }));

    const yearlyBuckets = {};
    points.forEach((p) => {
      const year = String(p.date.getFullYear());
      if (!yearlyBuckets[year]) yearlyBuckets[year] = [];
      yearlyBuckets[year].push(p.grade);
    });
    const yearly = Object.entries(yearlyBuckets).map(([batch, grades]) => ({
      batch,
      grade: Math.round(grades.reduce((a, b) => a + b, 0) / grades.length),
    }));

    return { daily, weekly, monthly, yearly };
  }, [batches]);

  const chartData = qualityTrend[trendTab] || [];
  const latestGrade = chartData.length ? chartData[chartData.length - 1].grade : null;
  const predictedLabel = latestGrade == null
    ? 'Insufficient data'
    : latestGrade >= 80
    ? 'Export A'
    : latestGrade >= 60
    ? 'Export B'
    : 'Standard';

  const totalBeans = batches.reduce((s, b) => s + (b.total_beans || 0), 0);
  const exportBeans = batches.reduce((s, b) => s + (b.export_grade_count || 0), 0);
  const exportRate = totalBeans > 0 ? Math.round((exportBeans / totalBeans) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="dashboard-fade-in dashboard-stagger-1 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <Timer className="h-4 w-4" /> Batches Recorded
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">{loading ? '—' : batches.length}</p>
          <p className="mt-1.5 text-xs text-[#A1887F]">{totalBeans} beans classified</p>
        </div>

        <div className="dashboard-fade-in dashboard-stagger-2 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <ShieldCheck className="h-4 w-4" /> Latest Grade Trend
          </div>
          <p className="mt-3 text-lg font-bold text-[#3E2723]">Based on recorded batches</p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
            <ArrowUp className="h-3.5 w-3.5" /> {predictedLabel}
          </div>
          <p className="mt-2 text-xs text-[#A1887F]">
            {latestGrade == null ? 'Need batch history to forecast' : `${latestGrade}% export rate on latest point`}
          </p>
        </div>

        <div className="dashboard-fade-in dashboard-stagger-3 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <TrendingUp className="h-4 w-4" /> Export Rate
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">{loading ? '—' : `${exportRate}%`}</p>
          <p className="mt-1.5 text-xs text-[#A1887F]">
            Across all recorded batches
          </p>
        </div>
      </div>

      <div className="dashboard-fade-in dashboard-stagger-4 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1887F]">Export Grade % Trend</h2>
          <div className="flex gap-1 rounded-lg bg-[#FAF0E6]/50 p-1">
            {['daily', 'weekly', 'monthly', 'yearly'].map((tab) => (
              <button
                key={tab}
                onClick={() => setTrendTab(tab)}
                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all ${
                  trendTab === tab
                    ? 'bg-white text-[#3E2723] shadow-sm'
                    : 'text-[#A1887F] hover:text-[#6D4C41]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-[#BCAAA4]">
            No batch trend data yet.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={linearRegression(chartData)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFD6" />
                <XAxis dataKey="batch" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A1887F' }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A1887F' }} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E8DFD6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <ReferenceLine y={80} stroke="#4CAF50" strokeDasharray="6 4" label={{ value: 'Export A Threshold', fill: '#4CAF50', fontSize: 11, position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="grade" stroke="#6D4C41" strokeWidth={2.5} dot={{ r: 4, fill: '#6D4C41' }} activeDot={{ r: 6 }} name="Grade %" />
                <Line type="monotone" dataKey="trend" stroke="#FFB74D" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Trendline" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
