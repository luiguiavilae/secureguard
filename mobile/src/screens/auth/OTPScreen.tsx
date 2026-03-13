import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { sendOtp, verifyOtp } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import type { AuthStackParamList } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;
type Nav = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;

const OTP_LENGTH = 6;
const RESEND_COUNTDOWN = 60;

export default function OTPScreen(): React.ReactElement {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const { phone } = route.params;

  const { setAuth } = useAuthStore();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN);
  const [verifying, setVerifying] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  // Countdown para reenvío
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Verificar automáticamente cuando se completan los 6 dígitos
  useEffect(() => {
    const code = digits.join('');
    if (code.length === OTP_LENGTH && !verifying) {
      void handleVerify(code);
    }
  }, [digits]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(code: string): Promise<void> {
    setVerifying(true);
    setLoading(true);
    setError('');
    const { data, error: apiError } = await verifyOtp(phone, code, 'CLIENTE');
    setLoading(false);

    if (apiError || !data) {
      setError(apiError ?? 'Error al verificar el código');
      setDigits(Array(OTP_LENGTH).fill(''));
      setVerifying(false);
      inputRefs.current[0]?.focus();
      return;
    }

    setAuth(data.access_token, data.user_id, data.tipo, data.is_new_user);

    if (data.is_new_user) {
      navigation.replace('RoleSelect');
    } else if (data.tipo === 'AGENTE') {
      // Usuario existente agente → navegar a AgentStack (manejado en RootNavigator)
      navigation.replace('RoleSelect');
    } else {
      // Usuario existente cliente → manejado en RootNavigator por cambio de store
      navigation.replace('RoleSelect');
    }
  }

  function handleDigitChange(text: string, index: number): void {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (error) setError('');

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number): void {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleResend(): Promise<void> {
    setError('');
    setDigits(Array(OTP_LENGTH).fill(''));
    setVerifying(false);
    const { error: apiError } = await sendOtp(phone);
    if (apiError) {
      setError(apiError);
      return;
    }
    setCountdown(RESEND_COUNTDOWN);
    inputRefs.current[0]?.focus();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Código de verificación</Text>
          <Text style={styles.subtitle}>
            Enviamos un código a +51 {phone}
          </Text>
        </View>

        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                digit.length > 0 && styles.otpInputFilled,
                !!error && styles.otpInputError,
              ]}
              value={digit}
              onChangeText={(text) => handleDigitChange(text, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={index === 0}
              selectTextOnFocus
            />
          ))}
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          title={loading ? '' : 'Verificando...'}
          onPress={() => handleVerify(digits.join(''))}
          loading={loading}
          disabled={digits.join('').length !== OTP_LENGTH || loading}
        />

        <View style={styles.resendContainer}>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>
              Reenviar código en {countdown}s
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendText}>Reenviar código</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 24,
  },
  header: {
    gap: 8,
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
  },
  otpInputFilled: {
    borderColor: '#0f3460',
    backgroundColor: '#f0f4ff',
  },
  otpInputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  resendText: {
    fontSize: 14,
    color: '#0f3460',
    fontWeight: '600',
  },
});
