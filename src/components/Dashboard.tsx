import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePurchaseStore } from '../store/purchaseStore';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Users,
  FileText,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Dashboard = () => {
  const { user } = useAuthStore();
  const { requests, fetchRequests } = usePurchaseStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    critical: requests.filter(r => r.requestDetails.criticality === 'critical').length,
    totalValue: requests.reduce((sum, r) => sum + r.requestDetails.estimatedCost, 0),
    averageTime: 2.5 // Mock average approval time in hours
  };

  const recentRequests = requests.slice(0, 5);

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Bienvenido, {user?.profile.firstName} {user?.profile.lastName}
        </h1>
        <p className="text-slate-300">
          {user?.profile.position} - {user?.profile.department}
        </p>
        <p className="text-slate-400 text-sm mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Solicitudes Pendientes"
          value={stats.pending}
          icon={Clock}
          color="text-yellow-600"
          subtitle="Requieren acción"
        />
        <StatCard
          title="Críticas Activas"
          value={stats.critical}
          icon={AlertTriangle}
          color="text-red-600"
          subtitle="Alta prioridad"
        />
        <StatCard
          title="Aprobadas Hoy"
          value={stats.approved}
          icon={CheckCircle}
          color="text-green-600"
          subtitle="Procesadas"
        />
        <StatCard
          title="Valor Total"
          value={`$${stats.totalValue.toLocaleString()}`}
          icon={DollarSign}
          color="text-blue-600"
          subtitle="USD este mes"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">
                Solicitudes Recientes
              </h2>
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          <div className="p-6">
            {recentRequests.length > 0 ? (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <div key={request._id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 truncate">
                        {request.requestDetails.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getCriticalityColor(request.requestDetails.criticality)}`}>
                          {request.requestDetails.criticality.toUpperCase()}
                        </span>
                        <span className="text-slate-500 text-sm">
                          ${request.requestDetails.estimatedCost.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(request.status)}`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">
                No hay solicitudes recientes
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">
              Acciones Rápidas
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <button 
              onClick={() => navigate('/requests/new')}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Nueva Solicitud
            </button>
            <button 
              onClick={() => navigate('/approvals')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Ver Aprobaciones Pendientes
            </button>
            <button 
              onClick={() => navigate('/analytics')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Generar Reporte
            </button>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">
            Métricas de Rendimiento
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {stats.averageTime}h
              </div>
              <p className="text-slate-600 text-sm">Tiempo Promedio de Aprobación</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                94%
              </div>
              <p className="text-slate-600 text-sm">Cumplimiento SLA</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {Math.round((stats.approved / (stats.approved + stats.rejected)) * 100) || 0}%
              </div>
              <p className="text-slate-600 text-sm">Tasa de Aprobación</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;