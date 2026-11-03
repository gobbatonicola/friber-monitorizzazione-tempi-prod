/* Tempi Friber — modello dati e regole di calcolo.
   Nessun accesso al DOM: la logica è verificabile con test automatici.

   Flusso dei pezzi di un ODP:
     colati → Taglio → Sbavatura (nastro | manuale | nastro poi manuale | Trebi) → Sabbiatura → finiti
   Ogni lavorazione di nastro dichiara la destinazione dei pezzi (manuale o sabbiatura).
   Tutti i pezzi colati importati partono dal taglio e scendono a cascata nelle fasi successive. */
(function (FT) {
  'use strict';
  const U = FT.u, C = FT.cfg;
  const M = {};
  const D = { odp: new Map(), lav: new Map(), art: new Map(), settings: null, meta: null };
  const IX = { perOdp: new Map(), aperte: new Set() };
  const NOP = () => {};
  let P = { lav: NOP, odp: NOP, art: NOP, delLav: NOP, delOdp: NOP, delArt: NOP, settings: NOP, meta: NOP };
  let ultimoTs = 0;

  M.dati = D;
  M.persistenza = p => { P = Object.assign({}, P, p); };
  M.ordineFase = id => C.FASI.findIndex(f => f.id === id);
  const AUTO = s => s.tipo === 'auto' || s.tipo === 'turno';
  M.haAuto = l => l.seg.some(AUTO);

  /* ======================= caricamento ======================= */
  M.impostazioniIniziali = () => {
    const sale = U.cifreCasuali(8);
    return Object.assign(U.clona(C.IMPOSTAZIONI), { pinSale: sale, pinHash: U.hash(sale + C.PIN_PREDEFINITO), pinPredefinito: true, recHash: null, dataAvvio: '' });
  };
  M.metaIniziale = () => ({ lastBackup: '', lastImport: 0, lastExport: 0, importLog: [], installato: Date.now() });

  function normOdp(o) {
    return Object.assign({ ordLav: '', codProd: '', codMod: '', descr: '', cliente: '', codCli: '', ordCli: '', linea: 'N/D', lega: '', consegna: '', stato: '',
      qta: 0, qProdErp: 0, qComplTot: 0, qPianTot: 0, qResErp: 0, colate: [], fonti: [], creato: 0, aggiornato: 0, archiviato: false, nota: '' }, o, { num: String(o.num) });
  }
  function normLav(l) {
    const n = Object.assign({ chiuso: null, cnt: [], buoni: 0, scarti: 0, dest: null, note: '', ver: false, mod: [], man: false }, l);
    n.odp = String(n.odp); n.seg = (n.seg || []).map(s => ({ s: s.s, e: s.e == null ? null : s.e, tipo: s.tipo || null, nota: s.nota || '' }));
    return n;
  }
  function indicizza(l) {
    let a = IX.perOdp.get(l.odp); if (!a) IX.perOdp.set(l.odp, a = []);
    if (!a.includes(l)) a.push(l);
    statoIdx(l);
  }
  function deindicizza(l) {
    const a = IX.perOdp.get(l.odp);
    if (a) { const i = a.findIndex(x => x.id === l.id); if (i >= 0) a.splice(i, 1); }
    IX.aperte.delete(l.id);
  }
  function statoIdx(l) { if (l.stato === 'chiusa') IX.aperte.delete(l.id); else IX.aperte.add(l.id); }
  function salva(l) { statoIdx(l); P.lav(l); }
  function segnaTs(t) { if (t > ultimoTs) ultimoTs = t; }

  M.carica = ({ odp = [], lav = [], art = [], settings = null, meta = null } = {}) => {
    D.odp.clear(); D.lav.clear(); D.art.clear(); IX.perOdp.clear(); IX.aperte.clear(); ultimoTs = 0;
    for (const o of odp) { const n = normOdp(o); D.odp.set(n.num, n); segnaTs(n.aggiornato || 0); }
    for (const l of lav) {
      const n = normLav(l); D.lav.set(n.id, n); indicizza(n);
      for (const s of n.seg) { segnaTs(s.s); if (s.e) segnaTs(s.e); }
      for (const c of n.cnt) segnaTs(c.t);
    }
    for (const a of art) D.art.set(a.cod, a);
    D.settings = settings ? Object.assign(U.clona(C.IMPOSTAZIONI), { dataAvvio: '' }, settings) : M.impostazioniIniziali();
    D.settings.dataAvvio = ''; // regola dismessa: tutti i pezzi colati partono dal taglio
    if (!D.settings.pinHash) { const ini = M.impostazioniIniziali(); D.settings.pinSale = ini.pinSale; D.settings.pinHash = ini.pinHash; D.settings.pinPredefinito = true; }
    D.meta = Object.assign(M.metaIniziale(), meta || {});
  };
  M.ultimoTimestamp = () => ultimoTs;
  M.esporta = () => ({ odp: [...D.odp.values()], lav: [...D.lav.values()], art: [...D.art.values()], settings: D.settings, meta: D.meta });

  /* ======================= accesso ======================= */
  M.lav = id => D.lav.get(id);
  M.odp = num => D.odp.get(String(num));
  M.lavDiOdp = num => IX.perOdp.get(String(num)) || [];
  M.aperte = mid => {
    const out = [];
    for (const id of IX.aperte) { const l = D.lav.get(id); if (l && (!mid || l.mac === mid)) out.push(l); }
    return out.sort((a, b) => M.inizio(a) - M.inizio(b));
  };
  M.codArt = o => (o && (o.codProd || o.codMod)) || '';
  M.percorso = num => { const a = D.art.get(M.codArt(M.odp(num))); return a ? a.perc || '' : ''; };
  // Fasi di sbavatura con destinazione: nastro e manuale sono intercambiabili (uno dopo l'altro, o uno solo).
  M.conDest = fase => fase === 'NAS' || fase === 'MAN';
  M.destPercorso = (num, fase) => {
    const p = M.percorso(num);
    if (fase === 'NAS') return p === 'NASMAN' ? 'MAN' : (p === 'NAS' || p === 'MANNAS') ? 'SAB' : null;
    if (fase === 'MAN') return p === 'MANNAS' ? 'NAS' : (p === 'MAN' || p === 'NASMAN') ? 'SAB' : null;
    return null;
  };
  // Proposta per l'operatore: dal percorso dell'articolo, oppure sabbiatura se i pezzi arrivano già dall'altra sbavatura.
  M.destPredefinita = (num, fase = 'NAS') => {
    const d = M.destPercorso(num, fase); if (d) return d;
    const a = M.avanzamento(num);
    if (fase === 'NAS' && a.attesaNas > 0) return 'SAB';
    if (fase === 'MAN' && a.attesaMan > 0) return 'SAB';
    return null;
  };

  /* ======================= tempi ======================= */
  M.netto = (l, ora = Date.now()) => { let t = 0; for (const s of l.seg) t += (s.e == null ? ora : s.e) - s.s; return Math.max(0, t); };
  M.inizio = l => l.seg.length ? l.seg[0].s : l.creato;
  M.ultimaFine = l => { for (let i = l.seg.length - 1; i >= 0; i--) if (l.seg[i].e != null) return l.seg[i].e; return null; };
  M.segAperto = l => { const s = l.seg[l.seg.length - 1]; return s && s.e == null ? s : null; };
  M.inPausaDa = l => (l.stato === 'pausa' && l.seg.length) ? l.seg[l.seg.length - 1].e : null;
  M.ultimoSeg = l => l.seg[l.seg.length - 1] || null;
  M.maxOre = fase => { const S = D.settings; const v = S.maxOreFase && +S.maxOreFase[fase]; return v > 0 ? v : (+S.maxOre || 8); };
  // Pezzi attribuiti a ciascuna sessione: un conteggio appartiene all'ultima sessione iniziata prima di esso.
  M.pezziSessioni = l => {
    const out = l.seg.map(() => ({ b: 0, s: 0 }));
    for (const c of l.cnt) {
      let i = 0; for (let k = 0; k < l.seg.length; k++) if (l.seg[k].s <= c.t) i = k;
      if (out[i]) { out[i].b += c.b; out[i].s += c.s; }
    }
    return out;
  };
  M.pause = (l, ora = Date.now()) => {
    const out = [];
    l.seg.forEach((sg, i) => {
      if (sg.e == null) return;
      const succ = l.seg[i + 1];
      if (succ) out.push({ da: sg.e, a: succ.s, tipo: sg.tipo, nota: sg.nota, inCorso: false });
      else if (l.stato === 'pausa') out.push({ da: sg.e, a: ora, tipo: sg.tipo, nota: sg.nota, inCorso: true });
    });
    return out;
  };
  M.causa = (tipo, nota) => {
    if (tipo === 'auto') return 'Chiusura automatica';
    if (tipo === 'turno') return 'Fine turno (automatica)';
    const n = U.normTesto(nota); if (!n) return 'Senza causa';
    if (n === 'cambio odp') return 'Cambio ODP';
    for (const c of D.settings.causePausa || []) if (n.startsWith(U.normTesto(c))) return c;
    return 'Altro';
  };

  /* ======================= operazioni dell'operatore ======================= */
  function pausaInterna(l, nota, ora) {
    const sg = M.segAperto(l); if (!sg) return;
    sg.e = Math.max(sg.s, ora); sg.tipo = 'pausa'; sg.nota = nota || ''; l.stato = 'pausa'; salva(l);
  }
  M.avvia = (num, mid, opz = {}) => {
    const m = C.macchina(mid); if (!m) throw new Error('Macchina sconosciuta: ' + mid);
    const ora = opz.ora || Date.now();
    if (M.faseCompleta(num, m.fase)) throw new Error('ODP completato in questa fase: tutti i pezzi colati sono già stati lavorati');
    segnaTs(ora);
    if (!m.multi) for (const x of M.aperte(mid)) if (x.stato === 'attiva') pausaInterna(x, 'Cambio ODP', ora);
    const l = {
      id: U.uid(), odp: String(num), mac: mid, fase: m.fase, stato: 'attiva', creato: ora, chiuso: null,
      seg: [{ s: ora, e: null, tipo: null, nota: '' }], cnt: [], buoni: 0, scarti: 0,
      dest: M.conDest(m.fase) ? (opz.dest || null) : null, note: '', ver: false, mod: [], man: false,
    };
    D.lav.set(l.id, l); indicizza(l); salva(l); impara(l);
    return l;
  };
  M.pausa = (l, nota, ora = Date.now()) => { segnaTs(ora); pausaInterna(l, nota, ora); };
  M.riprendi = (l, ora = Date.now()) => {
    if (l.stato === 'attiva') return true;
    if (l.stato === 'chiusa' && M.faseCompleta(l.odp, l.fase)) return false;
    segnaTs(ora);
    const m = C.macchina(l.mac);
    if (!m.multi) for (const x of M.aperte(l.mac)) if (x.stato === 'attiva' && x.id !== l.id) pausaInterna(x, 'Cambio ODP', ora);
    if (l.stato === 'chiusa') { l.chiuso = null; l.mod.push({ t: ora, cosa: 'Riaperta dall\'operatore' }); }
    l.seg.push({ s: ora, e: null, tipo: null, nota: '' }); l.stato = 'attiva'; salva(l);
    return true;
  };
  // Variazione dei pezzi: i tocchi ravvicinati dell'operatore vengono uniti in un'unica registrazione.
  // Restituisce false se la variazione supera i pezzi disponibili (limite a cascata).
  M.conta = (l, db, ds, src = 'op', t = Date.now(), causa = null) => {
    db = Math.max(Math.round(db) || 0, -l.buoni); ds = Math.max(Math.round(ds) || 0, -l.scarti);
    if (!db && !ds) return true;
    if (src !== 'mig' && !M.limiteOk(l.odp, { lav: l, b: l.buoni + db, s: l.scarti + ds })) return false;
    segnaTs(t);
    if (ds < 0 && !causa) causa = causaDaTogliere(l);
    if (ds > 0 && !causa) causa = 'Non indicata';
    const u = l.cnt[l.cnt.length - 1];
    if (!ds && u && !u.s && src === 'op' && u.src === 'op' && t >= u.t && t - u.t < 15000) { u.b += db; u.t = t; if (!u.b) l.cnt.pop(); }
    else { const ev = { t, b: db, s: ds, src }; if (ds) ev.causa = causa; l.cnt.push(ev); }
    l.buoni += db; l.scarti += ds; salva(l);
    return true;
  };
  function causaDaTogliere(l) {
    const saldo = new Map(); for (const c of l.cnt) if (c.s) saldo.set(c.causa || 'Non indicata', (saldo.get(c.causa || 'Non indicata') || 0) + c.s);
    for (let i = l.cnt.length - 1; i >= 0; i--) { const k = l.cnt[i].causa || 'Non indicata'; if (l.cnt[i].s > 0 && saldo.get(k) > 0) return k; }
    return 'Non indicata';
  }
  M.imposta = (l, b, s, src = 'op', t = Date.now(), causa = null) => M.conta(l, (b == null ? l.buoni : b) - l.buoni, (s == null ? l.scarti : s) - l.scarti, src, t, causa);
  M.chiudi = (l, { buoni, scarti, dest, nota, causa } = {}, ora = Date.now()) => {
    const nb = buoni == null ? l.buoni : buoni, ns = scarti == null ? l.scarti : scarti, nd = (M.conDest(l.fase) && dest) ? dest : l.dest;
    if (!M.limiteOk(l.odp, { lav: l, b: nb, s: ns, dest: nd })) return false;
    l.dest = nd;
    segnaTs(ora);
    const sg = M.segAperto(l);
    if (sg) { sg.e = Math.max(sg.s, ora); sg.tipo = 'fine'; }
    else if (l.seg.length) { const u = M.ultimoSeg(l); if (!AUTO(u)) u.tipo = 'fine'; }
    if (buoni != null || scarti != null) M.imposta(l, buoni, scarti, 'fine', ora, causa);
    if (nota != null) l.note = String(nota).trim();
    l.stato = 'chiusa'; l.chiuso = ora; salva(l); impara(l);
    return true;
  };

  // Chiusura automatica: dopo il tempo massimo per fase oppure (se configurati) agli orari di fine turno.
  function prossimoFineTurno(s, turni) {
    let best = null; const base = U.inizioGiorno(s);
    for (let dd = 0; dd < 3; dd++) for (const hm of turni) {
      const m = String(hm).match(/^(\d{1,2}):(\d{2})$/); if (!m) continue;
      const d = new Date(base); d.setDate(d.getDate() + dd); d.setHours(+m[1], +m[2], 0, 0);
      const T = d.getTime(); if (T > s && (best == null || T < best)) best = T;
    }
    return best;
  }
  M.limiteSessione = (l, sg, ora = Date.now()) => {
    const S = D.settings, maxH = M.maxOre(l.fase);
    let lim = null;
    const cap = sg.s + maxH * 3600000;
    if (ora >= cap) lim = { t: cap, tipo: 'auto', nota: `Chiusura automatica dopo ${U.fmtNum(maxH, maxH % 1 ? 1 : 0)} h di lavoro continuo` };
    if (S.turni && S.turni.length) {
      const T = prossimoFineTurno(sg.s, S.turni);
      if (T && ora >= T + (+S.tolTurno || 0) * 60000 && (!lim || T < lim.t)) lim = { t: T, tipo: 'turno', nota: `Pausa automatica a fine turno (${U.fmtOra(T)})` };
    }
    return lim;
  };
  M.minutiAlLimite = (l, ora = Date.now()) => {
    const sg = l.stato === 'attiva' && M.segAperto(l); if (!sg) return null;
    return (sg.s + M.maxOre(l.fase) * 3600000 - ora) / 60000;
  };
  M.autoChiusure = (ora = Date.now()) => {
    const fatte = [];
    for (const l of M.aperte()) {
      if (l.stato !== 'attiva') continue;
      const sg = M.segAperto(l); if (!sg) continue;
      const lim = M.limiteSessione(l, sg, ora);
      if (lim) { sg.e = Math.max(sg.s, lim.t); sg.tipo = lim.tipo; sg.nota = lim.nota; l.stato = 'pausa'; salva(l); fatte.push(l); }
    }
    return fatte;
  };

  // Il percorso di sbavatura dell'articolo viene imparato dalle scelte fatte in reparto.
  function impara(l) {
    const o = M.odp(l.odp); const cod = M.codArt(o); if (!cod) return;
    const a = D.art.get(cod) || { cod, descr: (o && o.descr) || '', perc: '', fisso: false, agg: 0 };
    if (a.fisso) return;
    let p = a.perc || '';
    const altre = M.lavDiOdp(l.odp).filter(x => x.id !== l.id);
    if (l.fase === 'NAS' && l.dest) p = l.dest === 'MAN' ? 'NASMAN' : (altre.some(x => M.chiaveTot(x) === 'MAN_N') ? 'MANNAS' : 'NAS');
    else if (l.fase === 'MAN' && l.dest) p = l.dest === 'NAS' ? 'MANNAS' : (altre.some(x => M.chiaveTot(x) === 'NAS_M') ? 'NASMAN' : 'MAN');
    else if (l.fase === 'TRE' && !p) p = 'TRE';
    else if (l.fase === 'MAN' && !p && !altre.some(x => x.fase === 'NAS')) p = 'MAN';
    if (p !== (a.perc || '')) { a.perc = p; a.agg = Date.now(); D.art.set(cod, a); P.art(a); }
  }

  /* ======================= code e accumuli ======================= */
  // NAS_M nastro→manuale, NAS_S nastro→sabbiatura, MAN_N manuale→nastro, MAN_S manuale→sabbiatura.
  M.vuotiTot = () => ({ TAG: { b: 0, s: 0 }, NAS_M: { b: 0, s: 0 }, NAS_S: { b: 0, s: 0 }, MAN_N: { b: 0, s: 0 }, MAN_S: { b: 0, s: 0 }, TRE: { b: 0, s: 0 }, SAB: { b: 0, s: 0 } });
  M.chiaveTot = l => {
    if (l.fase === 'NAS') return (l.dest || M.destPercorso(l.odp, 'NAS') || 'SAB') === 'MAN' ? 'NAS_M' : 'NAS_S';
    if (l.fase === 'MAN') return (l.dest || M.destPercorso(l.odp, 'MAN') || 'SAB') === 'NAS' ? 'MAN_N' : 'MAN_S';
    return l.fase;
  };
  M.totali = num => {
    const t = M.vuotiTot();
    for (const l of M.lavDiOdp(num)) { const k = t[M.chiaveTot(l)]; k.b += l.buoni; k.s += l.scarti; }
    return t;
  };
  // Pezzi da contare nelle code: con data di avvio, solo le colate dal giorno di avvio in poi.
  M.base = o => {
    const qta = Math.max(0, (o && o.qta) || 0); const avvio = D.settings && D.settings.dataAvvio;
    if (!avvio) return { qta, coda: qta, pre: 0 };
    let post = 0; for (const c of (o.colate || [])) if (c.data && c.data >= avvio && c.qCompl > 0) post += c.qCompl;
    post = Math.min(post, qta); return { qta, coda: post, pre: qta - post };
  };
  M.code = (base, t) => {
    const T = t.TAG, NM = t.NAS_M, NS = t.NAS_S, MN = t.MAN_N, MS = t.MAN_S, R = t.TRE, S = t.SAB;
    const Tl = T.b + T.s, Nl = NM.b + NM.s + NS.b + NS.s, Ml = MN.b + MN.s + MS.b + MS.s, Rl = R.b + R.s, Sl = S.b + S.s;
    // seconda passata: nastro dopo il manuale, manuale dopo il nastro (vanno poi in sabbiatura)
    const nasSecondo = Math.min(NS.b + NS.s, MN.b), manSecondo = Math.min(MS.b + MS.s, NM.b);
    const nasPrimo = Nl - nasSecondo, manPrimo = Ml - manSecondo;
    let riserva = base.pre;
    const preleva = n => { const x = Math.max(0, Math.min(n, riserva)); riserva -= x; return x; };
    const p1 = preleva(Tl - base.coda);
    const daTagliare = base.coda + p1 - Tl;
    const cons2 = nasPrimo + manPrimo + Rl;
    const p2 = preleva(cons2 - T.b);
    const attesaSbav = T.b + p2 - cons2;
    const attesaMan = NM.b - manSecondo, attesaNas = MN.b - nasSecondo;
    const in3 = NS.b + MS.b + R.b;
    const p3 = preleva(Sl - in3);
    const attesaSab = in3 + p3 - Sl;
    const scarti = T.s + NM.s + NS.s + MN.s + MS.s + R.s + S.s;
    return {
      prod: base.qta, coda: base.coda, pre: base.pre, prelevati: p1 + p2 + p3, riserva,
      daTagliare, attesaSbav, attesaMan, attesaNas, attesaSec: attesaMan + attesaNas, attesaSab, finiti: S.b, scarti,
      rimanente: daTagliare + attesaSbav + attesaMan + attesaNas + attesaSab,
      lav: { TAG: Tl, NAS: Nl, MAN: Ml, TRE: Rl, SAB: Sl }, nasSecondo, manSecondo,
    };
  };
  // Code ricalcolate con una lavorazione modificata (o aggiunta), senza toccare i dati.
  M.codeCon = (num, mod = {}) => {
    const t = M.vuotiTot();
    for (const x of M.lavDiOdp(num)) {
      if (mod.lav && x.id === mod.lav.id) continue;
      const k = t[M.chiaveTot(x)]; k.b += x.buoni; k.s += x.scarti;
    }
    const agg = mod.lav ? { odp: String(num), fase: mod.lav.fase, dest: mod.dest !== undefined ? mod.dest : mod.lav.dest, b: mod.b == null ? mod.lav.buoni : mod.b, s: mod.s == null ? mod.lav.scarti : mod.s } : mod.nuova;
    if (agg) { const k = t[M.chiaveTot(Object.assign({ odp: String(num) }, agg))]; k.b += agg.b || 0; k.s += agg.s || 0; }
    return M.code(M.base(M.odp(num) || {}), t);
  };
  const CODE = ['daTagliare', 'attesaSbav', 'attesaMan', 'attesaNas', 'attesaSab'];
  // Limite: taglio entro i pezzi colati, fasi successive entro i pezzi arrivati dalla fase precedente (scarti compresi).
  M.limiteOk = (num, mod) => { const prima = M.avanzamento(num), dopo = M.codeCon(num, mod); return !CODE.some(k => dopo[k] < 0 && dopo[k] < prima[k]); };
  // Quanti pezzi (buoni o scarti) si possono ancora registrare su questa lavorazione.
  M.capacita = l => {
    const o = M.odp(l.odp); const hi0 = Math.max(0, (o && o.qta) || 0);
    if (!M.limiteOk(l.odp, { lav: l, b: l.buoni + 1, s: l.scarti })) return 0;
    let lo = 1, hi = hi0 + 1;
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (M.limiteOk(l.odp, { lav: l, b: l.buoni + mid, s: l.scarti })) lo = mid; else hi = mid - 1; }
    return lo;
  };
  // Fase completata per l'ODP: tutti i pezzi colati sono passati da questa fase (e da quelle prima).
  M.faseCompletaAv = (av, fase) => {
    if (!(av.prod > 0) || av.riserva > 0) return false;
    const st = (C.fase(fase) || {}).stadio || 1;
    if (av.daTagliare > 0) return false; if (st === 1) return true;
    if (av.attesaSbav > 0 || av.attesaMan > 0 || av.attesaNas > 0) return false; if (st === 2) return true;
    return av.attesaSab <= 0;
  };
  M.faseCompleta = (num, fase) => M.faseCompletaAv(M.avanzamento(num), fase);
  M.spiegaLimite = (num, fase) => {
    const a = M.avanzamento(num);
    if (M.faseCompletaAv(a, fase)) return 'Tutti i pezzi colati di questo ODP sono già stati registrati in questa fase.';
    if (fase === 'TAG') return `Pezzi colati ${U.fmtInt(a.prod)}, già registrati al taglio ${U.fmtInt(a.lav.TAG)}: non si può andare oltre.`;
    return 'Non ci sono altri pezzi arrivati dalla fase precedente: prima vanno registrati a monte.';
  };
  M.avanzamento = num => { const o = M.odp(num); return M.code(M.base(o || {}), M.totali(num)); };
  M.disponibili = (num, fase, av) => {
    av = av || M.avanzamento(num);
    switch (fase) {
      case 'TAG': return av.daTagliare;
      case 'TRE': return av.attesaSbav;
      case 'NAS': return av.attesaNas + (M.percorso(num) === 'MANNAS' ? 0 : av.attesaSbav);
      case 'MAN': return av.attesaMan + (M.percorso(num) === 'NASMAN' ? 0 : av.attesaSbav);
      case 'SAB': return av.attesaSab;
    }
    return 0;
  };
  M.compatibile = (num, fase) => {
    const p = M.percorso(num); if (!p) return true;
    if (fase === 'NAS') return p === 'NAS' || p === 'NASMAN' || p === 'MANNAS';
    if (fase === 'MAN') return p === 'MAN' || p === 'NASMAN' || p === 'MANNAS';
    if (fase === 'TRE') return p === 'TRE';
    return true;
  };
  M.perFase = num => {
    const r = {}; C.FASI.forEach(f => r[f.id] = { b: 0, s: 0, ms: 0, n: 0 });
    for (const l of M.lavDiOdp(num)) { const x = r[l.fase]; if (!x) continue; x.b += l.buoni; x.s += l.scarti; x.ms += M.netto(l); x.n++; }
    return r;
  };
  M.codeReparto = () => {
    const r = { taglio: { pz: 0, odp: 0 }, sbav: { pz: 0, odp: 0 }, sab: { pz: 0, odp: 0 } };
    for (const o of D.odp.values()) {
      if (o.archiviato) continue;
      const a = M.avanzamento(o.num);
      if (a.daTagliare > 0) { r.taglio.pz += a.daTagliare; r.taglio.odp++; }
      const sb = Math.max(0, a.attesaSbav) + Math.max(0, a.attesaMan) + Math.max(0, a.attesaNas); if (sb > 0) { r.sbav.pz += sb; r.sbav.odp++; }
      if (a.attesaSab > 0) { r.sab.pz += a.attesaSab; r.sab.odp++; }
    }
    return r;
  };
  M.pezziGiorno = (giorno = U.giorno()) => {
    const t0 = U.daGiorno(giorno), t1 = U.mezzanotteDopo(t0); const r = {}; C.FASI.forEach(f => r[f.id] = { b: 0, s: 0 });
    for (const l of D.lav.values()) for (const c of l.cnt) if (c.t >= t0 && c.t < t1 && r[l.fase]) { r[l.fase].b += c.b; r[l.fase].s += c.s; }
    return r;
  };
  // Storico giornaliero di un ODP: colati, lavorati e livello delle code a fine giornata.
  M.storico = num => {
    const o = M.odp(num); if (!o) return { righe: [], base: null };
    const base = M.base(o);
    const giorni = new Map();
    const g = k => { let r = giorni.get(k); if (!r) giorni.set(k, r = { g: k, colati: 0, colatiCoda: 0, t: M.vuotiTot() }); return r; };
    const avvio = D.settings.dataAvvio;
    for (const c of o.colate || []) {
      if (!c.data || !(c.qCompl > 0)) continue;
      const r = g(c.data); r.colati += c.qCompl; if (!avvio || c.data >= avvio) r.colatiCoda += c.qCompl;
    }
    for (const l of M.lavDiOdp(num)) { const k = M.chiaveTot(l); for (const c of l.cnt) { const r = g(U.giorno(c.t)); r.t[k].b += c.b; r.t[k].s += c.s; } }
    const ordinati = [...giorni.values()].sort((a, b) => a.g.localeCompare(b.g));
    const sommaCoda = ordinati.reduce((s, r) => s + r.colatiCoda, 0);
    // pezzi colati senza data (righe non presenti nell'estrazione): contati dall'inizio
    let codaCum = Math.max(0, base.coda - sommaCoda);
    const cum = M.vuotiTot(); const out = [];
    for (const r of ordinati) {
      codaCum += r.colatiCoda;
      for (const k of Object.keys(cum)) { cum[k].b += r.t[k].b; cum[k].s += r.t[k].s; }
      const q = M.code({ qta: base.qta, coda: Math.min(codaCum, base.coda), pre: base.pre }, cum);
      const t = r.t;
      out.push({
        g: r.g, colati: r.colati,
        taglio: t.TAG.b + t.TAG.s, sbav: ['NAS_M', 'NAS_S', 'MAN_N', 'MAN_S', 'TRE'].reduce((x, k) => x + t[k].b + t[k].s, 0),
        sab: t.SAB.b + t.SAB.s, scarti: Object.keys(t).reduce((x, k) => x + t[k].s, 0), q,
      });
    }
    return { righe: out, base };
  };

  /* ======================= analisi per il supervisore ======================= */
  M.analisi = (t0, t1, ora = Date.now()) => {
    const mac = new Map(C.MACCHINE.map(m => [m.id, { id: m.id, ms: 0, pausaMs: 0, b: 0, s: 0, nLav: 0 }]));
    const fas = new Map(C.FASI.map(f => [f.id, { id: f.id, ms: 0, b: 0, s: 0 }]));
    const cause = new Map(), causeScarto = new Map(); const giorni = new Map(); const toccate = new Set();
    const k = { ms: 0, b: 0, s: 0, chiuse: 0, auto: 0, pausaMs: 0, fermiMs: 0 };
    const gg = key => { let r = giorni.get(key); if (!r) giorni.set(key, r = { g: key, ms: 0, b: 0, s: 0 }); return r; };
    for (const l of D.lav.values()) {
      const mm = mac.get(l.mac), ff = fas.get(l.fase); if (!mm || !ff) continue;
      l.seg.forEach((sg, i) => {
        const e = sg.e == null ? ora : sg.e;
        const ms = U.sovrapposto(sg.s, e, t0, t1);
        if (ms > 0) {
          mm.ms += ms; ff.ms += ms; k.ms += ms; toccate.add(l.id);
          for (const p of U.spezzaGiorni(Math.max(sg.s, t0), Math.min(e, t1))) gg(p.g).ms += p.ms;
        }
        if (AUTO(sg) && sg.e != null && sg.e >= t0 && sg.e < t1) k.auto++;
        if (sg.e != null) {
          const succ = l.seg[i + 1];
          const pe = succ ? succ.s : (l.stato === 'pausa' && i === l.seg.length - 1 ? ora : null);
          if (pe != null) {
            const pms = U.sovrapposto(sg.e, pe, t0, t1);
            if (pms > 0) {
              const c = M.causa(sg.tipo, sg.nota); cause.set(c, (cause.get(c) || 0) + pms);
              k.pausaMs += pms; mm.pausaMs += pms;
              if (!/^Fine turno/.test(c) && c !== 'Cambio ODP') k.fermiMs += pms;
            }
          }
        }
      });
      for (const c of l.cnt) if (c.t >= t0 && c.t < t1) {
        if (c.s) { const ca = c.causa || 'Non indicata'; causeScarto.set(ca, (causeScarto.get(ca) || 0) + c.s); }
        mm.b += c.b; mm.s += c.s; ff.b += c.b; ff.s += c.s; k.b += c.b; k.s += c.s;
        const r = gg(U.giorno(c.t)); r.b += c.b; r.s += c.s;
      }
      if (l.stato === 'chiusa' && l.chiuso >= t0 && l.chiuso < t1) k.chiuse++;
    }
    for (const id of toccate) mac.get(D.lav.get(id).mac).nLav++;
    k.lavorazioni = toccate.size;
    return {
      kpi: k, macchine: [...mac.values()], fasi: [...fas.values()],
      cause: [...cause].map(([causa, ms]) => ({ causa, ms })).sort((a, b) => b.ms - a.ms),
      causeScarto: [...causeScarto].map(([causa, n]) => ({ causa, n })).filter(x => x.n > 0).sort((a, b) => b.n - a.n),
      giorni: [...giorni.values()].sort((a, b) => a.g.localeCompare(b.g)),
      articoli: M.tempiArticoli(t0, t1),
    };
  };
  // Tempi per articolo e fase: lavorazioni chiuse nel periodo, escluse quelle con chiusura automatica.
  M.tempiArticoli = (t0 = 0, t1 = Infinity) => {
    const g = new Map();
    for (const l of D.lav.values()) {
      if (l.stato !== 'chiusa' || l.chiuso == null || l.chiuso < t0 || l.chiuso >= t1) continue;
      const o = M.odp(l.odp); const cod = M.codArt(o) || ('ODP ' + l.odp); const key = cod + '|' + l.fase;
      let r = g.get(key);
      if (!r) g.set(key, r = { cod, descr: (o && o.descr) || '', fase: l.fase, n: 0, nValide: 0, auto: 0, b: 0, s: 0, ms: 0, msValidi: 0, bValidi: 0, mpz: [], odp: new Set() });
      const ms = M.netto(l); r.n++; r.b += l.buoni; r.s += l.scarti; r.ms += ms; r.odp.add(l.odp);
      if (M.haAuto(l)) { r.auto++; continue; }
      r.nValide++; r.msValidi += ms; r.bValidi += l.buoni;
      if (l.buoni > 0) r.mpz.push(ms / 60000 / l.buoni);
    }
    return [...g.values()].map(r => ({
      cod: r.cod, descr: r.descr, fase: r.fase, n: r.n, nValide: r.nValide, auto: r.auto, odp: r.odp.size, b: r.b, s: r.s, ms: r.ms,
      minPz: r.bValidi ? r.msValidi / 60000 / r.bValidi : null, mediana: U.mediana(r.mpz),
      min: r.mpz.length ? Math.min(...r.mpz) : null, max: r.mpz.length ? Math.max(...r.mpz) : null,
      scartiPct: (r.b + r.s) ? r.s / (r.b + r.s) : null,
    })).sort((a, b) => a.cod.localeCompare(b.cod) || M.ordineFase(a.fase) - M.ordineFase(b.fase));
  };
  // Sessioni in un intervallo, per macchina (diagramma della giornata).
  M.sessioniIntervallo = (t0, t1, ora = Date.now()) => {
    const per = new Map(C.MACCHINE.map(m => [m.id, []]));
    for (const l of D.lav.values()) {
      if (!per.has(l.mac)) continue;
      l.seg.forEach((sg, i) => {
        const e = sg.e == null ? ora : sg.e;
        if (e <= t0 || sg.s >= t1) return;
        per.get(l.mac).push({ l, i, s: sg.s, e, aperta: sg.e == null, tipo: sg.tipo, nota: sg.nota });
      });
    }
    for (const arr of per.values()) arr.sort((a, b) => a.s - b.s);
    return per;
  };
  // Situazioni da far controllare al supervisore.
  M.anomalie = (ora = Date.now()) => {
    const out = []; const S = D.settings;
    for (const l of D.lav.values()) {
      if (l.ver) continue;
      if (M.haAuto(l)) out.push({ tipo: 'auto', l, t: (l.seg.find(AUTO) || {}).e });
      if (l.stato === 'chiusa' && l.buoni + l.scarti === 0) out.push({ tipo: 'zero', l, t: l.chiuso });
      if (l.stato !== 'chiusa' && ora - M.inizio(l) > (+S.staleGiorni || 3) * 86400000) out.push({ tipo: 'vecchia', l, t: M.inizio(l) });
    }
    const grp = new Map();
    for (const l of D.lav.values()) {
      if (l.stato !== 'chiusa' || !(l.buoni > 0) || M.haAuto(l)) continue;
      const key = M.codArt(M.odp(l.odp)) + '|' + l.fase; let a = grp.get(key); if (!a) grp.set(key, a = []);
      a.push({ l, mpz: M.netto(l) / 60000 / l.buoni });
    }
    for (const a of grp.values()) {
      if (a.length < 5) continue;
      const med = U.mediana(a.map(x => x.mpz));
      for (const x of a) if (!x.l.ver && med > 0 && (x.mpz > 3 * med || x.mpz < med / 3)) out.push({ tipo: 'fuori', l: x.l, mpz: x.mpz, med, t: x.l.chiuso });
    }
    for (const o of D.odp.values()) {
      if (!M.lavDiOdp(o.num).length) continue;
      const a = M.avanzamento(o.num);
      const neg = [['daTagliare', 'da tagliare'], ['attesaSbav', 'in attesa di sbavatura'], ['attesaMan', 'in attesa di manuale'], ['attesaNas', 'in attesa di nastro'], ['attesaSab', 'in attesa di sabbiatura']].filter(([k2]) => a[k2] < 0);
      if (neg.length) out.push({ tipo: 'negativo', o, a, neg, t: o.aggiornato });
    }
    return out.sort((x, y) => (y.t || 0) - (x.t || 0));
  };

  /* ======================= operazioni del supervisore ======================= */
  M.validaSessioni = (seg, stato) => {
    if (!seg.length) return 'Serve almeno una sessione di lavoro';
    for (let i = 0; i < seg.length; i++) {
      const s = seg[i];
      if (!s.s) return `Sessione ${i + 1}: manca l'inizio`;
      if (s.e != null && s.e < s.s) return `Sessione ${i + 1}: la fine è prima dell'inizio`;
      if (s.e == null && (i < seg.length - 1 || stato !== 'attiva')) return `Sessione ${i + 1}: manca la fine`;
      if (i > 0 && seg[i - 1].e != null && s.s < seg[i - 1].e) return `Sessione ${i + 1}: si sovrappone alla precedente`;
    }
    if (stato === 'attiva' && seg[seg.length - 1].e != null) return null; // viene aperta una nuova sessione
    return null;
  };
  M.modifica = (l, patch, ora = Date.now()) => {
    const diff = [];
    const nb0 = patch.buoni == null ? l.buoni : Math.max(0, Math.round(patch.buoni)), ns0 = patch.scarti == null ? l.scarti : Math.max(0, Math.round(patch.scarti));
    const nd0 = patch.dest !== undefined && M.conDest(l.fase) ? patch.dest : l.dest;
    if (!M.limiteOk(l.odp, { lav: l, b: nb0, s: ns0, dest: nd0 })) throw new Error('I pezzi superano quelli disponibili: al taglio non si supera il colato, nelle altre fasi i pezzi arrivati dalla fase precedente.');
    if (l.stato === 'chiusa' && patch.stato && patch.stato !== 'chiusa' && M.faseCompletaAv(M.codeCon(l.odp, { lav: l, b: nb0, s: ns0, dest: nd0 }), l.fase)) throw new Error('Fase completata per questo ODP: non si può riaprire. Correggi prima i pezzi se sono sbagliati.');
    const desc = seg => seg.map(s => `${U.fmtDataOra(s.s)}-${s.e ? U.fmtOra(s.e) : 'in corso'}`).join(', ');
    if (patch.seg) {
      const nuovo = patch.seg.map(s => ({ s: s.s, e: s.e == null ? null : s.e, tipo: s.tipo || null, nota: s.nota || '' }));
      if (patch.stato === 'attiva' && nuovo[nuovo.length - 1].e != null) nuovo.push({ s: ora, e: null, tipo: null, nota: '' });
      if ((patch.stato || l.stato) === 'chiusa' && nuovo.length) { const u = nuovo[nuovo.length - 1]; if (!AUTO(u)) u.tipo = 'fine'; }
      if (desc(nuovo) !== desc(l.seg)) diff.push(`sessioni ${desc(l.seg)} → ${desc(nuovo)}`);
      l.seg = nuovo;
    }
    if (patch.stato && patch.stato !== l.stato) {
      if (patch.stato === 'attiva' && !C.macchina(l.mac).multi) for (const x of M.aperte(l.mac)) if (x.stato === 'attiva' && x.id !== l.id) pausaInterna(x, 'Cambio ODP', ora);
      diff.push(`stato ${l.stato} → ${patch.stato}`); l.stato = patch.stato;
      l.chiuso = patch.stato === 'chiusa' ? (M.ultimaFine(l) || ora) : null;
    } else if (l.stato === 'chiusa') l.chiuso = M.ultimaFine(l) || l.chiuso || ora;
    if (patch.dest !== undefined && M.conDest(l.fase) && patch.dest !== l.dest) { diff.push(`dopo ${l.fase === 'NAS' ? 'il nastro' : 'il manuale'} ${l.dest || '—'} → ${patch.dest || '—'}`); l.dest = patch.dest; }
    if (patch.note !== undefined && patch.note !== l.note) { diff.push('note'); l.note = patch.note; }
    const nb = patch.buoni == null ? l.buoni : Math.max(0, Math.round(patch.buoni)), ns = patch.scarti == null ? l.scarti : Math.max(0, Math.round(patch.scarti));
    if (nb !== l.buoni || ns !== l.scarti) { diff.push(`pezzi ${l.buoni}+${l.scarti} → ${nb}+${ns}`); M.imposta(l, nb, ns, 'sup', M.ultimaFine(l) || M.inizio(l), patch.causa || null); }
    if (patch.ver !== undefined) l.ver = !!patch.ver;
    if (diff.length) l.mod.push({ t: ora, cosa: 'Supervisore: ' + diff.join('; ') });
    salva(l); impara(l);
    return diff;
  };
  M.verifica = l => { l.ver = true; l.mod.push({ t: Date.now(), cosa: 'Verificata dal supervisore' }); salva(l); };
  M.puoEliminare = l => M.limiteOk(l.odp, { lav: l, b: 0, s: 0 });
  M.elimina = l => { D.lav.delete(l.id); deindicizza(l); P.delLav(l.id); };
  M.creaManuale = ({ mac, odp, s, e, buoni = 0, scarti = 0, dest = null, note = '' }, ora = Date.now()) => {
    const m = C.macchina(mac); if (!m) throw new Error('Macchina non valida');
    if (!(s < e)) throw new Error('La fine deve essere dopo l\'inizio');
    if (!M.limiteOk(odp, { nuova: { fase: m.fase, dest: M.conDest(m.fase) ? dest : null, b: +buoni || 0, s: +scarti || 0 } })) throw new Error('I pezzi superano quelli disponibili per questa fase. ' + M.spiegaLimite(odp, m.fase));
    const l = {
      id: U.uid(), odp: String(odp), mac, fase: m.fase, stato: 'chiusa', creato: ora, chiuso: e,
      seg: [{ s, e, tipo: 'fine', nota: '' }], cnt: (buoni || scarti) ? [Object.assign({ t: e, b: +buoni || 0, s: +scarti || 0, src: 'sup' }, scarti ? { causa: 'Non indicata' } : {})] : [],
      buoni: +buoni || 0, scarti: +scarti || 0, dest: M.conDest(m.fase) ? dest : null, note, ver: true,
      mod: [{ t: ora, cosa: 'Inserita manualmente dal supervisore' }], man: true,
    };
    D.lav.set(l.id, l); indicizza(l); salva(l); impara(l);
    return l;
  };
  M.salvaOdp = o => { D.odp.set(o.num, o); P.odp(o); };
  M.archivia = (num, si = true) => { const o = M.odp(num); if (!o) return; o.archiviato = !!si; o.archiviatoIl = si ? Date.now() : null; P.odp(o); };
  M.eliminaOdp = num => { if (M.lavDiOdp(num).length) return false; D.odp.delete(String(num)); P.delOdp(String(num)); return true; };
  M.completato = num => { const o = M.odp(num); if (!o || !(o.qta > 0)) return false; const a = M.avanzamento(num); return a.rimanente <= 0 && a.finiti > 0 && !M.lavDiOdp(num).some(l => l.stato !== 'chiusa'); };
  M.archiviaCompletati = () => { let n = 0; for (const o of D.odp.values()) if (!o.archiviato && M.completato(o.num)) { M.archivia(o.num, true); n++; } return n; };
  M.setPercorso = (cod, perc, fisso) => {
    const o = [...D.odp.values()].find(x => M.codArt(x) === cod);
    const a = D.art.get(cod) || { cod, descr: (o && o.descr) || '', perc: '', fisso: false, agg: 0 };
    a.perc = perc || ''; a.fisso = !!fisso; a.agg = Date.now(); D.art.set(cod, a); P.art(a);
  };
  M.articoli = () => {
    const m = new Map();
    for (const o of D.odp.values()) {
      const cod = M.codArt(o); if (!cod) continue;
      let r = m.get(cod); if (!r) m.set(cod, r = { cod, descr: o.descr, nOdp: 0, ultima: 0 });
      r.nOdp++; for (const l of M.lavDiOdp(o.num)) r.ultima = Math.max(r.ultima, M.inizio(l));
    }
    for (const a of D.art.values()) if (!m.has(a.cod)) m.set(a.cod, { cod: a.cod, descr: a.descr, nOdp: 0, ultima: 0 });
    return [...m.values()].map(r => Object.assign(r, { perc: (D.art.get(r.cod) || {}).perc || '', fisso: !!(D.art.get(r.cod) || {}).fisso })).sort((a, b) => a.cod.localeCompare(b.cod));
  };

  /* ======================= annulla ======================= */
  M.istantanea = (ids, cod) => ({
    lav: ids.map(id => D.lav.has(id) ? U.clona(D.lav.get(id)) : { id, __assente: true }),
    art: cod ? (D.art.has(cod) ? U.clona(D.art.get(cod)) : { cod, __assente: true }) : null,
  });
  M.ripristinaIstantanea = (snap, creati = []) => {
    for (const id of creati) { const l = D.lav.get(id); if (l) M.elimina(l); }
    for (const c of snap.lav) {
      const cur = D.lav.get(c.id);
      if (c.__assente) { if (cur) M.elimina(cur); continue; }
      if (cur) deindicizza(cur);
      D.lav.set(c.id, c); indicizza(c); salva(c);
    }
    if (snap.art) {
      if (snap.art.__assente) { if (D.art.has(snap.art.cod)) { D.art.delete(snap.art.cod); P.delArt(snap.art.cod); } }
      else { D.art.set(snap.art.cod, snap.art); P.art(snap.art); }
    }
  };

  /* ======================= impostazioni e PIN ======================= */
  M.salvaImpostazioni = patch => { Object.assign(D.settings, patch); P.settings(D.settings); };
  M.salvaMeta = patch => { if (patch) Object.assign(D.meta, patch); P.meta(D.meta); };
  M.verificaPin = pin => {
    const S = D.settings; pin = String(pin || '');
    if (pin && U.hash(S.pinSale + pin) === S.pinHash) return 'ok';
    if (pin.length === 12 && S.recHash && U.hash(S.pinSale + 'R' + pin) === S.recHash) return 'recupero';
    return false;
  };
  M.impostaPin = pin => {
    const rec = U.cifreCasuali(12);
    M.salvaImpostazioni({ pinHash: U.hash(D.settings.pinSale + String(pin)), pinPredefinito: false, recHash: U.hash(D.settings.pinSale + 'R' + rec) });
    return rec;
  };

  FT.model = M;
})(self.FT = self.FT || {});
