import { useState } from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts';
import {
  Flag,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';

/* ── mock data ─────────────────────────────── */
const FLAGGED_ITEMS = Array.from({ length: 9 }, (_, i) => ({
  id: `IMG-${4000 + i}`,
  src: `https://images.unsplash.com/photo-${
    ['1606312619070-d48b4c652a52', '1599599810694-b5b37304c041', '1610611424854-5e07b4926176',
     '1606312619070-d48b4c652a52', '1599599810694-b5b37304c041', '1610611424854-5e07b4926176',
     '1606312619070-d48b4c652a52', '1599599810694-b5b37304c041', '1610611424854-5e07b4926176'][i]
  }?w=200&h=200&fit=crop`,
  aiLabel: ['Criollo', 'Forastero', 'Trinitario', 'Criollo', 'Forastero', 'Trinitario', 'Criollo', 'Forastero', 'Trinitario'][i],
  confidence: Math.floor(40 + Math.random() * 45),
  corrected: null,
}));

const LABEL_OPTIONS = ['Criollo', 'Forastero', 'Trinitario', 'Broken', 'Moldy', 'Germinated'];

/* ── component ─────────────────────────────── */
export default function AIIntelligenceHub() {
  const [items, setItems] = useState(FLAGGED_ITEMS);
  const [threshold, setThreshold] = useState(60);

  const correctedCount = items.filter((i) => i.corrected).length;
  const readiness = Math.min(100, Math.round((correctedCount / items.length) * 100));

  const gaugeData = [{ name: 'Readiness', value: readiness, fill: readiness > 70 ? '#4CAF50' : readiness > 40 ? '#FFB74D' : '#D84315' }];

  function handleCorrection(id, label) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, corrected: label } : item)));
  }

  return (
    <div className="space-y-6">

      {/* Top row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Flagged count */}
        <div className="dashboard-fade-in dashboard-stagger-1 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <Flag className="h-4 w-4" /> Flagged Errors
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">{items.length}</p>
          <p className="mt-1 text-xs text-[#A1887F]">{correctedCount} corrected by farmer</p>
        </div>

        {/* Optimization Readiness Gauge */}
        <div className="dashboard-fade-in dashboard-stagger-2 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <CheckCircle2 className="h-4 w-4" /> Optimization Readiness
          </div>
          <div className="flex items-center gap-4">
            <div className="h-28 w-28">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="100%"
                  startAngle={180}
                  endAngle={0}
                  data={gaugeData}
                  barSize={10}
                >
                  <RadialBar background clockWise dataKey="value" cornerRadius={12} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[#3E2723]">{readiness}%</p>
              <p className="text-xs text-[#A1887F]">
                {readiness >= 80 ? 'Ready for retraining' : readiness >= 50 ? 'Making progress' : 'More corrections needed'}
              </p>
            </div>
          </div>
        </div>

        {/* Inference Sensitivity Slider */}
        <div className="dashboard-fade-in dashboard-stagger-3 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <SlidersHorizontal className="h-4 w-4" /> Confidence Threshold
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">{threshold}%</p>
          <input
            type="range"
            min={10}
            max={85}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="mt-3 w-full accent-[#6D4C41]"
          />
          <div className="mt-1 flex justify-between text-[10px] text-[#BCAAA4]">
            <span>Lenient (10%)</span><span>Strict (85%)</span>
          </div>
          <p className="mt-2 text-xs text-[#A1887F]">
            Below {threshold}% confidence → flagged for review
          </p>
        </div>
      </div>

      {/* Flagged Error Gallery */}
      <div className="dashboard-fade-in dashboard-stagger-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#A1887F]">Flagged Error Gallery</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="dashboard-card-hover group overflow-hidden rounded-xl border border-[#A1887F]/10 bg-white shadow-sm"
            >
              <div className="relative">
                <img src={item.src} alt={item.id} className="h-40 w-full object-cover" />
                <div className="absolute left-2 top-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                  {item.id}
                </div>
                {item.confidence < threshold && (
                  <div className="absolute right-2 top-2 rounded-full bg-red-500/90 p-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#6D4C41]">AI: {item.aiLabel}</span>
                  <span className={`font-bold ${item.confidence < threshold ? 'text-red-500' : 'text-green-600'}`}>
                    {item.confidence}%
                  </span>
                </div>
                {/* Correction Dropdown */}
                <div className="relative mt-3">
                  <select
                    value={item.corrected || ''}
                    onChange={(e) => handleCorrection(item.id, e.target.value || null)}
                    className="w-full appearance-none rounded-lg border border-[#A1887F]/20 bg-[#FFFBF7] px-3 py-2 text-xs font-medium text-[#3E2723] outline-none transition-colors focus:border-[#FFB74D] focus:ring-2 focus:ring-[#FFB74D]/20"
                  >
                    <option value="">Select correction…</option>
                    {LABEL_OPTIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1887F]" />
                </div>
                {item.corrected && (
                  <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> Corrected to: {item.corrected}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
