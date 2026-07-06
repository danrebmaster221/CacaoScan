import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';

import AdminGlobalStats from './pages/admin/AdminGlobalStats';
import AdminDirectory from './pages/admin/AdminDirectory';
import AdminModelDeployment from './pages/admin/AdminModelDeployment';
import AdminMLOpsWorkbench from './pages/admin/AdminMLOpsWorkbench';
import AdminTechnicalLogs from './pages/admin/AdminTechnicalLogs';

const ModuleUnderConstruction = ({ title }) => (
  <div className="p-8 text-center text-gray-500 font-medium border border-dashed rounded-lg bg-gray-50 mt-4">
    {title}
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { session, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center"><p className="text-[#6D4C41] font-bold text-lg animate-pulse">Verifying security perimeter...</p></div>;
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AdminRoute = ({ children }) => {
  const { session, userRole, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center"><p className="text-[#6D4C41] font-bold text-lg animate-pulse">Verifying security perimeter...</p></div>;
  }
  
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
             <Route index element={<ModuleUnderConstruction title="Analytics Board Initialization..." />} />
             <Route path="batches" element={<ModuleUnderConstruction title="Central Batch Ledger Pending..." />} />
             <Route path="predictions" element={<ModuleUnderConstruction title="Yield & Logic Predictor Offline..." />} />
             <Route path="mlops" element={<ModuleUnderConstruction title="AI Feedback Center Secure..." />} />
             <Route path="hardware" element={<ModuleUnderConstruction title="Hardware Diagnostics Ready..." />} />
             
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