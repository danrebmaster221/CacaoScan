import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, Check, ChevronDown, Eye, SlidersHorizontal, RefreshCw } from 'lucide-react';

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-[#F5EDE4] via-[#E8DDD4] to-[#F5EDE4] rounded-lg ${className}`} />
);

const VARIETY_OPTIONS = ['criollo', 'forastero', 'trinitario'];
const QUALITY_OPTIONS = ['export_grade', 'needs_drying', 'rejected'];
const READINESS_TARGET = 50; // number of flagged cases to trigger retraining

export default function AIIntelligenceHub() {
  const { user } = useAuth();
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(80);
  const [savingId, setSavingId] = useState(null);

  const fetchFlagged = useCallback(async () => {
    setLoading(true);
    // Get all flagged classifications from user's batches
    const { data: userBatches } = await supabase
      .from('batches')
      .select('id')
      .eq('user_id', user.id);

    if (!userBatches || userBatches.length === 0) {
      setFlagged([]);
      setLoading(false);
      return;
    }

    const batchIds = userBatches.map(b => b.id);
    const { data } = await supabase
      .from('classifications')
      .select('id, batch_id, variety, quality, variety_confidence, quality_confidence, image_url, is_flagged, farmer_correction')
      .in('batch_id', batchIds)
      .eq('is_flagged', true)
      .order('classified_at', { ascending: false })
      .limit(100);

    setFlagged(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchFlagged();
  }, [user, fetchFlagged]);

  /* ── Ground Truth Correction ─────────────────────────────────── */
  async function saveCorrection(classId, correction) {
    setSavingId(classId);
    await supabase
      .from('classifications')
      .update({ farmer_correction: correction })
      .eq('id', classId);
    setFlagged(prev => prev.map(f => f.id === classId ? { ...f, farmer_correction: correction } : f));
    setSavingId(null);
  }

  /* ── Readiness gauge ─────────────────────────────────────────── */
  const readiness = Math.min(100, Math.round((flagged.length / READINESS_TARGET) * 100));
  const gaugeData = [{ name: 'Readiness', value: readiness, fill: readiness >= 100 ? '#E53935' : readiness >= 60 ? '#FFA726' : '#4CAF50' }];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3E2723]">AI Intelligence Hub</h1>
          <p className="text-sm text-[#A1887F]">Human-in-the-Loop MLOps feedback &middot; {flagged.length} flagged cases</p>
        </div>
        <button
          onClick={fetchFlagged}
          className="flex items-center gap-2 px-4 py-2 bg-[#FAF0E6] border border-[#D7CCC8] rounded-lg text-sm font-bold text-[#6D4C41] hover:bg-[#F5EDE4] transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Control Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Optimization Readiness Meter */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-5 relative overflow-hidden">
          <p className="text-xs font-bold text-[#A1887F] uppercase tracking-wider mb-2">Optimization Readiness</p>
          <div className="flex items-center justify-center h-36">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="85%" startAngle={180} endAngle={0} barSize={14} data={gaugeData}>
                <RadialBar background clockWise dataKey="value" cornerRadius={8} />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-2xl font-extrabold text-[#3E2723]">{flagged.length}</p>
              <p className="text-xs text-[#A1887F]">of {READINESS_TARGET} cases</p>
            </div>
          </div>
          {readiness >= 100 && (
            <div className="mt-2 flex items-center gap-2 bg-red-50 text-red-700 text-xs font-bold px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              Retraining recommended — notify Admin
            </div>
          )}
        </div>

        {/* Confidence Threshold Slider */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-5">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-[#A1887F]" />
            <p className="text-xs font-bold text-[#A1887F] uppercase tracking-wider">Inference Sensitivity</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#6D4C41]">Min. Confidence Threshold</span>
              <span className="text-lg font-extrabold text-[#FF8F00]">{threshold}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={99}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-2 bg-[#F5EDE4] rounded-lg appearance-none cursor-pointer accent-[#FFB74D]"
            />
            <div className="flex justify-between text-xs text-[#A1887F]">
              <span>More detections</span>
              <span>Higher accuracy</span>
            </div>
          </div>
          <p className="text-xs text-[#A1887F] mt-3 leading-relaxed">
            At {threshold}%, the AI will only classify beans it is at least {threshold}% confident about.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-5">
          <p className="text-xs font-bold text-[#A1887F] uppercase tracking-wider mb-4">Feedback Summary</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6D4C41]">Total flagged</span>
              <span className="font-bold text-[#3E2723]">{flagged.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6D4C41]">Corrected</span>
              <span className="font-bold text-green-700">{flagged.filter(f => f.farmer_correction).length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6D4C41]">Pending review</span>
              <span className="font-bold text-amber-600">{flagged.filter(f => !f.farmer_correction).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Flagged Error Gallery ──────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[#3E2723]">Flagged Error Gallery</h3>
          <p className="text-xs text-[#A1887F]">Review and correct misclassified beans to improve AI accuracy</p>
        </div>

        {flagged.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <div className="bg-green-50 p-3 rounded-full mb-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-[#A1887F] font-medium">No flagged classifications found.</p>
            <p className="text-xs text-[#D7CCC8] mt-1">Flag beans on the mobile app to begin the feedback loop.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {flagged.map((item) => (
              <div key={item.id} className="bg-[#FDFAF7] rounded-lg border border-[#D7CCC8] overflow-hidden hover:shadow-md transition-shadow">
                {/* Image */}
                {item.image_url ? (
                  <img src={item.image_url} alt="Flagged bean" className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 flex items-center justify-center bg-[#F5EDE4]">
                    <Eye className="w-8 h-8 text-[#D7CCC8]" />
                  </div>
                )}

                {/* Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#A1887F] uppercase">AI Prediction</p>
                    <span className="text-xs bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full">
                      {item.variety} · {item.quality?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#8D6E63]">
                    <span>Confidence</span>
                    <span className="font-bold">{((item.quality_confidence || 0) * 100).toFixed(0)}%</span>
                  </div>

                  {/* Ground Truth Correction Dropdown */}
                  <div>
                    <p className="text-xs font-bold text-[#A1887F] uppercase mb-1">Correct Label</p>
                    <div className="relative">
                      <select
                        value={item.farmer_correction || ''}
                        onChange={(e) => saveCorrection(item.id, e.target.value)}
                        disabled={savingId === item.id}
                        className="w-full text-sm border border-[#D7CCC8] rounded-lg px-3 py-2 bg-white text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#FFB74D]/50 appearance-none cursor-pointer disabled:opacity-50"
                      >
                        <option value="">Select correct label...</option>
                        <optgroup label="Variety">
                          {VARIETY_OPTIONS.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                        </optgroup>
                        <optgroup label="Quality">
                          {QUALITY_OPTIONS.map(q => <option key={q} value={q}>{q.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                        </optgroup>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1887F] pointer-events-none" />
                    </div>
                  </div>

                  {item.farmer_correction && (
                    <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                      <Check className="w-3 h-3" />
                      Corrected: {item.farmer_correction.replace('_', ' ')}
                    </div>
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
