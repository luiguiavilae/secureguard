import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { getAgentProfile, selectAgent } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { AgentProfileResponse, ClientStackParamList } from '../../types';

type Props = NativeStackScreenProps<ClientStackParamList, 'AgentProfile'>;
type Nav = NativeStackNavigationProp<ClientStackParamList, 'AgentProfile'>;

const NIVEL_COLORS: Record<number, string> = {
  1: '#6b7280',
  2: '#16a34a',
  3: '#0f3460',
  4: '#7c3aed',
  5: '#d97706',
};
const NIVEL_LABELS: Record<number, string> = {
  1: 'Novato',
  2: 'Bronce',
  3: 'Plata',
  4: 'Oro',
  5: 'Elite',
};

function RatingBar({ label, value, icono }: { label: string; value: number; icono: string }) {
  const pct = Math.min(100, (value / 5) * 100);
  return (
    <View style={styles.ratingBarRow}>
      <Text style={styles.ratingBarIcon}>{icono}</Text>
      <Text style={styles.ratingBarLabel}>{label}</Text>
      <View style={styles.ratingBarTrack}>
        <View style={[styles.ratingBarFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.ratingBarValue}>{value.toFixed(1)}</Text>
    </View>
  );
}

export default function AgentProfileScreen(): React.ReactElement {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((s) => s.token);
  const { agentId, serviceId } = route.params;

  const [profile, setProfile] = useState<AgentProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    const { data, error: err } = await getAgentProfile(agentId, token);
    if (err) setError(err);
    else setProfile(data);
    setLoading(false);
  }, [agentId, token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSelect = async () => {
    if (!token || !profile) return;
    setSelecting(true);
    const { data, error: err } = await selectAgent(serviceId, agentId, token);
    setSelecting(false);
    if (err) {
      Alert.alert('Error', err);
      return;
    }
    if (data) {
      navigation.navigate('ActiveService', { serviceId: data.id });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0f3460" />
      </SafeAreaView>
    );
  }

  if (error !== null || profile === null) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'No se pudo cargar el perfil'}</Text>
      </SafeAreaView>
    );
  }

  const nivelColor = NIVEL_COLORS[profile.nivel] ?? '#6b7280';
  const nivelLabel = NIVEL_LABELS[profile.nivel] ?? `Nivel ${profile.nivel}`;
  const scorePct = Math.min(100, (profile.score / 1000) * 100);
  const nombre = profile.nombre ?? 'Agente';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.avatarLarge, { borderColor: nivelColor }]}>
            <Text style={styles.avatarLargeText}>{nombre.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.heroName}>{nombre}</Text>
          <View style={[styles.nivelBadge, { backgroundColor: nivelColor }]}>
            <Text style={styles.nivelText}>{nivelLabel}</Text>
          </View>
        </View>

        {/* Score */}
        <View style={styles.section}>
          <View style={styles.scoreHeader}>
            <Text style={styles.sectionTitle}>Score</Text>
            <Text style={styles.scoreNum}>{profile.score}</Text>
          </View>
          <View style={styles.scoreTrack}>
            <View style={[styles.scoreFill, { width: `${scorePct}%`, backgroundColor: nivelColor }]} />
          </View>
        </View>

        {/* Ratings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calificaciones</Text>
          <RatingBar label="General" value={profile.rating_avg} icono="⭐" />
          <RatingBar label="Puntualidad" value={profile.rating_puntualidad ?? 0} icono="⏰" />
          <RatingBar label="Trato" value={profile.rating_trato ?? 0} icono="😊" />
          <RatingBar label="Seguridad" value={profile.rating_seguridad ?? 0} icono="🛡️" />
          <RatingBar label="Presentación" value={profile.rating_presentacion ?? 0} icono="👔" />
        </View>

        {/* Badges */}
        {profile.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Logros</Text>
            <View style={styles.badgesGrid}>
              {profile.badges.map((b) => (
                <View key={b.id} style={styles.badgeItem}>
                  <Text style={styles.badgeIcono}>{b.icono}</Text>
                  <Text style={styles.badgeName}>{b.nombre}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estadísticas</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{profile.completed_services}</Text>
              <Text style={styles.statLabel}>Servicios{'\n'}completados</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{profile.puntualidad_pct ?? 0}%</Text>
              <Text style={styles.statLabel}>Tasa de{'\n'}puntualidad</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{profile.rating_count}</Text>
              <Text style={styles.statLabel}>Reseñas{'\n'}recibidas</Text>
            </View>
          </View>
        </View>

        <View style={styles.selectBtnContainer}>
          <Button title="Seleccionar este agente" onPress={handleSelect} loading={selecting} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 20 },
  scroll: { paddingBottom: 40 },
  errorText: { color: '#dc2626', fontSize: 15, textAlign: 'center' },

  heroSection: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 24,
    backgroundColor: '#1a1a2e',
    gap: 10,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  avatarLargeText: { color: '#ffffff', fontSize: 34, fontWeight: '700' },
  heroName: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  nivelBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  nivelText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },

  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  scoreNum: { fontSize: 20, fontWeight: '800', color: '#0f3460' },
  scoreTrack: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 5 },

  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  ratingBarIcon: { fontSize: 16, width: 22 },
  ratingBarLabel: { fontSize: 13, color: '#374151', width: 90 },
  ratingBarTrack: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden' },
  ratingBarFill: { height: '100%', backgroundColor: '#0f3460', borderRadius: 4 },
  ratingBarValue: { fontSize: 13, fontWeight: '700', color: '#0f3460', width: 30, textAlign: 'right' },

  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeItem: {
    alignItems: 'center',
    width: '30%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  badgeIcono: { fontSize: 24 },
  badgeName: { fontSize: 11, color: '#374151', textAlign: 'center', fontWeight: '500' },

  statsGrid: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#0f3460', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center' },

  selectBtnContainer: { paddingHorizontal: 16, marginTop: 24, marginBottom: 8 },
});
