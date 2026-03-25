import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import OTPScreen from '../screens/auth/OTPScreen';
import PhoneInputScreen from '../screens/auth/PhoneInputScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import TermsScreen from '../screens/legal/TermsScreen';
import type { AuthStackParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
      <Stack.Screen
        name="OTP"
        component={OTPScreen}
        options={{
          headerShown: true,
          title: '',
          headerBackTitle: 'Atrás',
        }}
      />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{
          headerShown: true,
          title: 'Términos y Condiciones',
          headerBackTitle: 'Atrás',
        }}
      />
    </Stack.Navigator>
  );
}
