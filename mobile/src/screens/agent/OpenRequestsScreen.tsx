import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { agentRespond, getOpenRequests } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { AgentStackParamList, NivelRiesgo, ServiceResponse } from '../../types';

type Nav = NativeStackNavigationProp<AgentStackParamList, 'OpenRequests'>;

const RIESGO_COLORS: Record<NivelRiesgo, string> = {
  bajo: '#16a34a',
  medio: '#d97706',
  alto: '#dc2626',
};

const TIPO_ICONOS: Record<string, string> = {
  acompañamiento: '🤝',
  eventos: '🎉',
  residencial: '🏠',
  escolta: '🚗',
  custodia: '📦',
  trayecto: '📍',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RequestCard({
  service,
  onAceptar,
  onIgnorar,
  actionLoading,
}: {
  service: ServiceResponse;
  onAceptar: () => void;
  onIgnorar: () => void;
  actionLoading: boolean;
}) {
  const riesgo = service.nivel_riesgo ?? 'bajo';
  const riesgoColor = RIESGO_COLORS[riesgo];
  const icono = TIPO_ICONOS[service.tipo_servicio] ?? '🛡';

  return (
    <View style={styles.card}>
      {/* Tipo e ícono */}
      <View style={styles.cardHeader}>
        <View style={styles.tipoIconContainer}>
          <Text style={styles.tipoIcono}>{icono}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tipoLabel}>{service.tipo_servicio}</Text>
          <Text style={styles.distritoLabel}>{service.distrito}</Text>
        </View>
        {service.nivel_riesgo !== undefined && (
          <View style={[styles.riesgoBadge, { backgroundColor: `${riesgoColor}20` }]}>
            <Text style={[styles.riesgoText, { color: riesgoColor }]}>
              Riesgo {service.nivel_riesgo}
            </Text>
          </View>
        )}
      </View>

      {/* Detalles */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Fecha</Text>
          <Text style={styles.detailValue}>{formatDate(service.fecha_inicio_solicitada)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Duración</Text>
          <Text style={styles.detailValue}>{service.duracion_horas}h</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Ganancia</Text>
          <Text style={[styles.detailValue, styles.montoValue]}>
            S/ {(service.precio_total * 0.8).toFixed(0)}
          </Text>
        </View>
      </View>

      {service.presentacion !== undefined && (
        <Text style={styles.presentacionTag}>
          👔 Presentación: {service.presentacion}
        </Text>
      )}

      {/* Botones */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.ignorarBtn}
          onPress={onIgnorar}
          disabled={actionLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.ignorarText}>Ignorar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.aceptarBtn}
          onPress={onAceptar}
          disabled={actionLoading}
          activeOpacity={0.8}
        >
          {actionLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.aceptarText}>Aceptar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OpenRequestsScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((s) => s.token);

  const [requests, setRequests] = useState<ServiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());

  const loadRequests = useCallback(async () => {
    if (!token) return;
    const { data } = await getOpenRequests(token);
    if (data) setRequests(data);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 20000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  const handleAceptar = async (serviceId: string) => {
    if (!token) return;
    setActionLoadingId(serviceId);
    const { error } = await agentRespond(serviceId, 'ACEPTAR', token);
    setActionLoadingId(null);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    Alert.alert('Solicitud aceptada', 'Esperando confirmación del cliente.', [
      { text: 'OK', onPress: () => navigation.navigate('ActiveService', { serviceId }) },
    ]);
  };

  const handleIgnorar = (serviceId: string) => {
    setIgnored((prev) => new Set([...prev, serviceId]));
  };

  const visible = requests.filter((r) => !ignored.has(r.id));

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0f3460" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {visible.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No hay solicitudes disponibles ahora</Text>
          <Text style={styles.emptyBody}>
            Se actualizará automáticamente cada 20 segundos.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <RequestCard
              service={item}
              onAceptar={() => handleAceptar(item.id)}
              onIgnorar={() => handleIgnorar(item.id)}
              actionLoading={actionLoadingId === item.id}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },

  list: { padding: 16, gap: 14 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  tipoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoIcono: { fontSize: 22 },
  tipoLabel: { fontSize: 15, fontWeight: '700', color: '#1f2937', textTransform: 'capitalize' },
  distritoLabel: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  riesgoBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  riesgoText: { fontSize: 11, fontWeight: '700' },

  detailsRow: { flexDirection: 'row', marginBottom: 10 },
  detailItem: { flex: 1, alignItems: 'center' },
  detailLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
  montoValue: { color: '#16a34a', fontSize: 15, fontWeight: '800' },

  presentacionTag: { fontSize: 12, color: '#6b7280', marginBottom: 12 },

  cardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  ignorarBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  ignorarText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  aceptarBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    alignItems: 'center',
  },
  aceptarText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
