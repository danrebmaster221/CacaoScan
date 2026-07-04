import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { Timer, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, Zap } from 'lucide-react';

/* ── helpers ───────────────────────────────────────────────────── */
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0 };
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  points.forEach(({ x, y }) => { sx += x; sy += y; sxy += x * y; sxx += x * x; });
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { slope: 0, intercept: sy / n };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-[#F5EDE4] via-[#E8DDD4] to-[#F5EDE4] rounded-lg ${className}`} />
);

/* ── page component ────────────────────────────────────────────── */
export default function YieldPredictor() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dryingSlider, setDryingSlider] = useState(50); // 0–100 scale

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('batches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (data) setBatches(data);
      setLoading(false);
    })();
  }, [user]);

  /* ── derived ─────────────────────────────────────────────────── */
  const recent = batches.slice(-10);

  // Quality trend data
  const qualityTrend = useMemo(() => {
    return recent.map((b, i) => {
      const total = b.total_beans || 1;
      const exportPct = ((b.export_grade_count || 0) / total) * 100;
      return { name: b.batch_name || `Batch ${i + 1}`, exportPct: Math.round(exportPct * 10) / 10, index: i };
    });
  }, [recent]);

  // Linear regression for trend line
  const regression = useMemo(() => {
    if (qualityTrend.length < 2) return null;
    const points = qualityTrend.map((d, i) => ({ x: i, y: d.exportPct }));
    const { slope, intercept } = linearRegression(points);
    return { slope, intercept };
  }, [qualityTrend]);

  // Trend line points
  const trendLineData = useMemo(() => {
    if (!regression) return qualityTrend;
    return qualityTrend.map((d, i) => ({
      ...d,
      trend: Math.round((regression.intercept + regression.slope * i) * 10) / 10,
    }));
  }, [qualityTrend, regression]);

  // Next batch prediction
  const nextPrediction = regression
    ? Math.max(0, Math.min(100, Math.round((regression.intercept + regression.slope * qualityTrend.length) * 10) / 10))
    : null;
  const nextGrade = nextPrediction >= 80 ? 'A' : nextPrediction >= 50 ? 'B' : 'C';
  const trendDirection = regression ? (regression.slope >= 0 ? 'up' : 'down') : 'flat';

  // Depletion forecast (hopper assumed 50kg = ~5000 beans)
  const HOPPER_CAPACITY = 5000;
  const lastBatch = batches.length > 0 ? batches[batches.length - 1] : null;
  const lastSpeed = lastBatch && lastBatch.duration_seconds > 0
    ? (lastBatch.total_beans || 0) / (lastBatch.duration_seconds / 60)
    : 0;
  const timeToEmpty = lastSpeed > 0 ? Math.round(HOPPER_CAPACITY / lastSpeed) : null;

  // What-If economic calculation
  // Base: current rejected rate → if drying improved, fewer rejected
  const totalBeans = batches.reduce((s, b) => s + (b.total_beans || 0), 0);
  const totalExport = batches.reduce((s, b) => s + (b.export_grade_count || 0), 0);
  const totalRejected = batches.reduce((s, b) => s + (b.rejected_count || 0), 0);
  const baseExportRate = totalBeans > 0 ? totalExport / totalBeans : 0;
  const baseRejectedRate = totalBeans > 0 ? totalRejected / totalBeans : 0;

  // Improved drying shifts rejected → export grade
  const improvement = (dryingSlider / 100) * baseRejectedRate;
  const newExportRate = Math.min(1, baseExportRate + improvement);
  const newExportKg = (totalBeans * newExportRate) / 100;
  const baseExportKg = (totalBeans * baseExportRate) / 100;
  const PRICE_PER_KG = 350; // PHP per kg
  const baseRevenue = Math.round(baseExportKg * PRICE_PER_KG);
  const newRevenue = Math.round(newExportKg * PRICE_PER_KG);
  const revenueDiff = newRevenue - baseRevenue;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#3E2723]">Yield Predictor</h1>
        <p className="text-sm text-[#A1887F]">Machine Learning decision support &middot; Linear Regression engine</p>
      </div>

      {/* ── Prediction Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Depletion Forecast */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-50 p-2.5 rounded-lg"><Timer className="w-5 h-5 text-blue-600" /></div>
            <p className="text-xs font-bold text-[#A1887F] uppercase tracking-wider">Depletion Forecast</p>
          </div>
          {timeToEmpty !== null ? (
            <>
              <p className="text-3xl font-extrabold text-[#3E2723]">{timeToEmpty} min</p>
              <p className="text-xs text-[#A1887F] mt-1">Time to empty 50kg at {lastSpeed.toFixed(1)} beans/min</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-[#A1887F]">No data</p>
              <p className="text-xs text-[#D7CCC8]">Complete a batch to estimate depletion.</p>
            </>
          )}
        </div>

        {/* Next Batch Prediction */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-lg ${trendDirection === 'up' ? 'bg-green-50' : 'bg-red-50'}`}>
              {trendDirection === 'up' ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
            </div>
            <p className="text-xs font-bold text-[#A1887F] uppercase tracking-wider">Next Batch Prediction</p>
          </div>
          {nextPrediction !== null ? (
            <>
              <p className="text-3xl font-extrabold text-[#3E2723]">
                {nextPrediction}%
                <span className={`ml-2 text-base font-bold ${nextGrade === 'A' ? 'text-green-600' : nextGrade === 'B' ? 'text-amber-600' : 'text-red-600'}`}>Grade {nextGrade}</span>
              </p>
              <p className="text-xs text-[#A1887F] mt-1">Based on Linear Regression of last {recent.length} batches</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-[#A1887F]">Insufficient data</p>
              <p className="text-xs text-[#D7CCC8]">Need at least 2 batches for prediction.</p>
            </>
          )}
        </div>

        {/* PNS Alignment */}
        <div className={`rounded-xl shadow-sm border p-5 ${nextPrediction !== null && nextPrediction >= 80 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-lg ${nextPrediction !== null && nextPrediction >= 80 ? 'bg-green-100' : 'bg-amber-100'}`}>
              {nextPrediction !== null && nextPrediction >= 80
                ? <ShieldCheck className="w-5 h-5 text-green-700" />
                : <AlertTriangle className="w-5 h-5 text-amber-700" />}
            </div>
            <p className="text-xs font-bold text-[#A1887F] uppercase tracking-wider">PNS Alignment</p>
          </div>
          {nextPrediction !== null ? (
            <p className="text-sm font-bold text-[#3E2723] leading-relaxed">
              {nextPrediction >= 80
                ? 'Your next batch is predicted to meet Grade A standards. Keep current drying process.'
                : `Your next batch is predicted to be Grade ${nextGrade}. Consider extending drying time to reach Grade A.`}
            </p>
          ) : (
            <p className="text-sm text-[#A1887F]">Complete more batches for PNS alignment tracking.</p>
          )}
        </div>
      </div>

      {/* ── Quality Trend Chart ────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[#3E2723]">Quality Trend Analysis</h3>
          <p className="text-xs text-[#A1887F]">Export Grade % across last {recent.length} batches with Linear Regression trendline</p>
        </div>
        {trendLineData.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-[#A1887F]">No batch data available for trend analysis.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendLineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD4" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8D6E63' }} angle={-15} textAnchor="end" height={50} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#8D6E63' }} unit="%" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #D7CCC8' }} />
              <Legend />
              <ReferenceLine y={80} stroke="#4CAF50" strokeDasharray="6 3" label={{ value: 'Grade A (80%)', position: 'right', fill: '#4CAF50', fontSize: 10 }} />
              <Line type="monotone" dataKey="exportPct" stroke="#FFB74D" strokeWidth={3} dot={{ fill: '#FF8F00', r: 4 }} name="Export %" />
              {regression && (
                <Line type="linear" dataKey="trend" stroke="#E53935" strokeWidth={2} strokeDasharray="8 4" dot={false} name="Trendline" />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── What-If Simulator ──────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[#3E2723]">Economic "What-If" Simulator</h3>
          <p className="text-xs text-[#A1887F]">Adjust the Drying Process Improvement slider to see how it affects revenue</p>
        </div>

        <div className="space-y-6">
          {/* Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-[#6D4C41]">Drying Process Improvement</label>
              <span className="text-sm font-extrabold text-[#FF8F00]">{dryingSlider}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={dryingSlider}
              onChange={(e) => setDryingSlider(Number(e.target.value))}
              className="w-full h-2 bg-[#F5EDE4] rounded-lg appearance-none cursor-pointer accent-[#FFB74D]"
            />
            <div className="flex justify-between text-xs text-[#A1887F] mt-1">
              <span>No improvement</span>
              <span>Maximum optimization</span>
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#FAF0E6] rounded-lg p-4 text-center">
              <p className="text-xs font-bold text-[#A1887F] uppercase mb-1">Current Revenue</p>
              <p className="text-xl font-extrabold text-[#6D4C41]">₱{baseRevenue.toLocaleString()}</p>
              <p className="text-xs text-[#A1887F]">{(baseExportRate * 100).toFixed(1)}% export rate</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
              <p className="text-xs font-bold text-green-700 uppercase mb-1">Projected Revenue</p>
              <p className="text-xl font-extrabold text-green-700">₱{newRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-600">{(newExportRate * 100).toFixed(1)}% export rate</p>
            </div>
            <div className={`rounded-lg p-4 text-center ${revenueDiff > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-[#FAF0E6]'}`}>
              <p className="text-xs font-bold text-[#A1887F] uppercase mb-1">Revenue Increase</p>
              <div className="flex items-center justify-center gap-2">
                {revenueDiff > 0 && <Zap className="w-5 h-5 text-amber-500" />}
                <p className={`text-xl font-extrabold ${revenueDiff > 0 ? 'text-amber-700' : 'text-[#A1887F]'}`}>
                  +₱{revenueDiff.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-[#A1887F]">additional profit potential</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
