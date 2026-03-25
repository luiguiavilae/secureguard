import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/common/Button';
import {
  getAgentDayStats,
  getAgentProfile,
  getMyActiveServices,
  updateAgentAvailability,
} from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type {
  AgentDayStats,
  AgentProfileResponse,
  AgentStackParamList,
  ServiceResponse,
} from '../../types';

type Nav = NativeStackNavigationProp<AgentStackParamList, 'AgentHome'>;

export default function AgentHomeScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((s) => s.token);
  const agentId = useAuthStore((s) => s.agentId);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
      ],
    );
  };

  const [profile, setProfile] = useState<AgentProfileResponse | null>(null);
  const [activeService, setActiveService] = useState<ServiceResponse | null>(null);
  const [stats, setStats] = useState<AgentDayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !agentId) return;
    const [profileRes, activeRes, statsRes] = await Promise.all([
      getAgentProfile(agentId, token),
      getMyActiveServices(token),
      getAgentDayStats(agentId, token),
    ]);
    if (profileRes.data) setProfile(profileRes.data);
    if (activeRes.data && activeRes.data.length > 0) setActiveService(activeRes.data[0]);
    else setActiveService(null);
    if (statsRes.data) setStats(statsRes.data);
  }, [token, agentId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleToggleAvailability = async (value: boolean) => {
    if (!token || !agentId || !profile) return;
    setTogglingAvail(true);
    const { data } = await updateAgentAvailability(agentId, value, token);
    setTogglingAvail(false);
    if (data) setProfile((p) => p ? { ...p, disponible: data.disponible } : p);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0f3460" />
      </SafeAreaView>
    );
  }

  const disponible = profile?.disponible ?? false;
  const nombre = profile?.nombre ?? 'Agente';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>Hola,</Text>
            <Text style={styles.headerName}>{nombre} 👋</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} hitSlop={8}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle disponibilidad */}
        <View style={[styles.availCard, { borderColor: disponible ? '#16a34a' : '#dc2626' }]}>
          <View style={styles.availInfo}>
            <Text style={styles.availTitle}>
              {disponible ? '✅ Disponible' : '🔴 No disponible'}
            </Text>
            <Text style={styles.availSubtext}>
              {disponible
                ? 'Recibirás nuevas solicitudes'
                : 'No recibirás solicitudes hasta activarte'}
            </Text>
          </View>
          {togglingAvail ? (
            <ActivityIndicator color="#0f3460" />
          ) : (
            <Switch
              value={disponible}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: '#fca5a5', true: '#86efac' }}
              thumbColor={disponible ? '#16a34a' : '#dc2626'}
            />
          )}
        </View>

        {/* Solicitudes abiertas */}
        {disponible && (
          <TouchableOpacity
            style={styles.openRequestsCard}
            onPress={() => navigation.navigate('OpenRequests')}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.openRequestsNum}>
                {stats?.solicitudes_abiertas ?? 0}
              </Text>
              <Text style={styles.openRequestsLabel}>solicitudes disponibles</Text>
            </View>
            <Text style={styles.openRequestsArrow}>Ver →</Text>
          </TouchableOpacity>
        )}

        {/* Servicio activo */}
        {activeService !== null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicio activo</Text>
            <TouchableOpacity
              style={styles.activeServiceCard}
              onPress={() => navigation.navigate('ActiveService', { serviceId: activeService.id })}
              activeOpacity={0.85}
            >
              <View style={styles.activeServiceHeader}>
                <Text style={styles.activeServiceTipo}>{activeService.tipo_servicio}</Text>
                <View style={styles.estadoBadge}>
                  <Text style={styles.estadoBadgeText}>{activeService.estado}</Text>
                </View>
              </View>
              <Text style={styles.activeServiceDistrito}>{activeService.distrito}</Text>
              <Text style={styles.activeServiceMonto}>
                S/ {activeService.precio_total.toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats del día */}
        {stats !== null && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hoy</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats.servicios_completados}</Text>
                <Text style={styles.statLabel}>Servicios{'\n'}completados</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>S/ {stats.ingresos.toFixed(0)}</Text>
                <Text style={styles.statLabel}>Ingresos{'\n'}del día</Text>
              </View>
            </View>
          </View>
        )}

        {/* Calificaciones */}
        <View style={styles.ratingsBtnContainer}>
          <Button
            title="Ver mis calificaciones"
            onPress={() => navigation.navigate('Reviews')}
            variant="secondary"
          />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerGreeting: { color: '#9ca3af', fontSize: 14 },
  headerName: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#4b5563' },
  logoutText: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },

  availCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
  },
  availInfo: { flex: 1 },
  availTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  availSubtext: { fontSize: 13, color: '#6b7280' },

  openRequestsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#0f3460',
    borderRadius: 14,
    padding: 20,
  },
  openRequestsNum: { fontSize: 36, fontWeight: '800', color: '#ffffff' },
  openRequestsLabel: { fontSize: 13, color: '#93c5fd', marginTop: 2 },
  openRequestsArrow: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 12 },

  activeServiceCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
  },
  activeServiceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  activeServiceTipo: { color: '#ffffff', fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  estadoBadge: { backgroundColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  estadoBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  activeServiceDistrito: { color: '#93c5fd', fontSize: 14, marginBottom: 8 },
  activeServiceMonto: { color: '#ffffff', fontSize: 18, fontWeight: '800' },

  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statNum: { fontSize: 24, fontWeight: '800', color: '#0f3460', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center' },

  ratingsBtnContainer: { paddingHorizontal: 16, marginTop: 20 },
});
