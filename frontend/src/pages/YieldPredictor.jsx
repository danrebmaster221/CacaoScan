import { useState } from 'react';
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
  SlidersHorizontal,
  ShieldCheck,
  ArrowUp,
} from 'lucide-react';

/* ── mock data ─────────────────────────────── */
const QUALITY_TREND = {
  daily: [
    { batch: 'Mon', grade: 72 },
    { batch: 'Tue', grade: 75 },
    { batch: 'Wed', grade: 71 },
    { batch: 'Thu', grade: 78 },
    { batch: 'Fri', grade: 80 },
    { batch: 'Sat', grade: 82 },
  ],
  weekly: [
    { batch: 'Week 1', grade: 79 },
    { batch: 'Week 2', grade: 85 },
    { batch: 'Week 3', grade: 88 },
    { batch: 'Week 4', grade: 87 },
  ],
  monthly: [
    { batch: 'Jan', grade: 72 },
    { batch: 'Feb', grade: 78 },
    { batch: 'Mar', grade: 75 },
    { batch: 'Apr', grade: 81 },
    { batch: 'May', grade: 84 },
    { batch: 'Jun', grade: 87 },
  ],
  yearly: [
    { batch: '2024', grade: 70 },
    { batch: '2025', grade: 74 },
    { batch: '2026', grade: 79 },
    { batch: '2027', grade: 84 },
    { batch: '2028', grade: 89 },
  ]
};

// Simple linear regression for trendline
function linearRegression(data) {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  data.forEach((d, i) => {
    sumX += i;
    sumY += d.grade;
    sumXY += i * d.grade;
    sumXX += i * i;
  });
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return data.map((d, i) => ({ ...d, trend: Math.round(intercept + slope * i) }));
}



/* ── component ─────────────────────────────── */
export default function YieldPredictor() {
  const [dryingHours, setDryingHours] = useState(48);
  const [trendTab, setTrendTab] = useState('daily');

  /* very simplified economic estimate */
  const pricePerKg = 4.2;
  const yieldFactor = dryingHours >= 72 ? 0.92 : dryingHours >= 48 ? 0.85 : 0.7;
  const estimatedRevenue = (500 * yieldFactor * pricePerKg).toFixed(0);
  const exportGrade = dryingHours >= 60 ? 'Export A' : dryingHours >= 40 ? 'Export B' : 'Standard';

  /* depletion countdown (mocked) */
  const daysRemaining = 14;
  const depletionPercent = 38;

  return (
    <div className="space-y-6">

      {/* Top cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Depletion Forecast */}
        <div className="dashboard-fade-in dashboard-stagger-1 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <Timer className="h-4 w-4" /> Time-to-Empty
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">{daysRemaining}d</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#FAF0E6]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#D84315] to-[#FFB74D]" style={{ width: `${depletionPercent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-[#A1887F]">{depletionPercent}% stock depleted</p>
        </div>

        {/* PNS Alignment */}
        <div className="dashboard-fade-in dashboard-stagger-2 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <ShieldCheck className="h-4 w-4" /> PNS Forecast
          </div>
          <p className="mt-3 text-lg font-bold text-[#3E2723]">Next batch predicted grade</p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
            <ArrowUp className="h-3.5 w-3.5" /> Export A
          </div>
          <p className="mt-2 text-xs text-[#A1887F]">Based on 10-batch regression analysis</p>
        </div>

        {/* Revenue Snapshot */}
        <div className="dashboard-fade-in dashboard-stagger-3 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <TrendingUp className="h-4 w-4" /> Revenue Estimate
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">₱{Number(estimatedRevenue).toLocaleString()}</p>
          <p className="mt-1.5 text-xs text-[#A1887F]">
            For 500 kg at {(yieldFactor * 100).toFixed(0)}% yield factor
          </p>
        </div>
      </div>

      {/* Quality Trend Chart */}
      <div className="dashboard-fade-in dashboard-stagger-4 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1887F]">Export Grade % Trend</h2>
          <div className="flex gap-1 rounded-lg bg-[#FAF0E6]/50 p-1">
            {['daily', 'weekly', 'monthly', 'yearly'].map(tab => (
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
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={linearRegression(QUALITY_TREND[trendTab])} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8DFD6" />
              <XAxis dataKey="batch" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A1887F' }} dy={10} />
              <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A1887F' }} />
              <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E8DFD6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <ReferenceLine y={80} stroke="#4CAF50" strokeDasharray="6 4" label={{ value: 'Export A Threshold', fill: '#4CAF50', fontSize: 11, position: 'insideTopRight' }} />
              <Line type="monotone" dataKey="grade" stroke="#6D4C41" strokeWidth={2.5} dot={{ r: 4, fill: '#6D4C41' }} activeDot={{ r: 6 }} name="Grade %" />
              <Line type="monotone" dataKey="trend" stroke="#FFB74D" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Trendline" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* What-If Economic Simulator */}
      <div className="dashboard-fade-in dashboard-stagger-5 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#A1887F]">
          <SlidersHorizontal className="h-4 w-4" /> What-If Economic Simulator
        </div>
        <p className="mt-1 text-xs text-[#BCAAA4]">Adjust drying time to see its impact on revenue and grade.</p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-center">
          {/* Slider */}
          <div className="sm:col-span-1">
            <label className="text-xs font-semibold text-[#6D4C41]">Drying Time: {dryingHours}h</label>
            <input
              type="range"
              min={24}
              max={96}
              step={6}
              value={dryingHours}
              onChange={(e) => setDryingHours(Number(e.target.value))}
              className="mt-2 w-full accent-[#6D4C41]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[#BCAAA4]">
              <span>24h</span><span>96h</span>
            </div>
          </div>

          {/* Results */}
          <div className="flex items-center gap-6 sm:col-span-2">
            <div className="rounded-xl border border-[#A1887F]/10 bg-[#FFFBF7] p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#A1887F]">Estimated Revenue</p>
              <p className="mt-1 text-2xl font-extrabold text-[#3E2723]">₱{Number(estimatedRevenue).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[#A1887F]/10 bg-[#FFFBF7] p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#A1887F]">Predicted Grade</p>
              <p className={`mt-1 text-2xl font-extrabold ${exportGrade === 'Export A' ? 'text-green-600' : exportGrade === 'Export B' ? 'text-amber-600' : 'text-gray-500'}`}>
                {exportGrade}
              </p>
            </div>
            <div className="rounded-xl border border-[#A1887F]/10 bg-[#FFFBF7] p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#A1887F]">Yield Factor</p>
              <p className="mt-1 text-2xl font-extrabold text-[#3E2723]">{(yieldFactor * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
