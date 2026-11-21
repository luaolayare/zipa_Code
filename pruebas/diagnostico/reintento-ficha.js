// Reintento de la ficha del negocio (clientes) con fallos forzados en el navegador.
// Intercepta las lecturas de la ficha (businesses_public?id=eq.<id>) contra Supabase LOCAL (clientes en 8083):
//  R-1 un fallo de red pasajero -> la ficha carga sola (reintento propio de supabase-js)
//  R-2 la red sigue caída -> «No pudimos cargar…» con «Intentar de nuevo»; exactamente 4 intentos:
//      1 + 3 reintentos de supabase-js (1, 2 y 4 s). La app no agrega ninguno (no duplica peticiones)
//  R-3 al tocar «Intentar de nuevo» con la red de vuelta -> carga
//  R-4 error de permisos (42501) -> no se reintenta (1 intento) y se muestra el error
// Uso: NODE_PATH=<playwright> node pruebas/diagnostico/reintento-ficha.js <estado.json>
const { chromium } = require('playwright-core');
const fs = require('fs');
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

(async () => {
  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const R = [];
  const ok = (id, prueba, cond, detalle) => { R.push({ id, cond }); console.log(`${cond ? 'OK   ' : 'FALLA'} ${id} ${prueba} ${cond ? '' : '→ ' + JSON.stringify(detalle)}`); };
  const ficha = new RegExp(`/rest/v1/businesses_public\\?.*id=eq\\.${s.negocio}`);
  const abrir = async (modo) => {
    const p = await (await br.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    const errores = [];
    p.on('pageerror', (e) => errores.push(e.message.slice(0, 120)));
    let intentos = 0;
    await p.route(ficha, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      intentos++;
      if (modo === 'red-una-vez' && intentos === 1) return route.abort('internetdisconnected');
      if (modo === 'red-siempre' && p.__redCaida !== false) return route.abort('internetdisconnected');
      if (modo === 'permiso') return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: '42501', message: 'permission denied for view businesses_public', details: null, hint: null }) });
      return route.continue();
    });
    await p.goto(`http://localhost:8083/negocio/${s.negocio}`, { waitUntil: 'load', timeout: 300000 });
    return { p, errores, intentos: () => intentos };
  };
  const cargo = (p) => p.getByText('Lo que dicen los clientes', { exact: true }).first().waitFor({ timeout: 15000 }).then(() => true, () => false);
  const enError = (p) => p.getByText('No pudimos cargar este negocio', { exact: true }).first().waitFor({ timeout: 20000 }).then(() => true, () => false);

  // R-1
  let t = await abrir('red-una-vez');
  const r1 = await cargo(t.p);
  ok('R-1', 'Un fallo de red pasajero se recupera solo (reintento de supabase-js, sin reintento extra de la app)', r1 && t.intentos() === 2 && !t.errores.length, { cargo: r1, intentos: t.intentos(), errores: t.errores });
  await t.p.context().close();

  // R-2 y R-3
  t = await abrir('red-siempre');
  const e2 = await enError(t.p);
  await t.p.waitForTimeout(3000); // si hubiera un tercer intento, ya habría ocurrido
  const boton = await t.p.getByRole('button', { name: 'Intentar de nuevo' }).count();
  ok('R-2', 'Con la red caída: mensaje y «Intentar de nuevo»; 4 intentos de supabase-js y ninguno extra de la app', e2 && boton === 1 && t.intentos() === 4, { error: e2, boton, intentos: t.intentos() });
  await t.p.screenshot({ path: `${process.argv[3] || '.'}/r2-ficha-sin-conexion.png` }).catch(() => {});
  t.p.__redCaida = false;
  await t.p.getByRole('button', { name: 'Intentar de nuevo' }).click();
  const r3 = await cargo(t.p);
  ok('R-3', 'Con la red de vuelta, «Intentar de nuevo» carga la ficha', r3 && !t.errores.length, { cargo: r3, errores: t.errores });
  await t.p.context().close();

  // R-4
  t = await abrir('permiso');
  const e4 = await enError(t.p);
  await t.p.waitForTimeout(3000);
  ok('R-4', 'Un error de permisos (42501) no se reintenta', e4 && t.intentos() === 1, { error: e4, intentos: t.intentos() });
  await t.p.context().close();

  await br.close();
  console.log(`RESUMEN: ${R.filter((r) => r.cond).length}/${R.length}`);
  process.exit(R.every((r) => r.cond) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
