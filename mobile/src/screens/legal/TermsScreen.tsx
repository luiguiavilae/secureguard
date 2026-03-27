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

const LAST_UPDATED = '27 de marzo de 2026';

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

        {/* ── 1 ─────────────────────────────────────────────────── */}
        <Section title="1. Naturaleza de la plataforma e intermediación">
          Salvus (operado bajo la marca SecureGuard) es una plataforma tecnológica de intermediación que
          conecta personas naturales que requieren servicios de seguridad privada («Clientes») con agentes
          de seguridad privada independientes y certificados ante SUCAMEC («Agentes»).{'\n\n'}
          <Text style={styles.bold}>Salvus actúa exclusivamente como plataforma de intermediación
          tecnológica.</Text>{' '}La relación contractual del servicio de seguridad se establece directamente
          entre el Cliente y el Agente de Seguridad. Salvus no es empleador de los Agentes ni responsable
          directo por la prestación del servicio.{'\n\n'}
          La presente plataforma se rige, en lo que resulte aplicable, por el Código Civil Peruano en
          materia de mandato y representación (artículos 1790 y siguientes), así como por la
          Ley N.° 29571, Código de Protección y Defensa del Consumidor.
        </Section>

        {/* ── 2 ─────────────────────────────────────────────────── */}
        <Section title="2. Relación con los Agentes de Seguridad">
          Los Agentes de Seguridad prestan sus servicios como trabajadores independientes bajo la
          modalidad de recibo por honorarios. La presente relación no genera vínculo laboral, de
          dependencia, ni beneficios sociales entre el Agente y Salvus, de conformidad con la
          legislación peruana vigente.{'\n\n'}
          Los Agentes registrados en Salvus han sido verificados contra los registros de SUCAMEC.
          Sin embargo, Salvus no garantiza la vigencia continua de dichas licencias y realiza
          verificaciones periódicas. Es responsabilidad del Agente mantener sus certificaciones
          y habilitaciones al día.
        </Section>

        {/* ── 3 ─────────────────────────────────────────────────── */}
        <Section title="3. Requisitos de uso y veracidad de datos">
          Para utilizar la plataforma el Usuario deberá:{'\n'}
          {'  '}• Ser mayor de 18 años de edad.{'\n'}
          {'  '}• Proporcionar un número de teléfono válido para verificación por OTP.{'\n'}
          {'  '}• Aceptar los presentes Términos y la Política de Privacidad.{'\n\n'}
          <Text style={styles.bold}>El Usuario se obliga a proporcionar información veraz y
          actualizada.</Text>{' '}Salvus se reserva el derecho de suspender o cancelar cuentas donde se
          detecte información falsa, incompleta o suplantación de identidad, sin perjuicio de las
          acciones legales que pudieran corresponder.{'\n\n'}
          El uso de la plataforma para actividades ilegales, que atenten contra la seguridad pública o
          la dignidad de terceros, queda estrictamente prohibido.
        </Section>

        {/* ── 4 ─────────────────────────────────────────────────── */}
        <Section title="4. Política de cancelaciones y reembolsos">
          <Text style={styles.bold}>Cancelación gratuita:{'\n'}</Text>
          El Cliente puede cancelar sin costo mientras la solicitud se encuentre en estado de
          búsqueda de agente o en revisión, es decir, antes de que se confirme el pago.{'\n\n'}
          <Text style={styles.bold}>Cancelación con penalidad (servicio con pago confirmado):{'\n'}</Text>
          {'  '}• Más de 2 horas antes del inicio: reembolso del 75 %.{'\n'}
          {'  '}• Entre 1 y 2 horas antes del inicio: reembolso del 50 %.{'\n'}
          {'  '}• Menos de 1 hora antes del inicio: reembolso del 25 %.{'\n'}
          {'  '}• En camino o ya iniciado: sin derecho a reembolso.{'\n\n'}
          <Text style={styles.bold}>Finalización anticipada (servicio en curso):{'\n'}</Text>
          Si el Cliente decide finalizar el servicio antes de transcurrida la duración contratada,
          el Agente recibirá el pago íntegro acordado y no corresponderá reembolso alguno al Cliente.{'\n\n'}
          Los reembolsos se procesan al instrumento de pago original en un plazo de 5 a 10 días
          hábiles, sujeto a los tiempos de procesamiento de cada entidad financiera.
        </Section>

        {/* ── 5 ─────────────────────────────────────────────────── */}
        <Section title="5. Responsabilidad en servicios de seguridad">
          Salvus no garantiza resultados específicos en materia de seguridad. La plataforma verifica
          la idoneidad de los Agentes pero no puede prever todos los escenarios posibles durante la
          prestación del servicio.{'\n\n'}
          Salvus no asume responsabilidad por:{'\n'}
          {'  '}• Daños a personas o bienes ocurridos durante la prestación del servicio.{'\n'}
          {'  '}• Actos u omisiones del Agente en el ejercicio de sus funciones.{'\n'}
          {'  '}• Interrupciones del servicio tecnológico por causas de fuerza mayor o caso fortuito.{'\n\n'}
          <Text style={styles.bold}>En caso de emergencia, el Usuario debe contactar inmediatamente
          a la PNP (105) o al número de emergencias (911).</Text>
        </Section>

        {/* ── 6 ─────────────────────────────────────────────────── */}
        <Section title="6. Protocolo de emergencias y botón SOS">
          Durante un servicio activo, el botón SOS de la aplicación genera una alerta interna al
          equipo de Salvus para activar el protocolo de respuesta.{'\n\n'}
          <Text style={styles.bold}>Este botón NO reemplaza la llamada a los servicios de emergencia
          oficiales:</Text>{'\n'}
          {'  '}• Policía Nacional del Perú — PNP: 105{'\n'}
          {'  '}• Bomberos: 116{'\n'}
          {'  '}• Central de Emergencias: 911{'\n\n'}
          El uso indebido o malintencionado del botón SOS podrá resultar en la suspensión permanente
          de la cuenta del Usuario.
        </Section>

        {/* ── 7 ─────────────────────────────────────────────────── */}
        <Section title="7. Privacidad y protección de datos personales">
          En cumplimiento de la <Text style={styles.bold}>Ley N.° 29733</Text>, Ley de Protección de
          Datos Personales del Perú, y su Reglamento aprobado mediante{' '}
          <Text style={styles.bold}>Decreto Supremo N.° 003-2013-JUS</Text>, el Usuario autoriza
          expresamente a Salvus a recopilar, tratar y utilizar sus datos personales (nombre, número de
          teléfono, ubicación referencial, historial de servicios) con la finalidad exclusiva de
          prestar y mejorar el servicio de intermediación.{'\n\n'}
          Los datos personales no serán cedidos, vendidos ni transferidos a terceros sin el
          consentimiento previo, expreso e informado del titular, salvo obligación legal impuesta por
          autoridad competente.{'\n\n'}
          El Usuario podrá ejercer sus derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)
          en cualquier momento, escribiendo a <Text style={styles.bold}>privacidad@salvus.pe</Text>.{'\n\n'}
          El número de teléfono del Usuario nunca será compartido con la contraparte del servicio.
          Toda comunicación se realiza exclusivamente a través del chat interno de la plataforma.
        </Section>

        {/* ── 8 ─────────────────────────────────────────────────── */}
        <Section title="8. Prohibición de contacto directo">
          Queda estrictamente prohibido que Clientes y Agentes intercambien datos de contacto
          personales (número de teléfono, correo electrónico, redes sociales u otros medios) fuera
          de la plataforma, con el propósito de contratar servicios al margen de Salvus.{'\n\n'}
          El incumplimiento de esta disposición podrá resultar en la suspensión o cancelación
          definitiva de la cuenta, sin perjuicio de las acciones civiles o penales que correspondan.
        </Section>

        {/* ── 9 ─────────────────────────────────────────────────── */}
        <Section title="9. Sistema de puntuación, sanciones y reserva de derechos">
          La plataforma opera un sistema de puntuación (score) para Clientes y Agentes. Las
          cancelaciones tardías, el incumplimiento de compromisos y la conducta inapropiada
          descontarán puntos del score, pudiendo resultar en restricciones de uso o bloqueo
          permanente de la cuenta.{'\n\n'}
          <Text style={styles.bold}>Salvus se reserva el derecho de suspender o cancelar cuentas de
          usuarios que incumplan los presentes Términos, sin previo aviso y sin obligación de
          reembolso en casos de fraude comprobado.</Text>{'\n\n'}
          Las cancelaciones realizadas por el Agente con menos de 2 horas de anticipación al inicio
          del servicio conllevan una suspensión automática de 7 días calendario.
        </Section>

        {/* ── 10 ────────────────────────────────────────────────── */}
        <Section title="10. Marco legal aplicable">
          Los presentes Términos y Condiciones se rigen e interpretan de conformidad con las leyes
          de la República del Perú, en particular:{'\n'}
          {'  '}• <Text style={styles.bold}>Ley N.° 29733</Text> — Ley de Protección de Datos Personales{'\n'}
          {'  '}• <Text style={styles.bold}>Decreto Supremo N.° 003-2013-JUS</Text> — Reglamento de la Ley 29733{'\n'}
          {'  '}• <Text style={styles.bold}>Ley N.° 29571</Text> — Código de Protección y Defensa del Consumidor{'\n'}
          {'  '}• <Text style={styles.bold}>Código Civil Peruano</Text> — artículos sobre mandato (arts. 1790 y ss.){'\n\n'}
          Cualquier controversia derivada del uso de la plataforma será sometida primero a mediación
          interna de Salvus (soporte@salvus.pe). De no resolverse, las partes se someten a la
          competencia exclusiva de los <Text style={styles.bold}>Juzgados y Tribunales del Distrito
          Judicial de Lima</Text>, renunciando a cualquier otro fuero que pudiera corresponderles.
        </Section>

        {/* ── 11 ────────────────────────────────────────────────── */}
        <Section title="11. Modificaciones a los Términos y Condiciones">
          Salvus se reserva el derecho de modificar los presentes Términos y Condiciones en cualquier
          momento. Cualquier modificación será notificada al Usuario a través de la aplicación con al
          menos <Text style={styles.bold}>7 días calendario de anticipación</Text>.{'\n\n'}
          El uso continuado de la plataforma tras la notificación implica la aceptación íntegra de
          los nuevos Términos. Si el Usuario no acepta las modificaciones, deberá dejar de utilizar
          la plataforma y podrá solicitar la eliminación de su cuenta.
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
