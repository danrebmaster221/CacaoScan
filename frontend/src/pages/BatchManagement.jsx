import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import { Search, FileDown, Trash2, Eye, X, ChevronLeft, ChevronRight, Archive, ShieldCheck } from 'lucide-react';

/* ── helpers ───────────────────────────────────────────────────── */
function getGrade(b) {
  const total = b.total_beans || 0;
  if (total === 0) return { grade: '—', color: 'text-gray-400' };
  const exportPct = ((b.export_grade_count || 0) / total) * 100;
  if (exportPct >= 80) return { grade: 'A', color: 'text-green-700 bg-green-50' };
  if (exportPct >= 50) return { grade: 'B', color: 'text-amber-700 bg-amber-50' };
  return { grade: 'C', color: 'text-red-700 bg-red-50' };
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-[#F5EDE4] via-[#E8DDD4] to-[#F5EDE4] rounded-lg ${className}`} />
);

/* ── page component ────────────────────────────────────────────── */
export default function BatchManagement() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [auditBatch, setAuditBatch] = useState(null);
  const [auditImages, setAuditImages] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const PER_PAGE = 10;

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setBatches(data);
        setFiltered(data);
      }
      setLoading(false);
    })();
  }, [user]);

  /* ── search filter ───────────────────────────────────────────── */
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(batches);
    } else {
      const q = search.toLowerCase();
      setFiltered(batches.filter(b =>
        (b.batch_name || '').toLowerCase().includes(q) ||
        (b.harvest_date || '').includes(q) ||
        (b.id || '').toLowerCase().includes(q)
      ));
    }
    setPage(0);
  }, [search, batches]);

  const pageSlice = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  /* ── PDF generation ──────────────────────────────────────────── */
  function generatePDF(batch) {
    const doc = new jsPDF();
    const g = getGrade(batch);
    const total = batch.total_beans || 0;

    // Header
    doc.setFillColor(62, 39, 35);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 183, 77);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CacaoScan', 15, 18);
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('Digital Quality Certificate', 15, 26);
    doc.text(`PNS/BAFS 58:2019 Aligned`, 15, 32);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 32);

    // Body
    doc.setTextColor(62, 39, 35);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Batch: ${batch.batch_name || 'Unnamed'}`, 15, 55);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const info = [
      [`Lot Number:`, batch.id.slice(0, 8).toUpperCase()],
      [`Harvest Date:`, batch.harvest_date || '—'],
      [`Total Beans Processed:`, `${total}`],
      [`Overall Grade:`, g.grade],
      [`Export Grade:`, `${batch.export_grade_count || 0} (${total > 0 ? ((batch.export_grade_count / total) * 100).toFixed(1) : 0}%)`],
      [`Needs Drying:`, `${batch.needs_drying_count || 0} (${total > 0 ? ((batch.needs_drying_count / total) * 100).toFixed(1) : 0}%)`],
      [`Rejected:`, `${batch.rejected_count || 0} (${total > 0 ? ((batch.rejected_count / total) * 100).toFixed(1) : 0}%)`],
    ];

    let y = 68;
    info.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 15, y);
      doc.setFont('helvetica', 'normal');
      doc.text(val, 70, y);
      y += 8;
    });

    // Variety breakdown
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Variety Breakdown', 15, y);
    y += 10;
    doc.setFontSize(10);

    const varieties = [
      ['Criollo', batch.criollo_count || 0],
      ['Forastero', batch.forastero_count || 0],
      ['Trinitario', batch.trinitario_count || 0],
    ];

    varieties.forEach(([name, count]) => {
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
      doc.setFont('helvetica', 'normal');
      doc.text(`${name}: ${count} beans (${pct}%)`, 20, y);

      // Mini bar
      const barWidth = Math.max(1, (count / (total || 1)) * 100);
      doc.setFillColor(255, 183, 77);
      doc.roundedRect(80, y - 3, barWidth, 4, 1, 1, 'F');
      y += 9;
    });

    // Footer
    y += 10;
    doc.setDrawColor(215, 204, 200);
    doc.line(15, y, 195, y);
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(141, 110, 99);
    doc.text('This certificate was generated by the CacaoScan AI Quality Assurance System.', 15, y);
    doc.text('AI-verified classification using YOLOv8 Computer Vision Engine.', 15, y + 5);
    doc.text('Western Mindanao State University — Capstone Research Project', 15, y + 10);

    doc.save(`CacaoScan_Certificate_${(batch.batch_name || 'batch').replace(/\s/g, '_')}.pdf`);
  }

  /* ── Visual Audit Gallery ────────────────────────────────────── */
  async function openAuditGallery(batch) {
    setAuditBatch(batch);
    setAuditLoading(true);
    const { data } = await supabase
      .from('classifications')
      .select('id, variety, quality, quality_confidence, image_url, is_flagged, farmer_correction')
      .eq('batch_id', batch.id)
      .eq('quality', 'rejected')
      .order('classified_at', { ascending: false })
      .limit(50);
    setAuditImages(data || []);
    setAuditLoading(false);
  }

  /* ── delete batch ────────────────────────────────────────────── */
  async function deleteBatch(id) {
    await supabase.from('batches').delete().eq('id', id);
    setBatches(prev => prev.filter(b => b.id !== id));
    setDeleteTarget(null);
  }

  /* ── loading skeleton ────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-72" />
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3E2723]">Batch Management</h1>
          <p className="text-sm text-[#A1887F]">Digital traceability ledger &middot; {batches.length} total batches</p>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1887F]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by batch name, date, or ID..."
          className="w-full pl-10 pr-4 py-2.5 border border-[#D7CCC8] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB74D]/50 focus:border-[#FFB74D] bg-white text-[#3E2723] placeholder:text-[#A1887F]"
        />
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAF0E6]">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">Lot #</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">Batch Name</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">Date</th>
                <th className="text-right py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">Beans</th>
                <th className="text-center py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">Grade</th>
                <th className="text-center py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">PNS</th>
                <th className="text-center py-3 px-4 text-xs font-bold text-[#A1887F] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A1887F]">No batches found.</td>
                </tr>
              ) : (
                pageSlice.map((b) => {
                  const g = getGrade(b);
                  const total = b.total_beans || 0;
                  const exportPct = total > 0 ? ((b.export_grade_count || 0) / total) * 100 : 0;
                  const pnsPass = exportPct >= 60;
                  return (
                    <tr key={b.id} className="border-b border-[#F5EDE4] hover:bg-[#FFF8F0] transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-[#8D6E63]">{b.id.slice(0, 8).toUpperCase()}</td>
                      <td className="py-3 px-4 font-semibold text-[#3E2723]">{b.batch_name || 'Unnamed'}</td>
                      <td className="py-3 px-4 text-[#8D6E63]">{fmtDate(b.created_at)}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#3E2723]">{total.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-extrabold ${g.color}`}>{g.grade}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pnsPass ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> Aligned
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-[#A1887F]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => generatePDF(b)} className="p-2 rounded-lg hover:bg-amber-50 text-[#FF8F00] hover:text-amber-700 transition-colors" title="Download Quality Certificate">
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button onClick={() => openAuditGallery(b)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors" title="Visual Audit Gallery">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(b)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Archive / Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#F5EDE4] bg-[#FDFAF7]">
            <p className="text-xs text-[#A1887F]">
              Showing {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg hover:bg-[#FAF0E6] disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4 text-[#6D4C41]" />
              </button>
              <span className="text-xs text-[#6D4C41] font-bold px-2">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg hover:bg-[#FAF0E6] disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4 text-[#6D4C41]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirm Modal ───────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center border border-[#A1887F]/20">
            <div className="bg-red-50 p-3 rounded-full w-fit mx-auto mb-4">
              <Archive className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-[#3E2723] mb-1">Archive Batch?</h3>
            <p className="text-sm text-[#A1887F] mb-6">
              Permanently delete <strong>{deleteTarget.batch_name || 'this batch'}</strong>? This action is logged per ISO 27001.
            </p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2 border border-[#D7CCC8] rounded-lg text-sm font-bold text-[#6D4C41] hover:bg-[#FAF0E6] transition-colors">Cancel</button>
              <button onClick={() => deleteBatch(deleteTarget.id)} className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Visual Audit Gallery Modal ─────────────────────────── */}
      {auditBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-[#A1887F]/20">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5EDE4]">
              <div>
                <h3 className="text-lg font-bold text-[#3E2723]">Visual Audit Gallery</h3>
                <p className="text-xs text-[#A1887F]">Rejected beans for: {auditBatch.batch_name || 'Unnamed'}</p>
              </div>
              <button onClick={() => { setAuditBatch(null); setAuditImages([]); }} className="p-2 rounded-lg hover:bg-[#FAF0E6] transition-colors">
                <X className="w-5 h-5 text-[#6D4C41]" />
              </button>
            </div>
            {/* Gallery body */}
            <div className="flex-1 overflow-y-auto p-6">
              {auditLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40" />)}
                </div>
              ) : auditImages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[#A1887F]">No rejected bean images found for this batch.</p>
                  <p className="text-xs text-[#D7CCC8] mt-1">Images are captured by the Vision Station during live sorting.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {auditImages.map((img) => (
                    <div key={img.id} className="bg-[#FAF0E6] rounded-lg border border-[#D7CCC8] overflow-hidden">
                      {img.image_url ? (
                        <img src={img.image_url} alt="Rejected bean" className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center bg-[#F5EDE4]">
                          <p className="text-xs text-[#A1887F]">No image</p>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-xs font-bold text-[#3E2723]">{img.variety}</p>
                        <p className="text-xs text-red-600 font-medium">Rejected ({(img.quality_confidence * 100).toFixed(0)}% conf.)</p>
                        {img.is_flagged && (
                          <p className="text-xs text-amber-600 mt-1">⚠ Flagged: {img.farmer_correction || 'Pending review'}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
