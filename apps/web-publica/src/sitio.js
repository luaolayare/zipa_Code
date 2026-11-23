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
