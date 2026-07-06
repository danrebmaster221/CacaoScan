import { useState } from 'react';
import { DownloadCloud, Tag, CheckSquare, Square, ArchiveRestore } from 'lucide-react';

// Using solid placeholder images that won't break
const DUMMY_ERRORS = [
  { 
    id: 1, 
    url: 'https://images.unsplash.com/photo-1621508654686-809f23efdabc?w=400&q=80', // Working cacao bean image
    pred: 'Forastero', 
    groundTruth: 'Criollo', 
    confidence: 72,
    modelVersion: 'yolo_v5_cacao_variety_base.pt (v1.0)'
  },
  { 
    id: 2, 
    url: 'https://images.unsplash.com/photo-1606716914589-9e8cce91124c?w=400&q=80', 
    pred: 'Over-fermented', 
    groundTruth: 'Export Grade', 
    confidence: 81,
    modelVersion: 'yolov8_quality_retrained_v2.onnx (v2.1)'
  },
  { 
    id: 3, 
    url: 'https://images.unsplash.com/photo-1549449339-fc9fe3564e9a?w=400&q=80', 
    pred: 'Trinitario', 
    groundTruth: 'Forastero', 
    confidence: 65,
    modelVersion: 'yolov8_variety_zamboanga_v3.pt (v3.0)'
  },
  { 
    id: 4, 
    url: 'https://images.unsplash.com/photo-1511381395561-12c5bda2c5df?w=400&q=80', 
    pred: 'Under-fermented', 
    groundTruth: 'Slately', 
    confidence: 58,
    modelVersion: 'yolov8_quality_retrained_v2.onnx (v2.1)'
  },
];

export default function AdminMLOpsWorkbench() {
  const [items, setItems] = useState(DUMMY_ERRORS);
  const [selected, setSelected] = useState([]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selected.length === items.length) {
      setSelected([]);
    } else {
      setSelected(items.map(e => e.id));
    }
  };

  const handleResolve = (id) => {
    // In production, this would update Supabase to 'resolved' or 'archived'
    setItems(prev => prev.filter(item => item.id !== id));
    setSelected(prev => prev.filter(selectedId => selectedId !== id));
  };

  return (
    <div className="space-y-6 relative h-full">
      <div className="flex justify-between items-end">
         <div>
            <h1 className="text-2xl font-extrabold text-[#3E2723]">MLOps Data Workbench</h1>
            <p className="text-sm text-[#A1887F]">Human-in-the-Loop validation. Audit field corrections and export for Active Learning.</p>
         </div>
      </div>

      <div className="bg-white border border-[#A1887F]/20 rounded-xl p-5 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-4">
            <button 
              onClick={selectAll} 
              disabled={items.length === 0}
              className="flex items-center gap-2 text-sm font-bold text-[#6D4C41] hover:text-[#3E2723] disabled:opacity-50"
            >
              {selected.length === items.length && items.length > 0 ? (
                <CheckSquare className="w-5 h-5 text-[#3E2723]" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
              {selected.length === items.length && items.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-gray-500">
               {selected.length} of {items.length} records selected
            </span>
         </div>
         <button 
           disabled={selected.length === 0}
           onClick={() => alert('Downloading zip file of images and YOLO label txts to Ryzen 7 workstation...')}
           className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all ${
             selected.length > 0 
               ? 'bg-[#3E2723] text-white hover:bg-[#5C3D2E] scale-100'
               : 'bg-gray-100 text-gray-400 cursor-not-allowed scale-95'
           }`}
         >
           <DownloadCloud className="w-5 h-5" />
           Export YOLO Dataset
         </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
         {items.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <p className="text-gray-500 font-medium">All flags have been resolved and tracked!</p>
            </div>
         ) : (
           items.map((err) => {
             const isSelected = selected.includes(err.id);
             return (
               <div 
                 key={err.id}
                 onClick={() => toggleSelect(err.id)}
                 className={`relative bg-white rounded-xl shadow-sm overflow-hidden border-2 cursor-pointer transition-all ${
                   isSelected ? 'border-[#3E2723] ring-4 ring-[#3E2723]/10 transform scale-[1.02]' : 'border-gray-200 hover:border-[#D7CCC8]'
                 }`}
               >
                  {/* Selection Checkbox (Explicit UI) */}
                  <div className="absolute top-3 left-3 z-10 bg-white rounded-md shadow-sm border border-gray-200 p-0.5">
                    {isSelected ? (
                      <CheckSquare className="w-6 h-6 text-[#3E2723]" />
                    ) : (
                      <Square className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  <img 
                    src={err.url} 
                    alt="Flagged Bean" 
                    className="w-full h-40 object-cover"
                  />
                  
                  <div className="p-4 bg-white space-y-3">
                     {/* Added Model Version ID */}
                     <p className="text-[9px] font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded truncate border border-gray-100" title={err.modelVersion}>
                       🧠 {err.modelVersion}
                     </p>
                     
                     <div className="flex items-center justify-between">
                       <span className="text-xs text-red-600 font-bold bg-red-50 px-2.5 py-1.5 rounded border border-red-200">
                         AI: {err.pred} ({err.confidence}%)
                       </span>
                     </div>
                     
                     <div className="flex flex-col border-t border-gray-100 pt-3">
                       <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Farmer Ground Truth</span>
                       <div className="flex items-center text-green-700 font-bold text-sm">
                         <Tag className="w-4 h-4 mr-1.5 opacity-70" />
                         {err.groundTruth}
                       </div>
                     </div>

                     {/* Resolve Button */}
                     <div className="pt-2">
                       <button
                         onClick={(e) => {
                           e.stopPropagation(); // Don't trigger the select toggle
                           handleResolve(err.id);
                         }}
                         className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-green-50 hover:text-green-700 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                       >
                         <ArchiveRestore className="w-3.5 h-3.5" />
                         Resolve & Archive
                       </button>
                     </div>
                  </div>
               </div>
             );
           })
         )}
      </div>
    </div>
  );
}
