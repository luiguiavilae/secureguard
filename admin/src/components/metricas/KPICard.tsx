// TODO: Card de KPI — métrica, valor, variación vs período anterior, icono
import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
}

export function KPICard({ title, value, change, icon }: KPICardProps) {
  // TODO: Implementar card de métrica con indicador de cambio
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      {change !== undefined && (
        <div className={`text-sm mt-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </div>
      )}
    </div>
  );
}
