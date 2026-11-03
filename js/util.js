/* Tempi Friber — funzioni di servizio (formati italiani, date, testo). Nessun accesso al DOM. */
(function (FT) {
  'use strict';
  const U = {};
  const GIORNO_MS = 86400000;

  U.pad2 = n => String(n).padStart(2, '0');

  /* ---------- date e ore (sempre ora locale del tablet) ---------- */
  U.giorno = (ms = Date.now()) => { const d = new Date(ms); return `${d.getFullYear()}-${U.pad2(d.getMonth() + 1)}-${U.pad2(d.getDate())}`; };
  U.inizioGiorno = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  U.mezzanotteDopo = ms => { const d = new Date(ms); d.setHours(24, 0, 0, 0); return d.getTime(); };
  U.daGiorno = iso => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  U.aggiungiGiorni = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate() + n); return d.getTime(); };
  U.fmtGiorno = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—';
  U.fmtGiornoBreve = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—';
  U.fmtOra = ms => { const d = new Date(ms); return `${U.pad2(d.getHours())}:${U.pad2(d.getMinutes())}`; };
  U.fmtDataOra = ms => { if (!ms) return '—'; const d = new Date(ms); return `${U.pad2(d.getDate())}/${U.pad2(d.getMonth() + 1)} ${U.fmtOra(ms)}`; };
  U.fmtDataOraLunga = ms => { if (!ms) return '—'; const d = new Date(ms); return `${U.pad2(d.getDate())}/${U.pad2(d.getMonth() + 1)}/${d.getFullYear()} ${U.fmtOra(ms)}`; };
  const GG = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  U.nomeGiorno = iso => GG[new Date(U.daGiorno(iso)).getDay()];
  U.fmtTimer = ms => {
    ms = Math.max(0, ms || 0); const s = Math.floor(ms / 1000);
    return `${U.pad2(Math.floor(s / 3600))}:${U.pad2(Math.floor(s % 3600 / 60))}:${U.pad2(s % 60)}`;
  };
  U.fmtDurata = ms => {
    const m = Math.round(Math.max(0, ms || 0) / 60000);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${U.pad2(m % 60)}`;
  };
  U.fmtOre = ms => U.fmtNum((ms || 0) / 3600000, 1) + ' h';
  U.perInput = ms => { const d = new Date(ms); return `${U.giorno(ms)}T${U.pad2(d.getHours())}:${U.pad2(d.getMinutes())}`; };
  U.daInput = s => { if (!s) return null; const t = new Date(s).getTime(); return isNaN(t) ? null : t; };
  // Divide l'intervallo [s, e) nei giorni di calendario che attraversa.
  U.spezzaGiorni = (s, e) => {
    const out = []; let a = s;
    while (a < e) { const b = Math.min(e, U.mezzanotteDopo(a)); out.push({ g: U.giorno(a), ms: b - a }); a = b; }
    return out;
  };
  U.sovrapposto = (s, e, t0, t1) => Math.max(0, Math.min(e, t1) - Math.max(s, t0));

  /* ---------- numeri (formato italiano) ---------- */
  const gruppi = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  U.fmtInt = n => {
    if (n == null || !isFinite(n)) return '—';
    n = Math.round(n); return (n < 0 ? '−' : '') + gruppi(String(Math.abs(n)));
  };
  U.fmtNum = (n, dec = 2) => {
    if (n == null || !isFinite(n)) return '—';
    const neg = n < 0 && Math.abs(n) >= 0.5 * Math.pow(10, -dec);
    const [i, d] = Math.abs(n).toFixed(dec).split('.');
    return (neg ? '−' : '') + gruppi(i) + (d ? ',' + d : '');
  };
  U.pz = (n, sing, plur) => `${U.fmtInt(n)} ${Math.round(n) === 1 ? sing : plur}`;
  U.fmtPct = (x, dec = 1) => (x == null || !isFinite(x)) ? '—' : U.fmtNum(x * 100, dec) + '%';
  U.numIt = x => {
    if (x == null || x === '') return 0;
    if (typeof x === 'number') return isFinite(x) ? x : 0;
    let s = String(x).trim().replace(/\s/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s); return isNaN(n) ? 0 : n;
  };
  U.mediana = arr => {
    const a = arr.filter(x => isFinite(x)).sort((x, y) => x - y); if (!a.length) return null;
    const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };

  /* ---------- date da Excel/testo ---------- */
  U.dataIso = x => {
    if (x == null || x === '') return '';
    if (x instanceof Date && !isNaN(x)) return U.giorno(x.getTime());
    if (typeof x === 'number' && x > 20000 && x < 80000) {
      const d = new Date(Math.round((x - 25569) * GIORNO_MS));
      return `${d.getUTCFullYear()}-${U.pad2(d.getUTCMonth() + 1)}-${U.pad2(d.getUTCDate())}`;
    }
    const s = String(x).trim();
    let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${U.pad2(m[2])}-${U.pad2(m[1])}`; }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[0] : '';
  };

  /* ---------- testo ---------- */
  U.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.normTesto = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  U.clona = o => (typeof structuredClone === 'function') ? structuredClone(o) : JSON.parse(JSON.stringify(o));
  // Hash non crittografico (cyrb53): serve solo a non salvare il PIN in chiaro.
  U.hash = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  };
  U.cifreCasuali = n => {
    const a = new Uint8Array(n); (self.crypto || {}).getRandomValues ? self.crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256);
    return Array.from(a, x => x % 10).join('');
  };

  FT.u = U;
})(self.FT = self.FT || {});
