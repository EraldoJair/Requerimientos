import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { usePurchaseStore } from '../store/purchaseStore';
import { useAuthStore } from '../store/authStore';
import {
  Save,
  ArrowLeft,
  Upload,
  AlertTriangle,
  DollarSign,
  Calendar,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

interface RequestForm {
  itemType: 'critical_spare' | 'consumable' | 'dangerous_material' | 'new_equipment' | 'specialized_service';
  description: string;
  partNumber?: string;
  brand?: string;
  model?: string;
  quantity: number;
  unitOfMeasure: string;
  technicalSpecs?: string;
  criticality: 'critical' | 'high' | 'medium' | 'low';
  justification: string;
  estimatedCost: number;
  currency: string;
  requiredDate: string;
}

const CreateRequest = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createRequest, loading } = usePurchaseStore();
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RequestForm>({
    defaultValues: {
      currency: 'USD',
      unitOfMeasure: 'units',
      criticality: 'medium'
    }
  });

  const itemType = watch('itemType');
  const criticality = watch('criticality');

  const onSubmit = async (data: RequestForm) => {
    if (!user) return;

    try {
      const approvalFlow = getApprovalFlow(data.estimatedCost, data.criticality, data.itemType);
      
      await createRequest({
        requestor: {
          userId: user._id,
          name: `${user.profile.firstName} ${user.profile.lastName}`,
          role: user.permissions.role,
          department: user.profile.department,
          location: user.profile.location
        },
        requestDetails: {
          itemType: data.itemType,
          description: data.description,
          specifications: {
            partNumber: data.partNumber,
            brand: data.brand,
            model: data.model,
            quantity: data.quantity,
            unitOfMeasure: data.unitOfMeasure,
            technicalSpecs: data.technicalSpecs
          },
          criticality: data.criticality,
          justification: data.justification,
          estimatedCost: data.estimatedCost,
          currency: data.currency,
          requiredDate: data.requiredDate,
          attachments: attachments.map(file => ({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            uploadedAt: new Date().toISOString()
          }))
        },
        approvalFlow,
        metrics: {
          escalations: 0,
          slaCompliance: true
        }
      });

      toast.success('Solicitud creada exitosamente');
      navigate('/requests');
    } catch (error) {
      toast.error('Error al crear la solicitud');
    }
  };

  const getApprovalFlow = (amount: number, criticality: string, itemType: string) => {
    const flow = [];
    let level = 1;

    // Always start with supervisor
    flow.push({
      level: level++,
      role: 'supervisor_maintenance',
      status: 'pending' as const
    });

    // Add maintenance manager for amounts > $5,000
    if (amount > 5000) {
      flow.push({
        level: level++,
        role: 'maintenance_manager',
        status: 'pending' as const
      });
    }

    // Add operations superintendent for amounts > $25,000
    if (amount > 25000) {
      flow.push({
        level: level++,
        role: 'operations_superintendent',
        status: 'pending' as const
      });
    }

    // Add financial manager for amounts > $100,000
    if (amount > 100000) {
      flow.push({
        level: level++,
        role: 'financial_manager',
        status: 'pending' as const
      });
    }

    // Add general manager for amounts > $500,000
    if (amount > 500000) {
      flow.push({
        level: level++,
        role: 'general_manager',
        status: 'pending' as const
      });
    }

    return flow;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/requests')}
          className="mr-4 p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nueva Solicitud de Compra</h1>
          <p className="text-slate-600">Complete la información requerida para su solicitud</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Información Básica
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Ítem *
              </label>
              <select
                {...register('itemType', { required: 'Seleccione un tipo de ítem' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">Seleccionar tipo...</option>
                <option value="critical_spare">Repuesto Crítico</option>
                <option value="consumable">Consumible</option>
                <option value="dangerous_material">Material Peligroso</option>
                <option value="new_equipment">Equipo Nuevo</option>
                <option value="specialized_service">Servicio Especializado</option>
              </select>
              {errors.itemType && (
                <p className="text-red-600 text-sm mt-1">{errors.itemType.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prioridad *
              </label>
              <select
                {...register('criticality', { required: 'Seleccione una prioridad' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="low">Baja - Mantenimiento programado</option>
                <option value="medium">Media - Parada en semana</option>
                <option value="high">Alta - Parada en 24-48h</option>
                <option value="critical">Crítica - Parada inmediata</option>
              </select>
              {errors.criticality && (
                <p className="text-red-600 text-sm mt-1">{errors.criticality.message}</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descripción *
            </label>
            <textarea
              {...register('description', { required: 'La descripción es requerida' })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Describa detalladamente el ítem solicitado..."
            />
            {errors.description && (
              <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Especificaciones Técnicas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Número de Parte
              </label>
              <input
                type="text"
                {...register('partNumber')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="P/N o código"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Marca
              </label>
              <input
                type="text"
                {...register('brand')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="Caterpillar, Komatsu, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Modelo
              </label>
              <input
                type="text"
                {...register('model')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="390F, PC4000, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cantidad *
              </label>
              <input
                type="number"
                {...register('quantity', { 
                  required: 'La cantidad es requerida',
                  min: { value: 1, message: 'La cantidad debe ser mayor a 0' }
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="1"
              />
              {errors.quantity && (
                <p className="text-red-600 text-sm mt-1">{errors.quantity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Unidad de Medida *
              </label>
              <select
                {...register('unitOfMeasure', { required: 'Seleccione una unidad' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="units">Unidades</option>
                <option value="meters">Metros</option>
                <option value="liters">Litros</option>
                <option value="kilograms">Kilogramos</option>
                <option value="hours">Horas</option>
                <option value="services">Servicios</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Especificaciones Técnicas Adicionales
            </label>
            <textarea
              {...register('technicalSpecs')}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Presión máxima, temperatura, voltaje, etc."
            />
          </div>
        </div>

        {/* Financial Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Información Financiera
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Costo Estimado *
              </label>
              <input
                type="number"
                step="0.01"
                {...register('estimatedCost', { 
                  required: 'El costo estimado es requerido',
                  min: { value: 0.01, message: 'El costo debe ser mayor a 0' }
                })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="25000.00"
              />
              {errors.estimatedCost && (
                <p className="text-red-600 text-sm mt-1">{errors.estimatedCost.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Moneda *
              </label>
              <select
                {...register('currency')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="USD">USD - Dólar Americano</option>
                <option value="PEN">PEN - Sol Peruano</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fecha Requerida *
            </label>
            <input
              type="date"
              {...register('requiredDate', { required: 'La fecha requerida es obligatoria' })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              min={new Date().toISOString().split('T')[0]}
            />
            {errors.requiredDate && (
              <p className="text-red-600 text-sm mt-1">{errors.requiredDate.message}</p>
            )}
          </div>
        </div>

        {/* Justification */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Justificación
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Justificación Técnica *
            </label>
            <textarea
              {...register('justification', { required: 'La justificación es requerida' })}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Explique la razón de la solicitud, impacto operacional, consecuencias de no aprobar, etc."
            />
            {errors.justification && (
              <p className="text-red-600 text-sm mt-1">{errors.justification.message}</p>
            )}
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Adjuntos
          </h2>
          
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 mb-2">Arrastra archivos aquí o haz clic para seleccionar</p>
            <p className="text-slate-500 text-sm">Fotos, planos, especificaciones técnicas (Max 10MB cada archivo)</p>
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer inline-block"
            >
              Seleccionar Archivos
            </label>
          </div>

          {attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="text-sm text-slate-700">{file.name}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Guardando...' : 'Crear Solicitud'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateRequest;