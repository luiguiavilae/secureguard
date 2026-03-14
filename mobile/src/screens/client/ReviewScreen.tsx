import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { submitReview } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { ClientStackParamList } from '../../types';

type Props = NativeStackScreenProps<ClientStackParamList, 'Review'>;
type Nav = NativeStackNavigationProp<ClientStackParamList, 'Review'>;

const DIMENSIONES = [
  { key: 'general', label: 'General', icono: '⭐' },
  { key: 'puntualidad', label: 'Puntualidad', icono: '⏰' },
  { key: 'trato', label: 'Trato', icono: '😊' },
  { key: 'seguridad', label: 'Seguridad', icono: '🛡️' },
  { key: 'presentacion', label: 'Presentación', icono: '👔' },
] as const;

type DimensionKey = (typeof DIMENSIONES)[number]['key'];

function StarSlider({
  value,
  onChange,
  icono,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  icono: string;
  label: string;
}) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderLabelRow}>
        <Text style={styles.sliderIcono}>{icono}</Text>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value}/5</Text>
      </View>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Text
            key={i}
            style={[styles.star, { color: i <= value ? '#d97706' : '#d1d5db' }]}
            onPress={() => onChange(i)}
          >
            ★
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function ReviewScreen(): React.ReactElement {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((s) => s.token);
  const { serviceId, agentNombre } = route.params;

  const [ratings, setRatings] = useState<Record<DimensionKey, number>>({
    general: 5,
    puntualidad: 5,
    trato: 5,
    seguridad: 5,
    presentacion: 5,
  });
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);

  const setRating = (key: DimensionKey, value: number) =>
    setRatings((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!token) return;
    setLoading(true);
    const { error } = await submitReview(
      serviceId,
      {
        rating_general: ratings.general,
        rating_puntualidad: ratings.puntualidad,
        rating_trato: ratings.trato,
        rating_seguridad: ratings.seguridad,
        rating_presentacion: ratings.presentacion,
        comentario: comentario.trim() || undefined,
      },
      token,
    );
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    Alert.alert('¡Gracias por tu calificación!', 'Tu opinión ayuda a mejorar el servicio.', [
      { text: 'OK', onPress: () => navigation.navigate('Home') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Agente */}
        <View style={styles.agentHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{agentNombre.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.agentNombre}>{agentNombre}</Text>
        </View>

        <Text style={styles.title}>¿Cómo fue el servicio?</Text>

        {/* Sliders */}
        <View style={styles.section}>
          {DIMENSIONES.map((d) => (
            <StarSlider
              key={d.key}
              icono={d.icono}
              label={d.label}
              value={ratings[d.key]}
              onChange={(v) => setRating(d.key, v)}
            />
          ))}
        </View>

        {/* Comentario */}
        <View style={styles.section}>
          <Text style={styles.comentarioLabel}>Comentario (opcional)</Text>
          <View style={styles.textareaContainer}>
            <TextInput
              style={styles.textarea}
              value={comentario}
              onChangeText={(v) => setComentario(v.slice(0, 200))}
              placeholder="Cuéntanos más sobre tu experiencia..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              maxLength={200}
            />
            <Text style={styles.charCount}>{comentario.length}/200</Text>
          </View>
        </View>

        <View style={styles.btnContainer}>
          <Button title="Enviar calificación" onPress={handleSubmit} loading={loading} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { paddingBottom: 40 },

  agentHeader: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
    gap: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 26, fontWeight: '700' },
  agentNombre: { color: '#ffffff', fontSize: 18, fontWeight: '700' },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 16,
  },

  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  sliderRow: { marginBottom: 16 },
  sliderLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sliderIcono: { fontSize: 18, marginRight: 8 },
  sliderLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1f2937' },
  sliderValue: { fontSize: 14, fontWeight: '700', color: '#0f3460' },
  starsRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 32 },

  comentarioLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  textareaContainer: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    padding: 12,
  },
  textarea: { fontSize: 15, color: '#1f2937', minHeight: 80 },
  charCount: { alignSelf: 'flex-end', fontSize: 11, color: '#9ca3af', marginTop: 4 },

  btnContainer: { paddingHorizontal: 16 },
});
