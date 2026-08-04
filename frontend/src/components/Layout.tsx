import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Flame,
  PlusCircle,
  ClipboardList, 
  BarChart3, 
  Settings, 
  Menu,
  X,
  LogOut,
  ExternalLink,
  FileText
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';
import { WangChaoHospitalLogo } from './WangChaoLogo';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navSections = [
    {
      groupTitle: 'ภาพรวม & รายงาน',
      items: [
        { 
          name: 'ความเสี่ยงวันนี้', 
          path: '/dashboard', 
          icon: Flame,
          badge: 'Live',
          badgeColor: 'bg-red-500/20 text-red-300 border border-red-500/30'
        },
        { 
          name: 'รายงานความเสี่ยงใหม่', 
          path: '/incidents/new', 
          icon: PlusCircle,
          badge: '+ แจ้งเหตุ',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
        },
        { 
          name: 'ความเสี่ยงที่คุณรายงาน', 
          path: '/my-reported', 
          icon: FileText,
          badge: null
        },
      ]
    },
    {
      groupTitle: 'การบริหารจัดการ',
      items: [
        { 
          name: 'ความเสี่ยงหน่วยงาน', 
          path: '/incidents/dept', 
          icon: ClipboardList,
          badge: null
        },
        // Only show team management if user belongs to a team or is admin
        ...((user?.teamId || user?.role === 'admin' || user?.accessrules === '1' || user?.accessrules === 'admin') ? [
          {
            name: 'ความเสี่ยงทีมดูแล',
            path: '/incidents/team',
            icon: ClipboardList,
            badge: 'ทีม'
          }
        ] : [])
      ]
    },
    {
      groupTitle: 'รายงาน & การวิเคราะห์',
      items: [
        { 
          name: 'วิเคราะห์ข้อมูลความเสี่ยง', 
          path: '/reports', 
          icon: BarChart3,
          badge: '5x5 Matrix',
          badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
        },
      ]
    },
    {
      groupTitle: 'ระบบ & กำหนดสิทธิ์',
      items: [
        { 
          name: 'ตั้งค่าระบบ', 
          path: '/settings', 
          icon: Settings,
          badge: null
        },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Aside */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[270px] bg-slate-900 border-r border-slate-800 text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col shadow-xl lg:shadow-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand Header */}
        <div className="flex items-center justify-between h-20 px-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <WangChaoHospitalLogo size={38} className="w-9 h-9" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-tight">รพ.วังเจ้า</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  RiskHRMS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">ระบบบริหารความเสี่ยง</p>
            </div>
          </div>
          <button 
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {section.groupTitle}
              </div>
              <div className="space-y-1 mt-1.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium group",
                        isActive 
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold" 
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className="shrink-0 transition-transform group-hover:scale-110" />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", item.badgeColor)}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* External Tool & User Profile Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 space-y-2.5">
          {/* RCA External Link */}
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-3.5 py-2.5 text-xs font-semibold text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/50 rounded-xl transition-all shadow-sm group"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
              <span>Swiss Cheese RCA Program</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
          
          {/* User Info Card */}
          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-750 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {user?.name || 'ผู้ดูแลระบบ (Admin)'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  แผนก: {user?.department_id ? `หน่วยที่ ${user.department_id}` : 'ทุกหน่วยงาน'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="ออกจากระบบ"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
        {/* Top Navbar */}
        <header className="h-18 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 z-10 sticky top-0 transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Hospital Logo & Brand Title */}
            <div className="flex items-center gap-3">
              <WangChaoHospitalLogo size={42} className="w-10 h-10 sm:w-11 sm:h-11" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                    ระบบบริหารความเสี่ยงโรงพยาบาลวังเจ้า
                  </h1>
                  <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    RiskHRMS
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Wang Chao Hospital Risk Management System
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {user?.name || 'ผู้ดูแลระบบ (Admin)'}
              </span>
            </div>

            <div className="w-9 h-9 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-sm uppercase">
              {user?.name ? user.name.charAt(0) : 'A'}
            </div>
          </div>
        </header>
        
        {/* Page Viewport */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 w-full">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
