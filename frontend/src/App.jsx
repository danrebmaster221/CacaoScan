function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-cacao">CacaoScan Management</h1>
        <button className="bg-pod hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-bold shadow-md transition">
          Generate Batch Report (PDF)
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quality Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-gradeA">
          <p className="text-gray-500 text-sm uppercase">Weekly Export Quality</p>
          <p className="text-4xl font-bold text-slate-800">88.4%</p>
        </div>

        {/* Total Batch Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-cacao">
          <p className="text-gray-500 text-sm uppercase">Batches Processed</p>
          <p className="text-4xl font-bold text-slate-800">42</p>
        </div>

        {/* AI Forecast Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-blue-500">
          <p className="text-gray-500 text-sm uppercase">AI Forecast Status</p>
          <p className="text-xl font-semibold text-blue-600">Optimizing Harvest...</p>
        </div>
      </div>
    </div>
  )
}

export default App