import { useState } from 'react';
import { UploadCloud, CheckCircle, RotateCcw, Info } from 'lucide-react';
import { LineChart, Line, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Initial version history with Model Task (Dual-Model Pipeline)
const INITIAL_VERSIONS = [
  { 
    id: 1, name: 'yolo_v5_cacao_variety_base.pt', date: 'Oct 15, 2025', 
    trainedBy: 'Alshaik', task: 'Variety (A)', status: 'Archived', confidence: 85.2,
    classes: 'Criollo, Forastero, Trinitario'
  },
  { 
    id: 2, name: 'yolo_v5_cacao_quality_base.pt', date: 'Nov 02, 2025', 
    trainedBy: 'Alshaik', task: 'Quality (B)', status: 'Archived', confidence: 82.7,
    classes: 'Export Grade, Under-fermented, Over-fermented, Slately, Moldy, Insect Damaged'
  },
  { 
    id: 3, name: 'yolov8_variety_retrained_v2.onnx', date: 'Jan 10, 2026', 
    trainedBy: 'Felixandra', task: 'Variety (A)', status: 'Active', confidence: 94.1,
    classes: 'Criollo, Forastero, Trinitario'
  },
  { 
    id: 4, name: 'yolov8_quality_retrained_v2.onnx', date: 'Mar 18, 2026', 
    trainedBy: 'Alshaik', task: 'Quality (B)', status: 'Active', confidence: 91.3,
    classes: 'Export Grade, Under-fermented, Over-fermented, Slately, Moldy, Insect Damaged'
  },
  { 
    id: 5, name: 'yolov8_variety_zamboanga_v3.pt', date: 'Jun 22, 2026', 
    trainedBy: 'Alfahad', task: 'Variety (A)', status: 'Archived', confidence: 89.4,
    classes: 'Criollo, Forastero, Trinitario'
  },
];

const METRICS_DATA = [
  { month: 'Jan', confidence: 86 },
  { month: 'Feb', confidence: 85 },
  { month: 'Mar', confidence: 78 },
  { month: 'Apr', confidence: 88 },
  { month: 'May', confidence: 91 },
  { month: 'Jun', confidence: 94 },
];

export default function AdminModelDeployment() {
  const [isDragging, setIsDragging] = useState(false);
  const [versions, setVersions] = useState(INITIAL_VERSIONS);
  const [hoveredInfo, setHoveredInfo] = useState(null);
  const [selectedTask, setSelectedTask] = useState('variety');
  const [showUploadToast, setShowUploadToast] = useState(false);
  const [filterType, setFilterType] = useState('All');

  const currentConfidence = METRICS_DATA[METRICS_DATA.length - 1].confidence;
  const isWarning = currentConfidence < 80;

  const handleActivate = (targetId) => {
    const target = versions.find(v => v.id === targetId);
    if (!target) return;

    setVersions(prev => prev.map(v => {
      // If same task category and was Active, archive it
      if (v.task === target.task && v.status === 'Active') {
        return { ...v, status: 'Archived' };
      }
      // The clicked one becomes Active
      if (v.id === targetId) {
        return { ...v, status: 'Active' };
      }
      return v;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
         <div>
            <h1 className="text-2xl font-extrabold text-[#3E2723]">Model Deployment</h1>
            <p className="text-sm text-[#A1887F]">Dual-Model Pipeline — Manage AI weights, version control, and monitor live confidence.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Drag and Drop Zone */}
         <div className="col-span-1 lg:col-span-2">
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); setShowUploadToast(true); setTimeout(() => setShowUploadToast(false), 4000); }}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                isDragging ? 'border-[#FFB74D] bg-[#FFF8F0]' : 'border-[#D7CCC8] bg-white hover:bg-gray-50'
              }`}
            >
              <div className="bg-[#FAF0E6] p-4 rounded-full w-fit mx-auto mb-4">
                 <UploadCloud className="w-8 h-8 text-[#6D4C41]" />
              </div>
              <h3 className="text-lg font-bold text-[#3E2723] mb-1">Upload New Weights</h3>
              <p className="text-sm text-[#A1887F] mb-3">Drag and drop your updated <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.pt</code> or <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.onnx</code> model files here.</p>
              
              {/* Model Task Selector */}
              <div className="flex items-center justify-center gap-6 mb-4">
                <label className="text-sm font-bold text-gray-500">Select Model Task:</label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTask === 'variety' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}>
                  <input type="radio" name="task" value="variety" checked={selectedTask === 'variety'} onChange={() => setSelectedTask('variety')} className="sr-only" />
                  <span className="w-3 h-3 rounded-full border-2 flex items-center justify-center border-current">
                    {selectedTask === 'variety' && <span className="w-1.5 h-1.5 rounded-full bg-current"></span>}
                  </span>
                  <span className="font-bold text-sm">Variety (Model A)</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTask === 'quality' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}>
                  <input type="radio" name="task" value="quality" checked={selectedTask === 'quality'} onChange={() => setSelectedTask('quality')} className="sr-only" />
                  <span className="w-3 h-3 rounded-full border-2 flex items-center justify-center border-current">
                    {selectedTask === 'quality' && <span className="w-1.5 h-1.5 rounded-full bg-current"></span>}
                  </span>
                  <span className="font-bold text-sm">Quality (Model B)</span>
                </label>
              </div>

              <p className="text-[10px] text-gray-400 mb-4 font-medium">Naming convention: <code className="bg-gray-50 px-1 py-0.5 rounded font-mono">[model]_[version]_[date].pt</code></p>
              <button 
                onClick={() => { setShowUploadToast(true); setTimeout(() => setShowUploadToast(false), 4000); }}
                className="bg-[#3E2723] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-[#5C3D2E] transition-colors"
              >
                Browse Files
              </button>
            </div>

            {/* Success Toast */}
            {showUploadToast && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-green-800">Upload Successful!</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    File registered to <code className="bg-green-100 px-1 rounded">ai_models</code> table as <strong>{selectedTask === 'variety' ? 'Variety (A)' : 'Quality (B)'}</strong>. Sync signal sent to FastAPI inference server.
                  </p>
                </div>
              </div>
            )}
         </div>

         {/* QA Metrics Panel */}
         <div className="col-span-1 bg-white border border-[#A1887F]/20 rounded-xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-[#A1887F] uppercase tracking-wider mb-4">Inference QA Monitor</h3>
              <p className={`text-4xl font-extrabold ${isWarning ? 'text-amber-600' : 'text-green-600'}`}>
                {currentConfidence}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Avg confidence (last 1,000 beans)</p>
            </div>
            
            <div className="h-32 mt-6">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={METRICS_DATA}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                     <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1887F' }} />
                     <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val) => [`${val}%`, 'Confidence']}
                     />
                     <Line 
                        type="monotone" 
                        dataKey="confidence" 
                        stroke={isWarning ? '#d97706' : '#16a34a'} 
                        strokeWidth={3} 
                        dot={(props) => {
                          const { cx, cy, value } = props;
                          return (
                            <circle 
                              cx={cx} cy={cy} r={4} strokeWidth={2}
                              fill={value < 80 ? '#d97706' : '#16a34a'}
                              stroke={value < 80 ? '#d97706' : '#16a34a'}
                            />
                          );
                        }}
                     />
                  </LineChart>
               </ResponsiveContainer>
            </div>
            
            {METRICS_DATA.some(m => m.confidence < 80) && (
              <div className="mt-4 bg-amber-50 rounded-lg p-3 border border-amber-200 text-xs text-amber-800">
                 ⚠️ Confidence dipped below 80% in <strong>
                   {METRICS_DATA.filter(m => m.confidence < 80).map(m => m.month).join(', ')}
                 </strong>. Retraining recommended.
              </div>
            )}
         </div>
      </div>

      {/* Version History Table */}
      <div className="bg-white border border-[#A1887F]/20 rounded-xl shadow-sm overflow-hidden flex flex-col">
         <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#3E2723]">Version History</h3>
            
            {/* Filter Tabs */}
            <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
               <button 
                  onClick={() => setFilterType('All')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${
                    filterType === 'All' ? 'bg-white text-gray-800 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                  }`}
               >
                  All
               </button>
               <button 
                  onClick={() => setFilterType('Variety')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${
                    filterType === 'Variety' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200' : 'text-gray-500 hover:text-blue-600'
                  }`}
               >
                  Model A = Variety
               </button>
               <button 
                  onClick={() => setFilterType('Quality')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${
                    filterType === 'Quality' ? 'bg-purple-50 text-purple-700 shadow-sm border border-purple-200' : 'text-gray-500 hover:text-purple-600'
                  }`}
               >
                  Model B = Quality
               </button>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-[#FAF0E6] text-[#A1887F] uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                     <th className="px-6 py-4 whitespace-nowrap">Model File</th>
                     <th className="px-6 py-4 whitespace-nowrap">Model Task</th>
                     <th className="px-6 py-4 whitespace-nowrap">Upload Date</th>
                     <th className="px-6 py-4 whitespace-nowrap">Trained By</th>
                     <th className="px-6 py-4 whitespace-nowrap text-center">Avg Confidence</th>
                     <th className="px-6 py-4 whitespace-nowrap text-right">Status / Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {versions.filter(v => filterType === 'All' || v.task.includes(filterType)).length > 0 ? (
                    versions.filter(v => filterType === 'All' || v.task.includes(filterType)).map((ver) => (
                    <tr key={ver.id} className="hover:bg-[#FFF8F0]/50 transition-colors">
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <span className="font-mono text-[#3E2723] font-medium text-xs">{ver.name}</span>
                             {/* Info tooltip for trained classes */}
                             <div className="relative">
                                <button
                                   onMouseEnter={() => setHoveredInfo(ver.id)}
                                   onMouseLeave={() => setHoveredInfo(null)}
                                   className="text-gray-400 hover:text-[#6D4C41] transition-colors"
                                >
                                   <Info className="w-3.5 h-3.5" />
                                </button>
                                {hoveredInfo === ver.id && (
                                   <div className="absolute left-6 top-0 z-20 bg-[#3E2723] text-white text-[10px] px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                                      <p className="font-bold mb-0.5">Trained Classes:</p>
                                      <p className="text-gray-300">{ver.classes}</p>
                                   </div>
                                )}
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`inline-flex items-center font-bold text-[10px] uppercase px-2.5 py-1 rounded-full border ${
                            ver.task.includes('Variety') 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {ver.task}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-gray-500">{ver.date}</td>
                       <td className="px-6 py-4 text-gray-500">{ver.trainedBy}</td>
                       <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            ver.confidence > 90 ? 'bg-green-100 text-green-700' :
                            ver.confidence < 80 ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {ver.confidence}%
                          </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          {ver.status === 'Active' ? (
                            <span className="inline-flex items-center text-green-600 font-bold text-xs uppercase bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                              Active
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleActivate(ver.id)}
                              className="inline-flex items-center text-[#6D4C41] font-bold text-xs uppercase bg-[#FAF0E6] hover:bg-[#F0E0D0] px-3 py-1.5 rounded-full border border-[#D7CCC8] transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              Activate
                            </button>
                          )}
                       </td>
                    </tr>
                  ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-medium">
                        No versions found for the selected task filter.
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
