// Notificaciones push de esta app: permiso, token del dispositivo y abrir el detalle al tocar un
// aviso. Las reglas (rutas permitidas, textos, cierre de sesión) están en @zipa/shared (push.ts).
// La app nunca envía avisos: solo registra su token; los envía el servidor (migración 0020).
// La app de negocios tiene un archivo igual con APP = 'negocios'.
import { isExpoPushToken, notificationRoute, onBeforeSignOut, remotePushAvailable, type Api, type PushApp, type PushState } from '@zipa/shared';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

const APP: PushApp = 'clientes';
const native = Platform.OS === 'android' || Platform.OS === 'ios';
// Avisos remotos: solo en un celular real y fuera de Expo Go (en los APK sí; ver remotePushAvailable).
const remote = () => remotePushAvailable({ os: Platform.OS, isDevice: Device.isDevice, expoGo: isRunningInExpoGo() });
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
  if (!remote()) return 'no_disponible';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === IOS_PROVISIONAL) return 'activadas';
  return p.canAskAgain ? 'sin_preguntar' : 'bloqueadas';
}

/** Pide el token a Expo y lo registra para la sesión actual. false si el dispositivo no lo entrega. */
async function register(api: Api): Promise<boolean> {
  if (!remote()) return false;
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
  if (!remote()) return 'no_disponible';
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
    // En Expo Go no se consulta el permiso, no se pide el token ni se escuchan cambios de token.
    if (!remote() || !userId) return;
    pushState().then((s) => s === 'activadas' && register(api)).catch(() => {});
    const tokenSub = Notifications.addPushTokenListener(() => { register(api).catch(() => {}); });
    const off = onBeforeSignOut(async () => {
      if (currentToken) await api.unregisterPushToken(currentToken);
      currentToken = null;
    });
    return () => { tokenSub.remove(); off(); };
  }, [api, userId]);
}

/**
 * Estado y acciones para la tarjeta de avisos de una pantalla: activar (acción explícita), reintentar
 * si falló, y volver a revisar el permiso (con un botón y al regresar de los ajustes del celular).
 */
export function usePushPrompt(api: Api) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const recheck = useCallback(() => {
    pushState().then((s) => {
      setState(s);
      if (s === 'activadas') { setFailed(false); register(api).catch(() => {}); }
    }).catch(() => setState('no_disponible'));
  }, [api]);
  useEffect(() => {
    recheck();
    // Si la persona fue a los ajustes y volvió, se actualiza sola.
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') recheck(); });
    return () => sub.remove();
  }, [recheck]);
  const enable = useCallback(async () => {
    setBusy(true);
    const r = await enablePush(api).catch(() => 'error' as const);
    setBusy(false);
    if (r === 'error') setFailed(true); // la tarjeta ofrece «Intentar de nuevo»
    else { setFailed(false); setState(r); }
  }, [api]);
  return { state, busy, failed, enable, recheck };
}
