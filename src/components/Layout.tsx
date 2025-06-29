import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Home,
  FileText,
  Plus,
  CheckCircle,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Solicitudes', href: '/requests', icon: FileText },
    { name: 'Nueva Solicitud', href: '/requests/new', icon: Plus },
    { name: 'Aprobaciones', href: '/approvals', icon: CheckCircle },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ...(user?.permissions.specialPermissions?.includes('user_management') 
       ? [{ name: 'Usuarios', href: '/users', icon: Users }] 
       : [])
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-900">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-amber-500 mr-3" />
            <span className="text-white font-semibold text-lg">MineOps</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-2 transition-colors duration-200
                  ${isActive 
                    ? 'bg-amber-500 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user?.profile.firstName.charAt(0)}{user?.profile.lastName.charAt(0)}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-white text-sm font-medium">
                {user?.profile.firstName} {user?.profile.lastName}
              </p>
              <p className="text-slate-400 text-xs">{user?.profile.position}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center">
            <div className="text-sm text-slate-600">
              {user?.profile.department} - {user?.profile.location}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`
              px-2 py-1 text-xs rounded-full font-medium
              ${{
                'technical_field': 'bg-blue-100 text-blue-800',
                'supervisor_maintenance': 'bg-green-100 text-green-800',
                'maintenance_manager': 'bg-purple-100 text-purple-800',
                'operations_superintendent': 'bg-orange-100 text-orange-800',
                'procurement_manager': 'bg-teal-100 text-teal-800',
                'financial_manager': 'bg-red-100 text-red-800',
                'general_manager': 'bg-amber-100 text-amber-800'
              }[user?.permissions.role || 'technical_field']}
            `}>
              {user?.permissions.role?.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;