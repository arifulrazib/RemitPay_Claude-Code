/* auth.js — shared client-side auth layer.
 *
 * NOTE: This is a demo-only, client-side check. Do not use this pattern for real
 * authentication; production auth must verify credentials on a server and use
 * httpOnly cookies / proper tokens. Here we just track logged-in state in storage
 * so the UI can simulate the flow.
 *
 * Public API (window.auth):
 *   isAuthenticated()        -> boolean
 *   getCurrentUser()         -> { email, signedInAt } | null
 *   login(email, remember)   -> user (persists to localStorage if remember=true,
 *                               otherwise sessionStorage)
 *   logout()                 -> clears storage and redirects to login.html
 *   requireAuth()            -> if not signed in, redirects to login.html;
 *                               returns boolean
 *
 * On DOM ready, if a `.user-menu` button exists in the page, this script wraps
 * it with a dropdown that shows the signed-in email + a Logout action.
 */
(function () {
  const STORAGE_KEY = 'remitpay.auth';

  // ============ STORAGE ============
  function readUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeUser(user, remember) {
    const json = JSON.stringify(user);
    if (remember) {
      localStorage.setItem(STORAGE_KEY, json);
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, json);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  function clearUser() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  // ============ PUBLIC API ============
  function getCurrentUser()  { return readUser(); }
  function isAuthenticated() { return !!readUser(); }

  function login(email, remember) {
    const user = { email: String(email).trim().toLowerCase(), signedInAt: Date.now() };
    writeUser(user, !!remember);
    return user;
  }

  function logout() {
    clearUser();
    window.location.replace('login.html');
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.replace('login.html');
      return false;
    }
    return true;
  }

  // ============ HELPERS ============
  // Turn "carlos.rodriguez@example.com" into { name: "Carlos Rodriguez", av: "CR" }
  function formatUser(user) {
    const email = (user && user.email) || '';
    const local = email.split('@')[0] || 'user';
    const parts = local.split(/[._\-+]+/).filter(Boolean);
    const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    const av = (parts.length === 1
      ? parts[0].slice(0, 2)
      : parts.map(p => p[0]).join('').slice(0, 2)).toUpperCase() || '?';
    return { name: name || 'User', email, av };
  }

  // ============ USER MENU DROPDOWN ============
  let injectedStyles = false;

  function injectStyles() {
    if (injectedStyles) return;
    injectedStyles = true;
    const css = `
      .user-menu-wrap { position: relative; }
      .user-menu-wrap > .user-menu { cursor: pointer; }
      .user-dropdown {
        position: absolute; top: calc(100% + 6px); right: 0;
        min-width: 240px; padding: 6px;
        background: #fff;
        border: 1px solid #E5EDF5;
        border-radius: 10px;
        box-shadow: 0 12px 32px rgba(10,37,64,0.14);
        list-style: none; margin: 0; z-index: 60;
        opacity: 0; transform: translateY(-4px); pointer-events: none;
        transition: opacity 160ms cubic-bezier(0.2, 0, 0, 1), transform 160ms cubic-bezier(0.2, 0, 0, 1);
        font-family: 'Poppins', system-ui, sans-serif;
      }
      html[lang="bn"] .user-dropdown { font-family: 'Noto Sans Bengali', 'Poppins', system-ui, sans-serif; }
      .user-menu-wrap.open .user-dropdown { opacity: 1; transform: translateY(0); pointer-events: auto; }
      .user-dropdown-head {
        padding: 10px 12px 12px;
        border-bottom: 1px solid #E5EDF5;
        margin-bottom: 4px;
      }
      .user-dropdown-name {
        font-size: 14px; font-weight: 700; color: #0A2540;
        line-height: 1.3;
        word-break: break-word;
      }
      .user-dropdown-email {
        font-size: 12px; color: #6B8299; margin-top: 2px;
        word-break: break-all;
      }
      .user-dropdown-item {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 12px;
        width: 100%; text-align: left;
        background: transparent; border: none; cursor: pointer;
        font-size: 13px; font-weight: 600; color: #0A2540;
        border-radius: 6px; font-family: inherit;
        transition: background 160ms ease, color 160ms ease;
      }
      .user-dropdown-item:hover { background: #F4F8FC; }
      .user-dropdown-item.danger { color: #D7263D; }
      .user-dropdown-item.danger:hover { background: #FCE8EB; }
      .user-dropdown-item svg { flex-shrink: 0; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function attachUserMenu() {
    const btn = document.querySelector('.user-menu');
    if (!btn || btn.dataset.authBound === '1') return;
    const user = getCurrentUser();
    if (!user) return;

    const fmt = formatUser(user);

    // Update existing avatar + name fields with the real user
    const avEl   = btn.querySelector('.user-av');
    const nameEl = btn.querySelector('.user-name');
    if (avEl)   avEl.textContent   = fmt.av;
    if (nameEl) nameEl.textContent = fmt.name;

    injectStyles();

    // Wrap button in a positioned container if not already wrapped
    let wrap = btn.parentElement;
    if (!wrap.classList.contains('user-menu-wrap')) {
      wrap = document.createElement('div');
      wrap.className = 'user-menu-wrap';
      btn.parentElement.insertBefore(wrap, btn);
      wrap.appendChild(btn);
    }

    // Build dropdown
    const dd = document.createElement('div');
    dd.className = 'user-dropdown';
    dd.setAttribute('role', 'menu');
    dd.innerHTML = `
      <div class="user-dropdown-head">
        <div class="user-dropdown-name"></div>
        <div class="user-dropdown-email"></div>
      </div>
      <button type="button" class="user-dropdown-item danger" data-auth-logout>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span data-i18n="auth.logout">Log out</span>
      </button>
    `;
    dd.querySelector('.user-dropdown-name').textContent  = fmt.name;
    dd.querySelector('.user-dropdown-email').textContent = fmt.email;
    wrap.appendChild(dd);

    // Toggle interactions
    btn.dataset.authBound = '1';
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !wrap.classList.contains('open');
      wrap.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        wrap.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });

    // Translate the new label if i18n is loaded
    if (window.i18n) {
      const span = dd.querySelector('[data-i18n]');
      const v = window.i18n.t(span.getAttribute('data-i18n'));
      if (v && v !== 'auth.logout') span.textContent = v;
    }
  }

  // Wire any element marked with [data-auth-logout] (works for the user-menu
  // dropdown item as well as standalone logout buttons on flow pages).
  function wireLogoutTriggers() {
    document.querySelectorAll('[data-auth-logout]').forEach((el) => {
      if (el.dataset.authLogoutBound === '1') return;
      el.dataset.authLogoutBound = '1';
      el.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    });
  }

  function init() {
    attachUserMenu();
    wireLogoutTriggers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cross-tab sync: if user logs out elsewhere, redirect this tab too.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && !isAuthenticated()) {
      window.location.replace('login.html');
    }
  });

  window.auth = { getCurrentUser, isAuthenticated, login, logout, requireAuth, formatUser };
})();
