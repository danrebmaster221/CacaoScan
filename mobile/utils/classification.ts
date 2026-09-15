/**
 * Capstone 2 — single-pass 5-class helpers
 * Classes match Python / ESP32 / schema_v2 CHECK constraints exactly.
 */

export const OPERATIONAL_CLASSES = [
  'Rejected',
  'Needs_Drying',
  'Criollo',
  'Forastero',
  'Trinitario',
] as const;

export type OperationalClass = (typeof OPERATIONAL_CLASSES)[number];

export type DerivedGrade = 'Export Grade' | 'High Moisture' | 'Defect / Reject';

/** Gate index 1–5 → physical cm from infeed */
export const GATE_CM: Record<number, number> = {
  1: 36,
  2: 42,
  3: 48,
  4: 54,
  5: 60,
};

export function gateForClass(cls: OperationalClass): number {
  switch (cls) {
    case 'Rejected':
      return 1;
    case 'Needs_Drying':
      return 2;
    case 'Criollo':
      return 3;
    case 'Forastero':
      return 4;
    case 'Trinitario':
      return 5;
  }
}

export function derivedGradeForClass(cls: OperationalClass): DerivedGrade {
  switch (cls) {
    case 'Rejected':
      return 'Defect / Reject';
    case 'Needs_Drying':
      return 'High Moisture';
    default:
      return 'Export Grade';
  }
}

/** batches.*_count column for an operational class */
export function batchCountKey(cls: OperationalClass): string {
  switch (cls) {
    case 'Rejected':
      return 'rejected_count';
    case 'Needs_Drying':
      return 'needs_drying_count';
    case 'Criollo':
      return 'criollo_count';
    case 'Forastero':
      return 'forastero_count';
    case 'Trinitario':
      return 'trinitario_count';
  }
}

export function labelForClass(cls: string): string {
  return cls.replace(/_/g, ' ');
}

export function isExportClass(cls: string): boolean {
  return cls === 'Criollo' || cls === 'Forastero' || cls === 'Trinitario';
}

/** Normalize any legacy / loose label into a canonical operational class */
export function normalizeOperationalClass(raw: string): OperationalClass {
  const s = String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (s === 'rejected') return 'Rejected';
  if (s === 'needs_drying' || s === 'needs-drying') return 'Needs_Drying';
  if (s === 'criollo') return 'Criollo';
  if (s === 'forastero') return 'Forastero';
  if (s === 'trinitario') return 'Trinitario';
  // quality-first legacy dual payload
  if (s === 'export_grade') return 'Forastero';
  return 'Rejected';
}
