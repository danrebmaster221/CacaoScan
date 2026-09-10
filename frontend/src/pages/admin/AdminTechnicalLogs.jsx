import { useEffect, useState } from 'react';
import { ShieldAlert, Activity } from 'lucide-react';
import { supabase } from '../../services/supabase';

export default function AdminTechnicalLogs() {
  const [loginAudit, setLoginAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('login_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        if (!cancelled) setLoginAudit(data || []);
      } catch (err) {
        console.warn('AdminTechnicalLogs load failed:', err.message);
        if (!cancelled) setLoginAudit([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3E2723]">System Technical Logs</h1>
          <p className="text-sm text-[#A1887F]">Audit trails and hardware event feeds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#A1887F]/20 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#6D4C41]" />
            <h3 className="text-lg font-bold text-[#3E2723]">Login Audit (RBAC)</h3>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF0E6] text-[#A1887F] uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Account</th>
                  <th className="px-4 py-3 whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Security Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-gray-500">Loading audit logs…</td>
                  </tr>
                ) : loginAudit.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-gray-500">No login audit events yet.</td>
                  </tr>
                ) : (
                  loginAudit.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FFF8F0]/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-[#3E2723]">
                        {log.user_email}
                        <span className="block text-xs font-normal text-gray-400 mt-0.5">
                          {log.ip_address || log.device_info || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {log.is_suspicious ? (
                          <span className="inline-flex items-center text-red-700 font-bold text-[10px] uppercase bg-red-50 px-2 py-1 rounded border border-red-200">
                            Suspicious
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-emerald-700 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                            {log.login_status || 'Verified'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-[#A1887F]/20 rounded-xl shadow-sm flex flex-col h-full">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#6D4C41]" />
            <h3 className="text-lg font-bold text-[#3E2723]">Live Hardware Events</h3>
          </div>

          <div className="p-4 flex-1 h-[300px] overflow-y-auto">
            <div className="flex h-full items-center justify-center text-sm text-[#BCAAA4]">
              No hardware event stream connected yet.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
