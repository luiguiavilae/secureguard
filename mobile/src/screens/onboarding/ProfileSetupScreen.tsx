import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { registerAgent } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type {
  Genero,
  OnboardingStackParamList,
  Presentacion,
  TipoServicio,
} from '../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'ProfileSetup'>;

const DISTRITOS = [
  'Miraflores',
  'San Isidro',
  'Barranco',
  'Surco',
  'La Molina',
  'San Borja',
  'Magdalena',
  'Pueblo Libre',
  'Jesús María',
  'Lince',
  'San Miguel',
  'Chorrillos',
  'Surquillo',
  'Ate',
  'San Juan de Lurigancho',
  'Los Olivos',
  'Independencia',
  'Comas',
  'Villa El Salvador',
  'Villa María',
];

const TIPOS_SERVICIO: { id: TipoServicio; label: string }[] = [
  { id: 'acompañamiento', label: 'Acompañamiento' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'residencial', label: 'Residencial' },
  { id: 'escolta', label: 'Escolta' },
  { id: 'custodia', label: 'Custodia' },
  { id: 'trayecto', label: 'Trayecto' },
];

const PRESENTACIONES: { id: Presentacion; label: string }[] = [
  { id: 'uniforme', label: 'Uniforme' },
  { id: 'formal', label: 'Formal' },
  { id: 'casual', label: 'Casual' },
];

const GENEROS: { id: Genero; label: string }[] = [
  { id: 'M', label: 'Masculino' },
  { id: 'F', label: 'Femenino' },
];

const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, '0')}:00`,
);

function CheckItem({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}): React.ReactElement {
  return (
    <TouchableOpacity style={styles.checkItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SelectorRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
}): React.ReactElement {
  return (
    <View style={styles.selectorSection}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <View style={styles.selectorRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.selectorBtn, selected === opt.id && styles.selectorBtnActive]}
            onPress={() => onSelect(opt.id)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.selectorBtnText,
                selected === opt.id && styles.selectorBtnTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function ProfileSetupScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const { token, setAgentId } = useAuthStore();

  const [distritos, setDistritos] = useState<string[]>([]);
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([]);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFin, setHorarioFin] = useState('20:00');
  const [presentacion, setPresentacion] = useState<Presentacion>('uniforme');
  const [genero, setGenero] = useState<Genero | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleDistrito(distrito: string): void {
    setDistritos((prev) =>
      prev.includes(distrito)
        ? prev.filter((d) => d !== distrito)
        : [...prev, distrito],
    );
  }

  function toggleTipoServicio(tipo: TipoServicio): void {
    setTiposServicio((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  }

  const canContinue =
    distritos.length > 0 &&
    tiposServicio.length > 0 &&
    genero !== '' &&
    !loading;

  async function handleContinue(): Promise<void> {
    if (!token || genero === '') return;
    setError('');
    setLoading(true);
    const { data, error: apiError } = await registerAgent(
      {
        distritos,
        tipos_servicio: tiposServicio,
        horario_inicio: horarioInicio,
        horario_fin: horarioFin,
        presentaciones: [presentacion],
        genero,
      },
      token,
    );
    setLoading(false);
    if (apiError || !data) {
      setError(apiError ?? 'Error al registrar perfil');
      return;
    }
    setAgentId(data.agent_id);
    navigation.navigate('DocumentUpload', { agentId: data.agent_id });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.progressBar}>
        <View style={[styles.progressStep, styles.progressStepActive]} />
        <View style={styles.progressStep} />
      </View>
      <Text style={styles.stepLabel}>Paso 1 de 2</Text>
      <Text style={styles.title}>Configura tu perfil de agente</Text>

      {/* Distritos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Distritos donde trabajas{' '}
          <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView
          style={styles.distritosScroll}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {DISTRITOS.map((d) => (
            <CheckItem
              key={d}
              label={d}
              checked={distritos.includes(d)}
              onPress={() => toggleDistrito(d)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Tipos de servicio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Tipos de servicio <Text style={styles.required}>*</Text>
        </Text>
        {TIPOS_SERVICIO.map(({ id, label }) => (
          <CheckItem
            key={id}
            label={label}
            checked={tiposServicio.includes(id)}
            onPress={() => toggleTipoServicio(id)}
          />
        ))}
      </View>

      {/* Horario */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Horario disponible</Text>
        <View style={styles.timeRow}>
          <View style={styles.timePicker}>
            <Text style={styles.timeLabel}>Inicio</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hourList}
            >
              {HOURS.map((h) => (
                <TouchableOpacity
                  key={`inicio-${h}`}
                  style={[
                    styles.hourChip,
                    horarioInicio === h && styles.hourChipActive,
                  ]}
                  onPress={() => setHorarioInicio(h)}
                >
                  <Text
                    style={[
                      styles.hourChipText,
                      horarioInicio === h && styles.hourChipTextActive,
                    ]}
                  >
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.timePicker}>
            <Text style={styles.timeLabel}>Fin</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hourList}
            >
              {HOURS.map((h) => (
                <TouchableOpacity
                  key={`fin-${h}`}
                  style={[
                    styles.hourChip,
                    horarioFin === h && styles.hourChipActive,
                  ]}
                  onPress={() => setHorarioFin(h)}
                >
                  <Text
                    style={[
                      styles.hourChipText,
                      horarioFin === h && styles.hourChipTextActive,
                    ]}
                  >
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Presentación */}
      <SelectorRow
        label="Presentación"
        options={PRESENTACIONES}
        selected={presentacion}
        onSelect={(v) => setPresentacion(v as Presentacion)}
      />

      {/* Género */}
      <SelectorRow
        label="Género *"
        options={GENEROS}
        selected={genero}
        onSelect={(v) => setGenero(v as Genero)}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.buttonContainer}>
        <Button
          title="Continuar"
          onPress={handleContinue}
          loading={loading}
          disabled={!canContinue}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 24,
    gap: 20,
    paddingBottom: 40,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
  },
  progressStepActive: {
    backgroundColor: '#0f3460',
  },
  stepLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    color: '#dc2626',
  },
  distritosScroll: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#ffffff',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0f3460',
    borderColor: '#0f3460',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  checkLabel: {
    fontSize: 15,
    color: '#374151',
  },
  timeRow: {
    gap: 12,
  },
  timePicker: {
    gap: 6,
  },
  timeLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  hourList: {
    gap: 6,
  },
  hourChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  hourChipActive: {
    backgroundColor: '#0f3460',
    borderColor: '#0f3460',
  },
  hourChipText: {
    fontSize: 13,
    color: '#374151',
  },
  hourChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  selectorSection: {
    gap: 10,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  selectorBtnActive: {
    backgroundColor: '#0f3460',
    borderColor: '#0f3460',
  },
  selectorBtnText: {
    fontSize: 14,
    color: '#374151',
  },
  selectorBtnTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 8,
  },
});
