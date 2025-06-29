import React, { useEffect, useState } from 'react';
import { usePurchaseStore } from '../store/purchaseStore';
import { useAuthStore } from '../store/authStore';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  MessageSquare,
  Filter,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

const ApprovalQueue = () => {
  const { user } = useAuthStore();
  const { requests, fetchRequests, approveRequest, rejectRequest, loading } = usePurchaseStore();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Filter requests that need approval from current user
  const pendingRequests = requests.filter(request => {
    if (request.status !== 'pending') return false;
    
    const currentApprovalLevel = request.approvalFlow.find(
      flow => flow.status === 'pending' && 
              flow.role === user?.permissions.role
    );
    
    return currentApprovalLevel !== undefined;
  }).filter(request => 
    request.requestDetails.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requestNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAction = async (requestId: string, level: number, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await approveRequest(requestId, level, comments);
        toast.success('Solicitud aprobada exitosamente');
      } else {
        if (!comments.trim()) {
          toast.error('Los comentarios son requeridos para rechazar');
          return;
        }
        await rejectRequest(requestId, level, comments);
        toast.success('Solicitud rechazada');
      }
      
      setSelectedRequest(null);
      setComments('');
      setActionType(null);
    } catch (error) {
      toast.error('Error al procesar la solicitud');
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  const getCurrentApprovalLevel = (request: any) => {
    return request.approvalFlow.find(
      (flow: any) => flow.status === 'pending' && flow.role === user?.permissions.role
    )?.level || 0;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cola de Aprobaciones</h1>
          <p className="text-slate-600 mt-1">Solicitudes pendientes de su aprobación</p>
        </div>
        <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
          {pendingRequests.length} pendientes
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
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
      </div>

      {/* Approval Queue */}
      <div className="space-y-4">
        {pendingRequests.length > 0 ? (
          pendingRequests.map((request) => {
            const currentLevel = getCurrentApprovalLevel(request);
            
            return (
              <div key={request._id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-slate-800">
                          {request.requestNumber}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium border ${getCriticalityColor(request.requestDetails.criticality)}`}>
                          {request.requestDetails.criticality.toUpperCase()}
                        </span>
                        {request.requestDetails.criticality === 'critical' && (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      
                      <p className="text-slate-800 font-medium mb-2">
                        {request.requestDetails.description}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                        <div>
                          <span className="font-medium">Solicitante:</span> {request.requestor.name}
                        </div>
                        <div>
                          <span className="font-medium">Departamento:</span> {request.requestor.department}
                        </div>
                        <div>
                          <span className="font-medium">Fecha:</span> {format(new Date(request.createdAt), 'dd/MM/yyyy', { locale: es })}
                        </div>
                        <div>
                          <span className="font-medium">Monto:</span> ${request.requestDetails.estimatedCost.toLocaleString()} {request.requestDetails.currency}
                        </div>
                        <div>
                          <span className="font-medium">Cantidad:</span> {request.requestDetails.specifications.quantity} {request.requestDetails.specifications.unitOfMeasure}
                        </div>
                        <div>
                          <span className="font-medium">Fecha Requerida:</span> {format(new Date(request.requestDetails.requiredDate), 'dd/MM/yyyy', { locale: es })}
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-medium text-slate-800 mb-2">Justificación:</h4>
                        <p className="text-slate-600 text-sm">{request.requestDetails.justification}</p>
                      </div>

                      {request.requestDetails.specifications.technicalSpecs && (
                        <div className="mt-3 p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-slate-800 mb-2">Especificaciones Técnicas:</h4>
                          <p className="text-slate-600 text-sm">{request.requestDetails.specifications.technicalSpecs}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-4 mt-6 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => {
                        setSelectedRequest(request._id);
                        setActionType('reject');
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request._id);
                        setActionType('approve');
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </button>
                  </div>
                </div>

                {/* Comments Modal */}
                {selectedRequest === request._id && (
                  <div className="border-t border-slate-200 p-6 bg-slate-50">
                    <div className="max-w-md mx-auto">
                      <h4 className="font-medium text-slate-800 mb-3">
                        {actionType === 'approve' ? 'Aprobar Solicitud' : 'Rechazar Solicitud'}
                      </h4>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Comentarios {actionType === 'reject' ? '(Requeridos)' : '(Opcionales)'}
                        </label>
                        <textarea
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          placeholder={
                            actionType === 'approve' 
                              ? 'Comentarios adicionales (opcional)...'
                              : 'Explicar motivo del rechazo...'
                          }
                        />
                      </div>
                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={() => {
                            setSelectedRequest(null);
                            setComments('');
                            setActionType(null);
                          }}
                          className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleAction(request._id, currentLevel, actionType!)}
                          disabled={loading || (actionType === 'reject' && !comments.trim())}
                          className={`px-4 py-2 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 ${
                            actionType === 'approve' 
                              ? 'bg-green-500 hover:bg-green-600' 
                              : 'bg-red-500 hover:bg-red-600'
                          }`}
                        >
                          {actionType === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              No hay solicitudes pendientes
            </h3>
            <p className="text-slate-600">
              {searchTerm 
                ? 'No se encontraron solicitudes que coincidan con su búsqueda.'
                : 'Todas las solicitudes han sido procesadas o no hay solicitudes que requieran su aprobación.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;