import { useState } from 'react';
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
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3,
  TrendingUp,
  Package,
  Sparkles,
} from 'lucide-react';

const QUICK_STATS = [
  { label: 'Active Batches', value: '12', trend: '+3 this week', icon: Package, color: 'from-[#6D4C41] to-[#8D6E63]' },
  { label: 'Avg. Grade Score', value: '87%', trend: '+2.4%', icon: TrendingUp, color: 'from-[#4CAF50] to-[#66BB6A]' },
  { label: 'AI Predictions', value: '248', trend: 'Today', icon: Sparkles, color: 'from-[#D97706] to-[#FFB74D]' },
];

const VARIETY_DATA = [
  { name: 'Trinitario', value: 45, color: '#8D6E63' },
  { name: 'Criollo', value: 30, color: '#FFB74D' },
  { name: 'Forastero', value: 25, color: '#6D4C41' },
];

const THROUGHPUT_DATA = {
  daily: [
    { time: 'Mon', throughput: 85 },
    { time: 'Tue', throughput: 92 },
    { time: 'Wed', throughput: 88 },
    { time: 'Thu', throughput: 110 },
    { time: 'Fri', throughput: 105 },
    { time: 'Sat', throughput: 95 },
  ],
  weekly: [
    { time: 'Week 1', throughput: 450 },
    { time: 'Week 2', throughput: 480 },
    { time: 'Week 3', throughput: 420 },
    { time: 'Week 4', throughput: 510 },
  ],
  monthly: [
    { time: 'Jan', throughput: 1850 },
    { time: 'Feb', throughput: 1920 },
    { time: 'Mar', throughput: 1880 },
    { time: 'Apr', throughput: 2100 },
    { time: 'May', throughput: 2050 },
    { time: 'Jun', throughput: 1950 },
    { time: 'Jul', throughput: 2000 },
    { time: 'Aug', throughput: 2150 },
    { time: 'Sep', throughput: 2200 },
    { time: 'Oct', throughput: 2100 },
    { time: 'Nov', throughput: 2250 },
    { time: 'Dec', throughput: 2400 },
  ],
  yearly: [
    { time: '2024', throughput: 22000 },
    { time: '2025', throughput: 24500 },
    { time: '2026', throughput: 26800 },
    { time: '2027', throughput: 29100 },
    { time: '2028', throughput: 31000 },
  ]
};

const ANOMALIES_DATA = [
  { id: 'BN-9021', date: 'Oct 14', rejected: '22%', issue: 'High Mold Count' },
  { id: 'BN-9014', date: 'Oct 10', rejected: '31%', issue: 'Under-Fermented' },
  { id: 'BN-8992', date: 'Oct 02', rejected: '19%', issue: 'Broken Beans' },
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
  const [throughputTab, setThroughputTab] = useState('daily');

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

      {/* Data Visualization Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Variety Distribution */}
        <div className="dashboard-fade-in dashboard-stagger-4 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#A1887F]">Variety Mix</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={VARIETY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {VARIETY_DATA.map((entry, index) => (
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
            {VARIETY_DATA.map(item => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs font-semibold text-[#8D6E63]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>

        {/* Throughput Area Chart */}
        <div className="dashboard-fade-in dashboard-stagger-5 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1887F]">Throughput Focus (Beans)</h2>
            <div className="flex gap-1 rounded-lg bg-[#FAF0E6]/50 p-1">
              {['daily', 'weekly', 'monthly', 'yearly'].map(tab => (
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
              <AreaChart data={THROUGHPUT_DATA[throughputTab]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB74D" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FFB74D" stopOpacity={0}/>
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

      {/* Anomalies Table */}
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
               {ANOMALIES_DATA.map((row, i) => (
                 <tr key={i} className="hover:bg-gray-50/50">
                   <td className="px-4 py-3 font-medium text-[#3E2723]">{row.id}</td>
                   <td className="px-4 py-3">{row.date}</td>
                   <td className="px-4 py-3 font-semibold text-[#D84315]">{row.rejected}</td>
                   <td className="px-4 py-3 text-[#A1887F]">{row.issue}</td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}
