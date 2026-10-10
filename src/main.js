/* Hot Potato — behaviour only. The page is fully readable without this file. */
(function () {
  'use strict';
  var d = document;
  var qs = function (s, r) { return (r || d).querySelector(s); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- language memory ---------- */
  qsa('[data-lang-switch]').forEach(function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('hp-lang', a.getAttribute('data-lang-switch')); } catch (e) { /* private mode */ }
    });
  });

  /* ---------- menu (phones) ---------- */
  var menuBtn = qs('.menu-btn'), menu = qs('#nav-menu');
  if (menuBtn && menu) {
    var setMenu = function (open) {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.textContent = menuBtn.getAttribute(open ? 'data-close' : 'data-open');
      d.body.classList.toggle('menu-open', open);
    };
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.body.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });
  }

  /* ---------- external links ---------- */
  qsa('a[href^="http"]').forEach(function (a) {
    if (a.host !== location.host) { a.target = '_blank'; a.rel = (a.rel ? a.rel + ' ' : '') + 'noopener'; }
  });

  /* ---------- lite YouTube: iframe only on click ---------- */
  qsa('.lite-yt').forEach(function (box) {
    var link = qs('.lite-yt-link', box);
    if (!link) return;
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var id = box.getAttribute('data-yt');
      var f = d.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&modestbranding=1';
      f.title = box.getAttribute('data-title') || 'Trailer';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.setAttribute('loading', 'eager');
      box.classList.add('is-playing');
      link.replaceWith(f);
      f.focus();
    });
  });

  /* ---------- lightbox (keyboard + swipe) ---------- */
  var lb = qs('#lightbox');
  var links = qsa('[data-lightbox]');
  if (lb && links.length) {
    var img = qs('img', lb), cap = qs('figcaption', lb), count = qs('.lb-count', lb);
    var current = 0, lastFocus = null, startX = null;
    var show = function (i) {
      current = (i + links.length) % links.length;
      var a = links[current], thumb = qs('img', a);
      img.src = a.href;
      img.width = a.getAttribute('data-w'); img.height = a.getAttribute('data-h');
      img.alt = thumb ? thumb.alt : '';
      var fc = a.parentNode.querySelector('figcaption');
      cap.textContent = fc ? fc.textContent : '';
      count.textContent = (current + 1) + ' ' + count.getAttribute('data-of') + ' ' + links.length;
      // preload neighbours
      [current + 1, current - 1].forEach(function (n) { var p = new Image(); p.src = links[(n + links.length) % links.length].href; });
    };
    var open = function (i) {
      lastFocus = d.activeElement;
      lb.hidden = false; d.body.classList.add('lb-open');
      show(i);
      qs('[data-lb-close]', lb).focus();
    };
    var close = function () {
      lb.hidden = true; d.body.classList.remove('lb-open'); img.removeAttribute('src');
      if (lastFocus) lastFocus.focus();
    };
    links.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); open(i); }); });
    qs('[data-lb-close]', lb).addEventListener('click', close);
    qs('[data-lb-prev]', lb).addEventListener('click', function () { show(current - 1); });
    qs('[data-lb-next]', lb).addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    d.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'Tab') { // keep focus inside
        var f = qsa('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    lb.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX; startX = null;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ---------- contact: build a real mailto (no Firebase config present) ---------- */
  var form = qs('.contact-form');
  if (form && form.getAttribute('data-mailto')) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      var subject = '[' + f.topic.value + '] ' + d.body.getAttribute('data-steam-app') + ' — ' + f.name.value;
      var body = f.message.value + '\n\n— ' + f.name.value + ' <' + f.email.value + '>';
      location.href = 'mailto:' + form.getAttribute('data-mailto') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      var note = qs('.form-note', form);
      if (note) { note.textContent = note.getAttribute('data-success'); note.hidden = false; }
    });
  }

})();
