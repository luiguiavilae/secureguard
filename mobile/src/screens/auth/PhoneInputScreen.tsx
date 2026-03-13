import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { sendOtp } from '../../lib/api';
import type { AuthStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'PhoneInput'>;

export default function PhoneInputScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validatePhone(value: string): string {
    if (!value) return 'Ingresa tu número de teléfono';
    if (!/^9/.test(value)) return 'El número debe empezar con 9';
    if (value.length !== 9) return 'Debe tener exactamente 9 dígitos';
    return '';
  }

  async function handleSend(): Promise<void> {
    const validationError = validatePhone(phone);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    const { error: apiError } = await sendOtp(phone);
    setLoading(false);
    if (apiError) {
      setError(apiError);
      return;
    }
    navigation.navigate('OTP', { phone });
  }

  function handleChangeText(text: string): void {
    setPhone(text.replace(/\D/g, '').slice(0, 9));
    if (error) setError('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Ingresa tu número</Text>
          <Text style={styles.subtitle}>
            Te enviaremos un código de verificación
          </Text>
        </View>

        <Input
          value={phone}
          onChangeText={handleChangeText}
          placeholder="912345678"
          prefix="+51"
          keyboardType="phone-pad"
          error={error}
          maxLength={9}
          autoFocus
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Enviar código"
            onPress={handleSend}
            loading={loading}
            disabled={phone.length !== 9}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 20,
  },
  header: {
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
  },
  buttonContainer: {
    marginTop: 8,
  },
});
