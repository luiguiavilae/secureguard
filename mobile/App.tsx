import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AgentStack from './src/navigation/AgentStack';
import AuthStack from './src/navigation/AuthStack';
import ClientStack from './src/navigation/ClientStack';
import OnboardingStack from './src/navigation/OnboardingStack';
import { useAuthStore } from './src/store/authStore';

function RootNavigator(): React.ReactElement {
  const { token, tipo, agentId } = useAuthStore();
  // Esperar a que Zustand hidrate desde SecureStore (async)
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // useAuthStore.persist.hasHydrated() es sync después del primer render
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // Si ya está hidratado (carga rápida), activar de inmediato
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!token) {
    return <AuthStack />;
  }

  if (tipo === 'CLIENTE') {
    return <ClientStack />;
  }

  if (tipo === 'AGENTE') {
    // agentId presente = onboarding completo → ir al home del agente
    if (agentId) {
      return <AgentStack />;
    }
    // Sin agentId = falta completar onboarding
    return <OnboardingStack />;
  }

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
