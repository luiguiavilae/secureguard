// TODO: Redirigir a /login o al dashboard si hay sesión activa
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/login');
}
