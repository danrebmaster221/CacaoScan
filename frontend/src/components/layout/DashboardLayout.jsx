import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, 
  Archive, 
  Settings, 
  LogOut, 
  Cpu, 
  LineChart, 
  BrainCircuit,
  Menu,
  X,
  User
} from 'lucide-react';

export default function DashboardLayout() {
  const { signOut, userRole, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const navigation = [
    { name: 'Dashboard Analytics', href: '/dashboard', icon: BarChart3 },
    { name: 'Batch Management', href: '/dashboard/batches', icon: Archive },
    { name: 'Yield Predictor', href: '/dashboard/predictions', icon: LineChart },
    { name: 'AI Intelligence Hub', href: '/dashboard/mlops', icon: BrainCircuit },
    { name: 'Hardware Config', href: '/dashboard/hardware', icon: Cpu },
    { name: 'Admin Control', href: '/dashboard/admin', icon: Settings, adminOnly: true },
  ];

  return (
    <div className="flex h-screen bg-[#FFF8F0] overflow-hidden font-sans">
      
      {/* Logout Confirm Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 px-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center border border-[#A1887F]/20">
            <h3 className="text-xl font-bold text-[#3E2723] mb-2">Confirm Logout</h3>
            <p className="text-[#A1887F] font-medium text-sm mb-8">Are you sure you want to officially terminate your CacaoScan secure session?</p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="px-6 py-2.5 border border-[#A1887F]/30 rounded-lg text-sm font-bold text-[#6D4C41] hover:bg-[#FAF0E6] focus:outline-none transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => { setShowLogoutModal(false); signOut(); }}
                className="px-6 py-2.5 border border-transparent rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md focus:outline-none transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className={`flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} bg-[#3E2723] shadow-2xl relative z-10 transition-all duration-300`}>
          <div className="flex flex-col flex-grow pt-6 pb-4 overflow-y-auto">
            
            {/* Brand Logo Section */}
            <div className="flex flex-col items-center justify-center border-b border-[#5C3D2E] pb-6 mb-4">
              <div className={`flex items-center justify-center ${isCollapsed ? 'mb-4' : 'mb-3'}`}>
                <img src="/logo.png" alt="CacaoScan" className={`${isCollapsed ? 'h-8 px-1' : 'h-10 px-3'} w-auto bg-[#FAF0E6] rounded py-1 object-contain shadow-sm transition-all`} />
                {!isCollapsed && <span className="ml-3 text-[#FFB74D] text-lg font-bold tracking-wide">CacaoScan</span>}
              </div>
              
              {/* Collapse Toggle Icon */}
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)} 
                className="group flex items-center justify-center p-2 rounded-[14px] bg-[#4E342E] text-white hover:bg-[#5C3D2E] focus:outline-none shadow-md transition-all"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <svg 
                  width="22" 
                  height="22" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className={`text-gray-300 group-hover:text-white transition-transform duration-300 ${isCollapsed ? 'scale-x-[-1]' : 'scale-x-100'}`}
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
              </button>
            </div>

            <nav className="mt-2 flex-1 px-3 space-y-2 text-white overflow-hidden">
              {!isCollapsed && <p className="px-3 text-xs font-semibold text-[#A1887F] uppercase tracking-wider mb-2">Features</p>}
              {navigation.map((item) => {
                if (item.adminOnly && userRole !== 'admin') return null;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isCollapsed ? 'justify-center px-0' : 'px-3'
                    } ${
                      isActive 
                        ? 'bg-[#5C3D2E] text-[#FFB74D] shadow-inner border border-[#6D4C41]' 
                        : 'text-gray-300 hover:bg-[#4E342E] hover:text-white'
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className={`flex-shrink-0 h-5 w-5 ${isActive ? 'text-[#FFB74D]' : 'text-gray-400 group-hover:text-gray-300'} ${isCollapsed ? '' : 'mr-3'}`} />
                    {!isCollapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex-shrink-0 flex flex-col border-t border-[#5C3D2E] bg-[#2C1F1A]">
            
            {/* User Profile Section */}
            <div className={`flex items-center px-4 py-4 border-b border-[#5C3D2E] transition-all overflow-hidden ${isCollapsed ? 'justify-center px-2' : ''}`}>
              <div className="bg-[#4E342E] p-1.5 rounded-full inline-flex flex-shrink-0">
                 <User className="h-5 w-5 text-[#FFB74D]" />
              </div>
              {!isCollapsed && (
                 <div className="ml-3 truncate overflow-hidden">
                   <p className="text-sm font-medium text-white truncate max-w-full">{user?.email || 'Farmer Account'}</p>
                   <p className="text-xs text-gray-400 capitalize truncate">{userRole}</p>
                 </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className={`p-4 group flex items-center justify-center text-red-500 hover:bg-[#3E2723] hover:text-red-400 transition-colors w-full focus:outline-none`}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <p className="text-sm font-medium">Logout</p>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile Header Nav */}
        <div className="md:hidden flex items-center justify-between bg-[#3E2723] py-4 px-4 shadow-md z-20">
          <div className="flex items-center">
             <img src="/logo.png" alt="CacaoScan" className="h-8 w-auto bg-[#FAF0E6] rounded px-2 object-contain" />
             <span className="ml-3 text-[#FFB74D] font-bold text-lg">CacaoScan</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-300 hover:text-white focus:outline-none p-1 rounded-md"
          >
            {isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[72px] left-0 w-full bg-[#3E2723] z-50 shadow-2xl border-b border-[#5C3D2E]">
            <nav className="px-4 pt-2 pb-5 space-y-2">
              {/* Profile Block Mobile */}
              <div className="flex items-center px-2 py-3 mb-2 border-b border-[#5C3D2E]">
                 <div className="bg-[#4E342E] p-1.5 rounded-full inline-flex flex-shrink-0">
                    <User className="h-5 w-5 text-[#FFB74D]" />
                 </div>
                 <div className="ml-3 truncate">
                    <p className="text-sm font-medium text-white truncate max-w-full">{user?.email || 'Farmer Account'}</p>
                 </div>
              </div>
              
              {navigation.map((item) => {
                if (item.adminOnly && userRole !== 'admin') return null;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-md text-base font-medium transition-colors ${
                      isActive ? 'bg-[#5C3D2E] text-[#FFB74D]' : 'text-gray-300 hover:bg-[#4E342E] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                       <item.icon className="mr-4 h-5 w-5" />
                       {item.name}
                    </div>
                  </Link>
                );
              })}
              <div className="border-t border-[#5C3D2E] mt-4 pt-4">
                 <button
                   onClick={() => { setIsMobileMenuOpen(false); setShowLogoutModal(true); }}
                   className="w-full flex items-center justify-center px-4 py-3 rounded-md text-base font-medium text-red-500 hover:bg-[#4E342E]"
                 >
                   <LogOut className="mr-4 h-5 w-5" />
                   Logout
                 </button>
              </div>
            </nav>
          </div>
        )}

        {/* Active Module Canvas Area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
               <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
