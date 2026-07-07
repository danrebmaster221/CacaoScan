import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './components/dashboard/DashboardHome';
import ModulePlaceholder from './components/dashboard/ModulePlaceholder';
import { Archive, LineChart, BrainCircuit, Cpu } from 'lucide-react';

import AdminGlobalStats from './pages/admin/AdminGlobalStats';
import AdminDirectory from './pages/admin/AdminDirectory';
import AdminModelDeployment from './pages/admin/AdminModelDeployment';
import AdminMLOpsWorkbench from './pages/admin/AdminMLOpsWorkbench';
import AdminTechnicalLogs from './pages/admin/AdminTechnicalLogs';

const LoadingScreen = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFF8F0]">
    <img src="/cacaoscanlogo.png" alt="CacaoScan" className="mb-6 h-auto w-48 animate-pulse object-contain" />
    <p className="text-sm font-bold tracking-wide text-[#6D4C41]">
      <span className="dashboard-loading-dots">Verifying security perimeter</span>
    </p>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { session, isLoading } = useAuth();
  
  if (isLoading) return <LoadingScreen />;
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AdminRoute = ({ children }) => {
  const { session, userRole, isLoading } = useAuth();
  
  if (isLoading) return <LoadingScreen />;
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  if (userRole !== 'admin') {
     return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Gateway */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Structural Shell */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
             <Route index element={<DashboardHome />} />
             <Route path="batches" element={<ModulePlaceholder title="Central Batch Ledger" description="Track fermentation cycles, drying progress, and batch quality metrics across your farm operations." icon={Archive} />} />
             <Route path="predictions" element={<ModulePlaceholder title="Yield & Logic Predictor" description="AI-powered harvest forecasting and grade prediction models will be available here." icon={LineChart} />} />
             <Route path="mlops" element={<ModulePlaceholder title="AI Feedback Center" description="Submit model corrections and review retraining pipelines for improved accuracy." icon={BrainCircuit} />} />
             <Route path="hardware" element={<ModulePlaceholder title="Hardware Diagnostics" description="Monitor ESP32 nodes, camera modules, and edge device connectivity status." icon={Cpu} />} />
             
             {/* Admin Paths */}
             <Route path="admin" element={<AdminRoute><AdminGlobalStats /></AdminRoute>} />
             <Route path="admin/directory" element={<AdminRoute><AdminDirectory /></AdminRoute>} />
             <Route path="admin/models" element={<AdminRoute><AdminModelDeployment /></AdminRoute>} />
             <Route path="admin/workbench" element={<AdminRoute><AdminMLOpsWorkbench /></AdminRoute>} />
             <Route path="admin/logs" element={<AdminRoute><AdminTechnicalLogs /></AdminRoute>} />
          </Route>

          {/* Root Capture */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}