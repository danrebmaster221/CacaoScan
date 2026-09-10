import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Search,
  Download,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

const PAGE_SIZE = 8;

function dominantVariety(batch) {
  const scores = [
    ['Criollo', batch.criollo_count || 0],
    ['Forastero', batch.forastero_count || 0],
    ['Trinitario', batch.trinitario_count || 0],
  ].sort((a, b) => b[1] - a[1]);
  return scores[0][1] > 0 ? scores[0][0] : '—';
}

function deriveGrade(batch) {
  const total = batch.total_beans || 0;
  if (total === 0) return 'Standard';
  const exportRate = ((batch.export_grade_count || 0) / total) * 100;
  const rejectedRate = ((batch.rejected_count || 0) / total) * 100;
  if (rejectedRate > 6) return 'Standard';
  if (exportRate >= 80) return 'Export A';
  if (exportRate >= 60) return 'Export B';
  return 'Standard';
}

function mapBatch(row) {
  const total = row.total_beans || 0;
  const rejectedRate = total > 0 ? Math.round(((row.rejected_count || 0) / total) * 100) : 0;
  const exportRate = total > 0 ? Math.round(((row.export_grade_count || 0) / total) * 100) : 0;
  return {
    id: row.id,
    label: row.batch_name || `BN-${String(row.id).slice(0, 8).toUpperCase()}`,
    date: row.completed_at || row.started_at || row.created_at
      ? new Date(row.completed_at || row.started_at || row.created_at).toISOString().slice(0, 10)
      : '—',
    totalBeans: total,
    variety: dominantVariety(row),
    grade: deriveGrade(row),
    confidence: exportRate,
    pns: rejectedRate <= 6,
    rejected: rejectedRate,
    moldy: 0,
    slaty: 0,
    shriveled: 0,
    varCriollo: row.criollo_count || 0,
    varForastero: row.forastero_count || 0,
    varTrinitario: row.trinitario_count || 0,
    exportCount: row.export_grade_count || 0,
    dryingCount: row.needs_drying_count || 0,
    rejectedCount: row.rejected_count || 0,
    images: [],
    machineId: row.machine_id || '—',
  };
}

function downloadCertificate(batch) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const marginLeft = 20;

  doc.setFillColor(62, 39, 35);
  doc.rect(0, 0, w, 40, 'F');
  doc.setTextColor(255, 252, 248);
  doc.setFontSize(14);
  doc.text('CACAOSCAN CENTRAL | FARMS OPERATIONS COMMAND', w / 2, 16, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('CACAOSCAN BATCH QUALITY CERTIFICATE', w / 2, 26, { align: 'center' });

  doc.setTextColor(62, 39, 35);
  let y = 55;

  const addSectionHeader = (title) => {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(240, 235, 230);
    doc.rect(marginLeft, y - 5, w - (marginLeft * 2), 8, 'F');
    doc.text(title, marginLeft + 2, y);
    y += 10;
  };

  const addLine = (label, value) => {
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(label, marginLeft + 2, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(value), marginLeft + 60, y);
    y += 6;
  };

  addSectionHeader('[SECTION 1: BATCH TRACEABILITY]');
  addLine('Batch ID:', batch.label);
  addLine('Processing Date:', batch.date);
  addLine('Machine ID:', batch.machineId);
  y += 6;

  addSectionHeader('[SECTION 2: AI ANALYSIS SUMMARY]');
  addLine('Total Volume:', `${batch.totalBeans} Beans`);
  addLine('Dominant Variety:', batch.variety);
  addLine('Criollo / Forastero / Trinitario:', `${batch.varCriollo} / ${batch.varForastero} / ${batch.varTrinitario}`);
  addLine('Quality Classification:', batch.grade);
  addLine('PNS/BAFS 58:2019 Status:', batch.pns ? 'COMPLIANT' : 'NON-COMPLIANT');
  y += 6;

  addSectionHeader('[SECTION 3: DETAILED METRICS]');
  y += 2;
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Category', marginLeft + 2, y);
  doc.text('Count', marginLeft + 90, y);
  doc.line(marginLeft, y + 2, w - marginLeft, y + 2);
  y += 8;
  doc.setFont(undefined, 'normal');
  [
    ['Export Grade', batch.exportCount],
    ['Needs Drying', batch.dryingCount],
    ['Rejected', batch.rejectedCount],
  ].forEach(([label, count]) => {
    doc.text(label, marginLeft + 2, y);
    doc.text(String(count), marginLeft + 90, y);
    y += 6;
  });

  y = 260;
  doc.setDrawColor(161, 136, 127);
  doc.line(marginLeft, y, w - marginLeft, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(109, 76, 65);
  const footerText = `Digital AI-Vision batch certificate. Generated: ${new Date().toLocaleDateString()}`;
  doc.text(doc.splitTextToSize(footerText, w - (marginLeft * 2)), w / 2, y, { align: 'center' });
  doc.save(`CacaoScan_Certificate_${batch.label}.pdf`);
}

function AuditGallery({ batch, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="dashboard-fade-in relative w-full max-w-lg rounded-2xl border border-[#A1887F]/20 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-[#A1887F] hover:bg-[#FAF0E6]">
          <X className="h-5 w-5" />
        </button>
        <h3 className="mb-1 text-lg font-bold text-[#3E2723]">Visual Audit — {batch.label}</h3>
        <p className="mb-5 text-sm text-[#A1887F]">{batch.variety} • {batch.date}</p>
        {batch.images.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#BCAAA4]">No archived bean images for this batch.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {batch.images.map((src, i) => (
              <img key={i} src={src} alt={`Bean sample ${i + 1}`} className="h-28 w-full rounded-xl border border-[#A1887F]/10 object-cover shadow-sm" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BatchManagement() {
  const { user, userRole } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [auditBatch, setAuditBatch] = useState(null);

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
        let query = supabase.from('batches').select('*').order('created_at', { ascending: false });
        if (userRole !== 'admin') query = query.eq('user_id', user.id);
        const { data, error } = await query;
        if (error) throw error;
        if (!cancelled) setBatches((data || []).map(mapBatch));
      } catch (err) {
        console.warn('BatchManagement load failed:', err.message);
        if (!cancelled) setBatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, userRole]);

  const filtered = useMemo(() => batches.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch =
      b.label.toLowerCase().includes(q) ||
      b.variety.toLowerCase().includes(q) ||
      b.grade.toLowerCase().includes(q);
    const matchesGrade = gradeFilter === 'All' || b.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  }), [batches, search, gradeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="dashboard-fade-in dashboard-stagger-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1887F]" />
            <input
              type="text"
              placeholder="Search lot, variety, grade…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full rounded-xl border border-[#A1887F]/20 bg-white py-2.5 pl-10 pr-4 text-sm text-[#3E2723] shadow-sm outline-none transition-all placeholder:text-[#BCAAA4] focus:border-[#FFB74D] focus:ring-2 focus:ring-[#FFB74D]/20"
            />
          </div>
          <select
            value={gradeFilter}
            onChange={(e) => { setGradeFilter(e.target.value); setPage(0); }}
            className="rounded-xl border border-[#A1887F]/20 bg-white px-4 py-2.5 text-sm text-[#3E2723] shadow-sm outline-none transition-all focus:border-[#FFB74D] focus:ring-2 focus:ring-[#FFB74D]/20"
          >
            <option value="All">All Grades</option>
            <option value="Export A">Export A</option>
            <option value="Export B">Export B</option>
            <option value="Standard">Standard</option>
          </select>
        </div>
        <p className="text-xs font-semibold text-[#A1887F]">
          {loading ? 'Loading…' : `${filtered.length} batches`}
        </p>
      </div>

      <div className="dashboard-fade-in dashboard-stagger-2 overflow-hidden rounded-xl border border-[#A1887F]/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#A1887F]/10 bg-[#FAF0E6]/40 text-xs uppercase tracking-wider text-[#A1887F]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Batch No.</th>
                <th className="px-5 py-3.5 font-semibold">Date</th>
                <th className="px-5 py-3.5 font-semibold">Variety</th>
                <th className="px-5 py-3.5 font-semibold">Total</th>
                <th className="px-5 py-3.5 font-semibold">Grade</th>
                <th className="px-5 py-3.5 font-semibold">Export %</th>
                <th className="px-5 py-3.5 font-semibold">PNS Compliant</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#A1887F]/10">
              {pageData.map((b) => (
                <tr key={b.id} className="group transition-colors hover:bg-[#FFFBF7]">
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#3E2723]">{b.label}</td>
                  <td className="px-5 py-3.5 text-[#8D6E63]">{b.date}</td>
                  <td className="px-5 py-3.5 text-[#8D6E63]">{b.variety}</td>
                  <td className="px-5 py-3.5 font-medium text-[#3E2723]">{b.totalBeans}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      b.grade === 'Export A'
                        ? 'bg-green-50 text-green-700'
                        : b.grade === 'Export B'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {b.grade}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#FAF0E6]">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#6D4C41] to-[#FFB74D]" style={{ width: `${b.confidence}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-[#6D4C41]">{b.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {b.pns ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => downloadCertificate(b)}
                        title="Download PDF Certificate"
                        className="rounded-lg p-2 text-[#A1887F] transition-colors hover:bg-[#FAF0E6] hover:text-[#6D4C41]"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setAuditBatch(b)}
                        title="Visual Audit Gallery"
                        className="rounded-lg p-2 text-[#A1887F] transition-colors hover:bg-[#FAF0E6] hover:text-[#6D4C41]"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && pageData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-[#BCAAA4]">
                    No batches found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-[#BCAAA4]">
                    Loading batches…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-[#A1887F]/10 px-5 py-3">
            <p className="text-xs text-[#A1887F]">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="rounded-lg p-1.5 text-[#A1887F] transition-colors hover:bg-[#FAF0E6] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="rounded-lg p-1.5 text-[#A1887F] transition-colors hover:bg-[#FAF0E6] disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {auditBatch && <AuditGallery batch={auditBatch} onClose={() => setAuditBatch(null)} />}
    </div>
  );
}
