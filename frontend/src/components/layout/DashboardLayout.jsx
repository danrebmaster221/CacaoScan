import { useState, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CacaoLightTexture } from '../auth/CacaoLightTexture';
import DashboardPageHeader from '../dashboard/DashboardPageHeader';
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
  User,
  Users,
  Server,
  Activity,
  Database,
} from 'lucide-react';

function SidebarLogo({ expanded }) {
  if (!expanded) {
    return (
      <img
        src="/cacaoscanlogo.png"
        alt="CacaoScan"
        className="h-9 w-9 rounded-lg object-contain transition-transform duration-300"
      />
    );
  }

  return (
    <div className="flex flex-col items-center px-2">
      <img
        src="/cacaoscanlogo.png"
        alt="CacaoScan"
        className="h-auto w-full max-w-[160px] object-contain"
      />
      <div
        className="central-scan-width-sidebar -mt-4 flex justify-between text-[9px] font-bold leading-none text-[#FFB74D]"
        aria-label="CENTRAL"
      >
        {'CENTRAL'.split('').map((letter, i) => (
          <span key={`${letter}-${i}`}>{letter}</span>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { signOut, userRole, user } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [showProfileText, setShowProfileText] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const sidebarTimerRef = useRef(null);

  const handleSidebarEnter = () => {
    setIsSidebarHovered(true);
    sidebarTimerRef.current = setTimeout(() => setShowProfileText(true), 280);
  };

  const handleSidebarLeave = () => {
    setIsSidebarHovered(false);
    setShowProfileText(false);
    if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
  };

  const farmerNavigation = [
    { name: 'Dashboard Analytics', href: '/dashboard', icon: BarChart3 },
    { name: 'Batch Management', href: '/dashboard/batches', icon: Archive },
    { name: 'Yield Predictor', href: '/dashboard/predictions', icon: LineChart },
    { name: 'AI Intelligence Hub', href: '/dashboard/mlops', icon: BrainCircuit },
    { name: 'Hardware Config', href: '/dashboard/hardware', icon: Cpu },
  ];

  const adminNavigation = [
    { name: 'Global System Stats', href: '/dashboard/admin', icon: Activity },
    { name: 'User & Machine Directory', href: '/dashboard/admin/directory', icon: Users },
    { name: 'Model Deployment', href: '/dashboard/admin/models', icon: Server },
    { name: 'Data Workbench', href: '/dashboard/admin/workbench', icon: Database },
    { name: 'System Technical Logs', href: '/dashboard/admin/logs', icon: Settings },
  ];

  const navigation = userRole === 'admin' ? adminNavigation : farmerNavigation;

  const NavLink = ({ item, mobile = false }) => {
    const isActive = location.pathname === item.href;
    const expanded = mobile || isSidebarHovered;

    const baseClass = mobile
      ? 'block px-4 py-3 rounded-xl text-base font-medium transition-all duration-200'
      : `group relative flex items-center overflow-hidden py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
          expanded ? 'px-3' : 'justify-center px-0'
        }`;

    const activeClass = isActive
      ? 'bg-[#241815] text-[#FFB74D] shadow-inner ring-1 ring-[#4E342E]/40'
      : 'text-[#A1887F] hover:bg-[#1a100e] hover:text-[#EFEBE9]';

    return (
      <Link
        to={item.href}
        onClick={mobile ? () => setIsMobileMenuOpen(false) : undefined}
        className={`${baseClass} ${activeClass}`}
        title={!expanded && !mobile ? item.name : undefined}
      >
        {isActive && !mobile && (
          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#FFB74D]" />
        )}
        <item.icon
          className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
            isActive ? 'text-[#FFB74D]' : 'text-[#8D6E63] group-hover:text-[#D7CCC8]'
          } ${expanded && !mobile ? 'mr-3' : mobile ? 'mr-4' : ''}`}
        />
        <span
          className={`truncate whitespace-nowrap transition-all duration-300 ${
            expanded ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0'
          }`}
        >
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FFF8F0] font-sans">
      {/* Logout confirmation modal. */}
      {showLogoutModal && (
        <div
          className="dashboard-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="dashboard-modal-content w-full max-w-sm rounded-2xl border border-[#A1887F]/20 bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <LogOut className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-[#3E2723]">Confirm Logout</h3>
            <p className="mb-8 mt-2 text-sm font-medium text-[#A1887F]">
              Are you sure you want to end your CacaoScan secure session?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="rounded-xl border border-[#A1887F]/30 px-6 py-2.5 text-sm font-bold text-[#6D4C41] transition-colors hover:bg-[#FAF0E6]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  signOut();
                }}
                className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-red-700 active:scale-[0.98]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hover-expand sidebar with icon rail. */}
      <aside
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        className={`dashboard-sidebar dashboard-sidebar-enter hidden h-full flex-shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-in-out md:flex ${
          isSidebarHovered ? 'w-64' : 'w-[72px]'
        }`}
      >
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden pb-4 pt-5">
          {/* Sidebar logo. */}
          <div className="mb-5 flex flex-col items-center border-b border-[#241815] px-3 pb-5">
            <SidebarLogo expanded={isSidebarHovered} />
          </div>

          <nav className="flex-1 space-y-1 px-2.5">
            <p
              className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6D4C41] transition-all duration-300 ${
                isSidebarHovered ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              {userRole === 'admin' ? 'Administration' : 'Features'}
            </p>
            {navigation.map((item, i) => (
              <div key={item.name} className={`dashboard-nav-item dashboard-stagger-${i + 1}`}>
                <NavLink item={item} />
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar user footer. */}
        <div className="dashboard-sidebar-footer flex-shrink-0">
          <div
            className={`flex items-center px-3 py-3.5 transition-all ${
              isSidebarHovered ? '' : 'justify-center'
            }`}
          >
            <div className="relative flex-shrink-0 rounded-full bg-[#2C1F1A] p-1.5 ring-1 ring-[#3E2723]/60">
              <User className="h-5 w-5 text-[#FFB74D]" />
            </div>
            {showProfileText && (
              <div className="ml-3 min-w-0 flex-1 overflow-hidden">
                <p className="whitespace-nowrap text-xs font-medium leading-tight text-[#EFEBE9]">
                  {user?.email || 'Account'}
                </p>
                <p className="mt-0.5 whitespace-nowrap text-[11px] capitalize text-[#8D6E63]">{userRole}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className={`flex w-full items-center py-3.5 text-red-500/90 transition-colors hover:bg-[#1A1210] hover:text-red-400 ${
              isSidebarHovered ? 'px-4' : 'justify-center'
            }`}
            title={!isSidebarHovered ? 'Logout' : undefined}
          >
            <LogOut className={`h-5 w-5 flex-shrink-0 ${isSidebarHovered ? 'mr-3' : ''}`} />
            <span
              className={`whitespace-nowrap text-sm font-medium transition-all duration-300 ${
                isSidebarHovered ? 'opacity-100' : 'max-w-0 opacity-0'
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main content area. */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden transition-[flex-basis,width] duration-300 ease-in-out">
        {/* Cacao texture background. */}
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <CacaoLightTexture />
        </div>

        {/* Mobile header. */}
        <div className="relative z-20 flex items-center justify-between bg-gradient-to-r from-[#1A1210] to-[#140E0C] px-4 py-3.5 shadow-lg md:hidden">
          <div className="flex items-center gap-2">
            <img
              src="/cacaoscanlogo.png"
              alt="CacaoScan"
              className="h-9 w-auto max-w-[120px] object-contain"
            />
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-[#4E342E] hover:text-white"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile navigation. */}
        <div
          className={`dashboard-mobile-menu absolute left-0 right-0 top-[60px] z-50 md:hidden ${
            isMobileMenuOpen ? 'dashboard-mobile-menu-open' : 'dashboard-mobile-menu-closed'
          }`}
        >
          <nav className="border-b border-[#2C1F1A] bg-[#1A1210] px-4 pb-5 pt-2 shadow-2xl">
            <div className="mb-3 flex items-center border-b border-[#2C1F1A] px-2 py-3">
              <div className="rounded-full bg-[#2C1F1A] p-1.5 ring-1 ring-[#3E2723]/60">
                <User className="h-5 w-5 text-[#FFB74D]" />
              </div>
              <div className="ml-3 min-w-0 flex-1 overflow-hidden">
                <p className="whitespace-nowrap text-xs font-medium leading-tight text-white">
                  {user?.email || 'Account'}
                </p>
                <p className="mt-0.5 whitespace-nowrap text-[11px] capitalize text-[#A1887F]">{userRole}</p>
              </div>
            </div>

            <div className="space-y-1">
              {navigation.map((item) => (
                <NavLink key={item.name} item={item} mobile />
              ))}
            </div>

            <div className="mt-4 border-t border-[#5C3D2E]/60 pt-4">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-base font-medium text-red-500/90 hover:bg-[#2C1F1A]"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Logout
              </button>
            </div>
          </nav>
        </div>

        {/* Page content. */}
        <main className="relative z-10 flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6 md:py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10">
              <DashboardPageHeader />
              <div className="dashboard-content-enter">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
