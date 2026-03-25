import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AgentStack from './src/navigation/AgentStack';
import AuthStack from './src/navigation/AuthStack';
import ClientStack from './src/navigation/ClientStack';
import OnboardingStack from './src/navigation/OnboardingStack';
import SplashScreen from './src/screens/auth/SplashScreen';
import { useAuthStore } from './src/store/authStore';

/** Decodifica el payload del JWT sin librerías externas. */
function getTokenExpiry(token: string): number | null {
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!base64) return null;
    // atob disponible en Expo SDK 47+ / React Native 0.74+
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const exp = getTokenExpiry(token);
  if (exp === null) return true; // si no se puede decodificar, tratar como expirado
  return exp * 1000 < Date.now();
}

/** Duración mínima del splash en ms (para que la marca se vea al menos brevemente). */
const SPLASH_MIN_MS = 1500;

function RootNavigator(): React.ReactElement {
  const { token, tipo, agentId, logout } = useAuthStore();

  // true cuando Zustand terminó de leer desde SecureStore
  const [hydrated, setHydrated] = useState(false);
  // true cuando el splash mínimo ya se cumplió
  const [splashDone, setSplashDone] = useState(false);

  // ── 1. Esperar hidratación de SecureStore ──────────────────
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    // Si ya está hidratado (segunda apertura en la misma sesión JS), activar de inmediato
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  // ── 2. Timer mínimo del splash ─────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  // ── 3. Auto-limpiar token expirado ─────────────────────────
  // Ejecutar solo cuando ya sabemos el token real (hidratación completa)
  useEffect(() => {
    if (hydrated && token && isTokenExpired(token)) {
      logout();
    }
  }, [hydrated, token, logout]);

  // ── 4. Mostrar splash mientras hidrata o el timer no terminó ──
  if (!hydrated || !splashDone) {
    return <SplashScreen />;
  }

  // ── 5. Ruteo reactivo ─────────────────────────────────────
  if (!token) {
    return <AuthStack />;
  }

  if (tipo === 'CLIENTE') {
    return <ClientStack />;
  }

  if (tipo === 'AGENTE') {
    // agentId presente = onboarding completo
    if (agentId) return <AgentStack />;
    return <OnboardingStack />;
  }

  // fallback de seguridad
  return <AuthStack />;
}

export default function App(): React.ReactElement {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
