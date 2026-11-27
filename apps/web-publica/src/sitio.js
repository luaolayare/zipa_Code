// Menú en celulares, sombra de la cabecera al bajar y aparición suave de las secciones. Sin dependencias.
(function () {
  document.documentElement.classList.add('js');
  var boton = document.querySelector('.menu-boton');
  var menu = document.getElementById('menu');
  if (boton && menu) {
    var cerrar = function () { menu.classList.remove('abierto'); boton.setAttribute('aria-expanded', 'false'); boton.setAttribute('aria-label', 'Abrir el menú'); };
    boton.addEventListener('click', function () {
      var abierto = menu.classList.toggle('abierto');
      boton.setAttribute('aria-expanded', String(abierto));
      boton.setAttribute('aria-label', abierto ? 'Cerrar el menú' : 'Abrir el menú');
    });
    menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') cerrar(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrar(); });
  }
  // Formulario «Sé tester»: envía a /api/tester (Cloudflare Pages Function) y muestra el resultado ahí mismo.
  var form = document.getElementById('form-tester');
  if (form) {
    var estado = form.querySelector('.tester-estado');
    var boton = form.querySelector('button[type=submit]');
    var mostrar = function (texto, tipo) { estado.textContent = texto; estado.className = 'tester-estado ' + (tipo || ''); };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var correo = form.correo.value.trim();
      var apps = Array.prototype.slice.call(form.querySelectorAll('input[name=apps]:checked')).map(function (i) { return i.value; });
      if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,24}$/.test(correo)) { mostrar('Escribe un correo válido.', 'error'); form.correo.focus(); return; }
      if (!apps.length) { mostrar('Elige al menos una app.', 'error'); return; }
      if (!form.acepta.checked) { mostrar('Necesitamos tu autorización para usar tu correo.', 'error'); form.acepta.focus(); return; }
      boton.disabled = true; mostrar('Enviando…');
      fetch('/api/tester', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ correo: correo, apps: apps, acepta: true, sitio: form.sitio.value }) })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (d) {
          if (d.ok) { form.reset(); form.querySelector('input[value=clientes]').checked = true; mostrar('¡Listo! Te agregaremos a la prueba y te enviaremos los enlaces a ' + correo + '. Revisa también la carpeta de spam.', 'ok'); }
          else mostrar(d.mensaje || 'No pudimos guardar tu correo. Intenta de nuevo en un rato.', 'error');
        })
        .catch(function () { mostrar('No hay conexión. Intenta de nuevo en un rato.', 'error'); })
        .then(function () { boton.disabled = false; });
    });
  }
  var cabecera = document.querySelector('.cabecera');
  var sombra = function () { if (cabecera) cabecera.classList.toggle('con-sombra', window.scrollY > 8); };
  window.addEventListener('scroll', sombra, { passive: true });
  sombra();
  var elementos = document.querySelectorAll('.revelar');
  if (!('IntersectionObserver' in window)) { elementos.forEach(function (el) { el.classList.add('visible'); }); return; }
  var obs = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('visible'); obs.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  elementos.forEach(function (el) { obs.observe(el); });
})();
