import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Button } from '../../components/common/Button';
import { uploadDocument } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { DocTipo, OnboardingStackParamList } from '../../types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'DocumentUpload'>;
type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'DocumentUpload'>;

interface DocSlot {
  tipo: DocTipo;
  label: string;
  description: string;
  uri: string | null;
}

const INITIAL_SLOTS: DocSlot[] = [
  {
    tipo: 'DNI_FRENTE',
    label: 'DNI - Parte frontal',
    description: 'Fotografía el frente de tu DNI',
    uri: null,
  },
  {
    tipo: 'DNI_REVERSO',
    label: 'DNI - Parte posterior',
    description: 'Fotografía el reverso de tu DNI',
    uri: null,
  },
  {
    tipo: 'SELFIE',
    label: 'Selfie sosteniendo tu DNI',
    description: 'Tómate una selfie mostrando tu DNI',
    uri: null,
  },
];

function CameraIcon(): React.ReactElement {
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
      <Circle cx={20} cy={22} r={7} stroke="#9ca3af" strokeWidth={2} />
      <Circle cx={20} cy={22} r={3} fill="#9ca3af" />
      <Line x1={12} y1={12} x2={28} y2={12} stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
      <Line x1={14} y1={8} x2={26} y2={8} stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export default function DocumentUploadScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const { agentId } = route.params;
  const { token } = useAuthStore();

  const [slots, setSlots] = useState<DocSlot[]>(INITIAL_SLOTS);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadedCount = slots.filter((s) => s.uri !== null).length;
  const allUploaded = uploadedCount === slots.length;

  async function handlePickImage(index: number): Promise<void> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para tomar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setSlots((prev) =>
        prev.map((s, i) => (i === index ? { ...s, uri } : s)),
      );
    }
  }

  function handleRetake(index: number): void {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, uri: null } : s)),
    );
  }

  async function handleSubmit(): Promise<void> {
    if (!token) return;
    setUploading(true);
    setError('');

    for (const slot of slots) {
      if (!slot.uri) continue;
      const filename = slot.uri.split('/').pop() ?? `${slot.tipo}.jpg`;
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const { error: uploadError } = await uploadDocument(
        agentId,
        { uri: slot.uri, name: filename, type: mimeType },
        slot.tipo,
        token,
      );

      if (uploadError) {
        setError(`Error al subir ${slot.label}: ${uploadError}`);
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    navigation.navigate('PendingApproval', { agentId });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.progressBar}>
        <View style={[styles.progressStep, styles.progressStepActive]} />
        <View style={[styles.progressStep, styles.progressStepActive]} />
      </View>
      <Text style={styles.stepLabel}>Paso 2 de 2</Text>
      <Text style={styles.title}>Sube tus documentos</Text>
      <Text style={styles.subtitle}>Necesitamos verificar tu identidad</Text>

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {uploadedCount}/{slots.length} fotos completadas
        </Text>
      </View>

      <View style={styles.slots}>
        {slots.map((slot, index) => (
          <View key={slot.tipo} style={styles.slot}>
            <Text style={styles.slotLabel}>{slot.label}</Text>
            <Text style={styles.slotDescription}>{slot.description}</Text>

            {slot.uri ? (
              <View style={styles.preview}>
                <Image source={{ uri: slot.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => handleRetake(index)}
                >
                  <Text style={styles.retakeText}>Retomar foto</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handlePickImage(index)}
                activeOpacity={0.7}
              >
                <CameraIcon />
                <Text style={styles.uploadButtonText}>Tomar foto</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {uploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator color="#0f3460" size="large" />
          <Text style={styles.uploadingText}>Subiendo documentos...</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title="Enviar para revisión"
          onPress={handleSubmit}
          disabled={!allUploaded || uploading}
          loading={uploading}
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
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: -8,
  },
  counter: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f3460',
  },
  slots: {
    gap: 20,
  },
  slot: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  slotLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  slotDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  uploadButton: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    marginTop: 4,
  },
  uploadButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  preview: {
    gap: 8,
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  retakeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  retakeText: {
    fontSize: 14,
    color: '#0f3460',
    fontWeight: '600',
  },
  uploadingContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  uploadingText: {
    fontSize: 15,
    color: '#374151',
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
