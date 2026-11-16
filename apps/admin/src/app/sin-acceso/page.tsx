import Link from 'next/link';

export default function SinAcceso() {
  return (
    <main className="auth">
      <div className="auth-card">
        <p className="overline">Sin acceso</p>
        <h1 style={{ fontSize: 28 }}>Esta cuenta no es del equipo</h1>
        <p className="muted">Tu sesión es válida, pero tu cuenta no tiene permisos de revisión. Si deberías tenerlos, pídele a un administrador que te agregue.</p>
        <form action="/salir" method="post">
          <button className="btn primary block">Salir</button>
        </form>
        <Link href="/verificar" className="small">Volver a verificar</Link>
      </div>
    </main>
  );
}
