// TODO: Sidebar de navegación con links a todas las secciones del dashboard
import React from 'react';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/verificacion', label: 'Verificación', icon: 'UserCheck' },
  { href: '/metricas', label: 'Métricas', icon: 'BarChart2' },
  { href: '/disputas', label: 'Disputas', icon: 'AlertTriangle' },
  { href: '/finanzas', label: 'Finanzas', icon: 'DollarSign' },
  { href: '/agentes', label: 'Agentes', icon: 'Shield' },
  { href: '/clientes', label: 'Clientes', icon: 'Users' },
  { href: '/configuracion', label: 'Configuración', icon: 'Settings' },
];

export function Sidebar() {
  // TODO: Implementar sidebar con active state y iconos
  return (
    <aside className="w-64 bg-brand-600 text-white flex flex-col">
      <div className="p-6 text-xl font-bold">SecureGuard</div>
      <nav className="flex-1">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center px-6 py-3 hover:bg-brand-700">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
