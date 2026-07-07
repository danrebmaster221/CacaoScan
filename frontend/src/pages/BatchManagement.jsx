import { useState } from 'react';
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

/* ── mock data ─────────────────────────────── */
const BATCHES = Array.from({ length: 18 }, (_, i) => {
  const rejectedRate = Math.floor(Math.random() * 8) + 1; // 1 to 8%
  const isCompliant = rejectedRate <= 6;
  const grade = isCompliant ? (Math.random() > 0.4 ? 'Export A' : 'Export B') : 'Standard';
  const total = Math.floor(800 + Math.random() * 400);

  return {
    id: `BN-${9000 + i}`,
    date: `2026-07-0${7 - (i % 7)}`,
    totalBeans: total,
    variety: ['Trinitario', 'Criollo', 'Forastero'][i % 3],
    grade,
    confidence: Math.floor(88 + Math.random() * 11), // 88 to 98%
    pns: isCompliant,
    rejected: rejectedRate,
    // Model A Defect Breakdown
    moldy: Math.floor(total * (rejectedRate * 0.4 / 100)),
    slaty: Math.floor(total * (rejectedRate * 0.5 / 100)),
    shriveled: Math.floor(total * (rejectedRate * 0.1 / 100)),
    // Model B Variety Breakdown (if Trinitario is dominant, small bits of others)
    varCriollo: Math.floor(Math.random() * 15),
    varForastero: Math.floor(Math.random() * 25),
    images: [
      'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1610611424854-5e07b4926176?w=200&h=200&fit=crop',
    ],
  };
});
const PAGE_SIZE = 8;

/* ── PDF generator ─────────────────────────── */
function downloadCertificate(batch) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const marginLeft = 20;

  // Header Background
  doc.setFillColor(62, 39, 35);
  doc.rect(0, 0, w, 40, 'F');
  
  // Header Text
  doc.setTextColor(255, 252, 248);
  doc.setFontSize(14);
  doc.text('CACAOSCAN CENTRAL | FARMS OPERATIONS COMMAND', w / 2, 16, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('CACAOSCAN BATCH QUALITY CERTIFICATE', w / 2, 26, { align: 'center' });
  
  // Reset text color for body
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

  // [SECTION 1: BATCH TRACEABILITY]
  addSectionHeader('[SECTION 1: BATCH TRACEABILITY]');
  addLine('Batch ID:', batch.id);
  addLine('Farmer/Owner:', 'CacaoScan Platform Operator');
  addLine('Farm Location:', 'Boalan, Zamboanga City');
  addLine('Processing Date:', batch.date);
  y += 6;

  // [SECTION 2: AI ANALYSIS SUMMARY]
  addSectionHeader('[SECTION 2: AI ANALYSIS SUMMARY]');
  addLine('Total Volume:', `${batch.totalBeans} Beans`);

  // Calculate dominant variety %
  const otherVars = batch.varCriollo + batch.varForastero;
  const domCount = batch.totalBeans - otherVars;
  const domPercent = ((domCount / batch.totalBeans) * 100).toFixed(1);
  
  addLine('Dominant Variety:', `${batch.variety} (${domPercent}%) | Criollo: ${batch.varCriollo} | Forastero: ${batch.varForastero}`);
  addLine('Quality Classification:', batch.grade);
  addLine('PNS/BAFS 58:2019 Status:', batch.pns ? 'COMPLIANT' : 'NON-COMPLIANT');
  y += 6;

  // [SECTION 3: DETAILED METRICS]
  addSectionHeader('[SECTION 3: DETAILED METRICS]');
  y += 2;
  
  // Table Header
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Category', marginLeft + 2, y);
  doc.text('Percentage', marginLeft + 50, y);
  doc.text('Count', marginLeft + 90, y);
  doc.text('AI Confidence', marginLeft + 130, y);
  doc.line(marginLeft, y + 2, w - marginLeft, y + 2);
  y += 8;

  // Table Rows (Mocked splits)
  const rejectedCount = Math.round((batch.rejected / 100) * batch.totalBeans);
  const acceptedCount = batch.totalBeans - rejectedCount;

  doc.setFont(undefined, 'normal');
  // Row 1
  doc.text('Export Grade', marginLeft + 2, y);
  doc.text(`${100 - batch.rejected}%`, marginLeft + 50, y);
  doc.text(`${acceptedCount}`, marginLeft + 90, y);
  doc.text(`${batch.confidence + 1.2}%`, marginLeft + 130, y);
  y += 6;
  // Row 2
  doc.text('Needs Drying', marginLeft + 2, y);
  doc.text(`0%`, marginLeft + 50, y);
  doc.text(`0`, marginLeft + 90, y);
  doc.text(`0%`, marginLeft + 130, y);
  y += 6;
  // Row 3
  doc.text('Rejected', marginLeft + 2, y);
  doc.text(`${batch.rejected}%`, marginLeft + 50, y);
  doc.text(`${rejectedCount}`, marginLeft + 90, y);
  doc.text(`${(batch.confidence - 2.5).toFixed(1)}%`, marginLeft + 130, y);
  y += 12;

  // [SECTION 4: REJECTION AUDIT]
  addSectionHeader('[SECTION 4: REJECTION AUDIT (MODEL B)]');
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`• Mold detected: ${batch.moldy} units`, marginLeft + 2, y);
  y += 6;
  doc.text(`• Slaty/Unfermented: ${batch.slaty} units`, marginLeft + 2, y);
  y += 6;
  doc.text(`• Shriveled/Broken: ${batch.shriveled} units`, marginLeft + 2, y);
  
  // [FOOTER]
  y = 260; // Push to bottom
  doc.setDrawColor(161, 136, 127);
  doc.line(marginLeft, y, w - marginLeft, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(109, 76, 65);
  
  const footerText = 'This document is a digital representation of AI-Vision analysis and is compliant with Philippine Cacao Standards. Verifiable via Machine ID: SCANNER-01. Generated: ' + new Date().toLocaleDateString();
  const splitFooter = doc.splitTextToSize(footerText, w - (marginLeft * 2));
  doc.text(splitFooter, w / 2, y, { align: 'center' });

  doc.save(`CacaoScan_Certificate_${batch.id}.pdf`);
}

/* ── Audit Gallery Modal ───────────────────── */
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
        <h3 className="mb-1 text-lg font-bold text-[#3E2723]">Visual Audit — {batch.id}</h3>
        <p className="mb-5 text-sm text-[#A1887F]">{batch.variety} • {batch.date}</p>
        <div className="grid grid-cols-3 gap-3">
          {batch.images.map((src, i) => (
            <img key={i} src={src} alt={`Bean sample ${i + 1}`} className="h-28 w-full rounded-xl border border-[#A1887F]/10 object-cover shadow-sm" />
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-[#BCAAA4]">Showing {batch.images.length} flagged samples from this batch</p>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────── */
export default function BatchManagement() {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [page, setPage] = useState(0);
  const [auditBatch, setAuditBatch] = useState(null);

  const filtered = BATCHES.filter(
    (b) => {
      const matchesSearch = b.id.toLowerCase().includes(search.toLowerCase()) ||
                            b.variety.toLowerCase().includes(search.toLowerCase()) ||
                            b.grade.toLowerCase().includes(search.toLowerCase());
      const matchesGrade = gradeFilter === 'All' || b.grade === gradeFilter;
      return matchesSearch && matchesGrade;
    }
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">

      {/* Toolbar */}
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
        <p className="text-xs font-semibold text-[#A1887F]">{filtered.length} batches</p>
      </div>

      {/* Table */}
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
                <th className="px-5 py-3.5 font-semibold">Confidence</th>
                <th className="px-5 py-3.5 font-semibold">PNS Compliant</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#A1887F]/10">
              {pageData.map((b) => (
                <tr key={b.id} className="group transition-colors hover:bg-[#FFFBF7]">
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#3E2723]">{b.id}</td>
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
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm text-[#BCAAA4]">
                    No batches match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
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

      {/* Audit Gallery Modal */}
      {auditBatch && <AuditGallery batch={auditBatch} onClose={() => setAuditBatch(null)} />}
    </div>
  );
}
