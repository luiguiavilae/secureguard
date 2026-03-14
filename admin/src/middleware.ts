import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = [
  '/verificacion',
  '/metricas',
  '/disputas',
  '/finanzas',
  '/agentes',
  '/clientes',
  '/configuracion',
];

export function middleware(request: NextRequest) {
  const session = request.cookies.get('mock-admin-session');
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === '/login';
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!session && isProtected) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/verificacion', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/verificacion/:path*',
    '/metricas/:path*',
    '/disputas/:path*',
    '/finanzas/:path*',
    '/agentes/:path*',
    '/clientes/:path*',
    '/configuracion/:path*',
    '/login',
  ],
};
