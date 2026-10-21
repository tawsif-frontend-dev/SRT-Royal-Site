// SRT ROYAL — pointer-lit rims, halo-follow headline (ThreeUI portfolio style)
(function () {
  var sel = '.btn,.service-card,.skill-card,.portfolio-card,.designer-card,.testimonial-card';
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest && e.target.closest(sel);
    if (el) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }
    var h = document.querySelector('.hero-headline');
    if (h) {
      var hr = h.getBoundingClientRect();
      h.style.setProperty('--hx', ((e.clientX - hr.left) / hr.width * 100) + '%');
      h.style.setProperty('--hy', ((e.clientY - hr.top) / hr.height * 100) + '%');
    }
  }, { passive: true });
})();
