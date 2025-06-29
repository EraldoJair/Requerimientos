import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePurchaseStore } from '../store/purchaseStore';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PurchaseRequests = () => {
  const { requests, fetchRequests, loading } = usePurchaseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [criticalityFilter, setCriticalityFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.requestDetails.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesCriticality = criticalityFilter === 'all' || request.requestDetails.criticality === criticalityFilter;
    
    return matchesSearch && matchesStatus && matchesCriticality;
  });

  const getCriticalityIcon = (criticality: string) => {
    switch (criticality) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'low': return <Clock className="w-4 h-4 text-green-600" />;
      default: return <Clock className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-slate-600" />;
    }
  };

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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Solicitudes de Compra</h1>
          <p className="text-slate-600 mt-1">Gestión de solicitudes de equipos y repuestos</p>
        </div>
        <Link
          to="/requests/new"
          className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Solicitud
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar solicitudes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
            </select>
          </div>
          
          <div>
            <select
              value={criticalityFilter}
              onChange={(e) => setCriticalityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">Todas las prioridades</option>
              <option value="critical">Crítica</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </div>
          
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center">
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avanzados
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-slate-600">Solicitud</th>
                  <th className="text-left py-3 px-6 font-medium text-slate-600">Descripción</th>
                  <th className="text-left py-3 px-6 font-medium text-slate-600">Solicitante</th>
                  <th className="text-left py-3 px-6 font-medium text-slate-600">Prioridad</th>
                  <th className="text-left py-3 px-6 font-medium text-slate-600">Monto</th>
                  <th className="text-left py-3 px-6 font-medium text-slate-600">Estado</th>
                  <th className="text-left py-3 px-6 font-medium text-slate-600">Fecha</th>
                  <th className="text-left py-3 px-6 font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-slate-50">
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-800">
                        {request.requestNumber}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-xs">
                        <p className="font-medium text-slate-800 truncate">
                          {request.requestDetails.description}
                        </p>
                        <p className="text-slate-500 text-sm truncate">
                          {request.requestDetails.specifications.partNumber && 
                           `P/N: ${request.requestDetails.specifications.partNumber}`}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-slate-800">{request.requestor.name}</p>
                        <p className="text-slate-500 text-sm">{request.requestor.department}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        {getCriticalityIcon(request.requestDetails.criticality)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${getCriticalityColor(request.requestDetails.criticality)}`}>
                          {request.requestDetails.criticality.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-800">
                        ${request.requestDetails.estimatedCost.toLocaleString()} {request.requestDetails.currency}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(request.status)}`}>
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-600 text-sm">
                        {format(new Date(request.createdAt), 'dd/MM/yyyy')}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button className="text-slate-600 hover:text-slate-800 p-1">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-slate-600 hover:text-slate-800 p-1">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              No se encontraron solicitudes
            </h3>
            <p className="text-slate-600 mb-4">
              No hay solicitudes que coincidan con los filtros seleccionados.
            </p>
            <Link
              to="/requests/new"
              className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Solicitud
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseRequests;