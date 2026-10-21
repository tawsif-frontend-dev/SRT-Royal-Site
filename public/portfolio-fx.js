// SRT ROYAL — pointer-lit rims, halo-follow headline (ThreeUI portfolio style)
(function () {
  var sel = '.btn,.service-card,.skill-card,.portfolio-card,.designer-card,.testimonial-card';
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest(sel);
    if (el) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--rx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--ry', (e.clientY - r.top) + 'px');
    }
    var h = document.querySelector('.hero-headline');
    if (h) {
      var hr = h.getBoundingClientRect();
      h.style.setProperty('--hx', ((e.clientX - hr.left) / hr.width * 100) + '%');
      h.style.setProperty('--hy', ((e.clientY - hr.top) / hr.height * 100) + '%');
    }
  }, { passive: true });
})();

// Floating hero cards: depth parallax toward the pointer
(function () {
  var cards = document.querySelectorAll('.stage-card');
  if (!cards.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  addEventListener('pointermove', function (e) {
    var nx = (e.clientX / innerWidth - 0.5) * 2, ny = (e.clientY / innerHeight - 0.5) * 2;
    cards.forEach(function (c) {
      var d = parseFloat(c.dataset.depth || 20);
      c.style.setProperty('--px', (-nx * d) + 'px');
      c.style.setProperty('--py', (-ny * d * 0.6) + 'px');
    });
  }, { passive: true });
})();

// Nav: mark the current page's link active (cream pill)
(function () {
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.navbar .nav-link').forEach(function (a) {
    var href = (a.getAttribute('href') || '').split('#')[0].toLowerCase();
    if (href && href === here && !a.classList.contains('nav-login-link')) a.classList.add('active');
  });
})();
