import { Activity, ServerCrash, Cpu } from 'lucide-react';
import { LineChart, Line, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DUMMY_LATENCY_DATA = [
  { time: '10:00', latency: 45 },
  { time: '10:05', latency: 52 },
  { time: '10:10', latency: 48 },
  { time: '10:15', latency: 120 }, // spike
  { time: '10:20', latency: 61 },
  { time: '10:25', latency: 45 },
  { time: '10:30', latency: 50 },
];

export default function AdminGlobalStats() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
         <div>
            <h1 className="text-2xl font-extrabold text-[#3E2723]">Global System Stats</h1>
            <p className="text-sm text-[#A1887F]">Fleet overview and ecosystem operational health.</p>
         </div>
         <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-bold text-green-700">System Healthy</span>
         </div>
      </div>

      {/* KPI Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Processed</p>
            <p className="text-3xl font-extrabold text-[#3E2723]">1.2M <span className="text-sm text-gray-400 font-normal">beans</span></p>
          </div>
          <div className="bg-[#FAF0E6] p-3 rounded-full">
            <Activity className="w-6 h-6 text-[#6D4C41]" />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Global Accuracy</p>
            <p className="text-3xl font-extrabold text-green-600">89.4%</p>
          </div>
          <div className="bg-green-50 p-3 rounded-full">
            <ServerCrash className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Active Nodes</p>
            <p className="text-3xl font-extrabold text-[#3E2723]">42 <span className="text-sm text-gray-400 font-normal">ESP32 units</span></p>
          </div>
          <div className="bg-[#FAF0E6] p-3 rounded-full">
            <Cpu className="w-6 h-6 text-[#6D4C41]" />
          </div>
        </div>
      </div>

      {/* Latency Tracker */}
      <div className="bg-white border border-[#A1887F]/20 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-[#A1887F] uppercase tracking-wider mb-6">API Latency Tracker (FastAPI Inference Server)</h3>
        <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
              <LineChart data={DUMMY_LATENCY_DATA}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                 <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#A1887F' }} />
                 <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val) => [`${val}ms`, 'Response Time']}
                 />
                 <Line 
                    type="monotone" 
                    dataKey="latency" 
                    stroke="#D97706" 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 2, fill: '#D97706' }} 
                 />
              </LineChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
