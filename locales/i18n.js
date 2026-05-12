/* Shared i18n module for RemitPay pages.
 * Exposes window.i18n with: lang, t(key, params), setLanguage(lang), onChange(fn).
 * Auto-applies translations on load and on every language change.
 */
(function () {
  const STORAGE_KEY = 'remitpay.lang';
  const DEFAULT_LANG = 'en';
  const SUPPORTED = ['en', 'bn'];

  const cache = {};
  let currentLang = DEFAULT_LANG;
  let currentDict = {};
  const listeners = new Set();

  const resolve = (dict, path) =>
    path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), dict);

  function format(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : `{${k}}`));
  }

  function t(key, params) {
    const v = resolve(currentDict, key);
    return v == null ? key : format(v, params);
  }

  async function load(lang) {
    if (cache[lang]) return cache[lang];
    const res = await fetch(`locales/${lang}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load locale "${lang}" (${res.status})`);
    cache[lang] = await res.json();
    return cache[lang];
  }

  function applyDom() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const v = resolve(currentDict, el.getAttribute('data-i18n'));
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const v = resolve(currentDict, el.getAttribute('data-i18n-placeholder'));
      if (v != null) el.placeholder = v;
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const v = resolve(currentDict, el.getAttribute('data-i18n-aria-label'));
      if (v != null) el.setAttribute('aria-label', v);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const v = resolve(currentDict, el.getAttribute('data-i18n-title'));
      if (v != null) el.setAttribute('title', v);
    });
  }

  function syncSwitcherUi(lang) {
    document.querySelectorAll('[data-lang-current]').forEach((el) => {
      el.textContent = lang.toUpperCase();
    });
    document.querySelectorAll('#langMenu [role="option"]').forEach((li) => {
      const isActive = li.dataset.lang === lang;
      li.classList.toggle('active', isActive);
      li.setAttribute('aria-selected', String(isActive));
    });
  }

  async function setLanguage(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    try {
      currentDict = await load(lang);
      currentLang = lang;
      document.documentElement.setAttribute('lang', lang);
      localStorage.setItem(STORAGE_KEY, lang);
      applyDom();
      syncSwitcherUi(lang);
      listeners.forEach((fn) => { try { fn(lang); } catch (e) { console.error(e); } });
      document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
    } catch (err) {
      console.error('[i18n]', err);
    }
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function initSwitcher() {
    const switcher = document.getElementById('langSwitcher');
    const btn = document.getElementById('langBtn');
    const menu = document.getElementById('langMenu');
    if (!switcher || !btn || !menu) return;

    const close = () => {
      switcher.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !switcher.classList.contains('open');
      switcher.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });

    menu.querySelectorAll('[role="option"]').forEach((li) => {
      const choose = () => { setLanguage(li.dataset.lang); close(); };
      li.addEventListener('click', choose);
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
      });
    });

    document.addEventListener('click', (e) => { if (!switcher.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = SUPPORTED.includes(saved) ? saved : DEFAULT_LANG;
    initSwitcher();
    setLanguage(initial);
  }

  window.i18n = {
    get lang() { return currentLang; },
    t,
    setLanguage,
    onChange,
    SUPPORTED,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
