import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';

const UserManagement = () => {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);

  // Mock users data - in production, this would come from your API
  const [users, setUsers] = useState([
    {
      _id: '1',
      employeeId: 'EMP-2025-001',
      email: 'carlos.lopez@minera.com',
      profile: {
        firstName: 'Carlos',
        lastName: 'López',
        position: 'Supervisor de Mantenimiento',
        department: 'Mantenimiento Mina',
        location: 'Operación Tajo Norte',
        phone: '+51-999-888-777'
      },
      permissions: {
        role: 'supervisor_maintenance',
        approvalLimits: {
          maxAmount: 10000,
          currency: 'USD'
        }
      },
      status: 'active',
      lastLogin: '2025-01-12T10:30:00Z'
    },
    {
      _id: '2',
      employeeId: 'EMP-2025-002',
      email: 'ana.garcia@minera.com',
      profile: {
        firstName: 'Ana',
        lastName: 'García',
        position: 'Jefe de Mantenimiento',
        department: 'Mantenimiento Mina',
        location: 'Oficina Central',
        phone: '+51-888-777-666'
      },
      permissions: {
        role: 'maintenance_manager',
        approvalLimits: {
          maxAmount: 50000,
          currency: 'USD'
        }
      },
      status: 'active',
      lastLogin: '2025-01-12T09:15:00Z'
    },
    {
      _id: '3',
      employeeId: 'EMP-2025-003',
      email: 'juan.perez@minera.com',
      profile: {
        firstName: 'Juan',
        lastName: 'Pérez',
        position: 'Técnico Mecánico Senior',
        department: 'Mantenimiento Mina',
        location: 'Pit 1 - Level 2400',
        phone: '+51-777-666-555'
      },
      permissions: {
        role: 'technical_field',
        approvalLimits: {
          maxAmount: 0,
          currency: 'USD'
        }
      },
      status: 'active',
      lastLogin: '2025-01-12T08:45:00Z'
    }
  ]);

  const filteredUsers = users.filter(u => 
    u.profile.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.profile.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    const colors = {
      'technical_field': 'bg-blue-100 text-blue-800',
      'supervisor_maintenance': 'bg-green-100 text-green-800',
      'maintenance_manager': 'bg-purple-100 text-purple-800',
      'operations_superintendent': 'bg-orange-100 text-orange-800',
      'procurement_manager': 'bg-teal-100 text-teal-800',
      'financial_manager': 'bg-red-100 text-red-800',
      'general_manager': 'bg-amber-100 text-amber-800'
    };
    return colors[role as keyof typeof colors] || 'bg-slate-100 text-slate-800';
  };

  const getRoleName = (role: string) => {
    const names = {
      'technical_field': 'Técnico de Campo',
      'supervisor_maintenance': 'Supervisor Mantenimiento',
      'maintenance_manager': 'Jefe Mantenimiento',
      'operations_superintendent': 'Superintendent Operaciones',
      'procurement_manager': 'Gerente Abastecimientos',
      'financial_manager': 'Gerente Financiero',
      'general_manager': 'Gerente General'
    };
    return names[role as keyof typeof names] || role;
  };

  // Check if current user has permission to manage users
  const canManageUsers = user?.permissions.role === 'general_manager' || user?.permissions.role === 'financial_manager';

  if (!canManageUsers) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Acceso Restringido</h2>
          <p className="text-red-600">No tiene permisos para acceder a la gestión de usuarios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
          <p className="text-slate-600 mt-1">Administrar usuarios y permisos del sistema</p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Filtros
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-slate-600">Usuario</th>
                <th className="text-left py-3 px-6 font-medium text-slate-600">Rol</th>
                <th className="text-left py-3 px-6 font-medium text-slate-600">Departamento</th>
                <th className="text-left py-3 px-6 font-medium text-slate-600">Límite Aprobación</th>
                <th className="text-left py-3 px-6 font-medium text-slate-600">Estado</th>
                <th className="text-left py-3 px-6 font-medium text-slate-600">Último Acceso</th>
                <th className="text-left py-3 px-6 font-medium text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-slate-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.profile.firstName.charAt(0)}{user.profile.lastName.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-slate-800">
                          {user.profile.firstName} {user.profile.lastName}
                        </p>
                        <p className="text-slate-500 text-sm">{user.email}</p>
                        <p className="text-slate-400 text-xs">{user.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRoleColor(user.permissions.role)}`}>
                      {getRoleName(user.permissions.role)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-slate-800">{user.profile.department}</p>
                      <p className="text-slate-500 text-sm">{user.profile.position}</p>
                      <p className="text-slate-400 text-xs">{user.profile.location}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-slate-800 font-medium">
                      ${user.permissions.approvalLimits.maxAmount.toLocaleString()} {user.permissions.approvalLimits.currency}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      {user.status === 'active' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          <span className="text-green-600 font-medium">Activo</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-600 mr-2" />
                          <span className="text-red-600 font-medium">Inactivo</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-slate-600 text-sm">
                      {new Date(user.lastLogin).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <button className="text-slate-600 hover:text-slate-800 p-1">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Total Usuarios</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Usuarios Activos</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Supervisores</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {users.filter(u => u.permissions.role.includes('supervisor') || u.permissions.role.includes('manager')).length}
              </p>
            </div>
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Técnicos</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {users.filter(u => u.permissions.role === 'technical_field').length}
              </p>
            </div>
            <Settings className="w-8 h-8 text-amber-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;