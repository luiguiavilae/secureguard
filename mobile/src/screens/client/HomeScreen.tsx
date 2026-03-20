import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { getMyActiveServices, getMyRecentServices } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { ClientStackParamList, EstadoServicio, ServiceResponse } from '../../types';

type Nav = NativeStackNavigationProp<ClientStackParamList, 'Home'>;

const ESTADO_CONFIG: Record<EstadoServicio, { label: string; color: string }> = {
  ABIERTO: { label: 'Abierto', color: '#d97706' },
  EN_REVISION: { label: 'En revisión', color: '#d97706' },
  CONFIRMADO: { label: 'Confirmado', color: '#0f3460' },
  CONFIRMADO_PAGADO: { label: 'Pago confirmado', color: '#0f3460' },
  EN_CURSO: { label: 'En curso', color: '#16a34a' },
  COMPLETADO: { label: 'Completado', color: '#6b7280' },
  CANCELADO: { label: 'Cancelado', color: '#dc2626' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMonto(monto: number): string {
  return `S/ ${monto.toFixed(2)}`;
}

function ActiveServiceCard({
  service,
  onPress,
}: {
  service: ServiceResponse;
  onPress: () => void;
}) {
  const config = ESTADO_CONFIG[service.estado] ?? { label: service.estado, color: '#6b7280' };
  return (
    <TouchableOpacity style={styles.activeCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.activeCardHeader}>
        <View style={[styles.estadoBadge, { backgroundColor: config.color }]}>
          <Text style={styles.estadoBadgeText}>{config.label}</Text>
        </View>
        <Text style={styles.activeCardTipo}>{service.tipo_servicio}</Text>
      </View>
      {service.agente && (
        <View style={styles.agenteRow}>
          <View style={styles.agenteAvatar}>
            <Text style={styles.agenteAvatarText}>
              {service.agente.nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.agenteLabel}>Agente asignado</Text>
            <Text style={styles.agenteNombre}>{service.agente.nombre}</Text>
          </View>
        </View>
      )}
      <View style={styles.activeCardFooter}>
        <Text style={styles.activeCardDate}>
          Inicio: {formatDate(service.fecha_inicio_solicitada)}
        </Text>
        <Text style={styles.activeCardMonto}>{formatMonto(service.precio_total)}</Text>
      </View>
      <Text style={styles.verDetalles}>Ver detalles →</Text>
    </TouchableOpacity>
  );
}

function RecentServiceRow({
  service,
  onPress,
}: {
  service: ServiceResponse;
  onPress: () => void;
}) {
  const config = ESTADO_CONFIG[service.estado] ?? { label: service.estado, color: '#6b7280' };
  return (
    <TouchableOpacity style={styles.recentRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.recentLeft}>
        <Text style={styles.recentTipo}>{service.tipo_servicio}</Text>
        <Text style={styles.recentDate}>{formatDate(service.fecha_inicio_solicitada)}</Text>
      </View>
      <View style={styles.recentRight}>
        <View style={[styles.recentEstado, { backgroundColor: `${config.color}18` }]}>
          <Text style={[styles.recentEstadoText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
        <Text style={styles.recentMonto}>{formatMonto(service.precio_total)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((s) => s.token);

  const [activeServices, setActiveServices] = useState<ServiceResponse[]>([]);
  const [recentServices, setRecentServices] = useState<ServiceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setError(null);
    const [activeRes, recentRes] = await Promise.all([
      getMyActiveServices(token),
      getMyRecentServices(token),
    ]);
    if (activeRes.error) setError(activeRes.error);
    else setActiveServices(activeRes.data ?? []);

    if (recentRes.data) {
      // Excluir los activos de la lista reciente
      const activeIds = new Set((activeRes.data ?? []).map((s) => s.id));
      setRecentServices((recentRes.data ?? []).filter((s) => !activeIds.has(s.id)).slice(0, 5));
    }
  }, [token]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleActivePress = (service: ServiceResponse) => {
    navigation.navigate('ActiveService', { serviceId: service.id });
  };

  const handleRecentPress = (service: ServiceResponse) => {
    if (service.estado === 'EN_CURSO' || service.estado === 'CONFIRMADO' || service.estado === 'CONFIRMADO_PAGADO') {
      navigation.navigate('ActiveService', { serviceId: service.id });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0f3460" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.shieldIcon}>
              <Text style={styles.shieldText}>🛡</Text>
            </View>
            <Text style={styles.headerTitle}>SecureGuard</Text>
          </View>
        </View>

        {/* Error */}
        {error !== null && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Servicio activo */}
        {activeServices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicio activo</Text>
            {activeServices.map((s) => (
              <ActiveServiceCard key={s.id} service={s} onPress={() => handleActivePress(s)} />
            ))}
          </View>
        )}

        {/* Botón solicitar */}
        <View style={styles.ctaContainer}>
          <Button
            title="Solicitar seguridad"
            onPress={() => navigation.navigate('CreateService')}
            disabled={activeServices.length > 0}
          />
          {activeServices.length > 0 ? (
            <Text style={styles.ctaSubtextBlocked}>
              Tienes un servicio activo. Resuélvelo antes de solicitar uno nuevo.
            </Text>
          ) : (
            <Text style={styles.ctaSubtext}>Respuesta en menos de 10 minutos</Text>
          )}
        </View>

        {/* Lista reciente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios recientes</Text>
          {recentServices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔒</Text>
              <Text style={styles.emptyTitle}>Tu seguridad, tu prioridad</Text>
              <Text style={styles.emptyBody}>
                Cuando contrates tu primer servicio, aparecerá aquí. ¡Empieza hoy!
              </Text>
            </View>
          ) : (
            <View style={styles.recentList}>
              {recentServices.map((s) => (
                <RecentServiceRow key={s.id} service={s} onPress={() => handleRecentPress(s)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  scroll: { paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#1a1a2e',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldText: { fontSize: 18 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff' },

  errorBox: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  errorText: { color: '#dc2626', fontSize: 14 },

  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 12 },

  // Active card
  activeCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  activeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  estadoBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  activeCardTipo: { color: '#ffffff', fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  agenteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  agenteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agenteAvatarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  agenteLabel: { color: '#9ca3af', fontSize: 11 },
  agenteNombre: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  activeCardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  activeCardDate: { color: '#9ca3af', fontSize: 13 },
  activeCardMonto: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  verDetalles: { color: '#60a5fa', fontSize: 13, fontWeight: '600', textAlign: 'right' },

  // CTA
  ctaContainer: { paddingHorizontal: 20, marginTop: 24, gap: 8 },
  ctaSubtext: { textAlign: 'center', color: '#6b7280', fontSize: 13 },
  ctaSubtextBlocked: { textAlign: 'center', color: '#d97706', fontSize: 13, fontWeight: '500' },

  // Recent
  recentList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  recentLeft: { flex: 1 },
  recentTipo: { fontSize: 14, fontWeight: '600', color: '#1f2937', textTransform: 'capitalize' },
  recentDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  recentRight: { alignItems: 'flex-end', gap: 4 },
  recentEstado: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  recentEstadoText: { fontSize: 11, fontWeight: '600' },
  recentMonto: { fontSize: 13, fontWeight: '700', color: '#1f2937' },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 24 },
});
