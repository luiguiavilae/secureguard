import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Button } from '../../components/common/Button';
import { getAgentProfile } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type {
  AgentProfileResponse,
  EstadoVerificacion,
  OnboardingStackParamList,
} from '../../types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'PendingApproval'>;
type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'PendingApproval'>;

const POLL_INTERVAL = 30_000;

function ClockIcon(): React.ReactElement {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx={40} cy={40} r={36} stroke="#f59e0b" strokeWidth={3} />
      <Line x1={40} y1={20} x2={40} y2={40} stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" />
      <Line x1={40} y1={40} x2={54} y2={50} stroke="#f59e0b" strokeWidth={3} strokeLinecap="round" />
      <Circle cx={40} cy={40} r={3} fill="#f59e0b" />
    </Svg>
  );
}

function CheckIcon(): React.ReactElement {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx={40} cy={40} r={36} stroke="#16a34a" strokeWidth={3} />
      <Path d="M24 40 L34 50 L56 28" stroke="#16a34a" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function XIcon(): React.ReactElement {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx={40} cy={40} r={36} stroke="#dc2626" strokeWidth={3} />
      <Line x1={26} y1={26} x2={54} y2={54} stroke="#dc2626" strokeWidth={4} strokeLinecap="round" />
      <Line x1={54} y1={26} x2={26} y2={54} stroke="#dc2626" strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

function InfoIcon(): React.ReactElement {
  return (
    <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
      <Circle cx={40} cy={40} r={36} stroke="#f97316" strokeWidth={3} />
      <Circle cx={40} cy={27} r={3} fill="#f97316" />
      <Line x1={40} y1={36} x2={40} y2={56} stroke="#f97316" strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

interface EstadoConfig {
  icon: React.ReactElement;
  color: string;
  label: string;
}

function getEstadoConfig(estado: EstadoVerificacion): EstadoConfig {
  switch (estado) {
    case 'ACTIVO':
      return { icon: <CheckIcon />, color: '#16a34a', label: '¡Aprobado! Ya puedes comenzar' };
    case 'RECHAZADO':
      return { icon: <XIcon />, color: '#dc2626', label: 'Documentos rechazados' };
    case 'PENDIENTE_INFO':
      return { icon: <InfoIcon />, color: '#f97316', label: 'Necesitamos más información' };
    default:
      return { icon: <ClockIcon />, color: '#f59e0b', label: 'En revisión' };
  }
}

export default function PendingApprovalScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const { agentId } = route.params;
  const { token } = useAuthStore();

  const [profile, setProfile] = useState<AgentProfileResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchProfile(): Promise<void> {
    if (!token) return;
    const { data } = await getAgentProfile(agentId, token);
    if (data) setProfile(data);
    setLoadingProfile(false);
  }

  useEffect(() => {
    void fetchProfile();
    pollingRef.current = setInterval(() => void fetchProfile(), POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Detener polling si el estado es final
  useEffect(() => {
    if (
      profile?.estado_verificacion === 'ACTIVO' ||
      profile?.estado_verificacion === 'RECHAZADO'
    ) {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [profile?.estado_verificacion]);

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f3460" />
      </View>
    );
  }

  const estado: EstadoVerificacion = profile?.estado_verificacion ?? 'EN_REVISION';
  const { icon, color, label } = getEstadoConfig(estado);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Solicitud enviada</Text>

      <View style={styles.iconContainer}>{icon}</View>

      <Text style={styles.mainMessage}>Estamos revisando tus documentos</Text>
      <Text style={styles.subMessage}>
        Te notificaremos cuando tu cuenta esté aprobada.{'\n'}
        Normalmente toma menos de 24 horas.
      </Text>

      <View style={[styles.statusBadge, { borderColor: color }]}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusLabel, { color }]}>{label}</Text>
      </View>

      {estado === 'RECHAZADO' && profile?.motivo && (
        <Text style={styles.detailText}>Motivo: {profile.motivo}</Text>
      )}

      {estado === 'PENDIENTE_INFO' && profile?.mensaje && (
        <Text style={styles.detailText}>{profile.mensaje}</Text>
      )}

      {estado === 'ACTIVO' && (
        <View style={styles.buttonContainer}>
          <Button
            title="Comenzar a trabajar"
            onPress={() => {
              // RootNavigator detectará el tipo AGENTE y estado ACTIVO
              // Re-navegar a inicio forzará re-evaluación
              navigation.navigate('ProfileSetup');
            }}
          />
        </View>
      )}

      {estado === 'RECHAZADO' && (
        <View style={styles.buttonContainer}>
          <Button
            title="Reenviar documentos"
            variant="secondary"
            onPress={() =>
              navigation.navigate('DocumentUpload', { agentId })
            }
          />
        </View>
      )}

      <Text style={styles.pollingNote}>
        Actualizando automáticamente cada 30 segundos...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  iconContainer: {
    marginVertical: 8,
  },
  mainMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  subMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 8,
  },
  pollingNote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
});
