import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { getServiceById, sendSos } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { ClientStackParamList, EstadoServicio, ServiceResponse } from '../../types';

type Props = NativeStackScreenProps<ClientStackParamList, 'ActiveService'>;
type Nav = NativeStackNavigationProp<ClientStackParamList, 'ActiveService'>;

const ESTADO_UI: Record<
  EstadoServicio,
  { emoji: string; label: string; color: string; bgColor: string }
> = {
  ABIERTO: { emoji: '🟡', label: 'Solicitud abierta', color: '#d97706', bgColor: '#fef3c7' },
  EN_REVISION: { emoji: '🟡', label: 'Esperando confirmación del agente', color: '#d97706', bgColor: '#fef3c7' },
  CONFIRMADO: { emoji: '🟢', label: 'Agente confirmado — pendiente de pago', color: '#0f3460', bgColor: '#eff6ff' },
  CONFIRMADO_PAGADO: { emoji: '🔵', label: 'Pago confirmado — en espera de inicio', color: '#0f3460', bgColor: '#eff6ff' },
  EN_CURSO: { emoji: '🔵', label: 'Servicio en curso', color: '#16a34a', bgColor: '#dcfce7' },
  COMPLETADO: { emoji: '✅', label: 'Servicio completado', color: '#6b7280', bgColor: '#f3f4f6' },
  CANCELADO: { emoji: '❌', label: 'Servicio cancelado', color: '#dc2626', bgColor: '#fee2e2' },
};

function formatElapsed(startIso: string): string {
  const diff = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActiveServiceScreen(): React.ReactElement {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((s) => s.token);
  const { serviceId } = route.params;

  const [service, setService] = useState<ServiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sosLoading, setSosLoading] = useState(false);
  const [elapsed, setElapsed] = useState('00:00:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadService = useCallback(async () => {
    if (!token) return;
    const { data } = await getServiceById(serviceId, token);
    if (data) setService(data);
    setLoading(false);
  }, [serviceId, token]);

  useEffect(() => {
    loadService();
    pollRef.current = setInterval(loadService, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadService]);

  // Timer para EN_CURSO
  useEffect(() => {
    if (service?.estado === 'EN_CURSO' && service.fecha_inicio_real) {
      const startIso = service.fecha_inicio_real;
      timerRef.current = setInterval(() => {
        setElapsed(formatElapsed(startIso));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [service?.estado, service?.fecha_inicio_real]);

  const handleSos = () => {
    Alert.alert(
      '🚨 SOS — Emergencia',
      '¿Estás en peligro? Se alertará a nuestro equipo de seguridad inmediatamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Activar SOS',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setSosLoading(true);
            const { error } = await sendSos(serviceId, token);
            setSosLoading(false);
            if (error) Alert.alert('Error', error);
            else Alert.alert('SOS activado', 'Nuestro equipo ha sido notificado. Mantente en un lugar seguro.');
          },
        },
      ],
    );
  };

  const handleChat = () => {
    if (!service) return;
    const nombre = service.agente?.nombre ?? 'Agente';
    navigation.navigate('Chat', { serviceId, interlocutorNombre: nombre });
  };

  const handleReview = () => {
    if (!service) return;
    const nombre = service.agente?.nombre ?? 'Agente';
    navigation.navigate('Review', { serviceId, agentNombre: nombre });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0f3460" />
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>No se pudo cargar el servicio</Text>
      </SafeAreaView>
    );
  }

  const estadoUI = ESTADO_UI[service.estado] ?? ESTADO_UI.ABIERTO;
  const enCurso = service.estado === 'EN_CURSO';
  const completado = service.estado === 'COMPLETADO';
  const agentNombre = service.agente?.nombre ?? null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con agente */}
      <View style={styles.header}>
        {agentNombre !== null ? (
          <>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{agentNombre.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerLabel}>Agente asignado</Text>
              <Text style={styles.headerName}>{agentNombre}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.headerNoAgent}>Buscando agente...</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Estado grande */}
        <View style={[styles.estadoCard, { backgroundColor: estadoUI.bgColor }]}>
          <Text style={styles.estadoEmoji}>{estadoUI.emoji}</Text>
          <Text style={[styles.estadoLabel, { color: estadoUI.color }]}>{estadoUI.label}</Text>
          {enCurso && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{elapsed}</Text>
              <Text style={styles.timerSubtext}>tiempo transcurrido</Text>
            </View>
          )}
        </View>

        {/* Detalles del servicio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del servicio</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tipo</Text>
            <Text style={styles.detailValue}>{service.tipo_servicio}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Distrito</Text>
            <Text style={styles.detailValue}>{service.distrito}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Hora de inicio</Text>
            <Text style={styles.detailValue}>{formatDate(service.fecha_inicio_solicitada)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duración</Text>
            <Text style={styles.detailValue}>{service.duracion_horas} horas</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={[styles.detailValue, { color: '#0f3460', fontWeight: '700' }]}>
              S/ {service.precio_total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.actions}>
          {!completado && agentNombre !== null && (
            <Button title="Abrir chat" onPress={handleChat} variant="secondary" />
          )}
          {completado && (
            <Button title="Calificar servicio" onPress={handleReview} />
          )}
        </View>
      </ScrollView>

      {/* SOS siempre visible si EN_CURSO */}
      {enCurso && (
        <TouchableOpacity
          style={styles.sosBtn}
          onPress={handleSos}
          disabled={sosLoading}
          activeOpacity={0.8}
        >
          {sosLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.sosBtnEmoji}>🚨</Text>
              <Text style={styles.sosBtnText}>SOS</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  errorText: { color: '#dc2626', fontSize: 15 },
  scroll: { paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  headerInfo: { flex: 1 },
  headerLabel: { color: '#9ca3af', fontSize: 11 },
  headerName: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  headerNoAgent: { color: '#9ca3af', fontSize: 15 },

  estadoCard: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  estadoEmoji: { fontSize: 36 },
  estadoLabel: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  timerContainer: { alignItems: 'center', marginTop: 8 },
  timerText: { fontSize: 32, fontWeight: '800', color: '#16a34a', fontVariant: ['tabular-nums'] },
  timerSubtext: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 10 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, color: '#1f2937', fontWeight: '500', flex: 1, textAlign: 'right' },

  actions: { paddingHorizontal: 16, marginTop: 16, gap: 12 },

  sosBtn: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 40,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  sosBtnEmoji: { fontSize: 22 },
  sosBtnText: { color: '#ffffff', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
});
