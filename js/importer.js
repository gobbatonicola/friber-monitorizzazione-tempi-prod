/* Tempi Friber — import delle estrazioni ODP (Excel del gestionale ordini).
   Regole:
   - lo stesso ODP compare una volta per ogni giorno di colata e può comparire in più file: si raggruppa per numero ODP;
   - le righe con "Impianto" vuoto compaiono identiche in tutti i file: i dati di un ODP si prendono solo dai file
     in cui l'ODP ha righe con impianto valorizzato (il file della sua linea);
   - si importano solo ODP con colata già avvenuta; nessun ODP viene cancellato. */
(function (FT) {
  'use strict';
  const U = FT.u, C = FT.cfg;
  const I = {};

  const ALIAS = {
    num: ['ordine produzione'], ordLav: ['ordine lavorazione'], impianto: ['impianto'], codCli: ['cliente'], cliente: ['nome cliente'],
    stato: ['stato'], codMod: ['codice modello'], codProd: ['cod prodotto', 'codice prodotto'], descr: ['descrizione'],
    qPian: ['quantita pianificata'], qRes: ['quantita residue', 'quantita residua'], lega: ['lega miscela', 'lega'],
    dataProg: ['data programma'], consegna: ['data consegna'], ordCli: ['ordine cliente'], fase: ['fase'],
    qProd: ['quantita prodotta'], qCompl: ['qta completata', 'quantita completata'],
  };
  const testo = x => (x == null ? '' : String(x).trim());
  const idOdp = x => { const s = testo(x); if (!s) return ''; return /^\d+(\.0+)?$/.test(s) ? String(parseInt(s, 10)) : s; };

  // Legge un file Excel/CSV e restituisce le righe normalizzate.
  I.leggi = (nome, buf) => {
    let wb;
    try { wb = XLSX.read(buf, { type: 'array', cellDates: false }); }
    catch (e) { return { nome, errore: 'Il file non è un Excel leggibile (' + e.message + ').' }; }
    const righe = []; let trovato = false;
    for (const sn of wb.SheetNames) {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: null, blankrows: false });
      const hi = aoa.findIndex(r => Array.isArray(r) && r.some(c => U.normTesto(c) === 'ordine produzione'));
      if (hi < 0) continue;
      trovato = true;
      const col = {}; aoa[hi].forEach((c, i) => { const k = U.normTesto(c); if (k && !(k in col)) col[k] = i; });
      const idx = {}; for (const [f, al] of Object.entries(ALIAS)) for (const a of al) if (a in col) { idx[f] = col[a]; break; }
      for (let r = hi + 1; r < aoa.length; r++) {
        const row = aoa[r]; if (!row) continue;
        const g = f => (idx[f] == null ? null : row[idx[f]]);
        const num = idOdp(g('num')); if (!num) continue;
        righe.push({
          num, file: nome, impianto: testo(g('impianto')).toUpperCase(), ordLav: idOdp(g('ordLav')),
          codCli: testo(g('codCli')), cliente: testo(g('cliente')), stato: testo(g('stato')), codMod: testo(g('codMod')), codProd: testo(g('codProd')),
          descr: testo(g('descr')), lega: testo(g('lega')), ordCli: idOdp(g('ordCli')),
          dataProg: U.dataIso(g('dataProg')), consegna: U.dataIso(g('consegna')),
          qPian: U.numIt(g('qPian')), qRes: U.numIt(g('qRes')), qProd: U.numIt(g('qProd')), qCompl: U.numIt(g('qCompl')),
        });
      }
    }
    if (!trovato) return { nome, errore: 'Manca la colonna "Ordine Produzione": non sembra un\'estrazione ODP.' };
    const freq = {}; righe.forEach(r => { if (r.impianto) freq[r.impianto] = (freq[r.impianto] || 0) + 1; });
    const imp = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    return { nome, righe, linea: imp ? (C.LINEE[imp[0]] || imp[0]) : 'N/D', nOdp: new Set(righe.map(r => r.num)).size };
  };

  const modo = arr => { const f = {}; let best = '', n = 0; for (const x of arr) if (x) { f[x] = (f[x] || 0) + 1; if (f[x] > n) { n = f[x]; best = x; } } return best; };
  const primo = (arr, k) => { for (const r of arr) if (r[k]) return r[k]; return ''; };

  // Confronta i file letti con gli ODP già presenti e prepara l'elenco delle modifiche (nessuna scrittura).
  I.anteprima = letti => {
    const M = FT.model;
    const per = new Map();
    for (const f of letti) if (!f.errore) for (const r of f.righe) { let a = per.get(r.num); if (!a) per.set(r.num, a = []); a.push(r); }
    const out = { nuovi: [], aggiornati: [], invariati: [], esclusi: [], parziali: [], avvisi: [], file: letti.map(f => ({ nome: f.nome, errore: f.errore, righe: f.righe ? f.righe.length : 0, nOdp: f.nOdp || 0, linea: f.linea })) };
    const perLinea = {}; out.file.forEach(f => { if (!f.errore && f.linea !== 'N/D') (perLinea[f.linea] = perLinea[f.linea] || []).push(f.nome); });
    for (const [lin, nomi] of Object.entries(perLinea)) if (nomi.length > 1) out.avvisi.push(`${nomi.length} file della linea ${lin}: vengono uniti. Se sono estrazioni di giorni diversi, importa solo la più recente.`);
    for (const [num, righe] of per) {
      const casa = righe.filter(r => r.impianto);
      const fileCasa = new Set(casa.map(r => r.file));
      const usate = casa.length ? righe.filter(r => fileCasa.has(r.file)) : righe;
      const esist = M.odp(num);
      if (!casa.length && esist) { out.parziali.push(num); continue; } // solo righe "orfane": non toccare un ODP già noto
      // colate: per ogni combinazione si tiene la molteplicità massima tra i file (i doppioni tra file non si sommano)
      const perFile = new Map();
      for (const r of usate) { const k = [r.dataProg, r.qCompl, r.qPian, r.qRes].join('|'); const m = perFile.get(r.file) || new Map(); m.set(k, (m.get(k) || 0) + 1); perFile.set(r.file, m); }
      const molt = new Map(); for (const m of perFile.values()) for (const [k, n] of m) molt.set(k, Math.max(molt.get(k) || 0, n));
      const colate = [];
      for (const [k, n] of molt) { const [data, qCompl, qPian, qRes] = k.split('|'); for (let i = 0; i < n; i++) colate.push({ data, qCompl: +qCompl, qPian: +qPian, qRes: +qRes }); }
      colate.sort((a, b) => (a.data || '9').localeCompare(b.data || '9'));
      const base = casa.length ? casa : righe;
      const qProd = Math.max(0, ...usate.map(r => r.qProd));
      const sCompl = colate.reduce((s, c) => s + c.qCompl, 0);
      const qta = qProd > 0 ? qProd : sCompl; // la quantità prodotta del gestionale prevale sulla somma delle righe
      const imp = modo(casa.map(r => r.impianto));
      const rec = {
        num, ordLav: primo(base, 'ordLav'), codProd: primo(base, 'codProd'), codMod: primo(base, 'codMod'), descr: primo(base, 'descr'),
        cliente: primo(base, 'cliente'), codCli: primo(base, 'codCli'), ordCli: primo(base, 'ordCli'), lega: primo(base, 'lega'), stato: primo(base, 'stato'),
        linea: imp ? (C.LINEE[imp] || imp) : (esist ? esist.linea : 'N/D'),
        consegna: usate.map(r => r.consegna).filter(Boolean).sort().pop() || '',
        qta, qProdErp: qProd, qComplTot: sCompl, qPianTot: colate.reduce((s, c) => s + c.qPian, 0), qResErp: colate.reduce((s, c) => s + c.qRes, 0),
        colate, fonti: [...new Set(usate.map(r => r.file))],
      };
      if (!esist) {
        if (qta <= 0) { out.esclusi.push(num); continue; }
        out.nuovi.push({ rec });
        continue;
      }
      const cambi = [];
      if (rec.qta !== esist.qta) cambi.push(`colati ${U.fmtInt(esist.qta)} → ${U.fmtInt(rec.qta)}`);
      if ((rec.colate || []).length !== (esist.colate || []).length) cambi.push(`righe colata ${(esist.colate || []).length} → ${rec.colate.length}`);
      if (rec.consegna !== esist.consegna) cambi.push(`consegna ${U.fmtGiorno(esist.consegna)} → ${U.fmtGiorno(rec.consegna)}`);
      for (const k of ['descr', 'cliente', 'stato', 'codProd', 'linea']) if ((rec[k] || '') !== (esist[k] || '')) cambi.push(k === 'descr' ? 'descrizione' : k === 'codProd' ? 'codice prodotto' : k);
      if (JSON.stringify(rec.colate) !== JSON.stringify(esist.colate) && !cambi.some(c => c.startsWith('righe') || c.startsWith('colati'))) cambi.push('dettaglio colate');
      if (!cambi.length) { out.invariati.push(num); continue; }
      const riattiva = esist.archiviato && rec.qta > esist.qta;
      out.aggiornati.push({ rec, cambi, riattiva });
      const lavT = M.perFase(num).TAG; const tagliati = lavT.b + lavT.s;
      if (rec.qta < tagliati) out.avvisi.push(`ODP ${num}: colati ${U.fmtInt(rec.qta)} ma già registrati ${U.fmtInt(tagliati)} pezzi al taglio`);
    }
    return out;
  };

  // Applica l'anteprima: aggiunge i nuovi ODP e aggiorna gli esistenti (archiviazione e note restano).
  I.applica = (ant, nomiFile) => {
    const M = FT.model, ora = Date.now();
    for (const { rec } of ant.nuovi) M.salvaOdp(Object.assign({ creato: ora, aggiornato: ora, archiviato: false, nota: '' }, rec));
    for (const { rec, riattiva } of ant.aggiornati) {
      const o = M.odp(rec.num);
      const nuovo = Object.assign({}, o, rec, { aggiornato: ora, creato: o.creato, nota: o.nota, archiviato: riattiva ? false : o.archiviato });
      M.salvaOdp(nuovo);
    }
    const D = M.dati;
    let notaAvvio = '';
    const testoLog = `${(nomiFile || []).join(', ')}: ${ant.nuovi.length} nuovi, ${ant.aggiornati.length} aggiornati, ${ant.invariati.length + ant.parziali.length} invariati, ${ant.esclusi.length} esclusi`;
    D.meta.importLog = [{ t: ora, testo: testoLog }].concat(D.meta.importLog || []).slice(0, 30);
    M.salvaMeta({ lastImport: ora });
    return { nuovi: ant.nuovi.length, aggiornati: ant.aggiornati.length, notaAvvio };
  };

  FT.imp = I;
})(self.FT = self.FT || {});
