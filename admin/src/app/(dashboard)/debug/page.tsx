import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface CheckResult {
  ok: boolean;
  label: string;
  value: string;
  detail?: string;
}

async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. NEXT_PUBLIC_SUPABASE_URL
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  results.push({
    ok: Boolean(url),
    label: 'NEXT_PUBLIC_SUPABASE_URL',
    value: url ? url : '❌ No configurada',
  });

  // 2. SUPABASE_SERVICE_ROLE_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  results.push({
    ok: Boolean(serviceKey),
    label: 'SUPABASE_SERVICE_ROLE_KEY',
    value: serviceKey
      ? `${serviceKey.slice(0, 10)}… (${serviceKey.length} chars)`
      : '❌ No configurada — usando anon key como fallback',
  });

  // 3. NEXT_PUBLIC_SUPABASE_ANON_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  results.push({
    ok: Boolean(anonKey),
    label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: anonKey
      ? `${anonKey.slice(0, 10)}… (${anonKey.length} chars)`
      : '❌ No configurada',
  });

  // 4. Query: SELECT count(*) FROM users
  try {
    const db = createAdminClient();
    const { count, error } = await db
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) {
      results.push({
        ok: false,
        label: 'Query: SELECT count(*) FROM users',
        value: `❌ Error: ${error.message}`,
        detail: `code: ${error.code} | hint: ${error.hint ?? '—'} | details: ${error.details ?? '—'}`,
      });
    } else {
      results.push({
        ok: true,
        label: 'Query: SELECT count(*) FROM users',
        value: `✅ ${count ?? 0} filas`,
      });
    }
  } catch (e: any) {
    results.push({
      ok: false,
      label: 'Query: SELECT count(*) FROM users',
      value: `❌ Excepción: ${e?.message ?? String(e)}`,
    });
  }

  // 5. Query: SELECT count(*) FROM agent_profiles
  try {
    const db = createAdminClient();
    const { count, error } = await db
      .from('agent_profiles')
      .select('*', { count: 'exact', head: true });

    results.push({
      ok: !error,
      label: 'Query: SELECT count(*) FROM agent_profiles',
      value: error
        ? `❌ ${error.message} (code: ${error.code})`
        : `✅ ${count ?? 0} filas`,
    });
  } catch (e: any) {
    results.push({
      ok: false,
      label: 'Query: SELECT count(*) FROM agent_profiles',
      value: `❌ Excepción: ${e?.message ?? String(e)}`,
    });
  }

  // 6. Query: SELECT count(*) FROM agent_verification_queue
  try {
    const db = createAdminClient();
    const { count, error } = await db
      .from('agent_verification_queue')
      .select('*', { count: 'exact', head: true });

    results.push({
      ok: !error,
      label: 'Query: SELECT count(*) FROM agent_verification_queue',
      value: error
        ? `❌ ${error.message} (code: ${error.code})`
        : `✅ ${count ?? 0} filas`,
    });
  } catch (e: any) {
    results.push({
      ok: false,
      label: 'Query: SELECT count(*) FROM agent_verification_queue',
      value: `❌ Excepción: ${e?.message ?? String(e)}`,
    });
  }

  // 7. Query: SELECT count(*) FROM payments
  try {
    const db = createAdminClient();
    const { count, error } = await db
      .from('payments')
      .select('*', { count: 'exact', head: true });

    results.push({
      ok: !error,
      label: 'Query: SELECT count(*) FROM payments',
      value: error
        ? `❌ ${error.message} (code: ${error.code})`
        : `✅ ${count ?? 0} filas`,
    });
  } catch (e: any) {
    results.push({
      ok: false,
      label: 'Query: SELECT count(*) FROM payments',
      value: `❌ Excepción: ${e?.message ?? String(e)}`,
    });
  }

  // 8. Query: SELECT count(*) FROM service_requests
  try {
    const db = createAdminClient();
    const { count, error } = await db
      .from('service_requests')
      .select('*', { count: 'exact', head: true });

    results.push({
      ok: !error,
      label: 'Query: SELECT count(*) FROM service_requests',
      value: error
        ? `❌ ${error.message} (code: ${error.code})`
        : `✅ ${count ?? 0} filas`,
    });
  } catch (e: any) {
    results.push({
      ok: false,
      label: 'Query: SELECT count(*) FROM service_requests',
      value: `❌ Excepción: ${e?.message ?? String(e)}`,
    });
  }

  return results;
}

export default async function DebugPage() {
  const checks = await runChecks();
  const allOk = checks.every((c) => c.ok);
  const now = new Date().toISOString();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Diagnóstico de conexión</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generado: <span className="font-mono" suppressHydrationWarning>{now}</span>
        </p>
      </div>

      {/* Resumen */}
      <div
        className={`rounded-lg border px-5 py-4 ${
          allOk
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-red-200 bg-red-50'
        }`}
      >
        <p className={`text-sm font-semibold ${allOk ? 'text-emerald-800' : 'text-red-800'}`}>
          {allOk
            ? '✅ Todo OK — Supabase conectado correctamente'
            : '⚠️ Se detectaron problemas — revisa los items en rojo'}
        </p>
      </div>

      {/* Checks */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Variables de entorno y queries</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {checks.map((c, i) => (
            <div key={i} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide font-mono">
                    {c.label}
                  </p>
                  <p className={`mt-0.5 text-sm font-medium ${c.ok ? 'text-gray-900' : 'text-red-700'}`}>
                    {c.value}
                  </p>
                  {c.detail && (
                    <p className="mt-1 text-xs text-gray-400 font-mono break-all">{c.detail}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    c.ok
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {c.ok ? 'OK' : 'FALLO'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guía de diagnóstico */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-700">Cómo interpretar los resultados</h2>
        </div>
        <div className="divide-y divide-gray-100 text-sm text-gray-700">
          {[
            {
              cond: 'SUPABASE_SERVICE_ROLE_KEY falla',
              causa: 'Variable no agregada en Vercel → Settings → Environment Variables',
              fix: 'Agregar SUPABASE_SERVICE_ROLE_KEY con el valor de Supabase Dashboard → Settings → API → service_role',
            },
            {
              cond: 'Query falla con code 42501 (permission denied)',
              causa: 'RLS bloqueando la query — el service_role debería bypassear RLS',
              fix: 'Verificar que se está usando la service_role key (no la anon key)',
            },
            {
              cond: 'Query falla con code 42P01 (relation does not exist)',
              causa: 'La tabla no existe en el schema público de Supabase',
              fix: 'Correr las migrations pendientes en Supabase',
            },
            {
              cond: 'Query retorna 0 filas pero sin error',
              causa: 'Supabase conectado OK, la tabla existe pero está vacía',
              fix: 'El panel mostrará datos reales cuando haya registros en producción',
            },
            {
              cond: 'Página sigue mostrando mock data',
              causa: 'El try/catch en lib/queries/ atrapó un error silenciosamente',
              fix: 'Revisar los errores de query arriba — corregir la causa raíz',
            },
          ].map((row, i) => (
            <div key={i} className="px-5 py-3 space-y-0.5">
              <p className="font-medium text-gray-900 font-mono text-xs">{row.cond}</p>
              <p className="text-xs text-gray-500">Causa: {row.causa}</p>
              <p className="text-xs text-emerald-700">Fix: {row.fix}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Esta página solo es accesible para admins autenticados. Eliminarla en producción una vez
        resuelto el diagnóstico.
      </p>
    </div>
  );
}
