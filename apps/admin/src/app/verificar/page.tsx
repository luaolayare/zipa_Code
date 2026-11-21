'use client';

// Segundo factor (TOTP): la primera vez se configura con una app de autenticación
// (Google Authenticator, Microsoft Authenticator, 1Password…); después solo se pide el código.
// Sin este paso la sesión es aal1 y la base de datos no da ningún permiso de equipo (is_admin).
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

type Estado =
  | { paso: 'cargando' }
  | { paso: 'configurar'; factorId: string; qr: string; secret: string }
  | { paso: 'codigo'; factorId: string };

export default function Verificar() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ paso: 'cargando' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // Una sola vez (React en desarrollo ejecuta los efectos dos veces y crearía dos factores).
    if (started.current) return;
    started.current = true;
    const supabase = supabaseBrowser();
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === 'aal2') return router.replace('/');
      const { data, error: err } = await supabase.auth.mfa.listFactors();
      if (err) return setError('No pudimos consultar tu verificación. Vuelve a entrar.');
      const verified = data.totp.find((f) => f.status === 'verified');
      if (verified) return setEstado({ paso: 'codigo', factorId: verified.id });
      // Factores a medio configurar de intentos anteriores: se quitan para empezar limpio.
      for (const f of data.all.filter((f) => f.status !== 'verified')) await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data: enr, error: e2 } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Panel ${new Date().toISOString().slice(0, 16)}` });
      if (e2 || !enr) return setError('No pudimos iniciar la configuración. Intenta de nuevo.');
      setEstado({ paso: 'configurar', factorId: enr.id, qr: enr.totp.qr_code, secret: enr.totp.secret });
    })();
  }, [router]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (estado.paso === 'cargando') return;
    setLoading(true);
    setError('');
    const { error: err } = await supabaseBrowser().auth.mfa.challengeAndVerify({ factorId: estado.factorId, code: code.replace(/\s/g, '') });
    setLoading(false);
    if (err) return setError('El código no es válido o ya venció. Escribe el que aparece ahora en tu app.');
    router.replace('/');
    router.refresh();
  };

  const salir = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace('/entrar');
  };

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={verify}>
        <p className="overline">Verificación en dos pasos</p>
        {estado.paso === 'configurar' ? (
          <>
            <h1 style={{ fontSize: 28 }}>Configura tu app de autenticación</h1>
            <p className="muted">Escanea este código con Google Authenticator, Microsoft Authenticator u otra app similar. Luego escribe el código de 6 dígitos que te muestra.</p>
            <img className="qr" src={estado.qr} alt="Código QR para la app de autenticación" />
            <p className="small muted">¿No puedes escanear? Escribe esta clave en la app:</p>
            <p className="secret" data-testid="totp-secret">{estado.secret}</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28 }}>Escribe tu código</h1>
            <p className="muted">Abre tu app de autenticación y escribe el código de 6 dígitos de LocalmenteTuyo.</p>
          </>
        )}
        {estado.paso !== 'cargando' && (
          <div>
            <label htmlFor="code">Código de 6 dígitos</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
        )}
        {!!error && <p className="notice error" role="alert">{error}</p>}
        <button className="btn primary block" disabled={loading || estado.paso === 'cargando'}>{loading ? 'Verificando…' : 'Verificar'}</button>
        <button type="button" className="btn outline block" onClick={salir}>Salir</button>
      </form>
    </main>
  );
}
