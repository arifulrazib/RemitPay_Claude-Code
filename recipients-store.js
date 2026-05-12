/* Shared recipients store: localStorage-backed CRUD.
 * Exposes window.recipientsStore = { list, get, add, update, remove, onChange, COUNTRY_META, COUNTRIES }.
 * Cross-tab sync via the storage event.
 */
(function () {
  const KEY = 'remitpay.recipients';

  // Default country metadata (currency, symbol, flag, indicative rate)
  const COUNTRY_META = {
    india:       { flag: 'IN', curr: 'INR', symbol: '₹', rate: 83.42  },
    philippines: { flag: 'PH', curr: 'PHP', symbol: '₱', rate: 56.84  },
    mexico:      { flag: 'MX', curr: 'MXN', symbol: '$', rate: 17.20  },
    nigeria:     { flag: 'NG', curr: 'NGN', symbol: '₦', rate: 687.50 },
    bangladesh:  { flag: 'BD', curr: 'BDT', symbol: '৳', rate: 109.45 },
    colombia:    { flag: 'CO', curr: 'COP', symbol: '$', rate: 4112.30 },
  };
  const COUNTRIES = Object.keys(COUNTRY_META);

  const SEED = [
    { id: 'mom',   name: 'Mom',           relation: 'mother',  type: 'mobile', country: 'philippines', walletProvider: 'GCash',       phone: '0917 ••• 4221', av: 'M',  cls: 'av-1', freq: true,  last: '₱14k' },
    { id: 'jose',  name: 'Jose Ramirez',  relation: 'brother', type: 'bank',   country: 'mexico',      bankName: 'Banco',             accountNumber: '••• 9912', av: 'JR', cls: 'av-2', freq: true,  last: '$4.1k' },
    { id: 'ana',   name: 'Ana Krishnan',  relation: 'sister',  type: 'bank',   country: 'india',       bankName: 'HDFC Bank',         accountNumber: '••• 4453', av: 'AN', cls: 'av-3', freq: true,  last: '₹15k',
      accounts: [
        { type: 'bank', bankName: 'HDFC Bank',  accountNumber: '••• 4453' },
        { type: 'bank', bankName: 'ICICI Bank', accountNumber: '••• 9821' }
      ] },
    { id: 'elena', name: 'Elena Okafor',  relation: 'cousin',  type: 'cash',   country: 'nigeria',     pickupProvider: 'MoneyGram',   city: 'Lagos',             av: 'EL', cls: 'av-4', freq: true,  last: '₦82k' },
    { id: 'sami',  name: 'Sami Khan',     relation: 'father',  type: 'mobile', country: 'bangladesh',  walletProvider: 'bKash',       phone: '017 ••• 8821',     av: 'SK', cls: 'av-5' },
    { id: 'diana', name: 'Diana Reyes',   relation: 'friend',  type: 'bank',   country: 'colombia',    bankName: 'Bancolombia',       accountNumber: '••• 0102', av: 'DR', cls: 'av-6' },
  ];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.warn('[recipients]', e); }
    return SEED.map(r => decorate({ ...r }));
  }

  function save(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) { console.warn(e); }
  }

  let cache = load();
  const listeners = new Set();

  function emit() {
    save(cache);
    listeners.forEach(fn => { try { fn([...cache]); } catch (e) { console.error(e); } });
    document.dispatchEvent(new CustomEvent('recipientschange', { detail: { list: [...cache] } }));
  }

  function decorate(rec) {
    const meta = COUNTRY_META[rec.country];
    if (meta) {
      rec.flag = rec.flag || meta.flag;
      rec.curr = meta.curr;
      rec.symbol = meta.symbol;
      rec.rate = rec.rate || meta.rate;
    }
    rec.method = methodLabelFor(rec);
    rec.dest = destLabelFor(rec);
    if (!rec.av) rec.av = initialsFromName(rec.name);
    if (!rec.cls) rec.cls = pickAvCls();
    return rec;
  }

  function methodLabelFor(rec) {
    if (rec.type === 'bank')   return 'Bank';
    if (rec.type === 'mobile') return rec.walletProvider || 'Wallet';
    if (rec.type === 'cash')   return 'Cash pickup';
    return '';
  }

  function destLabelFor(rec) {
    if (rec.type === 'bank')   return [rec.bankName,       rec.accountNumber].filter(Boolean).join(' · ');
    if (rec.type === 'mobile') return [rec.walletProvider, rec.phone].filter(Boolean).join(' · ');
    if (rec.type === 'cash')   return [rec.pickupProvider, rec.city].filter(Boolean).join(' · ');
    return '';
  }

  function initialsFromName(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function pickAvCls() {
    const used = new Set(cache.map(r => r.cls));
    for (let i = 1; i <= 6; i++) if (!used.has('av-' + i)) return 'av-' + i;
    return 'av-' + (((cache.length) % 6) + 1);
  }

  function genId(name) {
    const slug = (name || 'rec').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'rec';
    let id = slug, n = 2;
    while (cache.some(r => r.id === id)) id = slug + '-' + (n++);
    return id;
  }

  function list() { return [...cache]; }
  function get(id) { return cache.find(r => r.id === id) || null; }

  function add(input) {
    const rec = decorate({ ...input, id: input.id || genId(input.name) });
    cache.push(rec);
    emit();
    return rec;
  }

  function update(id, patch) {
    const i = cache.findIndex(r => r.id === id);
    if (i < 0) return null;
    const next = decorate({ ...cache[i], ...patch });
    // Recompute initials if the name changed and av wasn't explicitly set
    if (patch.name !== undefined && patch.av === undefined) next.av = initialsFromName(next.name);
    cache[i] = next;
    emit();
    return next;
  }

  function remove(id) {
    const before = cache.length;
    cache = cache.filter(r => r.id !== id);
    if (cache.length === before) return false;
    emit();
    return true;
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // Cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = load();
      listeners.forEach(fn => { try { fn([...cache]); } catch (err) {} });
      document.dispatchEvent(new CustomEvent('recipientschange', { detail: { list: [...cache] } }));
    }
  });

  window.recipientsStore = { list, get, add, update, remove, onChange, COUNTRY_META, COUNTRIES };
})();
