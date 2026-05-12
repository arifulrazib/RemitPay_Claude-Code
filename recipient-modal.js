/* Reusable Add / Edit / Delete recipient modal.
 * Depends on window.recipientsStore (recipients-store.js) and window.i18n (i18n.js).
 *
 * Public API (attached to window):
 *   openAddRecipientModal({ defaultType?, onSave?, onClose? })
 *   openEditRecipientModal(id, { onSave?, onClose? })
 *   openDeleteRecipientModal(id, { onConfirm?, onClose? })
 */
(function () {
  const t = (k, p) => (window.i18n ? window.i18n.t(k, p) : k);
  const COUNTRIES = (window.recipientsStore && window.recipientsStore.COUNTRIES) || ['india','philippines','mexico','nigeria','bangladesh','colombia'];

  const state = {
    mode: null,            // 'add' | 'edit' | 'delete'
    type: null,            // 'bank' | 'mobile' | 'cash'
    editingId: null,
    deletingId: null,
    onSave: null,
    onConfirm: null,
    onClose: null,
  };

  let initialized = false;

  // ============ INJECTION ============
  function ensure() {
    if (initialized) return;
    initialized = true;

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.innerHTML = HTML;
    document.body.appendChild(wrap.firstElementChild);

    wireEvents();
  }

  function wireEvents() {
    const overlay = document.getElementById('recOverlay');
    overlay.addEventListener('click', (e) => { if (e.target.id === 'recOverlay') close(); });
    overlay.querySelectorAll('[data-rec-close]').forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });

    // Type chooser tiles
    overlay.querySelectorAll('.rec-type-card').forEach(card => {
      card.addEventListener('click', () => chooseType(card.dataset.type));
    });

    // Back button on form panel returns to type chooser when adding
    overlay.querySelector('#recBackBtn').addEventListener('click', () => {
      if (state.mode === 'add') showPanel('chooser');
    });

    // Country select → updates flag preview
    overlay.querySelector('#recCountry').addEventListener('change', updateFlagPreview);

    // Form submit / cancel
    overlay.querySelector('#recForm').addEventListener('submit', onFormSubmit);

    // Delete confirmation
    overlay.querySelector('#delConfirmBtn').addEventListener('click', confirmDelete);

    // Re-render labels on language change while open
    document.addEventListener('languagechange', () => {
      if (isOpen()) refreshTexts();
    });
  }

  // ============ UI HELPERS ============
  function showPanel(name) {
    const overlay = document.getElementById('recOverlay');
    overlay.querySelectorAll('.rec-panel').forEach(p => p.hidden = true);
    overlay.querySelector(`.rec-panel[data-panel="${name}"]`).hidden = false;
  }

  function isOpen() { return document.getElementById('recOverlay')?.classList.contains('show'); }

  function open() {
    ensure();
    refreshTexts();
    document.getElementById('recOverlay').classList.add('show');
  }

  function close() {
    document.getElementById('recOverlay')?.classList.remove('show');
    if (state.onClose) try { state.onClose(); } catch (e) {}
    state.onClose = null;
    state.onSave = null;
    state.onConfirm = null;
    state.editingId = null;
    state.deletingId = null;
  }

  // Repopulate any text/labels that come from i18n
  function refreshTexts() {
    const o = document.getElementById('recOverlay');
    if (!o) return;
    o.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t(el.getAttribute('data-i18n'));
      if (v) el.textContent = v;
    });
    o.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const v = t(el.getAttribute('data-i18n-placeholder'));
      if (v) el.placeholder = v;
    });
    // Country select options
    const sel = o.querySelector('#recCountry');
    const cur = sel.value;
    sel.innerHTML = '<option value="">' + t('recipients.modal.chooseCountry') + '</option>' +
      COUNTRIES.map(c => `<option value="${c}">${t('country.' + c)}</option>`).join('');
    if (cur) sel.value = cur;

    // Title and helper texts driven by mode
    const titleEl = o.querySelector('#recTitle');
    if (titleEl) {
      titleEl.textContent = state.mode === 'edit'
        ? t('recipients.modal.editTitle')
        : t('recipients.modal.addTitle');
    }
    // Save button label
    const saveBtn = o.querySelector('#recSaveBtn');
    if (saveBtn) saveBtn.textContent = t('recipients.modal.save');

    // Type pill on the form panel (locked indicator when editing)
    const typePill = o.querySelector('#recTypePill');
    if (typePill && state.type) typePill.textContent = t('recipients.type.' + state.type);
  }

  // ============ ADD ============
  function openAdd(opts = {}) {
    ensure();
    state.mode = 'add';
    state.editingId = null;
    state.type = opts.defaultType || null;
    state.onSave = opts.onSave || null;
    state.onClose = opts.onClose || null;

    if (state.type) {
      // Skip chooser if defaultType was provided
      showPanel('form');
      resetForm();
    } else {
      showPanel('chooser');
    }
    open();
  }

  function chooseType(type) {
    state.type = type;
    showPanel('form');
    resetForm();
    refreshTexts();
    // Show the back button only in add mode (since edit comes straight to form)
    document.getElementById('recBackBtn').style.display = state.mode === 'add' ? '' : 'none';
  }

  // ============ EDIT ============
  function openEdit(id, opts = {}) {
    ensure();
    const rec = window.recipientsStore?.get(id);
    if (!rec) return;
    state.mode = 'edit';
    state.editingId = id;
    state.type = rec.type;
    state.onSave = opts.onSave || null;
    state.onClose = opts.onClose || null;

    showPanel('form');
    document.getElementById('recBackBtn').style.display = 'none';
    populateForm(rec);
    refreshTexts();
    open();
  }

  // ============ DELETE ============
  function openDelete(id, opts = {}) {
    ensure();
    const rec = window.recipientsStore?.get(id);
    if (!rec) return;
    state.mode = 'delete';
    state.deletingId = id;
    state.onConfirm = opts.onConfirm || null;
    state.onClose = opts.onClose || null;

    showPanel('delete');
    const o = document.getElementById('recOverlay');
    o.querySelector('#delAv').className = 'sum-av ' + (rec.cls || 'av-1');
    o.querySelector('#delAv').textContent = rec.av || '?';
    o.querySelector('#delName').textContent = rec.name;
    o.querySelector('#delDest').textContent = rec.dest || '';
    o.querySelector('#delMessage').textContent = t('recipients.modal.deleteConfirm', { name: rec.name });
    open();
  }

  function confirmDelete() {
    const id = state.deletingId;
    if (id && window.recipientsStore) {
      window.recipientsStore.remove(id);
      if (state.onConfirm) try { state.onConfirm(id); } catch (e) {}
    }
    close();
  }

  // ============ FORM HELPERS ============
  function resetForm() {
    const o = document.getElementById('recOverlay');
    o.querySelector('#recForm').reset();
    showFieldsForType(state.type);
    updateTypePill();
    updateFlagPreview();
  }

  function populateForm(rec) {
    const o = document.getElementById('recOverlay');
    showFieldsForType(rec.type);
    o.querySelector('#recName').value     = rec.name || '';
    o.querySelector('#recCountry').value  = rec.country || '';
    if (rec.type === 'bank') {
      o.querySelector('#recBankName').value      = rec.bankName || '';
      o.querySelector('#recAccountNumber').value = rec.accountNumber || '';
    } else if (rec.type === 'mobile') {
      o.querySelector('#recWalletProvider').value = rec.walletProvider || '';
      o.querySelector('#recPhone').value          = rec.phone || '';
    } else if (rec.type === 'cash') {
      o.querySelector('#recPickupProvider').value = rec.pickupProvider || '';
      o.querySelector('#recCity').value           = rec.city || '';
    }
    updateTypePill();
    updateFlagPreview();
  }

  function showFieldsForType(type) {
    const o = document.getElementById('recOverlay');
    o.querySelectorAll('[data-type-field]').forEach(el => {
      el.hidden = el.getAttribute('data-type-field') !== type;
    });
  }

  function updateTypePill() {
    const o = document.getElementById('recOverlay');
    const pill = o.querySelector('#recTypePill');
    if (pill && state.type) pill.textContent = t('recipients.type.' + state.type);
  }

  function updateFlagPreview() {
    const o = document.getElementById('recOverlay');
    const flag = o.querySelector('#recFlagPreview');
    const country = o.querySelector('#recCountry').value;
    const meta = window.recipientsStore?.COUNTRY_META?.[country];
    if (flag) {
      flag.textContent = meta ? meta.flag : '🌐';
      flag.style.opacity = meta ? '1' : '0.4';
    }
  }

  function readForm() {
    const o = document.getElementById('recOverlay');
    const data = {
      type: state.type,
      name: o.querySelector('#recName').value.trim(),
      country: o.querySelector('#recCountry').value,
    };
    if (state.type === 'bank') {
      data.bankName      = o.querySelector('#recBankName').value.trim();
      data.accountNumber = o.querySelector('#recAccountNumber').value.trim();
    } else if (state.type === 'mobile') {
      data.walletProvider = o.querySelector('#recWalletProvider').value.trim();
      data.phone          = o.querySelector('#recPhone').value.trim();
    } else if (state.type === 'cash') {
      data.pickupProvider = o.querySelector('#recPickupProvider').value.trim();
      data.city           = o.querySelector('#recCity').value.trim();
    }
    return data;
  }

  function onFormSubmit(e) {
    e.preventDefault();
    const data = readForm();
    if (!data.name || !data.country) return;

    let saved;
    if (state.mode === 'edit' && state.editingId) {
      saved = window.recipientsStore.update(state.editingId, data);
    } else {
      saved = window.recipientsStore.add(data);
    }
    if (state.onSave) try { state.onSave(saved); } catch (e) {}
    close();
  }

  // ============ MARKUP + STYLES ============
  const HTML = `
    <div class="overlay rec-overlay" id="recOverlay" role="dialog" aria-modal="true">
      <div class="rec-card">

        <header class="rec-head">
          <h3 id="recTitle" data-i18n="recipients.modal.addTitle">Add new recipient</h3>
          <button class="rec-close" data-rec-close type="button" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <!-- PANEL: TYPE CHOOSER -->
        <div class="rec-panel" data-panel="chooser">
          <p class="rec-sub" data-i18n="recipients.modal.chooseType">How will they receive money?</p>
          <div class="rec-type-list">
            <button type="button" class="rec-type-card" data-type="bank">
              <div class="rec-type-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M2 7l10-5 10 5"/></svg>
              </div>
              <div class="rec-type-text">
                <div class="rec-type-name" data-i18n="recipients.modal.typeBank">Bank account</div>
                <div class="rec-type-sub" data-i18n="recipients.modal.typeBankSub">Direct deposit to a bank account</div>
              </div>
              <svg class="rec-type-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button type="button" class="rec-type-card" data-type="mobile">
              <div class="rec-type-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              </div>
              <div class="rec-type-text">
                <div class="rec-type-name" data-i18n="recipients.modal.typeMobile">Mobile wallet</div>
                <div class="rec-type-sub" data-i18n="recipients.modal.typeMobileSub">GCash, bKash, M-Pesa and more</div>
              </div>
              <svg class="rec-type-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button type="button" class="rec-type-card" data-type="cash">
              <div class="rec-type-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
              </div>
              <div class="rec-type-text">
                <div class="rec-type-name" data-i18n="recipients.modal.typeCash">Cash pickup</div>
                <div class="rec-type-sub" data-i18n="recipients.modal.typeCashSub">MoneyGram, Western Union, Ria</div>
              </div>
              <svg class="rec-type-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <!-- PANEL: FORM -->
        <div class="rec-panel" data-panel="form">
          <div class="rec-form-meta">
            <button class="rec-back" id="recBackBtn" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              <span data-i18n="recipients.modal.changeType">Change type</span>
            </button>
            <span class="rec-type-pill" id="recTypePill">Bank</span>
          </div>

          <form id="recForm" class="rec-form" novalidate>
            <div class="rec-row">
              <label class="rec-label" data-i18n="recipients.modal.name">Recipient name</label>
              <input id="recName" type="text" class="rec-input" required maxlength="60" data-i18n-placeholder="recipients.modal.namePlaceholder" placeholder="Full name">
            </div>

            <div class="rec-row">
              <label class="rec-label" data-i18n="recipients.modal.country">Country</label>
              <div class="rec-input-with-prefix">
                <span class="rec-flag" id="recFlagPreview">🌐</span>
                <select id="recCountry" class="rec-input" required>
                  <option value="">Choose country</option>
                </select>
              </div>
            </div>

            <div class="rec-row" data-type-field="bank" hidden>
              <label class="rec-label" data-i18n="recipients.modal.bankName">Bank name</label>
              <input id="recBankName" type="text" class="rec-input" maxlength="60" data-i18n-placeholder="recipients.modal.bankNamePlaceholder" placeholder="e.g. HDFC Bank">
            </div>
            <div class="rec-row" data-type-field="bank" hidden>
              <label class="rec-label" data-i18n="recipients.modal.accountNumber">Account number / IBAN</label>
              <input id="recAccountNumber" type="text" class="rec-input" maxlength="34" data-i18n-placeholder="recipients.modal.accountNumberPlaceholder" placeholder="Account or IBAN">
            </div>

            <div class="rec-row" data-type-field="mobile" hidden>
              <label class="rec-label" data-i18n="recipients.modal.walletProvider">Wallet provider</label>
              <input id="recWalletProvider" type="text" class="rec-input" maxlength="40" data-i18n-placeholder="recipients.modal.walletProviderPlaceholder" placeholder="e.g. GCash, bKash">
            </div>
            <div class="rec-row" data-type-field="mobile" hidden>
              <label class="rec-label" data-i18n="recipients.modal.phone">Phone number</label>
              <input id="recPhone" type="tel" class="rec-input" maxlength="20" data-i18n-placeholder="recipients.modal.phonePlaceholder" placeholder="01XXXXXXXXX">
            </div>

            <div class="rec-row" data-type-field="cash" hidden>
              <label class="rec-label" data-i18n="recipients.modal.pickupProvider">Pickup provider</label>
              <input id="recPickupProvider" type="text" class="rec-input" maxlength="40" data-i18n-placeholder="recipients.modal.pickupProviderPlaceholder" placeholder="e.g. MoneyGram">
            </div>
            <div class="rec-row" data-type-field="cash" hidden>
              <label class="rec-label" data-i18n="recipients.modal.city">City</label>
              <input id="recCity" type="text" class="rec-input" maxlength="40" data-i18n-placeholder="recipients.modal.cityPlaceholder" placeholder="e.g. Lagos">
            </div>

            <div class="rec-actions">
              <button type="button" class="rec-btn-secondary" data-rec-close data-i18n="recipients.modal.cancel">Cancel</button>
              <button type="submit" id="recSaveBtn" class="rec-btn-primary" data-i18n="recipients.modal.save">Save</button>
            </div>
          </form>
        </div>

        <!-- PANEL: DELETE CONFIRM -->
        <div class="rec-panel" data-panel="delete">
          <div class="rec-del-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </div>
          <h4 class="rec-del-title" data-i18n="recipients.modal.deleteTitle">Delete recipient</h4>
          <p class="rec-del-message" id="delMessage">Are you sure?</p>
          <div class="rec-del-card">
            <div class="sum-av av-1" id="delAv">?</div>
            <div>
              <div class="sum-name" id="delName">—</div>
              <div class="sum-dest" id="delDest"></div>
            </div>
          </div>
          <div class="rec-actions">
            <button type="button" class="rec-btn-secondary" data-rec-close data-i18n="recipients.modal.cancel">Cancel</button>
            <button type="button" class="rec-btn-danger" id="delConfirmBtn" data-i18n="recipients.modal.deleteAction">Delete</button>
          </div>
        </div>

      </div>
    </div>
  `;

  const CSS = `
    .rec-overlay {
      position: fixed; inset: 0;
      background: rgba(10, 37, 64, 0.55);
      -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
      display: none; align-items: center; justify-content: center;
      padding: 20px; z-index: 200;
      animation: recFadeIn 0.18s cubic-bezier(0.2, 0, 0, 1);
    }
    .rec-overlay.show { display: flex; }
    @keyframes recFadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes recPop    { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }
    .rec-overlay .rec-card {
      background: #fff; border-radius: 16px;
      width: 100%; max-width: 480px;
      max-height: 92vh; overflow-y: auto;
      box-shadow: 0 30px 80px rgba(0,0,0,0.25);
      animation: recPop 0.22s cubic-bezier(0.2, 0, 0, 1);
      font-family: 'Poppins', system-ui, sans-serif;
      color: #0A2540;
    }
    html[lang="bn"] .rec-overlay .rec-card { font-family: 'Noto Sans Bengali', 'Poppins', system-ui, sans-serif; }

    .rec-head {
      padding: 18px 22px;
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 1px solid #E5EDF5;
      position: sticky; top: 0; background: #fff; z-index: 1;
    }
    .rec-head h3 { font-family: 'Poppins'; font-size: 17px; font-weight: 700; }
    .rec-close {
      width: 36px; height: 36px; border-radius: 8px;
      background: transparent; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #6B8299;
      transition: background 160ms ease, color 160ms ease;
    }
    .rec-close:hover { background: #F4F8FC; color: #0A2540; }

    .rec-panel { padding: 22px; }

    /* TYPE CHOOSER */
    .rec-sub { font-size: 14px; color: #6B8299; margin-bottom: 16px; }
    .rec-type-list { display: flex; flex-direction: column; gap: 10px; }
    .rec-type-card {
      display: flex; align-items: center; gap: 14px;
      padding: 16px; border-radius: 12px;
      background: #fff; border: 1px solid #E5EDF5;
      cursor: pointer; text-align: left;
      transition: all 160ms cubic-bezier(0.2, 0, 0, 1);
    }
    .rec-type-card:hover {
      border-color: #00A86B;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(10, 37, 64, 0.08);
    }
    .rec-type-icon {
      width: 44px; height: 44px; border-radius: 10px;
      background: rgba(0, 168, 107, 0.08); color: #00A86B;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .rec-type-text { flex: 1; min-width: 0; }
    .rec-type-name { font-size: 14px; font-weight: 700; }
    .rec-type-sub  { font-size: 12px; color: #6B8299; margin-top: 2px; }
    .rec-type-arrow { color: #9AAEC1; flex-shrink: 0; }

    /* FORM */
    .rec-form-meta {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; gap: 12px;
    }
    .rec-back {
      background: transparent; border: none; cursor: pointer;
      color: #6B8299; font-size: 13px; font-weight: 600;
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 8px; border-radius: 6px;
      transition: color 160ms ease, background 160ms ease;
    }
    .rec-back:hover { background: #F4F8FC; color: #00A86B; }
    .rec-type-pill {
      padding: 4px 12px; border-radius: 999px;
      background: rgba(0, 168, 107, 0.08); color: #00A86B;
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
    }
    .rec-form { display: flex; flex-direction: column; gap: 14px; }
    .rec-row { display: flex; flex-direction: column; gap: 6px; }
    .rec-label {
      font-size: 12px; font-weight: 600; color: #6B8299;
    }
    .rec-input {
      width: 100%; padding: 12px 14px;
      background: #F4F8FC;
      border: 1px solid #E5EDF5;
      border-radius: 10px;
      font-size: 14px; font-weight: 500; color: #0A2540;
      outline: none; font-family: inherit;
      transition: border-color 160ms ease, background 160ms ease;
    }
    .rec-input:focus { border-color: #00A86B; background: #fff; }
    select.rec-input { cursor: pointer; appearance: none; -webkit-appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B8299' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
      background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px;
    }
    .rec-input-with-prefix {
      display: flex; align-items: stretch;
      background: #F4F8FC; border: 1px solid #E5EDF5; border-radius: 10px;
      transition: border-color 160ms ease, background 160ms ease;
    }
    .rec-input-with-prefix:focus-within { border-color: #00A86B; background: #fff; }
    .rec-input-with-prefix .rec-input { background: transparent; border: none; }
    .rec-flag {
      display: inline-flex; align-items: center; justify-content: center;
      width: 44px; font-weight: 700; font-size: 11px; color: #0A2540;
      border-right: 1px solid #E5EDF5;
      letter-spacing: 0.4px;
    }
    .rec-actions {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      margin-top: 8px;
    }
    .rec-btn-secondary, .rec-btn-primary, .rec-btn-danger {
      height: 46px; border-radius: 10px; border: none;
      font-size: 14px; font-weight: 700; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
      font-family: inherit;
    }
    .rec-btn-secondary {
      background: #fff; color: #0A2540;
      border: 1px solid #E5EDF5;
    }
    .rec-btn-secondary:hover { background: #F4F8FC; }
    .rec-btn-primary { background: #00A86B; color: #fff; }
    .rec-btn-primary:hover { background: #008454; }
    .rec-btn-danger { background: #D7263D; color: #fff; }
    .rec-btn-danger:hover { background: #b51e32; }

    /* DELETE CONFIRM */
    .rec-del-icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: #FCE8EB; color: #D7263D;
      display: flex; align-items: center; justify-content: center;
      margin: 4px auto 16px;
    }
    .rec-del-title {
      font-family: 'Poppins'; font-size: 18px; font-weight: 700;
      text-align: center; margin-bottom: 6px;
    }
    .rec-del-message {
      font-size: 14px; color: #6B8299;
      text-align: center; margin-bottom: 18px;
    }
    .rec-del-card {
      display: flex; align-items: center; gap: 12px;
      background: #F4F8FC; border-radius: 10px;
      padding: 12px 14px; margin-bottom: 18px;
    }
    .rec-del-card .sum-av {
      width: 40px; height: 40px; border-radius: 50%;
      color: #fff; font-weight: 700; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .rec-del-card .sum-name { font-size: 14px; font-weight: 700; }
    .rec-del-card .sum-dest { font-size: 12px; color: #6B8299; }
    .av-1 { background: linear-gradient(135deg, #F472B6, #DB2777); }
    .av-2 { background: linear-gradient(135deg, #60A5FA, #2563EB); }
    .av-3 { background: linear-gradient(135deg, #34D399, #059669); }
    .av-4 { background: linear-gradient(135deg, #FBBF24, #D97706); }
    .av-5 { background: linear-gradient(135deg, #A78BFA, #7C3AED); }
    .av-6 { background: linear-gradient(135deg, #FB7185, #E11D48); }
  `;

  // ============ EXPORTS ============
  window.openAddRecipientModal    = openAdd;
  window.openEditRecipientModal   = openEdit;
  window.openDeleteRecipientModal = openDelete;
})();
