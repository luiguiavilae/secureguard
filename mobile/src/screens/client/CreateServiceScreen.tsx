import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
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
import { Input } from '../../components/common/Input';
import { createService } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type {
  ClientStackParamList,
  Modalidad,
  NivelRiesgo,
  Presentacion,
  TipoLugar,
  TipoServicio,
  Visibilidad,
} from '../../types';

type Nav = NativeStackNavigationProp<ClientStackParamList, 'CreateService'>;

// ── Paso 2 — tipos de servicio ────────────────────────────────
const TIPOS_SERVICIO: { id: TipoServicio; label: string; icono: string }[] = [
  { id: 'acompañamiento', label: 'Acompañamiento', icono: '🤝' },
  { id: 'eventos', label: 'Eventos', icono: '🎉' },
  { id: 'residencial', label: 'Residencial', icono: '🏠' },
  { id: 'escolta', label: 'Escolta', icono: '🚗' },
  { id: 'custodia', label: 'Custodia', icono: '📦' },
  { id: 'trayecto', label: 'Trayecto', icono: '📍' },
];

const TIPOS_LUGAR: { id: TipoLugar; label: string }[] = [
  { id: 'domicilio', label: 'Domicilio' },
  { id: 'bar_restaurante', label: 'Bar / Restaurante' },
  { id: 'evento_publico', label: 'Evento público' },
  { id: 'espacio_publico', label: 'Espacio público' },
  { id: 'otro', label: 'Otro' },
];

const NIVELES_RIESGO: { id: NivelRiesgo; label: string; desc: string; color: string }[] = [
  { id: 'bajo', label: 'Bajo', desc: 'Ambiente tranquilo, sin amenazas conocidas', color: '#16a34a' },
  { id: 'medio', label: 'Medio', desc: 'Posible exposición a situaciones de riesgo moderado', color: '#d97706' },
  { id: 'alto', label: 'Alto', desc: 'Amenaza identificada o zona de alto peligro', color: '#dc2626' },
];

const PRESENTACIONES: { id: Presentacion; label: string; icono: string }[] = [
  { id: 'uniforme', label: 'Uniforme', icono: '👮' },
  { id: 'formal', label: 'Formal', icono: '👔' },
  { id: 'casual', label: 'Casual', icono: '👕' },
];

// ── Selector de opciones ──────────────────────────────────────
function OptionCard({
  selected,
  label,
  icono,
  onPress,
}: {
  selected: boolean;
  label: string;
  icono?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icono !== undefined && <Text style={styles.optionIcono}>{icono}</Text>}
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Toggle({
  value,
  onTrue,
  onFalse,
  labelTrue,
  labelFalse,
}: {
  value: boolean;
  onTrue: () => void;
  onFalse: () => void;
  labelTrue: string;
  labelFalse: string;
}) {
  return (
    <View style={styles.toggle}>
      <TouchableOpacity
        style={[styles.toggleBtn, value && styles.toggleBtnActive]}
        onPress={onTrue}
        activeOpacity={0.8}
      >
        <Text style={[styles.toggleText, value && styles.toggleTextActive]}>{labelTrue}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleBtn, !value && styles.toggleBtnActive]}
        onPress={onFalse}
        activeOpacity={0.8}
      >
        <Text style={[styles.toggleText, !value && styles.toggleTextActive]}>{labelFalse}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Barra de progreso ─────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressSegment,
            i < step ? styles.progressSegmentActive : styles.progressSegmentInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ── Estado del formulario ─────────────────────────────────────
interface FormState {
  // Paso 1
  paraTercero: boolean;
  terceroNombre: string;
  terceroDni: string;
  terceroGenero: string;
  terceroRelacion: string;
  // Paso 2
  tipoServicio: TipoServicio | null;
  modalidad: Modalidad;
  puntoInicio: string;
  paradas: string;
  puntoFin: string;
  transporte: string;
  // Paso 3
  tipoLugar: TipoLugar | null;
  consumoAlcohol: boolean;
  nivelRiesgo: NivelRiesgo | null;
  condicionEspecial: string;
  // Paso 4
  presentacion: Presentacion | null;
  visibilidad: Visibilidad;
  instrucciones: string;
  fechaInicio: Date;
  duracion: number;
}

const initialState: FormState = {
  paraTercero: false,
  terceroNombre: '',
  terceroDni: '',
  terceroGenero: '',
  terceroRelacion: '',
  tipoServicio: null,
  modalidad: 'fijo',
  puntoInicio: '',
  paradas: '',
  puntoFin: '',
  transporte: '',
  tipoLugar: null,
  consumoAlcohol: false,
  nivelRiesgo: null,
  condicionEspecial: '',
  presentacion: null,
  visibilidad: 'visible',
  instrucciones: '',
  fechaInicio: new Date(Date.now() + 60 * 60 * 1000),
  duracion: 3,
};

export default function CreateServiceScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const token = useAuthStore((s) => s.token);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  // Fecha en formato texto: DD/MM/AAAA HH:MM
  const [fechaTexto, setFechaTexto] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // ── Validaciones por paso ─────────────────────────────────
  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 1 && form.paraTercero) {
      if (!form.terceroNombre.trim()) e.terceroNombre = 'Nombre requerido';
      if (!form.terceroDni.trim()) e.terceroDni = 'DNI requerido';
      if (!form.terceroGenero) e.terceroGenero = 'Género requerido';
      if (!form.terceroRelacion.trim()) e.terceroRelacion = 'Relación requerida';
    }
    if (step === 2) {
      if (!form.tipoServicio) e.tipoServicio = 'Selecciona un tipo de servicio';
      if (form.modalidad === 'trayecto') {
        if (!form.puntoInicio.trim()) e.puntoInicio = 'Punto de inicio requerido';
        if (!form.puntoFin.trim()) e.puntoFin = 'Punto de destino requerido';
      }
    }
    if (step === 3) {
      if (!form.tipoLugar) e.tipoLugar = 'Selecciona el tipo de lugar';
      if (!form.nivelRiesgo) e.nivelRiesgo = 'Selecciona el nivel de riesgo';
    }
    if (step === 4) {
      if (!form.presentacion) e.presentacion = 'Selecciona la presentación del agente';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goNext() {
    if (validateStep()) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
    else navigation.goBack();
  }

  // ── Construir payload ─────────────────────────────────────
  function buildPayload() {
    return {
      tipo_servicio: form.tipoServicio ?? 'acompañamiento',
      descripcion: form.instrucciones.trim() || `Servicio de ${form.tipoServicio}`,
      distrito: 'Miraflores', // TODO: campo de distrito si se añade
      agentes_requeridos: 1,
      duracion_horas: form.duracion,
      fecha_inicio_solicitada: form.fechaInicio.toISOString(),
      para_tercero: form.paraTercero,
      tercero_nombre: form.paraTercero ? form.terceroNombre : undefined,
      tercero_dni: form.paraTercero ? form.terceroDni : undefined,
      tercero_genero: form.paraTercero ? form.terceroGenero : undefined,
      tercero_relacion: form.paraTercero ? form.terceroRelacion : undefined,
      modalidad: form.modalidad,
      punto_inicio: form.modalidad === 'trayecto' ? form.puntoInicio : undefined,
      paradas: form.modalidad === 'trayecto' && form.paradas.trim()
        ? form.paradas.split(',').map((p) => p.trim())
        : undefined,
      punto_fin: form.modalidad === 'trayecto' ? form.puntoFin : undefined,
      transporte: form.modalidad === 'trayecto' && form.transporte.trim()
        ? form.transporte
        : undefined,
      tipo_lugar: form.tipoLugar ?? undefined,
      consumo_alcohol: form.consumoAlcohol,
      nivel_riesgo: form.nivelRiesgo ?? undefined,
      condicion_especial: form.condicionEspecial.trim() || undefined,
      presentacion: form.presentacion ?? undefined,
      visibilidad: form.visibilidad,
      instrucciones: form.instrucciones.trim() || undefined,
    };
  }

  async function handlePublish() {
    if (!validateStep() || !token) return;
    setLoading(true);
    const { data, error } = await createService(buildPayload(), token);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    Alert.alert('¡Solicitud publicada!', 'Los agentes disponibles recibirán tu solicitud.', [
      { text: 'OK', onPress: () => navigation.navigate('Home') },
    ]);
  }

  async function handleChooseAgent() {
    if (!validateStep() || !token) return;
    setLoading(true);
    const { data, error } = await createService(buildPayload(), token);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
      return;
    }
    if (data) {
      navigation.navigate('AgentList', { serviceId: data.id });
    }
  }

  const precio = form.duracion * 50;

  // ── Render pasos ──────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar step={step} total={4} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backText}>← {step === 1 ? 'Cancelar' : 'Atrás'}</Text>
        </TouchableOpacity>

        {/* ── Paso 1: ¿Para quién? ── */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>¿Para quién es el servicio?</Text>
            <Toggle
              value={!form.paraTercero}
              onTrue={() => set('paraTercero', false)}
              onFalse={() => set('paraTercero', true)}
              labelTrue="Para mí"
              labelFalse="Para otra persona"
            />
            {form.paraTercero && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nombre completo</Text>
                <Input
                  value={form.terceroNombre}
                  onChangeText={(v) => set('terceroNombre', v)}
                  placeholder="Nombre de la persona"
                  error={errors.terceroNombre}
                />
                <Text style={styles.fieldLabel}>DNI</Text>
                <Input
                  value={form.terceroDni}
                  onChangeText={(v) => set('terceroDni', v)}
                  placeholder="Número de DNI"
                  keyboardType="numeric"
                  maxLength={8}
                  error={errors.terceroDni}
                />
                <Text style={styles.fieldLabel}>Género</Text>
                <View style={styles.rowOptions}>
                  {['M', 'F'].map((g) => (
                    <OptionCard
                      key={g}
                      selected={form.terceroGenero === g}
                      label={g === 'M' ? 'Masculino' : 'Femenino'}
                      onPress={() => set('terceroGenero', g)}
                    />
                  ))}
                </View>
                {errors.terceroGenero !== undefined && (
                  <Text style={styles.errorText}>{errors.terceroGenero}</Text>
                )}
                <Text style={styles.fieldLabel}>Relación</Text>
                <Input
                  value={form.terceroRelacion}
                  onChangeText={(v) => set('terceroRelacion', v)}
                  placeholder="Ej: familiar, empleado..."
                  error={errors.terceroRelacion}
                />
              </View>
            )}
          </View>
        )}

        {/* ── Paso 2: ¿Qué necesitas? ── */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>¿Qué necesitas?</Text>
            <Text style={styles.fieldLabel}>Tipo de servicio</Text>
            <View style={styles.tiposGrid}>
              {TIPOS_SERVICIO.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tipoCard, form.tipoServicio === t.id && styles.tipoCardSelected]}
                  onPress={() => set('tipoServicio', t.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tipoIcono}>{t.icono}</Text>
                  <Text style={[styles.tipoLabel, form.tipoServicio === t.id && styles.tipoLabelSelected]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.tipoServicio !== undefined && (
              <Text style={styles.errorText}>{errors.tipoServicio}</Text>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Modalidad</Text>
            <Toggle
              value={form.modalidad === 'fijo'}
              onTrue={() => set('modalidad', 'fijo')}
              onFalse={() => set('modalidad', 'trayecto')}
              labelTrue="Fijo"
              labelFalse="Con trayecto"
            />

            {form.modalidad === 'trayecto' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Punto de inicio</Text>
                <Input
                  value={form.puntoInicio}
                  onChangeText={(v) => set('puntoInicio', v)}
                  placeholder="Dirección de partida"
                  error={errors.puntoInicio}
                />
                <Text style={styles.fieldLabel}>Paradas (opcional, separadas por coma)</Text>
                <Input
                  value={form.paradas}
                  onChangeText={(v) => set('paradas', v)}
                  placeholder="Ej: Av. Larco 123, CC Larcomar"
                />
                <Text style={styles.fieldLabel}>Punto de destino</Text>
                <Input
                  value={form.puntoFin}
                  onChangeText={(v) => set('puntoFin', v)}
                  placeholder="Dirección de llegada"
                  error={errors.puntoFin}
                />
                <Text style={styles.fieldLabel}>Transporte (opcional)</Text>
                <Input
                  value={form.transporte}
                  onChangeText={(v) => set('transporte', v)}
                  placeholder="Ej: taxi, vehículo propio..."
                />
              </View>
            )}
          </View>
        )}

        {/* ── Paso 3: Contexto y riesgo ── */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Contexto y riesgo</Text>
            <Text style={styles.fieldLabel}>Tipo de lugar</Text>
            <View style={styles.rowOptions}>
              {TIPOS_LUGAR.map((l) => (
                <OptionCard
                  key={l.id}
                  selected={form.tipoLugar === l.id}
                  label={l.label}
                  onPress={() => set('tipoLugar', l.id)}
                />
              ))}
            </View>
            {errors.tipoLugar !== undefined && (
              <Text style={styles.errorText}>{errors.tipoLugar}</Text>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>¿Habrá consumo de alcohol?</Text>
            <Toggle
              value={form.consumoAlcohol}
              onTrue={() => set('consumoAlcohol', true)}
              onFalse={() => set('consumoAlcohol', false)}
              labelTrue="Sí"
              labelFalse="No"
            />

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Nivel de riesgo</Text>
            {NIVELES_RIESGO.map((nr) => (
              <TouchableOpacity
                key={nr.id}
                style={[
                  styles.riesgoCard,
                  form.nivelRiesgo === nr.id && { borderColor: nr.color, borderWidth: 2 },
                ]}
                onPress={() => set('nivelRiesgo', nr.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.riesgoDot, { backgroundColor: nr.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.riesgoLabel}>{nr.label}</Text>
                  <Text style={styles.riesgoDesc}>{nr.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {errors.nivelRiesgo !== undefined && (
              <Text style={styles.errorText}>{errors.nivelRiesgo}</Text>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
              Condición especial (opcional)
            </Text>
            <View style={styles.textareaContainer}>
              <TextInput
                style={styles.textarea}
                value={form.condicionEspecial}
                onChangeText={(v) => set('condicionEspecial', v.slice(0, 100))}
                placeholder="Alergias, limitaciones, necesidades especiales..."
                multiline
                numberOfLines={3}
                maxLength={100}
              />
              <Text style={styles.charCount}>{form.condicionEspecial.length}/100</Text>
            </View>
          </View>
        )}

        {/* ── Paso 4: Instrucciones y tiempo ── */}
        {step === 4 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Instrucciones y tiempo</Text>

            <Text style={styles.fieldLabel}>Presentación del agente</Text>
            <View style={styles.rowOptions}>
              {PRESENTACIONES.map((p) => (
                <OptionCard
                  key={p.id}
                  selected={form.presentacion === p.id}
                  label={p.label}
                  icono={p.icono}
                  onPress={() => set('presentacion', p.id)}
                />
              ))}
            </View>
            {errors.presentacion !== undefined && (
              <Text style={styles.errorText}>{errors.presentacion}</Text>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Visibilidad</Text>
            <Toggle
              value={form.visibilidad === 'visible'}
              onTrue={() => set('visibilidad', 'visible')}
              onFalse={() => set('visibilidad', 'discreto')}
              labelTrue="Visible"
              labelFalse="Discreto"
            />

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Instrucciones al agente</Text>
            <View style={styles.textareaContainer}>
              <TextInput
                style={styles.textarea}
                value={form.instrucciones}
                onChangeText={(v) => set('instrucciones', v.slice(0, 300))}
                placeholder="Indicaciones específicas, puntos de encuentro..."
                multiline
                numberOfLines={4}
                maxLength={300}
              />
              <Text style={styles.charCount}>{form.instrucciones.length}/300</Text>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Fecha y hora de inicio</Text>
            <Text style={styles.dateHint}>Formato: DD/MM/AAAA HH:MM</Text>
            <Input
              value={fechaTexto}
              onChangeText={(v) => {
                setFechaTexto(v);
                // Parse DD/MM/AAAA HH:MM
                const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
                if (match) {
                  const [, d, m, y, h, min] = match;
                  const parsed = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
                  if (!isNaN(parsed.getTime())) set('fechaInicio', parsed);
                }
              }}
              placeholder="13/03/2026 14:00"
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Duración</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={[styles.stepperBtn, form.duracion <= 3 && styles.stepperBtnDisabled]}
                onPress={() => set('duracion', Math.max(3, form.duracion - 1))}
                disabled={form.duracion <= 3}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{form.duracion} horas</Text>
              <TouchableOpacity
                style={[styles.stepperBtn, form.duracion >= 12 && styles.stepperBtnDisabled]}
                onPress={() => set('duracion', Math.min(12, form.duracion + 1))}
                disabled={form.duracion >= 12}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Resumen de precio */}
            <View style={styles.priceSummary}>
              <Text style={styles.priceSummaryTitle}>Resumen del precio</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>{form.duracion} h × S/ 50/h</Text>
                <Text style={styles.priceValue}>S/ {precio}</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceTotalLabel}>Total estimado</Text>
                <Text style={styles.priceTotalValue}>S/ {precio}</Text>
              </View>
            </View>

            {/* Botones de acción */}
            <View style={styles.actionBtns}>
              <Button
                title="Elegir mi agente"
                onPress={handleChooseAgent}
                loading={loading}
                variant="secondary"
              />
              <Button
                title="Publicar solicitud"
                onPress={handlePublish}
                loading={loading}
              />
            </View>
          </View>
        )}

        {/* Botón siguiente (pasos 1-3) */}
        {step < 4 && (
          <View style={styles.nextBtnContainer}>
            <Button title="Siguiente" onPress={goNext} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { paddingBottom: 40 },

  progressContainer: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: '#e5e7eb',
    gap: 3,
  },
  progressSegment: { flex: 1 },
  progressSegmentActive: { backgroundColor: '#0f3460' },
  progressSegmentInactive: { backgroundColor: '#e5e7eb' },

  backBtn: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  backText: { color: '#0f3460', fontSize: 15, fontWeight: '500' },

  stepContent: { paddingHorizontal: 20, paddingTop: 8 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#1f2937', marginBottom: 20 },

  fieldGroup: { gap: 12, marginTop: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  errorText: { color: '#dc2626', fontSize: 13, marginTop: 4 },

  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 3,
    marginBottom: 8,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#0f3460' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  toggleTextActive: { color: '#ffffff' },

  // Option cards (horizontal scroll)
  rowOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  optionCardSelected: { borderColor: '#0f3460', backgroundColor: '#eff6ff' },
  optionIcono: { fontSize: 16, marginBottom: 2 },
  optionLabel: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  optionLabelSelected: { color: '#0f3460', fontWeight: '700' },

  // Tipos de servicio
  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tipoCard: {
    width: '30%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    gap: 6,
  },
  tipoCardSelected: { borderColor: '#0f3460', backgroundColor: '#eff6ff' },
  tipoIcono: { fontSize: 24 },
  tipoLabel: { fontSize: 12, fontWeight: '500', color: '#6b7280', textAlign: 'center' },
  tipoLabelSelected: { color: '#0f3460', fontWeight: '700' },

  // Riesgo
  riesgoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  riesgoDot: { width: 12, height: 12, borderRadius: 6 },
  riesgoLabel: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  riesgoDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  // Textarea
  textareaContainer: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  textarea: { fontSize: 15, color: '#1f2937', minHeight: 80 },
  charCount: { alignSelf: 'flex-end', fontSize: 11, color: '#9ca3af', marginTop: 4 },

  dateHint: { fontSize: 12, color: '#9ca3af', marginBottom: 6 },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f3460',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: { backgroundColor: '#e5e7eb' },
  stepperBtnText: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  stepperValue: { fontSize: 18, fontWeight: '700', color: '#1f2937', minWidth: 90, textAlign: 'center' },

  // Price summary
  priceSummary: {
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceSummaryTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', marginBottom: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: '#6b7280' },
  priceValue: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  priceDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  priceTotalLabel: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  priceTotalValue: { fontSize: 18, fontWeight: '700', color: '#0f3460' },

  actionBtns: { gap: 12, marginTop: 24 },
  nextBtnContainer: { paddingHorizontal: 20, marginTop: 24 },
});
