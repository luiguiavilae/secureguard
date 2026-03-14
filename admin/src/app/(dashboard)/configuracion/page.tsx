'use client';

import React, { useState } from 'react';
import { Check, Edit2, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Parametro {
  key: string;
  label: string;
  value: number;
  unit: string;
  descripcion: string;
  min: number;
  max: number;
}

const PARAMETROS_INICIALES: Parametro[] = [
  { key: 'precio_hora_cliente', label: 'Precio hora (cliente)', value: 50, unit: 'S/', descripcion: 'Precio por hora cobrado al cliente por cada agente', min: 10, max: 500 },
  { key: 'precio_hora_agente', label: 'Precio hora (agente)', value: 30, unit: 'S/', descripcion: 'Monto pagado al agente por hora de servicio', min: 10, max: 400 },
  { key: 'comision_app_pct', label: 'Comisión app', value: 15, unit: '%', descripcion: 'Porcentaje de comisión que retiene la plataforma sobre el GMV', min: 0, max: 50 },
  { key: 'minimo_horas', label: 'Mínimo de horas', value: 3, unit: 'h', descripcion: 'Duración mínima de un servicio', min: 1, max: 24 },
  { key: 'fondo_seguro_por_servicio', label: 'Fondo seguro por servicio', value: 10, unit: 'S/', descripcion: 'Monto deducido de cada servicio para el fondo de seguro', min: 0, max: 100 },
  { key: 'timeout_agente_min', label: 'Timeout agente', value: 20, unit: 'min', descripcion: 'Tiempo máximo que tiene un agente para responder a una solicitud en Flujo A', min: 5, max: 120 },
  { key: 'tolerancia_puntualidad_min', label: 'Tolerancia puntualidad', value: 10, unit: 'min', descripcion: 'Minutos de tolerancia antes de registrar retraso en check-in', min: 0, max: 60 },
  { key: 'timeout_solicitud_horas', label: 'Timeout cuórum multi-agente', value: 4, unit: 'h', descripcion: 'Horas máximas para completar cuórum en servicios multi-agente', min: 1, max: 24 },
  { key: 'alerta_fondo_min', label: 'Alerta fondo mínimo', value: 500, unit: 'S/', descripcion: 'Nivel de balance del fondo de seguro que activa la alerta roja', min: 100, max: 10000 },
];

function ParamRow({ param, onSave }: { param: Parametro; onSave: (key: string, value: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(param.value));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleEdit = () => {
    setInputVal(String(param.value));
    setError('');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
  };

  const handleSave = () => {
    const num = parseFloat(inputVal);
    if (isNaN(num)) { setError('Valor inválido'); return; }
    if (num < param.min || num > param.max) { setError(`Rango: ${param.min}–${param.max}`); return; }
    onSave(param.key, num);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <tr className="group hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3.5">
        <p className="text-sm font-medium text-gray-900">{param.label}</p>
        <p className="text-xs text-gray-400 mt-0.5 max-w-sm">{param.descripcion}</p>
      </td>
      <td className="px-4 py-3.5">
        {editing ? (
          <div className="relative flex items-center gap-2">
            <input
              autoFocus
              type="number"
              value={inputVal}
              onChange={(e) => { setInputVal(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              min={param.min}
              max={param.max}
              className={cn(
                'w-24 rounded-md border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2',
                error ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-brand-500',
              )}
            />
            <span className="text-xs text-gray-500">{param.unit}</span>
            {error && <p className="absolute -bottom-4 left-0 text-[10px] text-red-600 whitespace-nowrap">{error}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-semibold tabular-nums', saved ? 'text-emerald-700' : 'text-gray-900')}>
              {param.unit === 'S/' ? `${param.unit} ${param.value}` : `${param.value} ${param.unit}`}
            </span>
            {saved && <Check className="h-3.5 w-3.5 text-emerald-500" />}
          </div>
        )}
      </td>
      <td className="px-4 py-3.5 text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="sm" className="h-7 bg-brand-600 hover:bg-brand-700 text-xs" onClick={handleSave}>
              <Check className="mr-1 h-3.5 w-3.5" />
              Guardar
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleEdit}
          >
            <Edit2 className="mr-1 h-3.5 w-3.5" />
            Editar
          </Button>
        )}
      </td>
    </tr>
  );
}

export default function ConfiguracionPage() {
  const [params, setParams] = useState(PARAMETROS_INICIALES);

  const handleSave = (key: string, value: number) => {
    setParams((prev) => prev.map((p) => (p.key === key ? { ...p, value } : p)));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-800">
          Los cambios aplican inmediatamente sin reiniciar. Haz clic en <strong>Editar</strong> en cualquier fila para modificar el valor en línea.
        </p>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Parámetros del sistema</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Parámetro</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Valor actual</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {params.map((p) => (
              <ParamRow key={p.key} param={p} onSave={handleSave} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
