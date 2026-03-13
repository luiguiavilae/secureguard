import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ActiveServiceScreen from '../screens/agent/ActiveServiceScreen';
import AgentHomeScreen from '../screens/agent/AgentHomeScreen';
import OpenRequestsScreen from '../screens/agent/OpenRequestsScreen';
import ReviewsScreen from '../screens/agent/ReviewsScreen';
import type { AgentStackParamList } from '../types';

const Stack = createNativeStackNavigator<AgentStackParamList>();

export default function AgentStack(): React.ReactElement {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Atrás',
        headerTintColor: '#0f3460',
        headerStyle: { backgroundColor: '#ffffff' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="AgentHome"
        component={AgentHomeScreen}
        options={{ title: 'SecureGuard', headerShown: false }}
      />
      <Stack.Screen
        name="OpenRequests"
        component={OpenRequestsScreen}
        options={{ title: 'Solicitudes disponibles' }}
      />
      <Stack.Screen
        name="ActiveService"
        component={ActiveServiceScreen}
        options={{ title: 'Servicio activo', headerBackVisible: false }}
      />
      <Stack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ title: 'Mis reseñas' }}
      />
    </Stack.Navigator>
  );
}
