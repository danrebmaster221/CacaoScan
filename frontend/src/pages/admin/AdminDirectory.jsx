import { Users, Server, Shield, Search, Filter, AlertTriangle, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';

const ITEMS_PER_PAGE = 10;

function formatLastSeen(iso) {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} hours ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AdminDirectory() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [unpairTarget, setUnpairTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [profileRes, machineRes] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, role, contact_number, linked_machine_id, created_at'),
          supabase.from('machines').select('machine_id, owner_id, is_online, last_heartbeat'),
        ]);

        if (profileRes.error) throw profileRes.error;

        const machines = machineRes.error ? [] : (machineRes.data || []);
        const machineByOwner = Object.fromEntries(
          machines.filter((m) => m.owner_id).map((m) => [m.owner_id, m])
        );

        const mapped = (profileRes.data || []).map((p) => {
          const machine = machineByOwner[p.id];
          const hardwareId = p.linked_machine_id || machine?.machine_id || 'Unclaimed';
          return {
            id: p.id,
            email: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id.slice(0, 8),
            role: (p.role || 'farmer').toLowerCase(),
            lastSeen: formatLastSeen(machine?.last_heartbeat),
            isOnline: Boolean(machine?.is_online),
            joined: p.created_at ? new Date(p.created_at).toLocaleDateString() : '—',
            hardwareId,
            profileId: p.id,
          };
        });

        if (!cancelled) setUsers(mapped);
      } catch (err) {
        console.warn('AdminDirectory load failed:', err.message);
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filteredUsers = useMemo(
    () => users.filter((u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.hardwareId.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [users, searchTerm]
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  async function confirmUnpair() {
    if (!unpairTarget) return;
    try {
      await supabase
        .from('profiles')
        .update({ linked_machine_id: null })
        .eq('id', unpairTarget.profileId);

      if (unpairTarget.hardwareId && unpairTarget.hardwareId !== 'Unclaimed') {
        await supabase
          .from('machines')
          .update({ owner_id: null })
          .eq('machine_id', unpairTarget.hardwareId);
      }

      setUsers((prev) => prev.map((u) => (
        u.id === unpairTarget.id
          ? { ...u, hardwareId: 'Unclaimed', isOnline: false, lastSeen: 'Never' }
          : u
      )));
    } catch (err) {
      console.warn('Force unpair failed:', err.message);
    } finally {
      setUnpairTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      {unpairTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setUnpairTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-0 overflow-hidden border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-red-100 p-1.5 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-red-800">Force Unpair Hardware</h3>
              </div>
              <button onClick={() => setUnpairTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-gray-600 mb-4">
                You are about to <strong className="text-red-700">Force Unpair</strong> the following machine from its registered owner.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Account:</span>
                  <span className="text-[#3E2723] font-bold">{unpairTarget.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">Machine ID:</span>
                  <span className="font-mono text-[#3E2723] font-bold">{unpairTarget.hardwareId}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setUnpairTarget(null)}
                className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnpair}
                className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors"
              >
                Confirm Unpair
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3E2723]">User & Machine Directory</h1>
          <p className="text-sm text-[#A1887F]">Security governance for physical hardware pairing and deployments.</p>
        </div>
      </div>

      <div className="bg-white border border-[#A1887F]/20 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6D4C41]" />
            <h3 className="text-lg font-bold text-[#3E2723]">Registered Fleet</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search fleet..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E2723] focus:border-transparent w-full sm:w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAF0E6] text-[#A1887F] uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Account</th>
                <th className="px-6 py-4 whitespace-nowrap">Role</th>
                <th className="px-6 py-4 whitespace-nowrap">Machine Heartbeat (Live)</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">
                    Loading directory…
                  </td>
                </tr>
              ) : paginatedUsers.length > 0 ? (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FFF8F0]/50 transition-colors">
                    <td className="px-6 py-4 text-[#3E2723] font-medium">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.role === 'admin' ? (
                        <span className="inline-flex items-center text-indigo-700 font-bold text-[10px] uppercase bg-indigo-50 px-2 py-1 rounded border border-indigo-200">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-emerald-700 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          Farmer
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center w-fit text-gray-600 font-mono text-xs bg-gray-100 px-2.5 py-1.5 rounded-md border border-gray-200">
                          <div className="relative flex h-2 w-2 mr-2">
                            {u.isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${u.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                          </div>
                          <Server className="w-3 h-3 mr-1.5 text-gray-400" />
                          {u.hardwareId}
                        </span>
                        <span className="text-[10px] font-medium text-gray-400 pl-1 uppercase tracking-wide">
                          Last Seen: {u.lastSeen}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role !== 'admin' && u.hardwareId !== 'Unclaimed' && (
                        <button
                          onClick={() => setUnpairTarget(u)}
                          className="inline-flex items-center text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 font-bold text-xs px-3 py-1.5 rounded-lg border border-red-200 transition-colors focus:outline-none"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                          Force Unpair
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No users or machines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > ITEMS_PER_PAGE && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-center bg-white">
            <div className="inline-flex items-center gap-1.5 bg-[#F3F4F6] p-1.5 rounded-full shadow-inner border border-gray-200">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-5 py-2.5 rounded-full bg-white text-gray-700 text-sm font-bold shadow-sm border border-gray-200 hover:bg-gray-50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const page = i + 1;
                const isActive = currentPage === page;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all focus:outline-none ${
                      isActive
                        ? 'bg-white text-black shadow-sm border border-gray-200'
                        : 'text-gray-500 hover:text-black hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-6 py-2.5 rounded-full bg-black text-white text-sm font-bold hover:bg-gray-800 shadow-sm focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors ml-1"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
