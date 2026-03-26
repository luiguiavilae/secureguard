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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { completeService, getServiceById, sendSos, startService } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { AgentStackParamList, EstadoServicio, ServiceResponse } from '../../types';

type Props = NativeStackScreenProps<AgentStackParamList, 'ActiveService'>;
type Nav = NativeStackNavigationProp<AgentStackParamList, 'ActiveService'>;

const ESTADO_LABELS: Record<EstadoServicio, { label: string; color: string }> = {
  ABIERTA: { label: 'Abierto', color: '#d97706' },
  EN_REVISION: { label: 'En revisión', color: '#d97706' },
  CONFIRMADO: { label: 'Confirmado', color: '#0f3460' },
  CONFIRMADO_PAGADO: { label: 'Pago confirmado', color: '#16a34a' },
  EN_CURSO: { label: 'En curso', color: '#16a34a' },
  COMPLETADO: { label: 'Completado', color: '#6b7280' },
  COMPLETADO_ANTICIPADO: { label: 'Finalizado antes', color: '#6b7280' },
  CANCELADO: { label: 'Cancelado', color: '#dc2626' },
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

export default function AgentActiveServiceScreen(): React.ReactElement {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((s) => s.token);
  const { serviceId } = route.params;

  const [service, setService] = useState<ServiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startLoading, setStartLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [reporte, setReporte] = useState('');
  const [elapsed, setElapsed] = useState('00:00:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadService = useCallback(async () => {
    if (!token) return;
    const { data } = await getServiceById(serviceId, token);
    if (data) setService(data);
    setLoading(false);
  }, [serviceId, token]);

  useEffect(() => {
    loadService();
  }, [loadService]);

  // Timer
  useEffect(() => {
    if (service?.estado === 'EN_CURSO' && service.fecha_inicio_real) {
      const startIso = service.fecha_inicio_real;
      timerRef.current = setInterval(() => setElapsed(formatElapsed(startIso)), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [service?.estado, service?.fecha_inicio_real]);

  const handleStart = async () => {
    if (!token) return;
    // En producción aquí se abriría la cámara
    setStartLoading(true);
    const { data, error } = await startService(serviceId, token);
    setStartLoading(false);
    if (error) { Alert.alert('Error', error); return; }
    if (data) setService(data);
  };

  const handleComplete = () => {
    Alert.alert(
      'Finalizar servicio',
      '¿Confirmas que el servicio ha concluido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setCompleteLoading(true);
            const { data, error } = await completeService(serviceId, reporte, token);
            setCompleteLoading(false);
            if (error) { Alert.alert('Error', error); return; }
            if (data) {
              Alert.alert('Servicio finalizado', '¡Buen trabajo!', [
                { text: 'OK', onPress: () => navigation.navigate('AgentHome') },
              ]);
            }
          },
        },
      ],
    );
  };

  const handleSos = () => {
    Alert.alert('🚨 SOS', '¿Necesitas asistencia de emergencia?', [
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
          else Alert.alert('SOS activado', 'El equipo de soporte ha sido notificado.');
        },
      },
    ]);
  };

  const handleChat = () => {
    if (!service) return;
    navigation.navigate('Chat', {
      serviceId,
      interlocutorNombre: 'Cliente',
    });
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

  const estadoUI = ESTADO_LABELS[service.estado] ?? { label: service.estado, color: '#6b7280' };
  const enCurso = service.estado === 'EN_CURSO';
  const confirmado = service.estado === 'CONFIRMADO_PAGADO';
  const completado = service.estado === 'COMPLETADO';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Tipo de servicio como header */}
        <View style={styles.header}>
          <Text style={styles.headerTipo}>{service.tipo_servicio}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: estadoUI.color }]}>
            <Text style={styles.estadoText}>{estadoUI.label}</Text>
          </View>
        </View>

        {/* Dirección — solo si CONFIRMADO_PAGADO o EN_CURSO */}
        {(confirmado || enCurso) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Dirección del cliente</Text>
            <Text style={styles.direccionText}>{service.distrito}</Text>
            {service.descripcion ? (
              <Text style={styles.descripcionText}>{service.descripcion}</Text>
            ) : null}
          </View>
        )}

        {/* Detalles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Inicio solicitado</Text>
            <Text style={styles.detailValue}>{formatDate(service.fecha_inicio_solicitada)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duración</Text>
            <Text style={styles.detailValue}>{service.duracion_horas}h</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tu ganancia</Text>
            <Text style={[styles.detailValue, { color: '#16a34a', fontWeight: '700' }]}>
              S/ {(service.precio_total * 0.8).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Timer */}
        {enCurso && (
          <View style={styles.timerSection}>
            <Text style={styles.timerLabel}>Tiempo transcurrido</Text>
            <Text style={styles.timerText}>{elapsed}</Text>
          </View>
        )}

        {/* Botón iniciar (solo si CONFIRMADO_PAGADO) */}
        {confirmado && (
          <View style={styles.actions}>
            <Button
              title="He llegado — Iniciar servicio"
              onPress={handleStart}
              loading={startLoading}
            />
          </View>
        )}

        {/* Reporte de novedades */}
        {enCurso && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reporte de novedades</Text>
            <View style={styles.textareaContainer}>
              <TextInput
                style={styles.textarea}
                value={reporte}
                onChangeText={(v) => setReporte(v.slice(0, 200))}
                placeholder="Describe cualquier novedad o incidente..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.charCount}>{reporte.length}/200</Text>
            </View>
          </View>
        )}

        {/* Acciones */}
        <View style={styles.actions}>
          {!completado && (
            <Button title="Abrir chat" onPress={handleChat} variant="secondary" />
          )}
          {enCurso && (
            <Button
              title="Finalizar servicio"
              onPress={handleComplete}
              loading={completeLoading}
              variant="danger"
            />
          )}
        </View>
      </ScrollView>

      {/* SOS */}
      {(enCurso || confirmado) && (
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
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
  },
  headerTipo: { color: '#ffffff', fontSize: 22, fontWeight: '700', textTransform: 'capitalize' },
  estadoBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  estadoText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 12 },
  direccionText: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
  descripcionText: { fontSize: 14, color: '#6b7280', marginTop: 6 },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, color: '#1f2937', fontWeight: '500' },

  timerSection: {
    alignItems: 'center',
    marginTop: 20,
    padding: 20,
    backgroundColor: '#dcfce7',
    marginHorizontal: 16,
    borderRadius: 14,
  },
  timerLabel: { fontSize: 13, color: '#166534', fontWeight: '600', marginBottom: 4 },
  timerText: { fontSize: 36, fontWeight: '800', color: '#16a34a', fontVariant: ['tabular-nums'] },

  textareaContainer: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    padding: 12,
  },
  textarea: { fontSize: 15, color: '#1f2937', minHeight: 70 },
  charCount: { alignSelf: 'flex-end', fontSize: 11, color: '#9ca3af', marginTop: 4 },

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
