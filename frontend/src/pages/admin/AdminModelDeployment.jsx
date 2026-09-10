import { useMemo, useState } from 'react';
import { UploadCloud, CheckCircle, RotateCcw, Info, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminModelDeployment() {
  const [isDragging, setIsDragging] = useState(false);
  const [versions, setVersions] = useState([]);
  const [hoveredInfo, setHoveredInfo] = useState(null);
  const [selectedTask, setSelectedTask] = useState('variety');
  const [showUploadToast, setShowUploadToast] = useState(false);
  const [filterType, setFilterType] = useState('All');

  const metricsData = useMemo(() => [], []);
  const currentConfidence = metricsData.length ? metricsData[metricsData.length - 1].confidence : null;
  const isWarning = currentConfidence != null && currentConfidence < 80;

  const handleActivate = (targetId) => {
    const target = versions.find((v) => v.id === targetId);
    if (!target) return;

    setVersions((prev) => prev.map((v) => {
      if (v.task === target.task && v.status === 'Active') {
        return { ...v, status: 'Archived' };
      }
      if (v.id === targetId) {
        return { ...v, status: 'Active' };
      }
      return v;
    }));
  };

  const filtered = versions.filter((v) => filterType === 'All' || v.task.includes(filterType));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3E2723]">Model Deployment</h1>
          <p className="text-sm text-[#A1887F]">Manage AI weights, version control, and monitor live confidence.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <p className="text-sm text-[#A1887F] mb-3">
              Drag and drop your updated <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.pt</code> or <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">.onnx</code> model files here.
            </p>

            <div className="flex items-center justify-center gap-6 mb-4">
              <label className="text-sm font-bold text-gray-500">Select Model Task:</label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                selectedTask === 'variety' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}>
                <input type="radio" name="task" value="variety" checked={selectedTask === 'variety'} onChange={() => setSelectedTask('variety')} className="sr-only" />
                <span className="w-3 h-3 rounded-full border-2 flex items-center justify-center border-current">
                  {selectedTask === 'variety' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                </span>
                <span className="font-bold text-sm">Variety (Model A)</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                selectedTask === 'quality' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}>
                <input type="radio" name="task" value="quality" checked={selectedTask === 'quality'} onChange={() => setSelectedTask('quality')} className="sr-only" />
                <span className="w-3 h-3 rounded-full border-2 flex items-center justify-center border-current">
                  {selectedTask === 'quality' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                </span>
                <span className="font-bold text-sm">Quality (Model B)</span>
              </label>
            </div>

            <button
              onClick={() => { setShowUploadToast(true); setTimeout(() => setShowUploadToast(false), 4000); }}
              className="bg-[#3E2723] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-[#5C3D2E] transition-colors"
            >
              Browse Files
            </button>
          </div>

          {showUploadToast && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-800">Upload queued</p>
                <p className="text-xs text-green-700 mt-0.5">
                  Model registry persistence is not connected yet. No fake version history will be shown.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-1 bg-white border border-[#A1887F]/20 rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-[#A1887F] uppercase tracking-wider mb-4">Inference QA Monitor</h3>
            <p className={`text-4xl font-extrabold ${isWarning ? 'text-amber-600' : 'text-green-600'}`}>
              {currentConfidence == null ? '—' : `${currentConfidence}%`}
            </p>
            <p className="text-xs text-gray-500 mt-1">Awaiting live confidence metrics</p>
          </div>

          {metricsData.length === 0 ? (
            <div className="mt-6 flex h-32 items-center justify-center text-xs text-[#BCAAA4]">
              No confidence history yet
            </div>
          ) : (
            <div className="h-32 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A1887F' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val) => [`${val}%`, 'Confidence']}
                  />
                  <Line type="monotone" dataKey="confidence" stroke={isWarning ? '#d97706' : '#16a34a'} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {isWarning && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>Confidence dipped below 80%. Retraining recommended.</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#A1887F]/20 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#3E2723]">Version History</h3>
          <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200">
            {['All', 'Variety', 'Quality'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${
                  filterType === type ? 'bg-white text-gray-800 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {type === 'Variety' ? 'Model A = Variety' : type === 'Quality' ? 'Model B = Quality' : 'All'}
              </button>
            ))}
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
              {filtered.length > 0 ? (
                filtered.map((ver) => (
                  <tr key={ver.id} className="hover:bg-[#FFF8F0]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#3E2723] font-medium text-xs">{ver.name}</span>
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
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
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
                    No model versions registered yet.
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
