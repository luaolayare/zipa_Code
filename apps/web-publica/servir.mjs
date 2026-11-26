// Vista previa local de dist/ (como la sirve Cloudflare Pages: /privacidad → privacidad/index.html, 404.html).
//   node servir.mjs [puerto]   (por defecto 4321)
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.ttf': 'font/ttf', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const puerto = Number(process.argv[2]) || 4321;
// Encabezados de /* en _headers (los mismos que aplica Cloudflare Pages), para probar la CSP en local.
const globales = existsSync(join(dist, '_headers'))
  ? Object.fromEntries(readFileSync(join(dist, '_headers'), 'utf8').split('\n/')[0].split('\n').slice(1)
      .map((l) => l.trim()).filter(Boolean).map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1).trim()]))
  : {};
// /api/tester: ejecuta la misma Pages Function de functions/ (variables SUPABASE_URL y SUPABASE_ANON_KEY del entorno;
// para probar, usa las del proyecto de PRUEBAS, nunca las de producción).
const { onRequestPost } = await import('./functions/api/tester.js');
createServer(async (req, res) => {
  if (req.url === '/api/tester' && req.method === 'POST') {
    const cuerpo = await new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => ok(d)); });
    const r = await onRequestPost({ request: new Request('http://local/api/tester', { method: 'POST', headers: req.headers, body: cuerpo }), env: process.env });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(await r.text());
  }
  const ruta =normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  let archivo = join(dist, ruta);
  if (!archivo.startsWith(dist)) { res.writeHead(400); return res.end(); }
  if (existsSync(archivo) && statSync(archivo).isDirectory()) archivo = join(archivo, 'index.html');
  const existe = existsSync(archivo);
  res.writeHead(existe ? 200 : 404, { ...globales, 'content-type': tipos[extname(existe ? archivo : '404.html')] ?? 'application/octet-stream' });
  res.end(readFileSync(existe ? archivo : join(dist, '404.html')));
}).listen(puerto, () => console.log(`Vista previa: http://localhost:${puerto}`));
