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

const LAST_UPDATED = '27 de marzo de 2026';

export default function TermsViewScreen(): React.ReactElement {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Términos y Condiciones</Text>
        <Text style={styles.headerSub}>Última actualización: {LAST_UPDATED}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Section title="1. Naturaleza de la plataforma e intermediación">
          Salvus (SecureGuard) es una plataforma tecnológica de intermediación que conecta Clientes
          con Agentes de seguridad privada certificados ante SUCAMEC.{'\n\n'}
          <Text style={styles.bold}>Salvus actúa exclusivamente como plataforma de intermediación
          tecnológica.</Text>{' '}La relación contractual se establece directamente entre el Cliente y el
          Agente. Salvus no es empleador de los Agentes ni responsable directo por la prestación del
          servicio.{'\n\n'}
          Rige el Código Civil Peruano en materia de mandato (arts. 1790 y ss.) y la
          Ley N.° 29571, Código de Protección y Defensa del Consumidor.
        </Section>

        <Section title="2. Relación con los Agentes de Seguridad">
          Los Agentes prestan servicios como trabajadores independientes bajo la modalidad de recibo
          por honorarios. Esta relación no genera vínculo laboral, de dependencia, ni beneficios
          sociales entre el Agente y Salvus, conforme a la legislación peruana vigente.{'\n\n'}
          Los Agentes han sido verificados contra los registros de SUCAMEC. Salvus realiza
          verificaciones periódicas pero no garantiza la vigencia continua de las licencias.
        </Section>

        <Section title="3. Requisitos de uso y veracidad de datos">
          {'  '}• Ser mayor de 18 años.{'\n'}
          {'  '}• Proporcionar número de teléfono válido (verificación OTP).{'\n'}
          {'  '}• Aceptar estos Términos y la Política de Privacidad.{'\n\n'}
          <Text style={styles.bold}>El Usuario se obliga a proporcionar información veraz y
          actualizada.</Text>{' '}Salvus se reserva el derecho de suspender cuentas con información
          falsa o suplantación de identidad.
        </Section>

        <Section title="4. Política de cancelaciones y reembolsos">
          <Text style={styles.bold}>Cancelación gratuita:</Text>{' '}Mientras la solicitud esté en
          búsqueda de agente o en revisión (sin pago realizado).{'\n\n'}
          <Text style={styles.bold}>Cancelación con penalidad (pago confirmado):{'\n'}</Text>
          {'  '}• {'>'} 2 h antes del inicio: reembolso 75 %{'\n'}
          {'  '}• 1–2 h antes del inicio: reembolso 50 %{'\n'}
          {'  '}• {'<'} 1 h antes del inicio: reembolso 25 %{'\n'}
          {'  '}• En camino o iniciado: sin reembolso{'\n\n'}
          <Text style={styles.bold}>Finalización anticipada:</Text>{' '}El Agente recibe el pago
          íntegro. No corresponde reembolso al Cliente.{'\n\n'}
          Reembolsos: 5–10 días hábiles al instrumento de pago original.
        </Section>

        <Section title="5. Responsabilidad en servicios de seguridad">
          Salvus verifica la idoneidad de los Agentes pero no garantiza resultados específicos en
          materia de seguridad ni puede prever todos los escenarios posibles.{'\n\n'}
          Salvus no asume responsabilidad por daños a personas o bienes, actos del Agente, ni
          interrupciones del servicio por fuerza mayor.{'\n\n'}
          <Text style={styles.bold}>En emergencias: llame inmediatamente a PNP (105) o
          Emergencias (911).</Text>
        </Section>

        <Section title="6. Protocolo de emergencias y botón SOS">
          El botón SOS genera una alerta interna al equipo de Salvus.{'\n\n'}
          <Text style={styles.bold}>NO reemplaza los servicios oficiales:{'\n'}</Text>
          {'  '}• PNP: 105{'  '}• Bomberos: 116{'  '}• Emergencias: 911{'\n\n'}
          El uso indebido del SOS puede resultar en suspensión permanente de la cuenta.
        </Section>

        <Section title="7. Privacidad y protección de datos personales">
          En cumplimiento de la <Text style={styles.bold}>Ley N.° 29733</Text> y el{' '}
          <Text style={styles.bold}>Decreto Supremo N.° 003-2013-JUS</Text>, sus datos personales
          se usan únicamente para prestar el servicio de intermediación. No se ceden a terceros sin
          consentimiento.{'\n\n'}
          Derechos ARCO: <Text style={styles.bold}>privacidad@salvus.pe</Text>.{'\n\n'}
          El teléfono del Usuario nunca se comparte con la contraparte. Toda comunicación ocurre
          a través del chat interno de la plataforma.
        </Section>

        <Section title="8. Prohibición de contacto directo">
          Queda prohibido el intercambio de datos de contacto personales fuera de la plataforma
          para contratar servicios al margen de Salvus. El incumplimiento puede resultar en
          cancelación de cuenta y acciones legales.
        </Section>

        <Section title="9. Sistema de puntuación, sanciones y reserva de derechos">
          La plataforma opera un sistema de score. Cancelaciones tardías y conducta inapropiada
          reducen el score, pudiendo generar restricciones o bloqueo permanente.{'\n\n'}
          <Text style={styles.bold}>Salvus se reserva el derecho de suspender o cancelar cuentas
          sin previo aviso en casos de fraude comprobado, sin obligación de reembolso.</Text>{'\n\n'}
          Cancelaciones del Agente con {'<'} 2 h de anticipación conllevan suspensión de 7 días.
        </Section>

        <Section title="10. Marco legal aplicable">
          {'  '}• <Text style={styles.bold}>Ley N.° 29733</Text> — Protección de Datos Personales{'\n'}
          {'  '}• <Text style={styles.bold}>D.S. N.° 003-2013-JUS</Text> — Reglamento Ley 29733{'\n'}
          {'  '}• <Text style={styles.bold}>Ley N.° 29571</Text> — Código de Protección al Consumidor{'\n'}
          {'  '}• <Text style={styles.bold}>Código Civil Peruano</Text> — mandato (arts. 1790 y ss.){'\n\n'}
          Toda controversia se somete a los{' '}
          <Text style={styles.bold}>Juzgados y Tribunales del Distrito Judicial de Lima</Text>,
          con renuncia a cualquier otro fuero.
        </Section>

        <Section title="11. Modificaciones a los Términos y Condiciones">
          Salvus se reserva el derecho de modificar estos Términos. Las modificaciones serán
          notificadas con al menos <Text style={styles.bold}>7 días calendario de anticipación</Text>{' '}
          a través de la aplicación. El uso continuado implica aceptación de los nuevos Términos.
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
