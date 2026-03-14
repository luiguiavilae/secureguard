// TODO: Configurar notificaciones push con Expo Notifications
// Funciones: registerForPushNotifications(), handleIncomingNotification()
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// TODO: Implementar registro de token push y guardado en perfil de usuario
export async function registerForPushNotifications(): Promise<string | null> {
  // TODO: Implementar
  return null;
}
