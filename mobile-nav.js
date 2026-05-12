/* mobile-nav.js
 * Injects a hamburger button into the topbar and a backdrop into <body>,
 * then toggles a "sidebar-open" class on <body> to reveal the sidebar drawer.
 * Pages provide the CSS — this script just wires the interaction.
 *
 * Auto-closes when:
 *   - the backdrop is clicked
 *   - a sidebar nav item or the logo is clicked (so navigation can happen)
 *   - Escape is pressed
 *   - the viewport grows past the mobile breakpoint
 */
(function () {
  const MOBILE_MAX = 900;

  function init() {
    const sidebar = document.querySelector('.sidebar');
    const topbar  = document.querySelector('.topbar');
    if (!sidebar || !topbar) return;
    if (topbar.querySelector('.hamburger')) return; // already injected

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    // Hamburger button — inserted as the first child of the topbar
    const btn = document.createElement('button');
    btn.className = 'hamburger';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    topbar.insertBefore(btn, topbar.firstChild);

    function open() {
      document.body.classList.add('sidebar-open');
      btn.setAttribute('aria-label', 'Close menu');
      btn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      document.body.classList.remove('sidebar-open');
      btn.setAttribute('aria-label', 'Open menu');
      btn.setAttribute('aria-expanded', 'false');
    }
    function toggle() {
      if (document.body.classList.contains('sidebar-open')) close(); else open();
    }

    btn.addEventListener('click', toggle);
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    // Close drawer when navigating (mobile only)
    sidebar.querySelectorAll('a.nav-item, .logo').forEach(el => {
      el.addEventListener('click', () => {
        if (window.innerWidth <= MOBILE_MAX) close();
      });
    });

    // Reset on resize past breakpoint
    let resizeT = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        if (window.innerWidth > MOBILE_MAX) close();
      }, 80);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
