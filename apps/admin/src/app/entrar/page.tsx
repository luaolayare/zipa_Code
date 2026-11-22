'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

export default function Entrar() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = supabaseBrowser();
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) return setError('Correo o contraseña incorrectos.');
    // Siempre se pide el segundo factor: /verificar lo configura o lo comprueba.
    router.replace('/verificar');
    router.refresh();
  };

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">
          <Image src="/logo.png" alt="LocalmenteTuyo. Lo mejor de aquí, cerquita de ti." width={220} height={220} priority />
          <p className="small muted">Panel del equipo</p>
        </div>
        <h1 style={{ fontSize: 30 }}>Entrar</h1>
        <p className="muted">Solo para el equipo de revisión. Después te pediremos el código de tu app de autenticación.</p>
        <div>
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {!!error && <p className="notice error" role="alert">{error}</p>}
        <button className="btn primary block" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  );
}
