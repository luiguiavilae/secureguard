// TODO: Configurar providers globales (NavigationContainer, StripeProvider, etc.)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  // TODO: Implementar navegación por rol (auth/client/agent)
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        {/* TODO: RootNavigator */}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
