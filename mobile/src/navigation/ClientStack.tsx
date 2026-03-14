import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ChatScreen from '../screens/ChatScreen';
import ActiveServiceScreen from '../screens/client/ActiveServiceScreen';
import AgentListScreen from '../screens/client/AgentListScreen';
import AgentProfileScreen from '../screens/client/AgentProfileScreen';
import CreateServiceScreen from '../screens/client/CreateServiceScreen';
import HomeScreen from '../screens/client/HomeScreen';
import ReviewScreen from '../screens/client/ReviewScreen';
import type { ClientStackParamList } from '../types';

const Stack = createNativeStackNavigator<ClientStackParamList>();

export default function ClientStack(): React.ReactElement {
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
        name="Home"
        component={HomeScreen}
        options={{ title: 'SecureGuard', headerShown: false }}
      />
      <Stack.Screen
        name="CreateService"
        component={CreateServiceScreen}
        options={{ title: 'Nueva solicitud' }}
      />
      <Stack.Screen
        name="AgentList"
        component={AgentListScreen}
        options={{ title: 'Agentes disponibles' }}
      />
      <Stack.Screen
        name="AgentProfile"
        component={AgentProfileScreen}
        options={{ title: 'Perfil del agente' }}
      />
      <Stack.Screen
        name="ActiveService"
        component={ActiveServiceScreen}
        options={{ title: 'Servicio activo', headerBackVisible: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params.interlocutorNombre,
          headerTintColor: '#0f3460',
        })}
      />
      <Stack.Screen
        name="Review"
        component={ReviewScreen}
        options={{ title: 'Califica el servicio' }}
      />
    </Stack.Navigator>
  );
}
