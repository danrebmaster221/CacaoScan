import { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const LABEL_OPTIONS = ['Criollo', 'Forastero', 'Trinitario', 'Needs_Drying', 'Rejected'];

export default function AIIntelligenceHub() {
  const { user, userRole } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(60);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Flagging / MLOps HITL retired in schema v2 — show empty review queue
        if (!cancelled) setItems([]);
      } catch (err) {
        console.warn('AIIntelligenceHub load failed:', err.message);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, userRole]);

  const correctedCount = items.filter((i) => i.corrected).length;
  const readiness = items.length === 0
    ? 0
    : Math.min(100, Math.round((correctedCount / items.length) * 100));

  const gaugeData = useMemo(
    () => [{ name: 'Readiness', value: readiness, fill: readiness > 70 ? '#4CAF50' : readiness > 40 ? '#FFB74D' : '#D84315' }],
    [readiness]
  );

  async function handleCorrection(_id, _label) {
    // No-op: farmer_correction / is_flagged removed in schema v2
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="dashboard-fade-in dashboard-stagger-1 dashboard-card-hover rounded-xl border border-[#A1887F]/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A1887F]">
            <Flag className="h-4 w-4" /> Flagged Errors
          </div>
          <p className="mt-3 text-4xl font-extrabold text-[#3E2723]">{loading ? '—' : items.length}</p>
          <p className="mt-1 text-xs text-[#A1887F]">{correctedCount} corrected by farmer</p>
        </div>

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
                {items.length === 0
                  ? 'No flagged samples yet'
                  : readiness >= 80
                  ? 'Ready for retraining'
                  : readiness >= 50
                  ? 'Making progress'
                  : 'More corrections needed'}
              </p>
            </div>
          </div>
        </div>

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

      <div className="dashboard-fade-in dashboard-stagger-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#A1887F]">Flagged Error Gallery</h2>
        {loading ? (
          <p className="py-16 text-center text-sm text-[#BCAAA4]">Loading flagged classifications…</p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#BCAAA4]">No flagged classifications yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="dashboard-card-hover group overflow-hidden rounded-xl border border-[#A1887F]/10 bg-white shadow-sm"
              >
                <div className="relative flex h-40 items-center justify-center bg-[#FAF0E6]/40">
                  {item.src ? (
                    <img src={item.src} alt={item.id} className="h-40 w-full object-cover" />
                  ) : (
                    <span className="text-4xl">🫘</span>
                  )}
                  <div className="absolute left-2 top-2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    {String(item.id).slice(0, 8)}
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
        )}
      </div>
    </div>
  );
}
