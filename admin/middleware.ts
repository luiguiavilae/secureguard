// TODO: Middleware de autenticación — proteger rutas del dashboard, redirigir a /login
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // TODO: Implementar verificación de sesión admin
  return NextResponse.next();
}

export const config = {
  matcher: ['/(dashboard)/:path*'],
};
