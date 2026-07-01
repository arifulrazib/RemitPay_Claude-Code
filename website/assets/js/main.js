// MuktoPay website — shared behaviour (nav, search, accordion, tabs, forms, locator)
(function () {
  'use strict';

  // Mobile nav toggle
  var navToggle = document.querySelector('.nav-toggle');
  var mobileNav = document.querySelector('.mobile-nav');
  if (navToggle && mobileNav) {
    navToggle.addEventListener('click', function () {
      mobileNav.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
    var closeBtn = mobileNav.querySelector('.mobile-nav-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
  }

  // Search overlay
  var searchTriggers = document.querySelectorAll('[data-search-open]');
  var searchOverlay = document.querySelector('.search-overlay');
  if (searchOverlay) {
    searchTriggers.forEach(function (btn) {
      btn.addEventListener('click', function () {
        searchOverlay.classList.add('open');
        var input = searchOverlay.querySelector('input');
        if (input) setTimeout(function () { input.focus(); }, 50);
      });
    });
    var searchClose = searchOverlay.querySelector('.search-close');
    if (searchClose) {
      searchClose.addEventListener('click', function () {
        searchOverlay.classList.remove('open');
      });
    }
    searchOverlay.addEventListener('click', function (e) {
      if (e.target === searchOverlay) searchOverlay.classList.remove('open');
    });
    var searchForm = searchOverlay.querySelector('form');
    if (searchForm) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = searchForm.querySelector('input').value.trim();
        window.location.href = 'search.html' + (q ? ('?q=' + encodeURIComponent(q)) : '');
      });
    }
  }

  // FAQ accordions
  document.querySelectorAll('.faq-item .faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.faq-item');
      var wasOpen = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        if (openItem !== item) openItem.classList.remove('open');
      });
      item.classList.toggle('open', !wasOpen);
    });
  });

  // FAQ search filter
  document.querySelectorAll('[data-faq-search]').forEach(function (input) {
    input.addEventListener('input', function () {
      var q = input.value.toLowerCase();
      var list = document.querySelector(input.getAttribute('data-faq-search'));
      if (!list) return;
      list.querySelectorAll('.faq-item').forEach(function (item) {
        var text = item.textContent.toLowerCase();
        item.style.display = text.indexOf(q) > -1 ? '' : 'none';
      });
    });
  });

  // Tabs
  document.querySelectorAll('.tabs').forEach(function (tabs) {
    var targetSelector = tabs.getAttribute('data-tabs-target');
    var panelGroup = targetSelector ? document.querySelector(targetSelector) : tabs.parentElement;
    tabs.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabs.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var name = btn.getAttribute('data-tab');
        panelGroup.querySelectorAll('.tab-panel').forEach(function (p) {
          p.classList.toggle('active', p.getAttribute('data-panel') === name);
        });
      });
    });
  });

  // Pill filters (offers / news / jobs)
  document.querySelectorAll('.pill-list[data-filter-target]').forEach(function (pills) {
    var target = document.querySelector(pills.getAttribute('data-filter-target'));
    if (!target) return;
    pills.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pills.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var cat = btn.getAttribute('data-cat');
        target.querySelectorAll('[data-cat-item]').forEach(function (card) {
          card.style.display = (cat === 'all' || card.getAttribute('data-cat-item') === cat) ? '' : 'none';
        });
      });
    });
  });

  // Locator: click list item -> highlight + update map
  document.querySelectorAll('.locator-item').forEach(function (item) {
    item.addEventListener('click', function () {
      document.querySelectorAll('.locator-item').forEach(function (i) { i.classList.remove('active'); });
      item.classList.add('active');
      var lat = item.getAttribute('data-lat');
      var lng = item.getAttribute('data-lng');
      var map = document.querySelector('.locator-map iframe');
      if (map && lat && lng) {
        var d = 0.01;
        map.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
          (parseFloat(lng) - d) + ',' + (parseFloat(lat) - d) + ',' +
          (parseFloat(lng) + d) + ',' + (parseFloat(lat) + d) +
          '&layer=mapnik&marker=' + lat + ',' + lng;
      }
    });
  });

  // Generic "coming soon" style form submit -> redirect to declared success page
  document.querySelectorAll('form[data-success]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var required = form.querySelectorAll('[required]');
      var valid = true;
      required.forEach(function (f) { if (!f.value) valid = false; });
      if (!valid) { form.reportValidity(); return; }
      window.location.href = form.getAttribute('data-success');
    });
  });

  // File drop label text
  document.querySelectorAll('.file-drop input[type="file"]').forEach(function (input) {
    input.addEventListener('change', function () {
      var label = input.closest('.file-drop').querySelector('.file-drop-text');
      if (label && input.files.length) label.textContent = input.files.length + ' file(s) selected';
    });
  });

  // Multi-step form nav (Become Merchant / Agent registration)
  document.querySelectorAll('[data-step-form]').forEach(function (formEl) {
    var steps = Array.prototype.slice.call(formEl.querySelectorAll('.form-step'));
    var panels = Array.prototype.slice.call(formEl.querySelectorAll('.step-panel'));
    var current = 0;
    function render() {
      steps.forEach(function (s, i) { s.classList.toggle('active', i === current); });
      panels.forEach(function (p, i) { p.style.display = i === current ? '' : 'none'; });
    }
    formEl.querySelectorAll('[data-step-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = panels[current];
        var required = panel.querySelectorAll('[required]');
        var valid = true;
        required.forEach(function (f) { if (!f.value) valid = false; });
        if (!valid) { panel.querySelectorAll('[required]')[0].reportValidity(); return; }
        if (current < panels.length - 1) { current++; render(); window.scrollTo({ top: formEl.offsetTop - 100, behavior: 'smooth' }); }
      });
    });
    formEl.querySelectorAll('[data-step-prev]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (current > 0) { current--; render(); window.scrollTo({ top: formEl.offsetTop - 100, behavior: 'smooth' }); }
      });
    });
    render();
  });

  // Search results page: read ?q= and reflect it
  if (location.pathname.indexOf('search.html') > -1) {
    var params = new URLSearchParams(location.search);
    var q = params.get('q');
    var out = document.querySelector('[data-search-query]');
    if (out) out.textContent = q || '';
    var input = document.querySelector('[data-search-input]');
    if (input && q) input.value = q;
  }
})();
