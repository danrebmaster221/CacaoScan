import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';

const ModuleUnderConstruction = ({ title }) => (
    <div className="bg-white rounded-xl shadow-sm border border-[#A1887F]/20 p-10 text-center animate-pulse">
        <h2 className="text-3xl font-extrabold text-[#3E2723] mb-3">{title}</h2>
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
             <Route path="admin" element={<ModuleUnderConstruction title="Administrative RBAC Vault Encrypted..." />} />
          </Route>

          {/* Root Capture */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}