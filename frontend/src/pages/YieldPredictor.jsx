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
import DashboardPageHeader from '../components/dashboard/DashboardPageHeader';

/* ── mock data ─────────────────────────────── */
const QUALITY_TREND = [
  { batch: 'B-01', grade: 72 },
  { batch: 'B-02', grade: 75 },
  { batch: 'B-03', grade: 71 },
  { batch: 'B-04', grade: 78 },
  { batch: 'B-05', grade: 80 },
  { batch: 'B-06', grade: 82 },
  { batch: 'B-07', grade: 79 },
  { batch: 'B-08', grade: 85 },
  { batch: 'B-09', grade: 88 },
  { batch: 'B-10', grade: 87 },
];

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

const TREND_DATA = linearRegression(QUALITY_TREND);

/* ── component ─────────────────────────────── */
export default function YieldPredictor() {
  const [dryingHours, setDryingHours] = useState(48);

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
      <DashboardPageHeader />

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
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#A1887F]">Export Grade % — Last 10 Batches</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
