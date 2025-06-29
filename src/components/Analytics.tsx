import React, { useEffect, useState } from 'react';
import { usePurchaseStore } from '../store/purchaseStore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Target
} from 'lucide-react';

const Analytics = () => {
  const { requests, fetchRequests } = usePurchaseStore();
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Calculate analytics data
  const totalRequests = requests.length;
  const approvedRequests = requests.filter(r => r.status === 'approved').length;
  const rejectedRequests = requests.filter(r => r.status === 'rejected').length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  
  const totalValue = requests.reduce((sum, r) => sum + r.requestDetails.estimatedCost, 0);
  const approvedValue = requests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + r.requestDetails.estimatedCost, 0);

  const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests * 100) : 0;
  const avgApprovalTime = 2.5; // Mock data - in hours

  // Data for charts
  const statusData = [
    { name: 'Aprobadas', value: approvedRequests, color: '#10b981' },
    { name: 'Pendientes', value: pendingRequests, color: '#f59e0b' },
    { name: 'Rechazadas', value: rejectedRequests, color: '#ef4444' }
  ];

  const criticalityData = [
    { name: 'Crítica', value: requests.filter(r => r.requestDetails.criticality === 'critical').length, color: '#ef4444' },
    { name: 'Alta', value: requests.filter(r => r.requestDetails.criticality === 'high').length, color: '#f97316' },
    { name: 'Media', value: requests.filter(r => r.requestDetails.criticality === 'medium').length, color: '#eab308' },
    { name: 'Baja', value: requests.filter(r => r.requestDetails.criticality === 'low').length, color: '#22c55e' }
  ];

  const monthlyData = [
    { month: 'Ene', requests: 45, value: 234000 },
    { month: 'Feb', requests: 52, value: 287000 },
    { month: 'Mar', requests: 38, value: 195000 },
    { month: 'Abr', requests: 61, value: 324000 },
    { month: 'May', requests: 49, value: 256000 },
    { month: 'Jun', requests: 43, value: 198000 }
  ];

  const departmentData = [
    { name: 'Mantenimiento Mina', requests: 28, value: 145000 },
    { name: 'Operaciones', requests: 22, value: 198000 },
    { name: 'Planta', requests: 18, value: 87000 },
    { name: 'Servicios', requests: 12, value: 65000 }
  ];

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }: any) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center mt-2 text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-3 h-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend)}% vs mes anterior
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics y Reportes</h1>
          <p className="text-slate-600 mt-1">Análisis de rendimiento del sistema de aprobaciones</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="365">Último año</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Solicitudes"
          value={totalRequests}
          icon={CheckCircle}
          color="text-blue-600"
          subtitle="Este período"
          trend={12}
        />
        <StatCard
          title="Valor Total"
          value={`$${totalValue.toLocaleString()}`}
          icon={DollarSign}
          color="text-green-600"
          subtitle="USD solicitados"
          trend={8}
        />
        <StatCard
          title="Tasa de Aprobación"
          value={`${approvalRate.toFixed(1)}%`}
          icon={Target}
          color="text-purple-600"
          subtitle="Solicitudes aprobadas"
          trend={-2}
        />
        <StatCard
          title="Tiempo Promedio"
          value={`${avgApprovalTime}h`}
          icon={Clock}
          color="text-amber-600"
          subtitle="Para aprobación"
          trend={-15}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Distribución por Estado</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            {statusData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-slate-600">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Criticality Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Distribución por Criticidad</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={criticalityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Tendencia Mensual</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="requests" fill="#3b82f6" />
                <Line yAxisId="right" type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Performance */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Rendimiento por Departamento</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="requests" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Eficiencia SLA</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Críticas</span>
              <div className="flex items-center">
                <div className="w-20 h-2 bg-slate-200 rounded-full mr-2">
                  <div className="w-4/5 h-2 bg-red-500 rounded-full"></div>
                </div>
                <span className="text-sm font-medium">80%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Altas</span>
              <div className="flex items-center">
                <div className="w-20 h-2 bg-slate-200 rounded-full mr-2">
                  <div className="w-full h-2 bg-orange-500 rounded-full"></div>
                </div>
                <span className="text-sm font-medium">95%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Medias</span>
              <div className="flex items-center">
                <div className="w-20 h-2 bg-slate-200 rounded-full mr-2">
                  <div className="w-full h-2 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-sm font-medium">98%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Solicitantes</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Juan Pérez</span>
              <span className="font-medium">12 solicitudes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">María García</span>
              <span className="font-medium">8 solicitudes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Carlos López</span>
              <span className="font-medium">6 solicitudes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Ana Rodríguez</span>
              <span className="font-medium">5 solicitudes</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Presupuesto Utilizado</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">Mantenimiento</span>
                <span className="font-medium">78%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full">
                <div className="w-4/5 h-2 bg-blue-500 rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">Operaciones</span>
                <span className="font-medium">62%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full">
                <div className="w-3/5 h-2 bg-green-500 rounded-full"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">Servicios</span>
                <span className="font-medium">45%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full">
                <div className="w-2/5 h-2 bg-purple-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;