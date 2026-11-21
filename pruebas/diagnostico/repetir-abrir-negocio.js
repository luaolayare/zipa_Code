// Diagnóstico del cierre al abrir un restaurante (clientes): repite N veces, cada una desde cero
// (contexto nuevo, sin sesión): iniciar sesión -> Explorar -> tocar el negocio -> esperar la ficha.
// Registra errores de JavaScript, fallos de red, a qué URL terminó y si apareció «No pudimos cargar».
// Contra Supabase LOCAL (clientes en 8083). Usa el negocio de muestra de pruebas/diseno (estado JSON).
// Uso: BETA2=<repo> NODE_PATH=<playwright> node pruebas/diagnostico/repetir-abrir-negocio.js <estado.json> [veces]
const { chromium } = require('playwright-core');
const fs = require('fs');
const [estado, veces = '15'] = process.argv.slice(2);
const s = JSON.parse(fs.readFileSync(estado, 'utf8'));

(async () => {
  const br = await chromium.launch({ executablePath: process.env.LOCALAPPDATA + '/ms-playwright/chromium-1248/chrome-win64/chrome.exe' });
  const R = [];
  for (let i = 1; i <= Number(veces); i++) {
    const p = await (await br.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    const ev = { i, errores: [], red: [], url: '', error: false, ok: false, ms: 0 };
    p.on('pageerror', (e) => ev.errores.push(e.message.slice(0, 160)));
    p.on('console', (m) => { if (m.type() === 'error') ev.errores.push(m.text().slice(0, 160)); });
    p.on('requestfailed', (r) => { if (!/HEAD/.test(r.method())) ev.red.push(`${r.url().slice(0, 80)} ${r.failure()?.errorText}`); });
    const vis = (l) => l.filter({ visible: true }).first();
    await p.goto('http://localhost:8083/login', { waitUntil: 'load', timeout: 300000 }); await p.waitForTimeout(2500);
    await vis(p.getByLabel('Correo electrónico', { exact: true })).fill(s.cliente);
    await vis(p.getByLabel('Contraseña', { exact: true })).fill('secreta123');
    await vis(p.getByText('Entrar', { exact: true })).click();
    // Sin espera extra: tocar el negocio apenas aparece en Explorar (como una persona apurada).
    const card = vis(p.getByRole('button', { name: 'Arepas Mamá Inés' }));
    await card.waitFor({ timeout: 30000 });
    const t0 = Date.now();
    await card.click();
    try {
      await p.getByText('Lo que dicen los clientes', { exact: true }).first().waitFor({ timeout: 20000 });
      ev.ok = true;
    } catch { /* no cargó */ }
    ev.ms = Date.now() - t0;
    ev.error = (await p.getByText('No pudimos cargar este negocio', { exact: true }).count()) > 0;
    ev.url = p.url().replace('http://localhost:8083', '');
    R.push(ev);
    console.log(`${ev.ok && !ev.error ? 'OK   ' : 'FALLA'} #${i} ${ev.ms} ms url=${ev.url} errores=${ev.errores.length} red=${ev.red.length}${ev.errores.length ? ' ' + JSON.stringify(ev.errores.slice(0, 2)) : ''}`);
    await p.context().close();
  }
  await br.close();
  const malas = R.filter((r) => !r.ok || r.error || r.errores.length);
  console.log(`RESUMEN: ${R.length - malas.length}/${R.length} aperturas correctas`);
  process.exit(malas.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
