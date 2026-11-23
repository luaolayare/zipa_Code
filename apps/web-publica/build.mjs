// Genera el sitio estático en dist/ (para Cloudflare Pages). Sin dependencias: solo Node.
//   node build.mjs           → compila y avisa los datos pendientes
//   node build.mjs --estricto → falla si falta algún dato legal (úsalo antes de la versión definitiva)
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITIO } from './sitio.config.mjs';
import { eliminarCuenta, inicio, noEncontrada, privacidad, soporte, terminos } from './src/paginas.mjs';
import { iniciarPagina, pagina, pendientesGlobales } from './src/plantilla.mjs';

const raiz = dirname(fileURLToPath(import.meta.url));
const dist = join(raiz, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(raiz, 'public'), dist, { recursive: true });
cpSync(join(raiz, 'src', 'estilos.css'), join(dist, 'estilos.css'));
cpSync(join(raiz, 'src', 'sitio.js'), join(dist, 'sitio.js'));

const paginas = [inicio, privacidad, eliminarCuenta, soporte, terminos, noEncontrada];
const indexables = [];
for (const crear of paginas) {
  iniciarPagina();
  const p = crear();
  const html = pagina(p);
  // /privacidad → privacidad/index.html (URL sin «.html»); 404 → 404.html (Cloudflare Pages la usa sola).
  const archivo = p.ruta === '/' ? 'index.html' : p.ruta === '/404' ? '404.html' : join(p.ruta.slice(1), 'index.html');
  mkdirSync(dirname(join(dist, archivo)), { recursive: true });
  writeFileSync(join(dist, archivo), html);
  if (p.indexar !== false) indexables.push(p.ruta);
}

const hoy = new Date().toISOString().slice(0, 10);
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexables.map((r) => `  <url><loc>${SITIO.dominio}${r}</loc><lastmod>${hoy}</lastmod></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITIO.dominio}/sitemap.xml\n`);
writeFileSync(join(dist, 'manifest.webmanifest'), JSON.stringify({
  name: SITIO.marca, short_name: SITIO.marca, description: SITIO.eslogan, lang: 'es-CO', start_url: '/', display: 'browser',
  background_color: '#F6F4EF', theme_color: '#0F3D3E', icons: [{ src: '/icono-512.png', sizes: '512x512', type: 'image/png' }],
}, null, 2));
// Encabezados de seguridad y caché (Cloudflare Pages los lee de _headers).
writeFileSync(join(dist, '_headers'), `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'
/fuentes/*
  Cache-Control: public, max-age=31536000, immutable
/img/*
  Cache-Control: public, max-age=604800
`);

// Datos pendientes
const etiquetas = [...pendientesGlobales.keys()];
if (etiquetas.length) {
  console.warn(`\n⚠ Faltan ${etiquetas.length} datos (en la web aparecen como «Por completar»). Complétalos en sitio.config.mjs:`);
  for (const [e, rutas] of pendientesGlobales) console.warn(`  - ${e}  (${[...rutas].join(', ')})`);
  if (!SITIO.play.clientes || !SITIO.play.negocios) console.warn('  - enlaces de Google Play: los botones muestran «Próximamente».');
  if (process.argv.includes('--estricto')) { console.error('\n✖ Modo estricto: no se publica con datos legales pendientes.'); process.exit(1); }
} else console.log('\n✓ Todos los datos legales están completos.');
const tam = (f) => (existsSync(f) ? readFileSync(f).length : 0);
console.log(`✓ Sitio generado en dist/ · ${paginas.length} páginas · portada ${Math.round(tam(join(dist, 'index.html')) / 1024)} KB`);
