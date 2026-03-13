import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import type { AuthStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

function ShieldIcon(): React.ReactElement {
  return (
    <Svg width={80} height={96} viewBox="0 0 80 96">
      <Path
        d="M40 4 L76 18 L76 50 C76 70 58 86 40 92 C22 86 4 70 4 50 L4 18 Z"
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={4}
      />
      <Path
        d="M40 16 L66 26 L66 50 C66 65 54 78 40 83 C26 78 14 65 14 50 L14 26 Z"
        fill="#1e3a5f"
      />
      <Polygon
        points="40,35 45,48 58,48 48,56 52,69 40,61 28,69 32,56 22,48 35,48"
        fill="#e2e8f0"
      />
    </Svg>
  );
}

export default function SplashScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('PhoneInput');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ShieldIcon />
      <Text style={styles.logo}>SecureGuard</Text>
      <Text style={styles.subtitle}>Seguridad privada on-demand</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logo: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 16,
  },
});
