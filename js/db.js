/* Tempi Friber — archivio locale su IndexedDB.
   Un record per ODP, lavorazione e articolo: ogni tocco salva solo il record cambiato.
   Usato sia dalla pagina sia dal service worker (file condivisi da altre app). */
(function (FT) {
  'use strict';
  const NOME = 'friber-tempi';
  const VERSIONE_DB = 2;
  const STORES = { odp: { keyPath: 'num' }, lav: { keyPath: 'id' }, art: { keyPath: 'cod' }, kv: null, snap: null, inbox: { keyPath: 'id' } };

  let db = null;
  let coda = Promise.resolve();
  let suErrore = e => console.error(e);

  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const fine = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('Transazione annullata')); });

  /* Conversione dei dati della versione 1.0 (un unico oggetto "state"). */
  function convertiV1(st) {
    const U = FT.u, ora = Date.now();
    const odp = Object.values(st.odp || {}).map(o => Object.assign({
      num: String(o.num), ordLav: '', codProd: '', codMod: '', descr: '', cliente: '', codCli: '', ordCli: '', linea: 'N/D', lega: '',
      consegna: '', stato: '', qta: 0, qProdErp: 0, qComplTot: 0, qPianTot: 0, qResErp: 0, colate: [], fonti: [],
      creato: ora, aggiornato: ora, archiviato: false, nota: '',
    }, o, { num: String(o.num) }));
    const lav = (st.lav || []).map(l => ({
      id: l.id, odp: String(l.odp), mac: l.mac, fase: l.fase, stato: l.stato || 'chiusa', creato: l.creato || (l.seg && l.seg[0] ? l.seg[0].s : ora),
      chiuso: l.stato === 'chiusa' ? (l.chiuso || (l.seg && l.seg.length ? l.seg[l.seg.length - 1].e : ora)) : null,
      seg: (l.seg || []).map(s => ({ s: s.s, e: s.e == null ? null : s.e, tipo: s.tipo || null, nota: s.nota || '' })),
      cnt: (l.buoni || l.scarti) ? [{ t: l.chiuso || (l.seg && l.seg.length ? (l.seg[l.seg.length - 1].e || l.seg[l.seg.length - 1].s) : ora), b: +l.buoni || 0, s: +l.scarti || 0, src: 'mig' }] : [],
      buoni: +l.buoni || 0, scarti: +l.scarti || 0, dest: null, note: l.note || '', ver: false,
      mod: [{ t: ora, cosa: 'Importata dalla versione 1.0' }], man: false,
    }));
    const sale = U.cifreCasuali(8);
    const settings = Object.assign({}, FT.cfg.IMPOSTAZIONI, {
      maxOre: (st.settings && +st.settings.maxOre) || FT.cfg.IMPOSTAZIONI.maxOre,
      pinSale: sale, pinHash: U.hash(sale + String((st.settings && st.settings.pin) || FT.cfg.PIN_PREDEFINITO)), pinPredefinito: !st.settings || String(st.settings.pin) === FT.cfg.PIN_PREDEFINITO,
    });
    const m = st.meta || {};
    const meta = { lastBackup: m.lastBackup || '', lastImport: m.lastImport || 0, lastExport: m.lastExport || 0, importLog: (m.importLog || []).map(x => ({ t: x.t, testo: x.msg })), installato: ora, migrato: ora };
    return { odp, lav, art: [], settings, meta };
  }

  function upgrade(ev) {
    const d = ev.target.result, tx = ev.target.transaction;
    for (const [n, opt] of Object.entries(STORES)) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, opt || undefined);
    if (ev.oldVersion === 1) {
      const kv = tx.objectStore('kv');
      const rk = kv.getAllKeys();
      rk.onsuccess = () => {
        for (const k of rk.result) if (String(k).startsWith('snap:') || k === 'friber-state-mirror') kv.delete(k);
        const r = kv.get('state');
        r.onsuccess = () => {
          if (!r.result) return;
          const c = convertiV1(r.result);
          c.odp.forEach(o => tx.objectStore('odp').put(o));
          c.lav.forEach(l => tx.objectStore('lav').put(l));
          kv.put(c.settings, 'settings'); kv.put(c.meta, 'meta'); kv.delete('state');
        };
      };
    }
  }

  const DB = {
    convertiV1,
    suErrore(fn) { suErrore = fn; },
    apri() {
      if (db) return Promise.resolve(db);
      return new Promise((res, rej) => {
        const r = self.indexedDB.open(NOME, VERSIONE_DB);
        r.onupgradeneeded = upgrade;
        r.onsuccess = () => {
          db = r.result;
          db.onversionchange = () => { db.close(); db = null; if (self.location && self.document) self.location.reload(); };
          res(db);
        };
        r.onerror = () => rej(r.error);
        r.onblocked = () => console.warn('Apertura archivio bloccata da un\'altra scheda');
      });
    },
    async tutti(store) { await DB.apri(); return req(db.transaction(store).objectStore(store).getAll()); },
    async chiavi(store) { await DB.apri(); return req(db.transaction(store).objectStore(store).getAllKeys()); },
    async leggi(store, k) { await DB.apri(); return req(db.transaction(store).objectStore(store).get(k)); },
    // Scritture in coda: ordine garantito, un errore non blocca le successive.
    scrivi(store, val, chiave) {
      coda = coda.then(async () => {
        await DB.apri();
        const tx = db.transaction(store, 'readwrite');
        chiave === undefined ? tx.objectStore(store).put(val) : tx.objectStore(store).put(val, chiave);
        await fine(tx);
      }).catch(e => suErrore(e));
      return coda;
    },
    cancella(store, chiave) {
      coda = coda.then(async () => {
        await DB.apri();
        const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(chiave); await fine(tx);
      }).catch(e => suErrore(e));
      return coda;
    },
    attendi() { return coda; },
    kvLeggi(k) { return DB.leggi('kv', k); },
    kvScrivi(k, v) { return DB.scrivi('kv', v, k); },
    // Sostituisce tutti i dati in un'unica transazione (ripristino backup, azzeramento).
    sostituisciTutto(d) {
      coda = coda.then(async () => {
        await DB.apri();
        const tx = db.transaction(['odp', 'lav', 'art', 'kv'], 'readwrite');
        for (const s of ['odp', 'lav', 'art']) tx.objectStore(s).clear();
        (d.odp || []).forEach(o => tx.objectStore('odp').put(o));
        (d.lav || []).forEach(l => tx.objectStore('lav').put(l));
        (d.art || []).forEach(a => tx.objectStore('art').put(a));
        if (d.settings) tx.objectStore('kv').put(d.settings, 'settings');
        if (d.meta) tx.objectStore('kv').put(d.meta, 'meta');
        await fine(tx);
      });
      return coda;
    },
    /* copie interne giornaliere */
    snapScrivi(k, v) { return DB.scrivi('snap', v, k); },
    snapLeggi(k) { return DB.leggi('snap', k); },
    snapChiavi() { return DB.chiavi('snap'); },
    snapCancella(k) { return DB.cancella('snap', k); },
    /* file ricevuti tramite "Condividi" da altre app */
    async inboxAggiungi(file) {
      const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nome: file.name || 'file', tipo: file.type || '', dim: file.size || 0, t: Date.now(), dati: await file.arrayBuffer() };
      await DB.apri();
      const tx = db.transaction('inbox', 'readwrite'); tx.objectStore('inbox').put(rec); await fine(tx);
      return rec.id;
    },
    inboxTutti() { return DB.tutti('inbox'); },
    inboxCancella(id) { return DB.cancella('inbox', id); },
  };

  FT.db = DB;
})(self.FT = self.FT || {});
