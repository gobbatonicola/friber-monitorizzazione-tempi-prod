/* Tempi Friber — componenti dell'interfaccia: icone, finestre, tastierino, avvisi. */
(function (FT) {
  'use strict';
  const U = FT.u;
  const UI = {};

  /* ---------- pittogrammi (24×24, tratto 2) ---------- */
  const P = {
    indietro: '<path d="M15 5l-7 7 7 7"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
    elenco: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="3"/>',
    lucchetto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    sbloccato: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/>',
    aiuto: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.9-.9 1.6v.4"/><path d="M12 17h.01" stroke-width="3"/>',
    play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
    pausa: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
    piu: '<path d="M12 5v14M5 12h14" stroke-width="2.6"/>',
    meno: '<path d="M5 12h14" stroke-width="2.6"/>',
    uguale: '<path d="M5 9h14M5 15h14" stroke-width="2.6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" stroke-width="2.6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01" stroke-width="3"/>',
    cerca: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    orologio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    buono: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5" stroke-width="2.4"/>',
    scarto: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6" stroke-width="2.4"/>',
    carica: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    scarica: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    condividi: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    salva: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    modifica: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    cestino: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    ingranaggio: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    attenzione: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5"/><path d="M12 17.3h.01" stroke-width="3"/>',
    archivio: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
    luna: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    chiave: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z"/>',
    scatola: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
    lama: '<rect x="3" y="8" width="18" height="6" rx="1"/><path d="M4 14l1.6 2.5L7.2 14l1.6 2.5L10.4 14l1.6 2.5 1.6-2.5 1.6 2.5 1.6-2.5 1.6 2.5L20 14"/>',
    caffe: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3"/>',
    nota: '<path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    sega: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2"/><path d="M12 4.5l2-2.3M19.5 12l2.3 2M12 19.5l-2 2.3M4.5 12l-2.3-2M17.3 6.7l3-.4M17.3 17.3l.4 3M6.7 17.3l-3 .4M6.7 6.7l-.4-3"/>',
    nastro: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="12" r="2.2"/><circle cx="17" cy="12" r="2.2"/>',
    mola: '<circle cx="8" cy="14.5" r="5"/><circle cx="8" cy="14.5" r="1.2"/><path d="M11.6 11L20 4.5M12.8 14.5H21"/>',
    robot: '<path d="M4 21h9"/><path d="M8.5 21v-3.5L11 11l5.5-1.5"/><circle cx="11" cy="11" r="1.8"/><path d="M16.5 9.5L19 6.5M16.5 9.5l3.3 1.2"/><path d="M6 17.5h5"/>',
    sabbia: '<path d="M3 6.5h7.5L13 9v2H3z"/><path d="M13 10h2.5"/><path d="M17.5 7h.01M19.5 10h.01M17.5 13h.01M21 8h.01M21.2 12.3h.01M19.4 15.4h.01" stroke-width="2.8"/>',
    fabbrica: '<path d="M3 21V10l6 3V10l6 3V6l6-3v18z"/><path d="M7 17h2M12 17h2M17 17h1"/>',
    grafico: '<path d="M4 20V4M4 20h16"/><path d="M8.5 16v-4M12.5 16V8M16.5 16v-6" stroke-width="2.6"/>',
    calendario: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    tastiera: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" stroke-width="2.4"/>',
    lettere: '<path d="M4 18l4-12 4 12M5.5 14h5"/><path d="M14 18V8h3.5a2.5 2.5 0 0 1 0 5H14h4a2.5 2.5 0 0 1 0 5z"/>',
    fotocamera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    annulla: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    riapri: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    freccia: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    posta: '<path d="M4 13l2.5-8h11L20 13v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
    strati: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    articolo: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    esci: '<path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4M18 12H9"/>',
    aggiorna: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8"/><path d="M20 3v5h-5"/>',
    cancella: '<path d="M8.5 5H20v14H8.5L3 12z"/><path d="M11.5 9l5 6M16.5 9l-5 6"/>',
    lampo: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    percorso: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6h7a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h7"/>',
  };
  UI.P = P;
  UI.ic = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[n] || ''}</svg>`;
  UI.icFase = id => UI.ic({ TAG: 'sega', NAS: 'nastro', MAN: 'mola', TRE: 'robot', SAB: 'sabbia' }[id] || 'fabbrica');
  UI.icCausa = c => UI.ic({ 'Fine turno': 'luna', 'Fine turno (automatica)': 'luna', 'Fermo macchina': 'chiave', 'Attesa materiale': 'scatola', 'Cambio lama o nastro': 'lama', 'Pausa': 'caffe', 'Chiusura automatica': 'attenzione', 'Cambio ODP': 'riapri', 'Senza causa': 'pausa' }[c] || 'nota');

  UI.$ = (s, el = document) => el.querySelector(s);
  UI.$$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  UI.vibra = (ms = 15) => { try { if (FT.model.dati.settings.vibra && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* non supportato */ } };

  /* ---------- avviso in basso (con eventuale "Annulla") ---------- */
  let tToast = null;
  UI.toast = (msg, opz = {}) => {
    const el = document.getElementById('toast');
    el.className = 'toast on' + (opz.errore ? ' err' : '');
    el.innerHTML = `${UI.ic(opz.errore ? 'attenzione' : (opz.icona || 'check'))}<span>${U.esc(msg)}</span>` + (opz.annulla ? `<button class="toast-btn" type="button">${UI.ic('annulla')}Annulla</button>` : '');
    if (opz.annulla) el.querySelector('button').onclick = () => { el.className = 'toast'; clearTimeout(tToast); opz.annulla(); };
    clearTimeout(tToast);
    tToast = setTimeout(() => { el.className = 'toast'; }, opz.durata || (opz.annulla ? 8000 : 3200));
  };

  /* ---------- finestre ---------- */
  UI.modale = (html, { onApri, onChiudi, chiudibile = true, cls = '' } = {}) => {
    const root = document.getElementById('modali');
    const ov = document.createElement('div'); ov.className = 'ov';
    ov.innerHTML = `<div class="md ${cls}" role="dialog" aria-modal="true" tabindex="-1">${html}</div>`;
    root.appendChild(ov);
    const md = ov.firstElementChild;
    const tasto = e => { if (e.key === 'Escape' && chiudibile) chiudi(); };
    let chiuso = false;
    const chiudi = () => { if (chiuso) return; chiuso = true; ov.remove(); document.removeEventListener('keydown', tasto); if (onChiudi) onChiudi(); };
    document.addEventListener('keydown', tasto);
    if (chiudibile) ov.addEventListener('click', e => { if (e.target === ov) chiudi(); });
    ov.addEventListener('chiudi', () => chiudi());
    UI.$$('[data-chiudi]', md).forEach(b => b.addEventListener('click', chiudi));
    if (onApri) onApri(md, chiudi);
    setTimeout(() => { const f = md.querySelector('[autofocus]'); (f || md).focus({ preventScroll: true }); }, 20);
    return chiudi;
  };
  UI.chiudiModali = () => { UI.$$('#modali .ov').forEach(ov => ov.dispatchEvent(new CustomEvent('chiudi'))); document.getElementById('modali').innerHTML = ''; };
  UI.conferma = ({ titolo, testo, ok = 'Conferma', cls = 'rosso', icona = 'attenzione', okIcona = 'check' }) => new Promise(res => {
    let esito = false;
    UI.modale(`<h2>${UI.ic(icona)}${U.esc(titolo)}</h2><div class="md-testo">${testo}</div>
      <div class="azioni"><button class="btn chiaro" type="button" data-no>${UI.ic('x')}Annulla</button><button class="btn ${cls}" type="button" data-si>${UI.ic(okIcona)}${U.esc(ok)}</button></div>`,
    { onChiudi: () => res(esito), onApri: (md, chiudi) => { md.querySelector('[data-si]').onclick = () => { esito = true; chiudi(); }; md.querySelector('[data-no]').onclick = () => chiudi(); } });
  });

  // Tastierino numerico grande (pezzi, PIN). Con "conta" offre Aggiungi e Totale.
  UI.tastierino = ({ titolo, icona, valore = '', maschera = false, max = 6, conta = false, attuale = 0, nota = '' }) => new Promise(res => {
    let v = maschera ? '' : String(valore || ''), esito = null;
    const tasti = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'B'];
    const azioni = conta
      ? `<button class="btn chiaro" type="button" data-chiudi>${UI.ic('x')}Annulla</button><button class="btn blu" type="button" data-a="tot">${UI.ic('uguale')}Totale</button><button class="btn verde" type="button" data-a="add">${UI.ic('piu')}Aggiungi</button>`
      : `<button class="btn chiaro" type="button" data-chiudi>${UI.ic('x')}Annulla</button><button class="btn verde" type="button" data-a="ok">${UI.ic('check')}OK</button>`;
    UI.modale(`<h2>${icona ? UI.ic(icona) : ''}${U.esc(titolo)}</h2>
      ${conta ? `<p class="md-testo">Registrati finora: <b>${U.fmtInt(attuale)}</b>. Scrivi il numero, poi scegli se aggiungerlo o se è il totale.</p>` : ''}
      ${nota ? `<p class="md-testo">${nota}</p>` : ''}
      <div class="pad-disp" data-disp aria-live="polite"></div>
      <div class="pad">${tasti.map(k => `<button type="button" data-k="${k}" aria-label="${k === 'B' ? 'Cancella ultima cifra' : k === 'C' ? 'Azzera' : k}">${k === 'B' ? UI.ic('cancella') : k}</button>`).join('')}</div>
      <div class="azioni">${azioni}</div>`, {
      cls: 'md-pad',
      onChiudi: () => res(esito),
      onApri: (md, chiudi) => {
        const disp = md.querySelector('[data-disp]');
        const mostra = () => { disp.textContent = maschera ? ('•'.repeat(v.length) || ' ') : U.fmtInt(parseInt(v || '0', 10)); };
        const premi = k => { if (k === 'C') v = ''; else if (k === 'B') v = v.slice(0, -1); else if (v.length < max) v = (v === '0' ? '' : v) + k; mostra(); };
        mostra();
        UI.$$('[data-k]', md).forEach(b => b.onclick = () => { UI.vibra(8); premi(b.dataset.k); });
        UI.$$('[data-a]', md).forEach(b => b.onclick = () => { esito = maschera ? v : { n: parseInt(v || '0', 10), azione: b.dataset.a }; chiudi(); });
        md.addEventListener('keydown', e => {
          if (/^\d$/.test(e.key)) premi(e.key); else if (e.key === 'Backspace') premi('B');
          else if (e.key === 'Enter') { const b = md.querySelector('[data-a="add"],[data-a="ok"]'); if (b) b.click(); }
        });
      },
    });
  });

  /* ---------- file ---------- */
  UI.scarica = (blob, nome) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
  };
  UI.puoCondividere = (nome, tipo) => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], nome, { type: tipo })] })); } catch (e) { return false; } };
  UI.condividi = async (blob, nome, titolo) => {
    const f = new File([blob], nome, { type: blob.type });
    if (!(navigator.canShare && navigator.canShare({ files: [f] }))) return false;
    await navigator.share({ files: [f], title: titolo }); return true;
  };
  const caricati = {};
  UI.caricaScript = src => caricati[src] || (caricati[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = () => res(); s.onerror = () => { delete caricati[src]; rej(new Error('Impossibile caricare ' + src)); };
    document.head.appendChild(s);
  }));
  UI.scegliFile = ({ accetta, multipli = false }) => new Promise(res => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accetta; inp.multiple = multipli; inp.style.display = 'none';
    inp.onchange = () => { res([...inp.files]); inp.remove(); };
    document.body.appendChild(inp); inp.click();
  });

  /* ---------- barra superiore ---------- */
  UI.barra = ({ titolo, sotto = '', indietro = false }) => {
    const b = document.getElementById('barra');
    const adm = FT.app.isAdmin();
    b.innerHTML = `${indietro ? `<button class="bb" type="button" data-back aria-label="Indietro">${UI.ic('indietro')}</button>` : `<a class="bb" href="#/" aria-label="Home">${UI.ic('fabbrica')}</a>`}
      <div class="bt"><div class="bt-1">${U.esc(titolo)}</div>${sotto ? `<div class="bt-2">${sotto}</div>` : ''}</div>
      <div class="bclock" data-orologio></div>
      <a class="bb${(location.hash.replace(/^#\/?/, '') === '') ? ' attivo' : ''}" href="#/" aria-label="Pagina iniziale">${UI.ic('home')}</a>
      <a class="bb" href="#/aiuto" aria-label="Guida">${UI.ic('aiuto')}</a>
      <a class="bb" href="#/odp" aria-label="Elenco ODP">${UI.ic('elenco')}</a>
      <button class="bb${adm ? ' attivo' : ''}" type="button" data-admin aria-label="Area supervisore">${UI.ic(adm ? 'sbloccato' : 'lucchetto')}</button>`;
    const back = b.querySelector('[data-back]');
    if (back) back.onclick = () => FT.app.indietro();
    b.querySelector('[data-admin]').onclick = () => FT.app.chiediPin().then(ok => { if (ok) location.hash = '#/admin'; });
    FT.app.aggiornaOrologio();
  };

  FT.ui = UI;
})(self.FT = self.FT || {});
