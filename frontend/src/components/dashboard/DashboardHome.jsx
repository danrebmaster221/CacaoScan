import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3,
  Archive,
  LineChart,
  BrainCircuit,
  Cpu,
  TrendingUp,
  Package,
  Sparkles,
} from 'lucide-react';

const QUICK_STATS = [
  { label: 'Active Batches', value: '12', trend: '+3 this week', icon: Package, color: 'from-[#6D4C41] to-[#8D6E63]' },
  { label: 'Avg. Grade Score', value: '87%', trend: '+2.4%', icon: TrendingUp, color: 'from-[#4CAF50] to-[#66BB6A]' },
  { label: 'AI Predictions', value: '248', trend: 'Today', icon: Sparkles, color: 'from-[#D97706] to-[#FFB74D]' },
];

const MODULE_CARDS = [
  { name: 'Batch Management', href: '/dashboard/batches', icon: Archive, desc: 'Track fermentation & drying cycles' },
  { name: 'Yield Predictor', href: '/dashboard/predictions', icon: LineChart, desc: 'Forecast harvest outcomes' },
  { name: 'AI Intelligence Hub', href: '/dashboard/mlops', icon: BrainCircuit, desc: 'Model feedback & retraining' },
  { name: 'Hardware Config', href: '/dashboard/hardware', icon: Cpu, desc: 'ESP32 node diagnostics' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardHome() {
  const { user, userRole } = useAuth();
  const displayName = user?.email?.split('@')[0] ?? 'Operator';

  return (
    <div className="space-y-8">
      {/* Welcome hero section. */}
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

      {/* Quick stat cards. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {QUICK_STATS.map((stat, i) => (
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

      {/* Module shortcut cards. */}
      <div className="dashboard-fade-in dashboard-stagger-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#A1887F]">Quick Access</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MODULE_CARDS.map((mod, i) => (
            <Link
              key={mod.name}
              to={mod.href}
              className={`dashboard-fade-in dashboard-stagger-${i + 6} dashboard-card-hover group flex items-center gap-4 rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm transition-all hover:border-[#FFB74D]/40`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FAF0E6] transition-colors duration-300 group-hover:bg-[#FFB74D]/20">
                <mod.icon className="h-6 w-6 text-[#6D4C41] transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#3E2723]">{mod.name}</p>
                <p className="mt-0.5 truncate text-sm text-[#A1887F]">{mod.desc}</p>
              </div>
              <span className="text-[#BCAAA4] opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
