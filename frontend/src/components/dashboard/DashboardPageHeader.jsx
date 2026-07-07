import { useLocation } from 'react-router-dom';

const ROUTE_TITLES = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview & analytics' },
  '/dashboard/batches': { title: 'Batch Management', subtitle: 'Central batch ledger' },
  '/dashboard/predictions': { title: 'Yield Predictor', subtitle: 'Harvest forecasting' },
  '/dashboard/mlops': { title: 'AI Intelligence Hub', subtitle: 'Model feedback center' },
  '/dashboard/hardware': { title: 'Hardware Config', subtitle: 'Device diagnostics' },
  '/dashboard/admin': { title: 'Global System Stats', subtitle: 'Fleet operational health' },
  '/dashboard/admin/directory': { title: 'User & Machine Directory', subtitle: 'Accounts & nodes' },
  '/dashboard/admin/models': { title: 'Model Deployment', subtitle: 'AI model management' },
  '/dashboard/admin/workbench': { title: 'Data Workbench', subtitle: 'MLOps data pipeline' },
  '/dashboard/admin/logs': { title: 'Technical Logs', subtitle: 'System audit trail' },
};

export default function DashboardPageHeader() {
  const { pathname } = useLocation();
  const meta = ROUTE_TITLES[pathname] ?? { title: 'Dashboard', subtitle: 'CacaoScan Central' };

  return (
    <header className="dashboard-fade-in mb-6 hidden border-b border-[#A1887F]/10 pb-5 md:block">
      <h1 className="text-xl font-extrabold tracking-tight text-[#3E2723]">{meta.title}</h1>
      <p className="mt-0.5 text-sm text-[#A1887F]">{meta.subtitle}</p>
    </header>
  );
}
