import { Construction, ArrowRight } from 'lucide-react';

export default function ModulePlaceholder({ title, description, icon: Icon = Construction }) {
  return (
    <div className="dashboard-fade-in flex min-h-[420px] flex-col items-center justify-center px-6 py-16">
      <div className="dashboard-card-hover group relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#A1887F]/20 bg-white/80 p-10 text-center shadow-[0_8px_30px_rgba(62,39,35,0.06)] backdrop-blur-sm">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#FFB74D]/10 transition-transform duration-500 group-hover:scale-125" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-[#6D4C41]/5 transition-transform duration-500 group-hover:scale-110" />

        <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FAF0E6] to-[#FFF5EA] shadow-inner">
          <Icon className="h-8 w-8 text-[#6D4C41] dashboard-icon-float" strokeWidth={1.75} />
        </div>

        <h2 className="relative text-xl font-bold text-[#3E2723]">{title}</h2>
        {description && (
          <p className="relative mt-3 text-sm leading-relaxed text-[#A1887F]">{description}</p>
        )}

        <div className="relative mt-8 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#BCAAA4]">
          <span className="dashboard-pulse-dot h-2 w-2 rounded-full bg-[#FFB74D]" />
          Module in development
          <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
        </div>
      </div>
    </div>
  );
}
