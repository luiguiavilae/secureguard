import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { AuthStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>;

function PersonIcon(): React.ReactElement {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Circle cx={24} cy={16} r={8} stroke="#0f3460" strokeWidth={2.5} />
      <Path
        d="M8 40c0-8.837 7.163-16 16-16s16 7.163 16 16"
        stroke="#0f3460"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AgentIcon(): React.ReactElement {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Path
        d="M24 4 L42 11 L42 26 C42 36 34 43 24 46 C14 43 6 36 6 26 L6 11 Z"
        stroke="#0f3460"
        strokeWidth={2.5}
        fill="none"
      />
      <Rect x={18} y={19} width={12} height={10} rx={2} stroke="#0f3460" strokeWidth={2} />
      <Path d="M24 19v-4" stroke="#0f3460" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export default function RoleSelectScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();

  function handleSelectClient(): void {
    navigation.navigate('Terms', { selectedTipo: 'CLIENTE' });
  }

  function handleSelectAgent(): void {
    navigation.navigate('Terms', { selectedTipo: 'AGENTE' });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>¿Cómo quieres usar SecureGuard?</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={styles.card}
          onPress={handleSelectClient}
          activeOpacity={0.85}
        >
          <PersonIcon />
          <Text style={styles.cardTitle}>Necesito seguridad</Text>
          <Text style={styles.cardDescription}>
            Solicita agentes verificados para ti o tu familia
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={handleSelectAgent}
          activeOpacity={0.85}
        >
          <AgentIcon />
          <Text style={styles.cardTitle}>Soy agente de seguridad</Text>
          <Text style={styles.cardDescription}>
            Ofrece tus servicios a clientes verificados
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 24,
    justifyContent: 'center',
    gap: 32,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
