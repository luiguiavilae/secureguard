// TODO: Inicializar clientes Supabase para server y browser components
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente browser (componentes 'use client')
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

// TODO: Agregar createServerClient con @supabase/ssr para Server Components
