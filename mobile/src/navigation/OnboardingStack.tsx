import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import DocumentUploadScreen from '../screens/onboarding/DocumentUploadScreen';
import PendingApprovalScreen from '../screens/onboarding/PendingApprovalScreen';
import ProfileSetupScreen from '../screens/onboarding/ProfileSetupScreen';
import type { OnboardingStackParamList } from '../types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack(): React.ReactElement {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Atrás',
        headerTintColor: '#0f3460',
        headerStyle: { backgroundColor: '#f9fafb' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{ title: 'Perfil de agente' }}
      />
      <Stack.Screen
        name="DocumentUpload"
        component={DocumentUploadScreen}
        options={{ title: 'Documentos' }}
      />
      <Stack.Screen
        name="PendingApproval"
        component={PendingApprovalScreen}
        options={{ title: 'Estado de solicitud', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
