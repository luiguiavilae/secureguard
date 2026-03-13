import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import OTPScreen from '../screens/auth/OTPScreen';
import PhoneInputScreen from '../screens/auth/PhoneInputScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import SplashScreen from '../screens/auth/SplashScreen';
import type { AuthStackParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack(): React.ReactElement {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
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
    </Stack.Navigator>
  );
}
