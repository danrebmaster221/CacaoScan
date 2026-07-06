import { useState } from 'react';
import AdminModelDeployment from './AdminModelDeployment';
import AdminMLOpsWorkbench from './AdminMLOpsWorkbench';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('model-deployment');

  return (
    <div className="space-y-6">
      {/* Sub-navigation for Admin Modules */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('model-deployment')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'model-deployment'
                ? 'border-[#3E2723] text-[#3E2723]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Model Deployment
          </button>
          
          <button
            onClick={() => setActiveTab('mlops-workbench')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'mlops-workbench'
                ? 'border-[#3E2723] text-[#3E2723]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            MLOps Data Workbench
          </button>
          
          {/* Diagnostic tab disabled currently */}
          <button
            disabled
            className="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-300 cursor-not-allowed"
          >
            Technical Logs
          </button>
        </nav>
      </div>

      {/* Render Active Tab */}
      <div className="pt-4">
        {activeTab === 'model-deployment' && <AdminModelDeployment />}
        {activeTab === 'mlops-workbench' && <AdminMLOpsWorkbench />}
      </div>
    </div>
  );
}
