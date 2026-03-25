import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const LAST_UPDATED = '25 de marzo de 2026';

export default function TermsViewScreen(): React.ReactElement {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Términos y Condiciones</Text>
        <Text style={styles.headerSub}>Última actualización: {LAST_UPDATED}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Section title="1. Naturaleza del servicio e intermediación">
          Salvus (SecureGuard) es una plataforma de intermediación que conecta Clientes con agentes de
          seguridad privada certificados SUCAMEC. Salvus NO es una empresa de seguridad privada. La
          relación contractual del servicio se establece directamente entre el Cliente y el Agente.
        </Section>

        <Section title="2. Requisitos de uso">
          • Ser mayor de 18 años.{'\n'}
          • Proporcionar un número de teléfono válido.{'\n'}
          • Uso exclusivamente lícito de la plataforma.
        </Section>

        <Section title="3. Política de cancelaciones y reembolsos">
          <Text style={styles.bold}>Cancelación gratuita:</Text>{' '}Estados ABIERTO o EN_REVISION (sin pago realizado).{'\n\n'}
          <Text style={styles.bold}>Cancelación con penalidad (CONFIRMADO_PAGADO):{'\n'}</Text>
          {'  '}• &gt; 2h antes: reembolso 75 %{'\n'}
          {'  '}• 1–2h antes: reembolso 50 %{'\n'}
          {'  '}• &lt; 1h antes: reembolso 25 %{'\n'}
          {'  '}• En camino: sin reembolso{'\n\n'}
          <Text style={styles.bold}>Finalización anticipada (EN_CURSO):</Text>{' '}
          El agente recibe el pago íntegro. Sin reembolso al cliente.
        </Section>

        <Section title="4. Comisión de plataforma">
          Salvus retiene el 20 % del precio total como comisión. El Agente recibe el 80 % restante.
        </Section>

        <Section title="5. Responsabilidad limitada">
          Salvus actúa como intermediario tecnológico y no garantiza resultados ni asume responsabilidad
          por actos de los Agentes. El Agente es responsable de sus certificaciones SUCAMEC vigentes.
        </Section>

        <Section title="6. Privacidad — Ley 29733">
          En cumplimiento de la Ley N.° 29733 (Perú), tus datos son usados únicamente para prestar el
          servicio. No se ceden a terceros sin consentimiento. El teléfono nunca se comparte con la
          contraparte. Ejerce derechos ARCO en privacidad@salvus.pe.
        </Section>

        <Section title="7. Prohibición de contacto directo">
          Queda prohibido el intercambio de datos de contacto personales fuera de la plataforma para
          contratar servicios al margen de Salvus. El incumplimiento puede resultar en bloqueo de cuenta.
        </Section>

        <Section title="8. Sistema de puntuación y sanciones">
          Cancelaciones tardías y conducta inapropiada reducen el score, pudiendo generar restricciones
          o bloqueo. Cancelaciones del Agente a &lt; 2h del inicio conllevan suspensión de 7 días.
        </Section>

        <Section title="9. Resolución de disputas">
          Mediación interna primero (soporte@salvus.pe). De no resolverse: Juzgados del Cercado de Lima,
          Perú.
        </Section>

        <Section title="10. Modificaciones">
          Salvus puede modificar estos Términos con 7 días de aviso previo en la aplicación.
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.closeBtnText}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
  },
  closeBtn: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
