import { Terminal, ShieldAlert, Wifi, Cpu, Activity, AlertTriangle } from 'lucide-react';

const DUMMY_LOGIN_AUDIT = [
  { id: 1, email: 'danrebmaster220@gmail.com', timestamp: '2026-07-06 15:30:12', ipState: '192.168.1.1 (Zamboanga)', isSuspicious: false },
  { id: 2, email: 'farmer_boy@cacaoscan.app', timestamp: '2026-07-06 14:12:05', ipState: '112.203.45.1 (Unknown)', isSuspicious: true },
  { id: 3, email: 'coop_manager@cacaoscan.app', timestamp: '2026-07-05 09:22:41', ipState: '192.168.1.15 (Davao)', isSuspicious: false },
];

const DUMMY_HARDWARE_EVENTS = [
  { id: 1, machine: 'CS-MASTER', event: 'New .onnx model deployed (yolov8_retrained_v1)', time: '10 mins ago', type: 'info', icon: Terminal },
  { id: 2, machine: 'CS-ZN-004', event: 'Low Wi-Fi Signal (-85 dBm)', time: '1 hour ago', type: 'warning', icon: Wifi },
  { id: 3, machine: 'CS-DV-012', event: 'Conveyor Jam Detected (Motor Amp Spike)', time: '3 hours ago', type: 'error', icon: AlertTriangle },
  { id: 4, machine: 'CS-MASTER', event: 'System Reboot Initiated', time: '1 day ago', type: 'info', icon: Cpu },
];

export default function AdminTechnicalLogs() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
         <div>
            <h1 className="text-2xl font-extrabold text-[#3E2723]">System Technical Logs</h1>
            <p className="text-sm text-[#A1887F]">ISO 27001 Audit Trails and hardware event feeds.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         
         {/* Login Audit Table */}
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
                     {DUMMY_LOGIN_AUDIT.map((log) => (
                       <tr key={log.id} className="hover:bg-[#FFF8F0]/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-[#3E2723]">
                             {log.email}
                             <span className="block text-xs font-normal text-gray-400 mt-0.5">{log.ipState}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{log.timestamp}</td>
                          <td className="px-4 py-3 text-right">
                             {log.isSuspicious ? (
                               <span className="inline-flex items-center text-red-700 font-bold text-[10px] uppercase bg-red-50 px-2 py-1 rounded border border-red-200">
                                 Suspicious
                               </span>
                             ) : (
                               <span className="inline-flex items-center text-emerald-700 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                 Verified
                               </span>
                             )}
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Hardware Event Feed */}
         <div className="bg-white border border-[#A1887F]/20 rounded-xl shadow-sm flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
               <Activity className="w-5 h-5 text-[#6D4C41]" />
               <h3 className="text-lg font-bold text-[#3E2723]">Live Hardware Events</h3>
            </div>
            
            <div className="p-4 flex-1 h-[300px] overflow-y-auto">
               <div className="space-y-4">
                  {DUMMY_HARDWARE_EVENTS.map((evt) => (
                    <div key={evt.id} className="flex gap-4 p-3 rounded-lg border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all">
                       <div className={`shrink-0 p-2 rounded-full h-fit ${
                         evt.type === 'error' ? 'bg-red-50 text-red-600' :
                         evt.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                         'bg-[#FAF0E6] text-[#6D4C41]'
                       }`}>
                          <evt.icon className="w-4 h-4" />
                       </div>
                       <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {evt.machine}
                            </span>
                            <span className="text-xs text-gray-400">{evt.time}</span>
                          </div>
                          <p className={`text-sm ${
                            evt.type === 'error' ? 'text-red-700 font-bold' :
                            evt.type === 'warning' ? 'text-amber-700 font-medium' :
                            'text-[#3E2723]'
                          }`}>
                             {evt.event}
                          </p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

      </div>
    </div>
  );
}
