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
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import type { AuthStackParamList } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Terms'>;
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Terms'>;

const LAST_UPDATED = '25 de marzo de 2026';

export default function TermsScreen(): React.ReactElement {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Nav>();
  const { selectedTipo } = route.params;

  const setTipo = useAuthStore((s) => s.setTipo);
  const acceptTerms = useAuthStore((s) => s.acceptTerms);

  const [accepted, setAccepted] = useState(false);

  const handleContinue = () => {
    if (!accepted) {
      Alert.alert('Términos requeridos', 'Debes aceptar los Términos y Condiciones para continuar.');
      return;
    }
    acceptTerms();
    setTipo(selectedTipo);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Términos y Condiciones</Text>
        <Text style={styles.headerSub}>Última actualización: {LAST_UPDATED}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section title="1. Naturaleza del servicio e intermediación">
          Salvus (operado bajo la marca SecureGuard) es una plataforma tecnológica de intermediación que
          conecta personas naturales que requieren servicios de seguridad privada («Clientes») con agentes
          de seguridad privada independientes y certificados ante SUCAMEC («Agentes»).{'\n\n'}
          Salvus NO es una empresa de seguridad privada. La relación contractual del servicio de
          seguridad se establece directamente entre el Cliente y el Agente. Salvus actúa únicamente como
          intermediario y facilitador tecnológico.
        </Section>

        <Section title="2. Requisitos de uso">
          Para utilizar la plataforma debes:{'\n'}
          • Ser mayor de 18 años.{'\n'}
          • Proporcionar un número de teléfono válido para verificación por OTP.{'\n'}
          • Aceptar estos Términos y nuestra Política de Privacidad.{'\n\n'}
          El uso de la plataforma para actividades ilegales o que atenten contra la seguridad o dignidad
          de terceros queda estrictamente prohibido.
        </Section>

        <Section title="3. Política de cancelaciones y reembolsos">
          <Text style={styles.bold}>Cancelación gratuita:</Text>{' '}Puedes cancelar sin costo mientras
          el servicio esté en estado «Abierto» o «En revisión» (antes de que se confirme el pago).{'\n\n'}
          <Text style={styles.bold}>Cancelación con penalidad (servicio CONFIRMADO_PAGADO):{'\n'}</Text>
          {'  '}• Más de 2 horas antes del inicio: reembolso del 75 %.{'\n'}
          {'  '}• Entre 1 y 2 horas antes del inicio: reembolso del 50 %.{'\n'}
          {'  '}• Menos de 1 hora antes del inicio: reembolso del 25 %.{'\n'}
          {'  '}• En camino o iniciado: sin reembolso.{'\n\n'}
          <Text style={styles.bold}>Finalización anticipada (servicio EN_CURSO):{'\n'}</Text>
          Si el Cliente finaliza el servicio antes de que transcurra la duración contratada,
          el Agente recibirá el pago íntegro acordado y no corresponderá reembolso alguno al Cliente.{'\n\n'}
          Los reembolsos se procesan al instrumento de pago original en un plazo de 5–10 días hábiles,
          sujeto a los tiempos de cada entidad financiera.
        </Section>

        <Section title="4. Responsabilidad limitada">
          Salvus facilita la conexión entre Clientes y Agentes, pero NO garantiza resultados específicos
          ni asume responsabilidad por actos u omisiones de los Agentes durante la prestación del servicio.{'\n\n'}
          La plataforma no es responsable por:{'\n'}
          • Daños a personas o bienes durante la prestación del servicio.{'\n'}
          • Incumplimientos del Agente.{'\n'}
          • Interrupciones del servicio tecnológico por causas de fuerza mayor.{'\n\n'}
          El Agente es responsable de contar con los permisos y certificaciones SUCAMEC vigentes.
        </Section>

        <Section title="5. Privacidad de datos — Ley N.° 29733">
          En cumplimiento de la Ley N.° 29733, Ley de Protección de Datos Personales del Perú, y su
          Reglamento (DS 003-2013-JUS), el usuario autoriza a Salvus a recopilar, tratar y utilizar sus
          datos personales (nombre, teléfono, ubicación referencial, historial de servicios) con la
          finalidad de prestar y mejorar el servicio de intermediación.{'\n\n'}
          Los datos no serán cedidos a terceros sin consentimiento expreso, salvo obligación legal.
          Puedes ejercer tus derechos ARCO (Acceso, Rectificación, Cancelación y Oposición) escribiendo
          a privacidad@salvus.pe.{'\n\n'}
          El número de teléfono del Usuario nunca es compartido con el otro actor del servicio.
          La comunicación se realiza exclusivamente a través del chat interno de la plataforma.
        </Section>

        <Section title="6. Prohibición de contacto directo">
          Queda prohibido que Clientes y Agentes intercambien datos de contacto personales
          (teléfono, correo, redes sociales) fuera de la plataforma con el fin de contratar servicios
          al margen de Salvus. El incumplimiento podrá resultar en la suspensión o bloqueo de la cuenta.
        </Section>

        <Section title="7. Sistema de puntuación y sanciones">
          La plataforma opera un sistema de score para Clientes y Agentes. Las cancelaciones tardías,
          el incumplimiento de compromisos y la conducta inapropiada descuentan puntos del score,
          pudiendo resultar en restricciones de uso o bloqueo permanente de la cuenta.{'\n\n'}
          Cancelaciones por parte del Agente a menos de 2 horas del inicio conllevan una suspensión
          automática de 7 días.
        </Section>

        <Section title="8. Resolución de disputas">
          Ante cualquier controversia derivada del uso de la plataforma, las partes se someten
          primero a la mediación interna de Salvus (soporte@salvus.pe).{'\n\n'}
          De no resolverse, la controversia se someterá a los Juzgados y Tribunales del Cercado de Lima,
          Perú, renunciando a cualquier otro fuero que pudiera corresponderles.
        </Section>

        <Section title="9. Modificaciones">
          Salvus se reserva el derecho de modificar estos Términos en cualquier momento.
          Los cambios serán notificados mediante la aplicación con al menos 7 días de anticipación.
          El uso continuado de la plataforma tras la notificación implica la aceptación de los
          nuevos Términos.
        </Section>
      </ScrollView>

      {/* Footer con checkbox y botón */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setAccepted((v) => !v)}
          activeOpacity={0.8}
        >
          <Switch
            value={accepted}
            onValueChange={setAccepted}
            trackColor={{ false: '#d1d5db', true: '#86efac' }}
            thumbColor={accepted ? '#16a34a' : '#9ca3af'}
          />
          <Text style={styles.checkLabel}>
            He leído y acepto los Términos y Condiciones
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueBtn, !accepted && styles.continueBtnDisabled]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },

  header: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#9ca3af', fontSize: 12, marginTop: 4 },

  scroll: { padding: 20, paddingBottom: 16 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  sectionBody: { fontSize: 14, color: '#374151', lineHeight: 22 },
  bold: { fontWeight: '700' },

  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 14,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkLabel: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

  continueBtn: {
    backgroundColor: '#0f3460',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueBtnDisabled: { backgroundColor: '#9ca3af' },
  continueBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
