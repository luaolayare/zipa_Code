// Genera los íconos y la pantalla de inicio de las apps, y el ícono del panel, a partir de
// config.json y marca.svg. Dibuja cada recurso como SVG y lo convierte a PNG con Chromium
// (playwright-core). No descarga nada de internet.
//
// Uso (desde la raíz del repositorio):
//   node scripts/identidad/generar.cjs
// Requisitos: `playwright-core` instalado en algún lugar accesible (variable PLAYWRIGHT_CORE con la
// ruta del paquete) y Chromium (variable CHROME_PATH o la ruta por defecto de Playwright).
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const marca = fs.readFileSync(path.join(__dirname, config.marca), 'utf8');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const CHROME = process.env.CHROME_PATH || path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe');

// El símbolo (24x24) como grupo, con su color.
const trazos = marca.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const simbolo = (color, x, y, lado) =>
  `<g transform="translate(${x} ${y}) scale(${lado / 24})" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${trazos}</g>`;

/** Cuadro redondeado con el símbolo dentro (como <Logo />: símbolo al 56 % del cuadro). */
const cuadro = (c, x, y, lado) => {
  const s = lado * 0.56;
  return `<rect x="${x}" y="${y}" width="${lado}" height="${lado}" rx="${lado * 0.28}" fill="${c.cuadro}"/>` + simbolo(c.simbolo, x + (lado - s) / 2, y + (lado - s) / 2, s);
};
const svg = (n, cuerpo) => `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}">${cuerpo}</svg>`;

// Recursos de una app. Medidas de la plantilla de Expo; el primer plano adaptativo deja el
// dibujo dentro de la zona segura (66/108 del lienzo) para que ningún recorte de Android lo corte.
function recursosApp(c) {
  return {
    'icon.png': svg(1024, `<rect width="1024" height="1024" fill="${c.fondo}"/>` + cuadro(c, 1024 * 0.19, 1024 * 0.19, 1024 * 0.62)),
    'android-icon-background.png': svg(512, `<rect width="512" height="512" fill="${c.fondo}"/>`),
    'android-icon-foreground.png': svg(512, cuadro(c, 512 * 0.27, 512 * 0.27, 512 * 0.46)),
    'android-icon-monochrome.png': svg(512, simbolo('#FFFFFF', 512 * 0.31, 512 * 0.31, 512 * 0.38)),
    'splash-icon.png': svg(1024, cuadro(c, 1024 * 0.1, 1024 * 0.1, 1024 * 0.8)),
    'favicon.png': svg(48, cuadro(c, 2, 2, 44)),
    // Ícono de las notificaciones en Android: solo el símbolo, blanco sobre transparente.
    'notification-icon.png': svg(96, simbolo('#FFFFFF', 96 * 0.14, 96 * 0.14, 96 * 0.72)),
  };
}

/** ICO con una sola imagen PNG adentro (válido para navegadores). */
function ico(png, lado) {
  const cabecera = Buffer.alloc(6 + 16);
  cabecera.writeUInt16LE(0, 0); cabecera.writeUInt16LE(1, 2); cabecera.writeUInt16LE(1, 4);
  cabecera.writeUInt8(lado >= 256 ? 0 : lado, 6); cabecera.writeUInt8(lado >= 256 ? 0 : lado, 7);
  cabecera.writeUInt8(0, 8); cabecera.writeUInt8(0, 9); cabecera.writeUInt16LE(1, 10); cabecera.writeUInt16LE(32, 12);
  cabecera.writeUInt32LE(png.length, 14); cabecera.writeUInt32LE(6 + 16, 18);
  return Buffer.concat([cabecera, png]);
}

(async () => {
  const br = await chromium.launch({ executablePath: CHROME });
  const page = await br.newPage();
  const png = async (contenido) => {
    const n = Number(contenido.match(/width="(\d+)"/)[1]);
    await page.setViewportSize({ width: n, height: n });
    await page.setContent(`<html><body style="margin:0;background:transparent">${contenido}</body></html>`);
    return page.locator('svg').screenshot({ omitBackground: true });
  };
  const escritos = [];
  for (const [app, colores] of Object.entries(config.apps)) {
    for (const [archivo, contenido] of Object.entries(recursosApp(colores))) {
      const destino = path.join(RAIZ, 'apps', app, 'assets', archivo);
      fs.writeFileSync(destino, await png(contenido));
      escritos.push(path.relative(RAIZ, destino));
    }
  }
  // Panel: icon.svg (navegadores modernos) y favicon.ico (pestaña y marcadores).
  const panel = { ...config.panel };
  const iconoSvg = svg(64, cuadro(panel, 0, 0, 64));
  fs.writeFileSync(path.join(RAIZ, 'apps/admin/src/app/icon.svg'), iconoSvg);
  fs.writeFileSync(path.join(RAIZ, 'apps/admin/src/app/favicon.ico'), ico(await png(svg(48, cuadro(panel, 0, 0, 48))), 48));
  escritos.push('apps/admin/src/app/icon.svg', 'apps/admin/src/app/favicon.ico');
  await br.close();
  console.log(escritos.join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
