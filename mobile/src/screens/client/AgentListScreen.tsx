import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAgentsForService } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { AgentListItem, ClientStackParamList } from '../../types';

type Props = NativeStackScreenProps<ClientStackParamList, 'AgentList'>;
type Nav = NativeStackNavigationProp<ClientStackParamList, 'AgentList'>;

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

function RatingStars({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={[styles.star, { color: i <= Math.round(rating) ? '#d97706' : '#d1d5db' }]}>
          ★
        </Text>
      ))}
      <Text style={styles.ratingNum}>{rating.toFixed(1)}</Text>
    </View>
  );
}

function AgentCard({
  agent,
  onPress,
}: {
  agent: AgentListItem;
  onPress: () => void;
}) {
  const nivelColor = NIVEL_COLORS[agent.nivel] ?? '#6b7280';
  const nivelLabel = NIVEL_LABELS[agent.nivel] ?? `Nivel ${agent.nivel}`;
  const topBadges = agent.badges.slice(0, 3);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { borderColor: nivelColor }]}>
          <Text style={styles.avatarText}>{agent.nombre.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.agentName}>{agent.nombre}</Text>
            <View style={[styles.nivelBadge, { backgroundColor: nivelColor }]}>
              <Text style={styles.nivelText}>{nivelLabel}</Text>
            </View>
          </View>
          <RatingStars rating={agent.rating_avg} />
          <Text style={styles.statsText}>
            {agent.completed_services} servicios · {agent.puntualidad_pct}% puntualidad
          </Text>
        </View>
      </View>

      {topBadges.length > 0 && (
        <View style={styles.badgesRow}>
          {topBadges.map((b) => (
            <View key={b.id} style={styles.badge}>
              <Text style={styles.badgeIcono}>{b.icono}</Text>
              <Text style={styles.badgeName}>{b.nombre}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.tiposRow}>
        {agent.tipos_servicio.slice(0, 4).map((t) => (
          <View key={t} style={styles.tipoTag}>
            <Text style={styles.tipoTagText}>{t}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const RATING_FILTERS = [
  { label: 'Todos', min: 0 },
  { label: '4+ ⭐', min: 4 },
  { label: '4.5+ ⭐', min: 4.5 },
];

const PRESENTACION_FILTERS = [
  { label: 'Todos', value: null as string | null },
  { label: 'Uniforme', value: 'uniforme' as string | null },
  { label: 'Formal', value: 'formal' as string | null },
  { label: 'Casual', value: 'casual' as string | null },
];

export default function AgentListScreen(): React.ReactElement {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((s) => s.token);
  const { serviceId } = route.params;

  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [presFilter, setPresFilter] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    if (!token) return;
    const { data, error: err } = await getAgentsForService(serviceId, token);
    if (err) setError(err);
    else setAgents(data ?? []);
    setLoading(false);
  }, [serviceId, token]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const filtered = agents.filter((a) => {
    if (a.rating_avg < minRating) return false;
    if (presFilter !== null && !a.presentaciones.includes(presFilter)) return false;
    return true;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0f3460" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filtersSection}>
        <Text style={styles.filterGroupLabel}>Rating mínimo</Text>
        <View style={styles.filterChips}>
          {RATING_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.min}
              style={[styles.chip, minRating === f.min && styles.chipActive]}
              onPress={() => setMinRating(f.min)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, minRating === f.min && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.filterGroupLabel}>Presentación</Text>
        <View style={styles.filterChips}>
          {PRESENTACION_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value ?? 'all'}
              style={[styles.chip, presFilter === f.value && styles.chipActive]}
              onPress={() => setPresFilter(f.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, presFilter === f.value && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error !== null && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>😔</Text>
          <Text style={styles.emptyTitle}>No hay agentes disponibles</Text>
          <Text style={styles.emptyBody}>No hay agentes disponibles para este horario.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(a) => a.agent_id}
          renderItem={({ item }) => (
            <AgentCard
              agent={item}
              onPress={() =>
                navigation.navigate('AgentProfile', {
                  agentId: item.agent_id,
                  serviceId,
                })
              }
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

  filtersSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterGroupLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 8, marginTop: 4 },
  filterChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#0f3460', borderColor: '#0f3460' },
  chipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: '600' },

  errorBox: { margin: 16, padding: 12, backgroundColor: '#fee2e2', borderRadius: 8 },
  errorText: { color: '#dc2626', fontSize: 14 },

  list: { padding: 16, gap: 12 },

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
  cardHeader: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  agentName: { fontSize: 16, fontWeight: '700', color: '#1f2937', flex: 1 },
  nivelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  nivelText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  star: { fontSize: 14 },
  ratingNum: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginLeft: 4 },
  statsText: { fontSize: 12, color: '#9ca3af' },

  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeIcono: { fontSize: 13 },
  badgeName: { fontSize: 11, color: '#374151', fontWeight: '500' },

  tiposRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tipoTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tipoTagText: { fontSize: 11, color: '#0f3460', fontWeight: '500' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  emptyBody: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
