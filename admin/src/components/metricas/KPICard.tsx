import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const colorMap = {
  default: { bg: 'bg-gray-50', icon: 'bg-gray-100 text-gray-600', value: 'text-gray-900' },
  success: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-900' },
  warning: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-700', value: 'text-amber-900' },
  danger: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-700', value: 'text-red-900' },
  info: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-700', value: 'text-blue-900' },
};

export function KPICard({ title, value, subtitle, icon: Icon, trend, color = 'default' }: KPICardProps) {
  const colors = colorMap[color];

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-5 shadow-sm')}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
          <p className={cn('mt-1.5 text-2xl font-bold', colors.value)}>{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          {trend && (
            <p
              className={cn(
                'mt-1.5 text-xs font-medium',
                trend.positive ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', colors.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
