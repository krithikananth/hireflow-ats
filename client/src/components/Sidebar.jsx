import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, Kanban, LogOut, 
  Menu, X, ChevronRight, Shield 
} from 'lucide-react';
import { useState } from 'react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['HR'] },
    { path: '/candidates', label: 'Candidates', icon: Users, roles: ['HR', 'Employee'] },
    { path: '/jobs', label: 'Jobs', icon: Briefcase, roles: ['HR'] },
    { path: '/pipeline', label: 'Pipeline', icon: Kanban, roles: ['HR'] },
    { path: '/admin', label: 'Admin Panel', icon: Shield, roles: ['HR'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role));

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile menu button */}
      <button
        id="mobile-menu-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg border border-surface-200"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full z-40
        w-[280px] bg-white border-r border-surface-200
        flex flex-col
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900">HireFlow</h1>
              <p className="text-xs text-surface-400 font-medium">ATS Platform</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 mx-4 mt-4 bg-gradient-to-r from-primary-50 to-primary-100/50 rounded-xl border border-primary-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-800 truncate">{user?.name}</p>
              <p className="text-xs text-primary-600 font-medium">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                id={`nav-${item.label.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                  transition-all duration-200 group
                  ${active 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' 
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                  }
                `}
              >
                <Icon size={20} className={active ? 'text-white' : 'text-surface-400 group-hover:text-primary-500'} />
                <span>{item.label}</span>
                {active && <ChevronRight size={16} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-surface-100">
          <button
            id="logout-button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              text-danger-500 hover:bg-danger-500/10 transition-all duration-200 w-full"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
