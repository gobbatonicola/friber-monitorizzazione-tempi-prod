/* Tempi Friber — avvio dell'app, navigazione, temporizzazioni, sessione supervisore, aggiornamenti. */
(function (FT) {
  'use strict';
  const U = FT.u, UI = FT.ui;
  const A = {};
  let adminFino = 0, ultimoTocco = Date.now(), uscite = [], swReg = null, nuovaVersione = false, nInbox = 0, wake = null, pila = [];
  const minuti = n => n * 60000;
  const S = () => FT.model.dati.settings;

  /* ---------- sessione supervisore ---------- */
  A.isAdmin = () => Date.now() < adminFino;
  A.esciAdmin = () => { adminFino = 0; };
  const estendiAdmin = () => { adminFino = Date.now() + minuti(+S().adminMin || 10); };
  A.chiediPin = async () => {
    if (A.isAdmin()) { estendiAdmin(); return true; }
    const pin = await UI.tastierino({ titolo: 'PIN supervisore', icona: 'lucchetto', maschera: true, max: 12, nota: 'Hai dimenticato il PIN? Scrivi il codice di recupero di 12 cifre.' });
    if (pin == null) return false;
    const r = FT.model.verificaPin(pin);
    if (r === 'ok') { estendiAdmin(); A.render(); return true; }
    if (r === 'recupero') { estendiAdmin(); UI.toast('Codice di recupero accettato: scegli un nuovo PIN'); await A.cambiaPin(); A.render(); return true; }
    UI.vibra(90); UI.toast('PIN errato', { errore: true }); return false;
  };
  A.cambiaPin = async () => {
    const p1 = await UI.tastierino({ titolo: 'Nuovo PIN, da 4 a 8 cifre', icona: 'lucchetto', maschera: true, max: 8 });
    if (p1 == null) return false;
    if (p1.length < 4) { UI.toast('Il PIN deve avere almeno 4 cifre', { errore: true }); return false; }
    const p2 = await UI.tastierino({ titolo: 'Ripeti il nuovo PIN', icona: 'lucchetto', maschera: true, max: 8 });
    if (p2 == null) return false;
    if (p2 !== p1) { UI.toast('I due PIN non coincidono', { errore: true }); return false; }
    const rec = FT.model.impostaPin(p1);
    await new Promise(res => UI.modale(`<h2>${UI.ic('lucchetto')}PIN cambiato</h2>
      <p class="md-testo">Questo è il codice di recupero: serve se un giorno dimentichi il PIN. Annotalo e conservalo in ufficio, non verrà più mostrato.</p>
      <div class="codice-rec">${rec.replace(/(\d{4})(?=\d)/g, '$1 ')}</div>
      <div class="azioni"><button class="btn verde" type="button" data-chiudi>${UI.ic('check')}L'ho annotato</button></div>`, { chiudibile: false, onChiudi: res }));
    A.render();
    return true;
  };

  /* ---------- azioni dell'operatore con "Annulla" ---------- */
  A.op = (messaggio, { mac, lavIds = [], cod } = {}, fn) => {
    const M = FT.model;
    const ids = new Set(lavIds); if (mac) M.aperte(mac).forEach(l => ids.add(l.id));
    const snap = M.istantanea([...ids], cod);
    let ris;
    try { ris = fn(); } catch (e) { UI.vibra(90); UI.toast(e.message, { errore: true, durata: 6000 }); A.render(); return null; }
    if (ris === false) { UI.vibra(90); UI.toast('Operazione non consentita: controlla i pezzi disponibili', { errore: true }); A.render(); return null; }
    const creati = ris && ris.id && !ids.has(ris.id) ? [ris.id] : [];
    UI.vibra(25);
    A.render(); A.aggiornaWakeLock();
    UI.toast(messaggio, { annulla: () => { M.ripristinaIstantanea(snap, creati); A.render(); A.aggiornaWakeLock(); UI.toast('Annullato', { icona: 'annulla' }); } });
    return ris;
  };

  /* ---------- navigazione ---------- */
  const ROTTE = [
    [/^$/, () => FT.views.home()],
    [/^m\/([\w-]+)\/scegli$/, m => FT.views.scegli({ id: m[1] })],
    [/^m\/([\w-]+)$/, m => FT.views.macchina({ id: m[1] })],
    [/^odp$/, () => FT.views.elencoOdp()],
    [/^odp\/(.+)$/, m => FT.views.odp({ num: decodeURIComponent(m[1]) })],
    [/^aiuto$/, () => FT.views.aiuto()],
    [/^admin(?:\/([a-z]+))?$/, m => FT.views.admin({ pagina: m[1] || 'panoramica' })],
  ];
  const rotta = () => location.hash.replace(/^#\/?/, '');
  A.allaUscita = fn => uscite.push(fn);
  A.render = () => {
    uscite.splice(0).forEach(fn => { try { fn(); } catch (e) { /* ignora */ } });
    const h = rotta();
    const r = ROTTE.find(([re]) => re.test(h));
    try { r ? r[1](h.match(r[0])) : FT.views.home(); }
    catch (e) { console.error(e); document.getElementById('vista').innerHTML = `<div class="vuoto">${UI.ic('attenzione')}Errore nella pagina: ${U.esc(e.message)}<br><a class="btn blu" href="#/">Torna alla pagina iniziale</a></div>`; }
    A.banner(); A.tick();
  };
  A.indietro = () => {
    if (pila.length > 1) { history.back(); return; }
    const h = rotta(); let su = '';
    const m = h.match(/^m\/([\w-]+)\/scegli$/); if (m) su = 'm/' + m[1];
    else if (/^odp\/.+/.test(h)) su = 'odp';
    location.hash = '#/' + su;
  };
  window.addEventListener('hashchange', () => {
    const h = rotta();
    if (pila.length > 1 && pila[pila.length - 2] === h) pila.pop(); else pila.push(h);
    if (pila.length > 50) pila = pila.slice(-50);
    UI.chiudiModali(); window.scrollTo(0, 0); A.render();
  });

  /* ---------- avvisi in alto ---------- */
  A.banner = () => {
    const M = FT.model, el = document.getElementById('banner'); if (!el) return;
    const v = [];
    if (Date.now() < M.ultimoTimestamp() - minuti(5) || new Date().getFullYear() < 2026) v.push(['rosso', 'orologio', 'La data o l\'ora del tablet sembrano sbagliate: sono precedenti ai dati già registrati. Correggile nelle impostazioni di Android prima di continuare.', null]);
    if (nuovaVersione) v.push(['blu', 'aggiorna', 'È disponibile una nuova versione dell\'app.', ['Aggiorna', () => { if (swReg && swReg.waiting) swReg.waiting.postMessage('salta-attesa'); else location.reload(); }]]);
    if (nInbox) v.push(['blu', 'posta', `${nInbox === 1 ? 'Un file ricevuto' : nInbox + ' file ricevuti'} da importare.`, ['Apri', () => { location.hash = '#/admin/ricevuti'; }]]);
    if (FT.bak.dovuto()) v.push(['giallo strisce', 'salva', 'Al primo tocco l\'app salva il backup di oggi nella cartella Download.', null]);
    if (!M.dati.odp.size && !rotta().startsWith('admin')) v.push(['blu', 'carica', 'Nessun ODP caricato: il supervisore deve importare le estrazioni del gestionale.', ['Importa', () => { location.hash = '#/admin/importa'; }]]);
    el.innerHTML = v.map(([c, i, t, b], k) => `<div class="bn ${c}">${UI.ic(i)}<span class="bn-t">${t}</span>${b ? `<button class="btn blu s" type="button" data-bn="${k}">${b[0]}</button>` : ''}</div>`).join('');
    v.forEach(([, , , b], k) => { if (b) { const x = el.querySelector(`[data-bn="${k}"]`); if (x) x.onclick = b[1]; } });
  };

  /* ---------- orologio e timer ---------- */
  A.aggiornaOrologio = () => { const el = document.querySelector('[data-orologio]'); if (el) el.textContent = U.fmtOra(Date.now()); };
  A.tick = () => {
    const M = FT.model, ora = Date.now();
    A.aggiornaOrologio();
    document.querySelectorAll('[data-run]').forEach(el => { const l = M.lav(el.dataset.run); if (l) el.textContent = U.fmtTimer(M.netto(l, ora)); });
    document.querySelectorAll('[data-pausa]').forEach(el => { const l = M.lav(el.dataset.pausa); const da = l && M.inPausaDa(l); if (da) el.textContent = U.fmtTimer(ora - da); });
  };

  /* ---------- schermo acceso ---------- */
  A.aggiornaWakeLock = async () => {
    try {
      const serve = S().wake && document.visibilityState === 'visible' && FT.model.aperte().some(l => l.stato === 'attiva');
      if (serve && !wake && navigator.wakeLock) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
      else if (!serve && wake) { await wake.release(); wake = null; }
    } catch (e) { wake = null; }
  };

  /* ---------- controlli periodici ---------- */
  function controlli() {
    const M = FT.model, ora = Date.now();
    const fatte = M.autoChiusure(ora);
    if (fatte.length) { A.render(); UI.toast(`Chiusura automatica: ${fatte.map(l => 'ODP ' + l.odp).join(', ')}`, { icona: 'attenzione', durata: 8000 }); A.aggiornaWakeLock(); }
    const homeMin = +S().homeMin || 0;
    if (homeMin && rotta() !== '' && !rotta().startsWith('admin') && ora - ultimoTocco > minuti(homeMin)) { UI.chiudiModali(); location.hash = '#/'; }
    if (adminFino && !A.isAdmin()) { adminFino = 0; if (rotta().startsWith('admin')) { UI.chiudiModali(); location.hash = '#/'; } else A.render(); }
  }
  async function controllaInbox() {
    try { const n = (await FT.db.inboxTutti()).length; if (n !== nInbox) { nInbox = n; A.banner(); } } catch (e) { /* ignora */ }
  }

  /* ---------- backup giornaliero al primo tocco ---------- */
  let backupInCorso = false;
  async function backupGiornaliero() {
    if (backupInCorso || !FT.bak.dovuto()) return;
    backupInCorso = true;
    try {
      const b = await FT.bak.crea();
      UI.scarica(b.blob, b.nome);
      FT.model.salvaMeta({ lastBackup: U.giorno() });
      UI.toast('Backup di oggi salvato in Download', { icona: 'salva' });
      A.banner();
    } catch (e) { console.error(e); } finally { backupInCorso = false; }
  }

  /* ---------- service worker e aggiornamenti ---------- */
  function registraSW() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    navigator.serviceWorker.register('sw.js').then(reg => {
      swReg = reg;
      const segnala = () => { if (reg.waiting && navigator.serviceWorker.controller) { nuovaVersione = true; A.banner(); } };
      segnala();
      reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') segnala(); }); });
      setInterval(() => reg.update().catch(() => {}), minuti(60));
    }).catch(e => console.warn('Service worker non registrato', e));
    let ricaricato = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (ricaricato) return; ricaricato = true; location.reload(); });
  }

  /* ---------- avvio ---------- */
  async function avvio() {
    const vista = document.getElementById('vista');
    FT.db.suErrore(e => { console.error(e); UI.toast('Errore nel salvataggio dei dati: ' + (e && e.message), { errore: true, durata: 8000 }); });
    let dati;
    try {
      await FT.db.apri();
      const [odp, lav, art, settings, meta] = await Promise.all([FT.db.tutti('odp'), FT.db.tutti('lav'), FT.db.tutti('art'), FT.db.kvLeggi('settings'), FT.db.kvLeggi('meta')]);
      dati = { odp, lav, art, settings, meta };
    } catch (e) {
      console.error(e);
      vista.innerHTML = `<div class="vuoto">${UI.ic('attenzione')}L'archivio dati del tablet non è disponibile (${U.esc(e && e.message)}).<br>Apri l'app da Chrome in modalità normale, non in incognito.</div>`;
      return;
    }
    const M = FT.model;
    M.carica(dati);
    M.persistenza({
      lav: l => FT.db.scrivi('lav', l), odp: o => FT.db.scrivi('odp', o), art: a => FT.db.scrivi('art', a),
      delLav: id => FT.db.cancella('lav', id), delOdp: n => FT.db.cancella('odp', n), delArt: c => FT.db.cancella('art', c),
      settings: s => FT.db.kvScrivi('settings', s), meta: m => FT.db.kvScrivi('meta', m),
    });
    if (!dati.settings) FT.db.kvScrivi('settings', M.dati.settings);
    if (!dati.meta) FT.db.kvScrivi('meta', M.dati.meta);

    document.addEventListener('pointerdown', () => { ultimoTocco = Date.now(); if (A.isAdmin()) estendiAdmin(); backupGiornaliero(); }, true);
    document.addEventListener('keydown', () => { ultimoTocco = Date.now(); if (A.isAdmin()) estendiAdmin(); }, true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') { controlli(); A.render(); controllaInbox(); FT.bak.copia('giorno').catch(() => {}); }
      A.aggiornaWakeLock();
    });
    window.addEventListener('pagehide', () => { FT.db.attendi(); });

    if (/[?&]condiviso=1/.test(location.search)) history.replaceState(null, '', location.pathname + (location.hash || '#/admin/ricevuti'));
    pila = [rotta()];
    M.autoChiusure();
    A.render();
    setInterval(A.tick, 1000);
    setInterval(controlli, 15000);
    setInterval(controllaInbox, 60000);
    controllaInbox();
    setTimeout(() => FT.bak.copia('giorno').catch(e => console.warn('Copia interna non riuscita', e)), 5000);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    A.aggiornaWakeLock();
    registraSW();
  }

  FT.app = A;
  document.addEventListener('DOMContentLoaded', avvio);
})(self.FT = self.FT || {});
