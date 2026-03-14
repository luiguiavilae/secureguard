'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  UserCheck,
  BarChart2,
  AlertTriangle,
  DollarSign,
  Shield,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeVariant?: 'default' | 'destructive';
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/verificacion',
    label: 'Verificación',
    icon: <UserCheck className="h-4 w-4" />,
    badge: 3,
    badgeVariant: 'destructive',
  },
  {
    href: '/metricas',
    label: 'Métricas',
    icon: <BarChart2 className="h-4 w-4" />,
  },
  {
    href: '/disputas',
    label: 'Disputas',
    icon: <AlertTriangle className="h-4 w-4" />,
    badge: 2,
    badgeVariant: 'destructive',
  },
  {
    href: '/finanzas',
    label: 'Finanzas',
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    href: '/agentes',
    label: 'Agentes',
    icon: <Shield className="h-4 w-4" />,
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: '/configuracion',
    label: 'Configuración',
    icon: <Settings className="h-4 w-4" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    document.cookie = 'mock-admin-session=; path=/; max-age=0';
    router.push('/login');
  };

  const SidebarContent = () => (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">SecureGuard</p>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Gestión
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <span className={cn(isActive ? 'text-brand-600' : 'text-gray-400')}>
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                        item.badgeVariant === 'destructive'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 text-gray-700',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-100 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex">
        <SidebarContent />
      </div>

      <button
        className="fixed left-4 top-4 z-50 flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 shadow-sm lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}
