import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createApi, type Api } from './api';
import type { ConsentInput } from './legal';
import { MissingConfigView } from './ui/MissingConfigView';

export interface AppUser {
  id: string;
  email: string;
  name: string;
}

interface AuthValue {
  user: AppUser | null;
  loading: boolean;
  api: Api;
  signIn: (email: string, password: string) => Promise<void>;
  /** `consents`: lo que la persona aceptó. Un trigger de la base lo guarda en la tabla consents (migración 0003). */
  signUp: (email: string, password: string, name: string, consents: ConsentInput[]) => Promise<void>;
  signOut: () => Promise<void>;
  /** Borra la cuenta y todo lo asociado, y cierra la sesión. */
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const nameFromEmail = (email: string) => {
  const n = email.split('@')[0].replace(/[._-]+/g, ' ');
  return n.charAt(0).toUpperCase() + n.slice(1);
};

const toUser = (s: Session | null): AppUser | null =>
  s?.user
    ? {
        id: s.user.id,
        email: s.user.email ?? '',
        name: (s.user.user_metadata?.full_name as string | undefined) ?? nameFromEmail(s.user.email ?? ''),
      }
    : null;

/**
 * Sesión compartida por ambas apps.
 * Sin Supabase: en desarrollo simula el inicio de sesión con datos de ejemplo;
 * en producción muestra un error en vez de la app.
 */
export function AuthProvider({ client, children }: { client: SupabaseClient | null; children: ReactNode }) {
  if (!client && !__DEV__) {
    console.error('Zipa lo tiene: compilación de producción sin variables de Supabase (ver .env.example).');
    return <MissingConfigView />;
  }
  return <AuthProviderInner client={client}>{children}</AuthProviderInner>;
}

function AuthProviderInner({ client, children }: { client: SupabaseClient | null; children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(client !== null);
  const api = useMemo(() => createApi(client), [client]);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      setUser(toUser(data.session));
      setLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => setUser(toUser(session)));
    return () => data.subscription.unsubscribe();
  }, [client]);

  const value: AuthValue = {
    user,
    loading,
    api,
    async signIn(email, password) {
      if (!client) return setUser({ id: 'demo-user', email, name: nameFromEmail(email) });
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password, name, consents) {
      if (!client) {
        await api.recordConsents('demo-user', consents);
        return setUser({ id: 'demo-user', email, name: name || nameFromEmail(email) });
      }
      // La aceptación viaja con el registro: si Supabase pide confirmar el correo,
      // todavía no hay sesión para guardarla desde la app.
      const { error } = await client.auth.signUp({ email, password, options: { data: { full_name: name, consents } } });
      if (error) throw error;
    },
    async signOut() {
      if (!client) return setUser(null);
      await client.auth.signOut();
    },
    async deleteAccount() {
      if (!user) return;
      await api.deleteAccount(user.id);
      if (!client) return setUser(null);
      // La cuenta ya no existe en el servidor; solo falta limpiar la sesión guardada en el celular.
      await client.auth.signOut({ scope: 'local' });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
