// Piezas comunes de todas las páginas: encabezado, pie, metadatos y datos pendientes.
import { SITIO } from '../sitio.config.mjs';

export const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Datos que faltan: se muestran marcados en la página y el build los lista.
let pendientesPagina = new Set();
export const pendientesGlobales = new Map(); // etiqueta -> páginas
export function iniciarPagina() { pendientesPagina = new Set(); }
export function dato(valor, etiqueta, ruta) {
  if (valor) return esc(valor);
  pendientesPagina.add(etiqueta);
  if (!pendientesGlobales.has(etiqueta)) pendientesGlobales.set(etiqueta, new Set());
  pendientesGlobales.get(etiqueta).add(ruta);
  return `<mark class="pendiente">[Por completar: ${esc(etiqueta)}]</mark>`;
}
export const correoEnlace = (correo, etiqueta, ruta) => (correo ? `<a href="mailto:${esc(correo)}">${esc(correo)}</a>` : dato(null, etiqueta, ruta));

/** Botón de Google Play: enlace real si existe; si no, «Próximamente» (deshabilitado). */
export function botonPlay(app, texto) {
  const url = SITIO.play[app];
  const icono = '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M3.6 2.3c-.2.2-.3.6-.3 1v17.4c0 .4.1.8.3 1l9.5-9.7-9.5-9.7Zm10.6 10.8 2.7 2.7-11.1 6.3c-.4.2-.8.3-1.1.2l9.5-9.2Zm0-2.2L4.7 1.7c.3-.1.7 0 1.1.2l11.1 6.3-2.7 2.7Zm4 .9 2.9 1.6c.9.5.9 1.4 0 1.9l-2.9 1.6-3-2.6 3-2.5Z"/></svg>';
  if (url) return `<a class="btn btn-play" href="${esc(url)}" rel="noopener">${icono}<span><small>Disponible en</small>Google Play · ${esc(texto)}</span></a>`;
  return `<span class="btn btn-play desactivado" aria-disabled="true">${icono}<span><small>Próximamente en</small>Google Play · ${esc(texto)}</span></span>`;
}

const NAV = [
  ['/', 'Inicio'],
  ['/#como-funciona', 'Cómo funciona'],
  ['/#negocios', 'Para negocios'],
  ['/#testers', 'Sé tester'],
  ['/#preguntas', 'Preguntas frecuentes'],
  ['/soporte', 'Soporte'],
];

export function pagina({ ruta, titulo, descripcion, cuerpo, legal = false, indexar = true }) {
  const url = `${SITIO.dominio}${ruta === '/' ? '/' : ruta}`;
  const tituloCompleto = ruta === '/' ? `${SITIO.marca} · ${SITIO.eslogan}` : `${titulo} · ${SITIO.marca}`;
  const aviso = legal && pendientesPagina.size
    ? `<div class="aviso-borrador" role="note"><strong>Documento en preparación.</strong> Antes de su versión definitiva faltan algunos datos del responsable, marcados como «Por completar».</div>`
    : '';
  const anio = new Date().getFullYear();
  return `<!doctype html>
<html lang="es-CO">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${esc(url)}">
${indexar ? '' : '<meta name="robots" content="noindex">'}
<meta name="theme-color" content="#0F3D3E">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_CO">
<meta property="og:site_name" content="${esc(SITIO.marca)}">
<meta property="og:title" content="${esc(tituloCompleto)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITIO.dominio}/img/compartir.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preload" href="/fuentes/BricolageGrotesque_800ExtraBold.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="/estilos.css">
</head>
<body>
<a class="saltar" href="#contenido">Saltar al contenido</a>
<header class="cabecera">
  <div class="contenedor cabecera-fila">
    <a class="marca" href="/" aria-label="${esc(SITIO.marca)}, inicio">
      <img src="/img/simbolo.png" alt="" width="40" height="40">
      <span>Localmente<b>Tuyo</b></span>
    </a>
    <button class="menu-boton" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir el menú">
      <span></span><span></span><span></span>
    </button>
    <nav id="menu" class="menu" aria-label="Principal">
      ${NAV.map(([href, texto]) => `<a href="${href}"${href === ruta ? ' aria-current="page"' : ''}>${texto}</a>`).join('')}
    </nav>
  </div>
</header>
<main id="contenido">
${aviso ? `<div class="contenedor">${aviso}</div>` : ''}
${cuerpo}
</main>
<footer class="pie">
  <div class="contenedor pie-rejilla">
    <div>
      <a class="marca marca-clara" href="/"><img src="/img/simbolo.png" alt="" width="36" height="36"><span>Localmente<b>Tuyo</b></span></a>
      <p class="pie-eslogan">${esc(SITIO.eslogan)}</p>
      <p class="pie-pequeno">Iniciamos en Zipaquirá, Cundinamarca.</p>
    </div>
    <nav aria-label="Información legal y ayuda">
      <h2>Ayuda y legal</h2>
      <a href="/soporte">Soporte</a>
      <a href="/privacidad">Política de privacidad</a>
      <a href="/terminos">Términos y condiciones</a>
      <a href="/eliminar-cuenta">Eliminar mi cuenta</a>
    </nav>
    <div>
      <h2>Apps</h2>
      <p class="pie-pequeno">LocalmenteTuyo, para descubrir.<br>LocalmenteTuyo Negocios, para comerciantes.</p>
      <p class="pie-pequeno">${SITIO.play.clientes ? 'Disponibles en Google Play.' : 'Próximamente en Google Play.'}</p>
    </div>
  </div>
  <div class="contenedor pie-final">
    <span>© ${anio} ${esc(SITIO.marca)}</span>
    <span>Desarrollado por <a href="${esc(SITIO.desarrollador.web)}" rel="noopener">${esc(SITIO.desarrollador.nombre)}</a></span>
  </div>
</footer>
<script src="/sitio.js" defer></script>
</body>
</html>
`;
}
