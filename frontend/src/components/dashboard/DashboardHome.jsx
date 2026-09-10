import { useEffect, useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import {
  BarChart3,
  TrendingUp,
  Package,
  Sparkles,
} from 'lucide-react';

const VARIETY_COLORS = {
  Trinitario: '#8D6E63',
  Criollo: '#FFB74D',
  Forastero: '#6D4C41',
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatShortDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardHome() {
  const { user, userRole } = useAuth();
  const displayName = user?.email?.split('@')[0] ?? 'Operator';
  const [throughputTab, setThroughputTab] = useState('daily');
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

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
          .order('created_at', { ascending: false })
          .limit(100);

        if (userRole !== 'admin') {
          query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setBatches(data || []);
      } catch (err) {
        console.warn('DashboardHome load failed:', err.message);
        if (!cancelled) setBatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, userRole]);

  const stats = useMemo(() => {
    const active = batches.filter((b) => b.status === 'active' || b.status === 'paused').length;
    const totalBeans = batches.reduce((sum, b) => sum + (b.total_beans || 0), 0);
    const exportBeans = batches.reduce((sum, b) => sum + (b.export_grade_count || 0), 0);
    const avgGrade = totalBeans > 0 ? Math.round((exportBeans / totalBeans) * 100) : 0;
    return [
      { label: 'Active Batches', value: String(active), trend: loading ? 'Loading…' : `${batches.length} total`, icon: Package, color: 'from-[#6D4C41] to-[#8D6E63]' },
      { label: 'Avg. Export Rate', value: `${avgGrade}%`, trend: totalBeans > 0 ? `${totalBeans} beans` : 'No data yet', icon: TrendingUp, color: 'from-[#4CAF50] to-[#66BB6A]' },
      { label: 'Beans Classified', value: String(totalBeans), trend: 'From recorded batches', icon: Sparkles, color: 'from-[#D97706] to-[#FFB74D]' },
    ];
  }, [batches, loading]);

  const varietyData = useMemo(() => {
    const totals = {
      Criollo: batches.reduce((s, b) => s + (b.criollo_count || 0), 0),
      Forastero: batches.reduce((s, b) => s + (b.forastero_count || 0), 0),
      Trinitario: batches.reduce((s, b) => s + (b.trinitario_count || 0), 0),
    };
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value, color: VARIETY_COLORS[name] }))
      .filter((d) => d.value > 0);
  }, [batches]);

  const throughputData = useMemo(() => {
    const completed = batches.filter((b) => b.completed_at || b.created_at);
    const byDay = {};
    completed.forEach((b) => {
      const d = new Date(b.completed_at || b.created_at);
      const key = d.toLocaleDateString('en-US', { weekday: 'short' });
      byDay[key] = (byDay[key] || 0) + (b.total_beans || 0);
    });
    const daily = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((time) => ({
      time,
      throughput: byDay[time] || 0,
    }));

    const byMonth = {};
    completed.forEach((b) => {
      const d = new Date(b.completed_at || b.created_at);
      const key = d.toLocaleDateString('en-US', { month: 'short' });
      byMonth[key] = (byMonth[key] || 0) + (b.total_beans || 0);
    });
    const monthly = Object.entries(byMonth).map(([time, throughput]) => ({ time, throughput }));

    return {
      daily,
      weekly: daily,
      monthly: monthly.length ? monthly : [{ time: '—', throughput: 0 }],
      yearly: [{ time: String(new Date().getFullYear()), throughput: completed.reduce((s, b) => s + (b.total_beans || 0), 0) }],
    };
  }, [batches]);

  const anomalies = useMemo(() => {
    return batches
      .filter((b) => (b.total_beans || 0) > 0 && ((b.rejected_count || 0) / b.total_beans) >= 0.15)
      .slice(0, 10)
      .map((b) => {
        const rate = Math.round(((b.rejected_count || 0) / b.total_beans) * 100);
        return {
          id: b.batch_name || b.id?.slice(0, 8)?.toUpperCase(),
          date: formatShortDate(b.completed_at || b.created_at),
          rejected: `${rate}%`,
          issue: (b.needs_drying_count || 0) > (b.rejected_count || 0) ? 'High Needs Drying' : 'Elevated Rejection',
        };
      });
  }, [batches]);

  return (
    <div className="space-y-8">
      <div className="dashboard-fade-in dashboard-stagger-1">
        <div className="relative overflow-hidden rounded-2xl border border-[#A1887F]/15 bg-gradient-to-br from-white via-[#FFFBF7] to-[#FAF0E6] p-8 shadow-[0_4px_24px_rgba(62,39,35,0.05)]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#FFB74D]/8 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[#6D4C41]/5 blur-xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#A1887F]">{getGreeting()},</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#3E2723] sm:text-3xl">
                {displayName}
              </h1>
              <p className="mt-2 max-w-md text-sm text-[#8D6E63]">
                Welcome to CacaoScan Central — your {userRole === 'admin' ? 'administrative' : 'farm operations'} command center.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start rounded-full border border-[#A1887F]/20 bg-white/70 px-4 py-2 text-xs font-semibold text-[#6D4C41] backdrop-blur-sm sm:self-center">
              <BarChart3 className="h-4 w-4 text-[#FFB74D]" />
              Analytics Board
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`dashboard-fade-in dashboard-stagger-${i + 2} dashboard-card-hover group rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#A1887F]">{stat.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-[#3E2723]">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-[#4CAF50]">{stat.trend}</p>
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${stat.color} p-3 shadow-md transition-transform duration-300 group-hover:scale-110`}>
                <stat.icon className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="dashboard-fade-in dashboard-stagger-4 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#A1887F]">Variety Mix</h2>
          {varietyData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-[#BCAAA4]">No variety data yet</div>
          ) : (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={varietyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {varietyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E8DFD6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#3E2723', fontWeight: '600' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex justify-center gap-4">
                {varietyData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs font-semibold text-[#8D6E63]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="dashboard-fade-in dashboard-stagger-5 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1887F]">Throughput Focus (Beans)</h2>
            <div className="flex gap-1 rounded-lg bg-[#FAF0E6]/50 p-1">
              {['daily', 'weekly', 'monthly', 'yearly'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setThroughputTab(tab)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all ${
                    throughputTab === tab
                      ? 'bg-white text-[#3E2723] shadow-sm'
                      : 'text-[#A1887F] hover:text-[#6D4C41]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughputData[throughputTab]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB74D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FFB74D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFD6" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A1887F' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A1887F' }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E8DFD6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="throughput" stroke="#FFB74D" strokeWidth={3} fillOpacity={1} fill="url(#colorThroughput)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="dashboard-fade-in dashboard-stagger-6 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#A1887F]">Recent Quality Anomalies</h2>
        <div className="overflow-x-auto rounded-lg border border-[#A1887F]/10">
          <table className="w-full text-left text-sm text-[#8D6E63]">
            <thead className="bg-[#FAF0E6]/50 text-xs uppercase text-[#A1887F]">
              <tr>
                <th className="px-4 py-3 font-semibold">Batch No.</th>
                <th className="px-4 py-3 font-semibold">Date processed</th>
                <th className="px-4 py-3 font-semibold">Rejected Rate</th>
                <th className="px-4 py-3 font-semibold">Primary Issue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#A1887F]/10">
              {anomalies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[#BCAAA4]">
                    No quality anomalies recorded yet.
                  </td>
                </tr>
              ) : (
                anomalies.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-[#3E2723]">{row.id}</td>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3 font-semibold text-[#D84315]">{row.rejected}</td>
                    <td className="px-4 py-3 text-[#A1887F]">{row.issue}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
