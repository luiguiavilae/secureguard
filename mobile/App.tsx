import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AgentStack from './src/navigation/AgentStack';
import AuthStack from './src/navigation/AuthStack';
import ClientStack from './src/navigation/ClientStack';
import OnboardingStack from './src/navigation/OnboardingStack';
import { useAuthStore } from './src/store/authStore';

function RootNavigator(): React.ReactElement {
  const { token, tipo } = useAuthStore();

  if (!token) {
    return <AuthStack />;
  }

  if (tipo === 'AGENTE') {
    return <OnboardingStack />;
  }

  if (tipo === 'CLIENTE') {
    return <ClientStack />;
  }

  // Default: AuthStack mientras se determina el tipo
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
