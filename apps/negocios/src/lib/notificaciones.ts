// Notificaciones push de esta app: permiso, token del dispositivo y abrir el detalle al tocar un
// aviso. Las reglas (rutas permitidas, textos, cierre de sesión) están en @zipa/shared (push.ts).
// La app nunca envía avisos: solo registra su token; los envía el servidor (migración 0020).
// La app de clientes tiene un archivo igual con APP = 'clientes'.
import { isExpoPushToken, notificationRoute, onBeforeSignOut, type Api, type PushApp, type PushState } from '@zipa/shared';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const APP: PushApp = 'negocios';
const native = Platform.OS === 'android' || Platform.OS === 'ios';
let currentToken: string | null = null;
// IosAuthorizationStatus.PROVISIONAL (avisos silenciosos de prueba en iOS); el valor está fijado por la librería.
const IOS_PROVISIONAL = 3;

if (native) {
  // Con la app abierta, el aviso también se muestra (banner y lista).
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Android 13+ exige el canal antes de pedir el token. Debe llamarse igual que el `channelId` del servidor. */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reservas', {
    name: 'Reservas',
    description: 'Solicitudes de reserva y sus respuestas',
    importance: AndroidImportance.HIGH,
  });
}

export async function pushState(): Promise<PushState> {
  if (!native || !Device.isDevice) return 'no_disponible';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === IOS_PROVISIONAL) return 'activadas';
  return p.canAskAgain ? 'sin_preguntar' : 'bloqueadas';
}

/** Pide el token a Expo y lo registra para la sesión actual. false si el dispositivo no lo entrega. */
async function register(api: Api): Promise<boolean> {
  try {
    await ensureChannel();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!isExpoPushToken(data)) return false;
    await api.registerPushToken(data, APP, Platform.OS as 'android' | 'ios');
    currentToken = data;
    return true;
  } catch {
    // Sin conexión, sin credenciales de push en este build (por ejemplo, Expo Go en Android) o el
    // servidor no respondió: la app sigue funcionando sin avisos.
    return false;
  }
}

/** Pide el permiso (lo llama la persona con el botón) y registra el dispositivo. */
export async function enablePush(api: Api): Promise<PushState | 'error'> {
  if (!native || !Device.isDevice) return 'no_disponible';
  await ensureChannel();
  const p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return p.canAskAgain ? 'sin_preguntar' : 'bloqueadas';
  return (await register(api)) ? 'activadas' : 'error';
}

/**
 * Se monta una vez en la raíz de la app, con sesión:
 * - si el permiso ya está dado, registra o actualiza el token (sin preguntar nada);
 * - vuelve a registrarlo si cambia;
 * - al tocar un aviso (con la app abierta, en segundo plano o cerrada) abre el detalle;
 * - al cerrar sesión, este dispositivo deja de recibir avisos de la cuenta.
 */
export function usePushSetup(api: Api, userId: string | null) {
  useEffect(() => {
    if (!native) return;
    const open = (data: unknown) => {
      const route = notificationRoute(data, APP);
      if (route) router.push(route as never);
    };
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
    Notifications.getLastNotificationResponseAsync().then((r) => r && open(r.notification.request.content.data)).catch(() => {});
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!native || !userId) return;
    pushState().then((s) => s === 'activadas' && register(api)).catch(() => {});
    const tokenSub = Notifications.addPushTokenListener(() => { register(api).catch(() => {}); });
    const off = onBeforeSignOut(async () => {
      if (currentToken) await api.unregisterPushToken(currentToken);
      currentToken = null;
    });
    return () => { tokenSub.remove(); off(); };
  }, [api, userId]);
}

/** Estado y acción para la tarjeta «Activar notificaciones» de una pantalla. */
export function usePushPrompt(api: Api) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { pushState().then(setState).catch(() => setState('no_disponible')); }, []);
  const enable = useCallback(async () => {
    setBusy(true);
    const r = await enablePush(api).catch(() => 'error' as const);
    setBusy(false);
    if (r === 'error') { setFailed(true); setState('no_disponible'); } else setState(r);
  }, [api]);
  return { state, busy, failed, enable };
}
