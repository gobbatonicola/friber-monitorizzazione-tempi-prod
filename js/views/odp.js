/* Tempi Friber — dettaglio ODP (avanzamento, accumuli giorno per giorno, colate) ed elenco ODP. */
(function (FT) {
  'use strict';
  const U = FT.u, C = FT.cfg, UI = FT.ui;
  FT.views = FT.views || {};
  const SERIE = [
    { k: 'daTagliare', nome: 'Da tagliare', col: 'var(--s1)' },
    { k: 'attesaSbav', nome: 'In attesa di sbavatura', col: 'var(--s2)' },
    { k: 'attesaSec', nome: 'In attesa di seconda sbavatura', col: 'var(--s3)' },
    { k: 'attesaSab', nome: 'In attesa di sabbiatura', col: 'var(--s4)' },
  ];

  FT.views.flussoHtml = a => {
    const p = (v, t, cls) => `<div class="passo ${v < 0 ? 'neg' : cls || ''}"><b>${U.fmtInt(v)}</b><span>${t}</span></div>`;
    const fr = `<div class="fr" aria-hidden="true">${UI.ic('freccia')}</div>`;
    return `<div class="flusso">
      ${p(a.prod, a.pre > 0 ? `colati, di cui ${U.fmtInt(a.pre)} prima dell'avvio` : 'colati')}${fr}
      ${p(a.daTagliare, 'da tagliare', a.daTagliare > 0 ? 'coda' : '')}${fr}
      ${p(a.attesaSbav, 'in attesa di sbavatura', a.attesaSbav > 0 ? 'coda' : '')}${fr}
      ${a.attesaMan || a.manSecondo ? p(a.attesaMan, 'in attesa di manuale, dopo il nastro', a.attesaMan > 0 ? 'coda' : '') + fr : ''}
      ${a.attesaNas || a.nasSecondo ? p(a.attesaNas, 'in attesa di nastro, dopo il manuale', a.attesaNas > 0 ? 'coda' : '') + fr : ''}
      ${p(a.attesaSab, 'in attesa di sabbiatura', a.attesaSab > 0 ? 'coda' : '')}${fr}
      ${p(a.finiti, 'finiti', 'fine')}
      <div class="spazio"></div>
      ${p(a.scarti, 'scarti totali', a.scarti ? 'ko' : '')}${p(a.rimanente, 'rimanenti nel ciclo')}${a.prelevati ? p(a.prelevati, 'lavorati tra quelli colati prima dell\'avvio') : ''}</div>`;
  };

  function graficoAccumuli(tutte) {
    const avvio = FT.model.dati.settings.dataAvvio;
    let righe = avvio ? tutte.filter(r => r.g >= avvio) : tutte;
    righe = righe.slice(-45);
    if (righe.length < 2) return `<p class="sp">Il grafico compare quando ci sono almeno due giorni con colate o lavorazioni${avvio ? ` dal ${U.fmtGiorno(avvio)}` : ''}.</p>`;
    const val = r => SERIE.map(s => Math.max(0, r.q[s.k]));
    const max = Math.max(...righe.map(r => val(r).reduce((a, b) => a + b, 0)));
    if (!max) return `<p class="sp">Nessun pezzo fermo in coda a fine giornata${avvio ? ` dal ${U.fmtGiorno(avvio)}` : ''}.</p>`;
    const passo = Math.max(2, Math.ceil(righe.length / 12));
    const legenda = `<div class="leggenda">${SERIE.map(s => `<span><i style="background:${s.col}"></i>${s.nome}</span>`).join('')}</div>`;
    return `<p class="sp">Pezzi fermi in coda a fine giornata, per fase. Max ${U.fmtInt(max)} pezzi.</p>
      <div class="colonne" role="img" aria-label="Andamento degli accumuli giorno per giorno: i valori sono nella tabella sotto">${righe.map((r, i) => {
        const v = val(r); const tot = v.reduce((a, b) => a + b, 0);
        return `<div class="colonna" tabindex="0" data-i="${i}" style="height:100%">${v.map((x, k) => x > 0 ? `<i style="height:calc(${(x / max) * 100}% - 2px);background:${SERIE[k].col}"></i>` : '').join('')}${tot === 0 ? '' : ''}</div>`;
      }).join('')}</div>
      <div class="assi-col">${righe.map((r, i) => `<span>${(righe.length - 1 - i) % passo === 0 ? U.fmtGiornoBreve(r.g) : ''}</span>`).join('')}</div>${legenda}`;
  }

  function legaTooltip(box, righe) {
    let tip = null;
    const mostra = (el, x, y) => {
      const r = righe[+el.dataset.i]; if (!r) return;
      if (!tip) { tip = document.createElement('div'); tip.className = 'tooltip'; document.body.appendChild(tip); }
      tip.innerHTML = `<div><b>${U.fmtGiorno(r.g)}</b></div>` + SERIE.map(s => `<div class="tl"><i style="background:${s.col}"></i><b>${U.fmtInt(Math.max(0, r.q[s.k]))}</b> ${s.nome.toLowerCase()}</div>`).join('') + `<div class="tl">Finiti <b>${U.fmtInt(r.q.finiti)}</b></div>`;
      const w = tip.offsetWidth; tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2)) + 'px'; tip.style.top = Math.max(8, y - tip.offsetHeight - 14) + 'px';
    };
    const nascondi = () => { if (tip) { tip.remove(); tip = null; } };
    UI.$$('.colonna', box).forEach(el => {
      el.addEventListener('pointerenter', e => mostra(el, e.clientX, e.clientY));
      el.addEventListener('pointermove', e => mostra(el, e.clientX, e.clientY));
      el.addEventListener('pointerdown', e => mostra(el, e.clientX, e.clientY));
      el.addEventListener('pointerleave', nascondi);
      el.addEventListener('focus', () => { const b = el.getBoundingClientRect(); mostra(el, b.left + b.width / 2, b.top); });
      el.addEventListener('blur', nascondi);
    });
    FT.app.allaUscita(nascondi);
  }

  FT.views.odp = ({ num }) => {
    const M = FT.model, o = M.odp(num);
    if (!o) { UI.barra({ titolo: 'ODP non trovato', indietro: true }); document.getElementById('vista').innerHTML = `<div class="vuoto">${UI.ic('cerca')}L'ODP ${U.esc(num)} non è tra quelli importati.</div>`; return; }
    UI.barra({ titolo: `ODP ${o.num}`, sotto: `${o.codProd} ${o.descr}`, indietro: true });
    const a = M.avanzamento(o.num), pf = M.perFase(o.num), st = M.storico(o.num);
    const L = M.lavDiOdp(o.num).slice().sort((x, y) => M.inizio(y) - M.inizio(x));
    const perc = M.percorso(o.num);
    const adm = FT.app.isAdmin();
    document.getElementById('vista').innerHTML = `
      <section class="pannello"><div class="lav-testa"><div class="lav-id"><div class="odpn"><small>ODP</small>${U.esc(o.num)}${o.archiviato ? '<span class="etich-s">Archiviato</span>' : ''}</div>
        <div class="art"><b>${U.esc(o.codProd)}</b> ${U.esc(o.descr)}</div><div class="cli">${U.esc(o.cliente)}, linea ${U.esc(o.linea)}${o.consegna ? `, consegna ${U.fmtGiorno(o.consegna)}` : ''}</div></div>
        <div class="lav-stato"><div class="det">Percorso sbavatura</div><div style="font:700 24px var(--f-num)">${U.esc(C.percorso(perc).nome)}</div></div></div></section>
      <section class="pannello"><h2>${UI.ic('percorso')}Avanzamento dei pezzi</h2>${FT.views.flussoHtml(a)}
        <div class="tab-w" style="margin-top:14px"><table class="tab"><thead><tr><th>Fase</th><th class="n">Lavorazioni</th><th class="n">Buoni</th><th class="n">Scarti</th><th class="n">Tempo netto</th><th class="n">Min per pezzo</th></tr></thead><tbody>
        ${C.FASI.map(f => { const x = pf[f.id]; return `<tr><td>${UI.icFase(f.id)} ${f.nome}</td><td class="n">${x.n}</td><td class="n">${U.fmtInt(x.b)}</td><td class="n">${U.fmtInt(x.s)}</td><td class="n">${U.fmtDurata(x.ms)}</td><td class="n">${x.b ? U.fmtNum(x.ms / 60000 / x.b, 2) : '—'}</td></tr>`; }).join('')}
        </tbody></table></div></section>
      <div class="griglia-2">
        <section class="pannello" data-graf><h2>${UI.ic('grafico')}Accumuli giorno per giorno</h2>${graficoAccumuli(st.righe)}
          ${st.righe.length ? `<div class="tab-w" style="margin-top:12px;max-height:320px;overflow:auto"><table class="tab"><thead><tr><th>Giorno</th><th class="n">Colati</th><th class="n">Tagliati</th><th class="n">Sbavati</th><th class="n">Sabbiati</th><th class="n">Da tagliare</th><th class="n">Attesa sbav.</th><th class="n">Attesa man.</th><th class="n">Attesa sabb.</th><th class="n">Finiti</th></tr></thead><tbody>
          ${st.righe.slice().reverse().map(r => `<tr><td>${U.fmtGiorno(r.g)}</td><td class="n">${U.fmtInt(r.colati)}</td><td class="n">${U.fmtInt(r.taglio)}</td><td class="n">${U.fmtInt(r.sbav)}</td><td class="n">${U.fmtInt(r.sab)}</td><td class="n">${U.fmtInt(r.q.daTagliare)}</td><td class="n">${U.fmtInt(r.q.attesaSbav)}</td><td class="n">${U.fmtInt(r.q.attesaMan)}</td><td class="n">${U.fmtInt(r.q.attesaSab)}</td><td class="n">${U.fmtInt(r.q.finiti)}</td></tr>`).join('')}
          </tbody></table></div>` : ''}</section>
        <section class="pannello"><h2>${UI.ic('calendario')}Colate giornaliere</h2>
          ${(o.colate || []).length ? `<div class="tab-w" style="max-height:420px;overflow:auto"><table class="tab"><thead><tr><th>Data programma</th><th class="n">Completata</th><th class="n">Pianificata</th><th class="n">Residua</th><th></th></tr></thead><tbody>
          ${o.colate.map(c => `<tr><td>${U.fmtGiorno(c.data)}</td><td class="n">${U.fmtInt(c.qCompl)}</td><td class="n">${U.fmtInt(c.qPian)}</td><td class="n">${U.fmtInt(c.qRes)}</td><td class="muto">${c.qCompl > 0 ? '' : 'programmata'}</td></tr>`).join('')}
          <tr class="tot"><td>Totale righe</td><td class="n">${U.fmtInt(o.qComplTot)}</td><td class="n">${U.fmtInt(o.qPianTot)}</td><td class="n">${U.fmtInt(o.qResErp)}</td><td></td></tr></tbody></table></div>
          <p class="sp" style="margin-top:10px">Quantità prodotta nel gestionale: <b>${U.fmtInt(o.qProdErp)}</b>${o.qProdErp !== o.qComplTot ? '. La differenza con la somma delle righe riguarda colate non presenti nell\'estrazione.' : '.'}</p>` : '<p class="sp">Nessuna riga di colata nell\'estrazione.</p>'}</section>
      </div>
      <section class="pannello"><h2>${UI.ic('strati')}Lavorazioni registrate<span class="dx">${L.length}</span></h2>
        ${L.length ? `<div class="tab-w"><table class="tab"><thead><tr><th>Postazione</th><th>Inizio</th><th>Stato</th><th class="n">Tempo netto</th><th class="n">Buoni</th><th class="n">Scarti</th><th class="n">Min per pezzo</th>${adm ? '<th></th>' : ''}</tr></thead><tbody>
        ${L.map(l => `<tr><td>${UI.icFase(l.fase)} ${U.esc(C.macchina(l.mac).nome)}${M.conDest(l.fase) && l.dest ? ` <span class="muto">poi ${{ MAN: 'manuale', NAS: 'nastro', SAB: 'sabbiatura' }[l.dest]}</span>` : ''}</td><td>${U.fmtDataOra(M.inizio(l))}</td>
          <td>${{ attiva: 'In corso', pausa: 'In pausa', chiusa: 'Chiusa' }[l.stato]}${M.haAuto(l) ? ' ' + UI.ic('attenzione') : ''}</td><td class="n">${U.fmtDurata(M.netto(l))}</td>
          <td class="n">${U.fmtInt(l.buoni)}</td><td class="n">${U.fmtInt(l.scarti)}</td><td class="n">${l.buoni ? U.fmtNum(M.netto(l) / 60000 / l.buoni, 2) : '—'}</td>
          ${adm ? `<td><button class="btn chiaro s" type="button" data-mod="${l.id}">${UI.ic('modifica')}Correggi</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<p class="sp">Nessuna lavorazione registrata per questo ODP.</p>'}</section>
      <section class="pannello"><h2>${UI.ic('info')}Dati del gestionale</h2><div class="kv">
        <div>N. lavorazione<b>${U.esc(o.ordLav || '—')}</b></div><div>Ordine cliente<b>${U.esc(o.ordCli || '—')}</b></div><div>Codice cliente<b>${U.esc(o.codCli || '—')}</b></div>
        <div>Codice modello<b>${U.esc(o.codMod || '—')}</b></div><div>Lega<b>${U.esc(o.lega || '—')}</b></div><div>Stato<b>${U.esc(o.stato || '—')}</b></div>
        <div>Residuo da colare<b>${U.fmtInt(o.qResErp)}</b></div><div>Ultimo aggiornamento<b>${U.fmtDataOraLunga(o.aggiornato)}</b></div><div class="largo">File di origine<b>${U.esc((o.fonti || []).join(', ') || '—')}</b></div></div></section>`;
    const avvio = M.dati.settings.dataAvvio;
    const g = UI.$('[data-graf]'); if (g) legaTooltip(g, (avvio ? st.righe.filter(r => r.g >= avvio) : st.righe).slice(-45));
    UI.$$('[data-mod]').forEach(b => b.onclick = () => FT.views.modificaLav(M.lav(b.dataset.mod)));
  };

  /* ---------- elenco ODP ---------- */
  const stLista = { q: '', filtro: 'attivi', linea: '', limite: 80 };
  FT.views.elencoOdp = () => {
    const M = FT.model;
    UI.barra({ titolo: 'Elenco ODP', sotto: `${M.dati.odp.size} ODP importati`, indietro: true });
    document.getElementById('vista').innerHTML = `
      <div class="ricerca"><div class="campo-r">${UI.ic('cerca')}<input data-q type="search" autocomplete="off" placeholder="Numero ODP, codice, descrizione o cliente" value="${U.esc(stLista.q)}" aria-label="Cerca ODP"></div></div>
      <div class="chips" style="margin-bottom:8px">${[['attivi', 'In lavorazione o in attesa'], ['completati', 'Completati'], ['archiviati', 'Archiviati'], ['tutti', 'Tutti']].map(([k, t]) => `<button class="chip ${stLista.filtro === k ? 'on' : ''}" type="button" data-f="${k}">${t}</button>`).join('')}</div>
      <div class="chips" style="margin-bottom:12px">${['', 'Automatico', 'Manuale', 'Rulliera'].map(x => `<button class="chip ${stLista.linea === x ? 'on' : ''}" type="button" data-lin="${x}">${x || 'Tutte le linee'}</button>`).join('')}</div>
      <div data-lista></div>`;
    const inp = UI.$('[data-q]');
    const disegna = () => {
      stLista.q = inp.value; const q = U.normTesto(stLista.q);
      let L = [...M.dati.odp.values()].filter(o => (!stLista.linea || o.linea === stLista.linea));
      if (stLista.filtro === 'archiviati') L = L.filter(o => o.archiviato);
      else if (stLista.filtro === 'completati') L = L.filter(o => !o.archiviato && M.completato(o.num));
      else if (stLista.filtro === 'attivi') L = L.filter(o => !o.archiviato && !M.completato(o.num));
      if (q) L = L.filter(o => U.normTesto(`${o.num} ${o.ordLav} ${o.codProd} ${o.descr} ${o.cliente}`).includes(q));
      L.sort((x, y) => (x.consegna || '9').localeCompare(y.consegna || '9') || x.num.localeCompare(y.num));
      const tot = L.length; L = L.slice(0, stLista.limite);
      const box = UI.$('[data-lista]');
      if (!tot) { box.innerHTML = `<div class="vuoto">${UI.ic('cerca')}Nessun ODP in questo elenco.</div>`; return; }
      box.innerHTML = `<div class="elenco-odp">${L.map(o => { const a = M.avanzamento(o.num); return `<button class="riga-odp" type="button" data-o="${U.esc(o.num)}">
        <div class="mid"><div class="n">${U.esc(o.num)}${o.archiviato ? '<span class="etich-s">Archiviato</span>' : ''}</div><div class="art"><b>${U.esc(o.codProd)}</b> ${U.esc(o.descr)}</div>
          <div class="cli">${U.esc(o.cliente)}, linea ${U.esc(o.linea)}${o.consegna ? `, consegna ${U.fmtGiorno(o.consegna)}` : ''}</div></div>
        <div class="disp zero"><b>${U.fmtInt(o.qta)}</b><span>colati</span></div><div class="disp"><b>${U.fmtInt(a.finiti)}</b><span>finiti</span></div><div class="disp zero"><b>${U.fmtInt(a.rimanente)}</b><span>nel ciclo</span></div></button>`; }).join('')}</div>
        ${tot > L.length ? `<div class="vuoto"><button class="btn chiaro" type="button" data-altri>Mostra altri (${tot - L.length})</button></div>` : ''}`;
      UI.$$('[data-o]', box).forEach(b => b.onclick = () => { location.hash = '#/odp/' + encodeURIComponent(b.dataset.o); });
      const al = UI.$('[data-altri]', box); if (al) al.onclick = () => { stLista.limite += 200; disegna(); };
    };
    inp.oninput = () => { stLista.limite = 80; disegna(); };
    UI.$$('[data-f]').forEach(b => b.onclick = () => { stLista.filtro = b.dataset.f; UI.$$('[data-f]').forEach(x => x.classList.toggle('on', x === b)); disegna(); });
    UI.$$('[data-lin]').forEach(b => b.onclick = () => { stLista.linea = b.dataset.lin; UI.$$('[data-lin]').forEach(x => x.classList.toggle('on', x === b)); disegna(); });
    disegna();
  };

  /* ---------- guida per gli operatori ---------- */
  FT.views.aiuto = () => {
    UI.barra({ titolo: 'Come si usa', sotto: 'Guida rapida per il reparto', indietro: true });
    const passo = (n, t, testo) => `<section class="pannello"><h2><span class="passo-n">${n}</span>${t}</h2><p class="sp" style="font-size:18px">${testo}</p></section>`;
    document.getElementById('vista').innerHTML = `<div class="guida">
      ${passo(1, 'Tocca la tua macchina', 'Nella pagina iniziale ogni postazione ha la sua foto. Tocca quella su cui lavori: trovi solo le lavorazioni di quella macchina.')}
      ${passo(2, 'Inizia l\'ODP', 'Tocca <b>Inizia una lavorazione</b>, cerca il numero dell\'ODP e tocca <b>Inizia</b>. Al nastro scegli dove vanno i pezzi dopo: sbavatura manuale o sabbiatura.')}
      ${passo(3, 'Conta i pezzi', 'Usa <b>+</b> e <b>−</b> per buoni e scarti, oppure tocca il numero e scrivi quanti pezzi hai fatto.')}
      ${passo(4, 'Pausa e fine', '<b>Pausa</b> ferma il tempo: a fine turno metti in pausa e il giorno dopo tocca <b>Riprendi</b>. Quando hai finito l\'ODP tocca <b>Fine</b> e conferma i pezzi.')}
      <section class="pannello"><h2>${UI.ic('info')}Colori e simboli</h2><div class="legenda-i">
        <span class="campione" style="background:var(--verde)"></span><span>In lavorazione: il tempo scorre</span>
        <span class="campione" style="background:var(--strisce)"></span><span>In pausa: il tempo è fermo</span>
        <span class="campione" style="background:var(--rosso)"></span><span>Da controllare: chiusa in automatico o vicina al limite</span>
        ${UI.ic('buono')}<span>Pezzi buoni</span>${UI.ic('scarto')}<span>Pezzi scartati</span>${UI.ic('annulla')}<span>Annulla: dopo ogni azione hai qualche secondo per tornare indietro</span>
      </div></section>
      <section class="pannello"><h2>${UI.ic('attenzione')}Se sbagli</h2><p class="sp" style="font-size:18px">Tocca <b>Annulla</b> nel messaggio in basso. Se una lavorazione chiusa per errore era di oggi, usa <b>Riapri</b> nella pagina della macchina. Per correzioni più vecchie chiama il supervisore.</p></section>
    </div>`;
  };
})(self.FT = self.FT || {});
