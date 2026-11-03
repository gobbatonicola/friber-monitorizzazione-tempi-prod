/* Tempi Friber — pagina della macchina (una per postazione) e scelta dell'ODP. */
(function (FT) {
  'use strict';
  const U = FT.u, C = FT.cfg, UI = FT.ui;
  FT.views = FT.views || {};
  const M = () => FT.model;
  const DEST = { NAS: 'Sbavatura a nastro', MAN: 'Sbavatura manuale', SAB: 'Sabbiatura' };
  const titoloDest = fase => fase === 'MAN' ? 'Dopo la sbavatura manuale i pezzi vanno a' : 'Dopo il nastro i pezzi vanno a';
  const msgDest = fase => fase === 'MAN' ? 'Indica dove vanno i pezzi dopo la sbavatura manuale.' : 'Indica dove vanno i pezzi dopo il nastro.';
  // Nastro e manuale sono intercambiabili: dall'uno si va all'altro oppure direttamente in sabbiatura.
  const destHtml = (fase, sel) => { const alt = fase === 'MAN' ? 'NAS' : 'MAN'; return `<div class="titoletto">${titoloDest(fase)}</div><div class="scelta-dest" role="radiogroup" aria-label="${titoloDest(fase)}">
      <button type="button" role="radio" data-dest="${alt}" aria-checked="${sel === alt}" class="${sel === alt ? 'on' : ''}">${UI.icFase(alt)}<span>${DEST[alt]}</span></button>
      <button type="button" role="radio" data-dest="SAB" aria-checked="${sel === 'SAB'}" class="${sel === 'SAB' ? 'on' : ''}">${UI.icFase('SAB')}<span>Direttamente in sabbiatura</span></button></div>`; };
  const legaDest = (md, cb) => UI.$$('[data-dest]', md).forEach(b => b.onclick = () => {
    UI.$$('[data-dest]', md).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); UI.vibra(8); cb(b.dataset.dest);
  });
  const contatori = (b, s) => `<div class="contatori">
      <div class="cont ok"><span>${UI.ic('buono')}<span class="lbl">Buoni</span></span><button class="pm" type="button" data-a="b-" aria-label="Togli un pezzo buono">${UI.ic('meno')}</button><button class="val" type="button" data-a="bn" aria-label="Pezzi buoni: scrivi un numero">${U.fmtInt(b)}</button><button class="pm" type="button" data-a="b+" aria-label="Aggiungi un pezzo buono">${UI.ic('piu')}</button></div>
      <div class="cont ko"><span>${UI.ic('scarto')}<span class="lbl">Scarti</span></span><button class="pm" type="button" data-a="s-" aria-label="Togli uno scarto">${UI.ic('meno')}</button><button class="val" type="button" data-a="sn" aria-label="Pezzi scartati: scrivi un numero">${U.fmtInt(s)}</button><button class="pm" type="button" data-a="s+" aria-label="Aggiungi uno scarto">${UI.ic('piu')}</button></div></div>`;

  // Causa dello scarto: un tocco su un pulsante grande.
  FT.views.causaScarto = (n = 1) => new Promise(res => {
    let esito = null;
    const cause = FT.model.dati.settings.causeScarto || C.IMPOSTAZIONI.causeScarto;
    UI.modale(`<h2>${UI.ic('scarto')}Perché ${n === 1 ? 'è scartato' : `sono scartati ${U.fmtInt(n)} pezzi`}?</h2>
      <div class="cause">${cause.map(c => `<button type="button" data-c="${U.esc(c)}">${UI.ic('scarto')}${U.esc(c)}</button>`).join('')}</div>
      <div class="azioni"><button class="btn chiaro" type="button" data-chiudi>${UI.ic('x')}Annulla</button></div>`, {
      onChiudi: () => res(esito),
      onApri: (md, chiudi) => UI.$$('[data-c]', md).forEach(b => b.onclick = () => { esito = b.dataset.c; UI.vibra(10); chiudi(); }),
    });
  });
  const avvisaLimite = l => { UI.vibra(90); UI.toast(FT.model.spiegaLimite(l.odp, l.fase), { errore: true, durata: 5000 }); };

  /* ======================= pagina macchina ======================= */
  FT.views.macchina = ({ id }) => {
    const m = C.macchina(id); if (!m) { location.hash = '#/'; return; }
    const f = C.fase(m.fase);
    UI.barra({ titolo: m.nome, sotto: `Stadio ${f.stadio}, ${f.nome.toLowerCase()}`, indietro: true });
    const ap = m.multi ? M().aperte(id).sort((a, b) => M().inizio(a) - M().inizio(b))
      : M().aperte(id).sort((a, b) => (a.stato === 'attiva' ? 0 : 1) - (b.stato === 'attiva' ? 0 : 1) || M().inizio(b) - M().inizio(a));
    const oggi = U.giorno();
    const chiuse = [...M().dati.lav.values()].filter(l => l.mac === id && l.stato === 'chiusa' && l.chiuso && U.giorno(l.chiuso) === oggi).sort((a, b) => b.chiuso - a.chiuso);
    const att = ap.some(l => l.stato === 'attiva');
    document.getElementById('vista').innerHTML = `
      <section class="targa"><div class="foto" style="background-image:url('${m.foto}')"></div>
        <div class="dati"><h1>${U.esc(m.nome)}</h1><div class="riga"><span>${UI.icFase(m.fase)}${U.esc(f.nome)}</span><span>${UI.ic('info')}${U.esc(m.nota)}</span>${f.desc ? `<span>${U.esc(f.desc)}</span>` : ''}</div></div></section>
      ${ap.map((l, i) => card(l, m.multi ? i + 1 : 0)).join('')}
      <button class="btn blu xl nuovo" type="button" data-nuovo>${UI.ic(ap.length ? 'piu' : 'play')}${ap.length ? (m.multi ? 'Nuova postazione' : 'Nuovo ODP') : 'Inizia una lavorazione'}</button>
      ${!m.multi && att ? '<p class="muto" style="margin:8px 2px 0;font-size:15px">Se inizi un altro ODP, quello in corso va in pausa da solo.</p>' : ''}
      ${chiuse.length ? `<section class="chiuse"><h2>${UI.ic('check')}Chiuse oggi su questa postazione</h2>${chiuse.map(l => {
        const o = M().odp(l.odp) || {};
        return `<div class="riga-l">${UI.ic('buono')}<b>ODP ${U.esc(l.odp)}</b><span class="muto">${U.esc(o.codProd || '')}</span>
          <span class="dx"><span>${UI.ic('orologio')} ${U.fmtDurata(M().netto(l))}</span><span class="v">${UI.ic('buono')} ${U.fmtInt(l.buoni)}</span><span class="r">${UI.ic('scarto')} ${U.fmtInt(l.scarti)}</span>
          ${M().faseCompleta(l.odp, l.fase) ? '<span class="etich-s">Fase completata</span>' : `<button class="btn chiaro s" type="button" data-riapri="${l.id}">${UI.ic('riapri')}Riapri</button>`}</span></div>`; }).join('')}</section>` : ''}`;
    UI.$('[data-nuovo]').onclick = () => { UI.vibra(10); location.hash = `#/m/${id}/scegli`; };
    UI.$$('[data-riapri]').forEach(b => b.onclick = () => {
      const l = M().lav(b.dataset.riapri);
      if (M().faseCompleta(l.odp, l.fase)) { UI.toast('Fase completata per questo ODP: non si può riaprire', { errore: true }); return; }
      FT.app.op('Lavorazione riaperta', { mac: id, lavIds: [l.id] }, () => M().riprendi(l));
    });
    UI.$$('.lav').forEach(el => lega(el, M().lav(el.dataset.l)));
  };

  function capHtml(l) {
    const MM = M();
    if (MM.faseCompleta(l.odp, l.fase)) return `${UI.ic('check')}Tutti i pezzi dell'ODP sono registrati in questa fase: tocca Fine.`;
    const c = MM.capacita(l);
    if (!c) return `${UI.ic('attenzione')}Nessun altro pezzo arrivato dalla fase precedente.`;
    return `${UI.ic('info')}Puoi registrare ancora <b>${U.fmtInt(c)}</b> ${c === 1 ? 'pezzo' : 'pezzi'}, scarti compresi.`;
  }
  function card(l, postazione) {
    const MM = M(), o = MM.odp(l.odp) || {}, u = MM.ultimoSeg(l);
    const on = l.stato === 'attiva', auto = !on && u && (u.tipo === 'auto' || u.tipo === 'turno');
    const min = MM.minutiAlLimite(l);
    const cls = on ? ((min != null && min < 30) ? 'al' : 'on') : (auto ? 'al' : 'ps');
    const etich = on ? `${UI.ic('play')}In lavorazione` : auto ? `${UI.ic('attenzione')}Chiusa in automatico` : `${UI.ic('pausa')}In pausa`;
    let avviso = '';
    if (on && min != null && min < 30) avviso = `<div class="avviso-in rosso">${UI.ic('attenzione')}Tra ${Math.max(0, Math.round(min))} minuti la sessione si chiude in automatico (limite ${U.fmtNum(MM.maxOre(l.fase), 0)} ore). Se stai ancora lavorando, metti in pausa e riprendi.</div>`;
    else if (auto) avviso = `<div class="avviso-in rosso">${UI.ic('attenzione')}${U.esc(u.nota)}${u.tipo === 'auto' ? ` alle ${U.fmtOra(u.e)}` : ''}. Se stai ancora lavorando tocca Riprendi, altrimenti Fine.</div>`;
    else if (!on) avviso = `<div class="avviso-in">${UI.icCausa(MM.causa(u && u.tipo, u && u.nota))}<span>In pausa da <b class="num" data-pausa="${l.id}">${U.fmtTimer(Date.now() - MM.inPausaDa(l))}</b>${u && u.nota ? `: ${U.esc(u.nota)}` : ''}</span></div>`;
    return `<article class="lav ${cls}" data-l="${l.id}"><div class="lamp"></div><div class="lav-c">
      <div class="lav-testa">
        <div class="lav-id">${postazione ? `<span class="etich-post">Postazione ${postazione}</span>` : ''}<div class="odpn"><small>ODP</small>${U.esc(l.odp)}</div>
          <div class="art"><b>${U.esc(o.codProd || '')}</b> ${U.esc(o.descr || '')}</div><div class="cli">${U.esc(o.cliente || '')}</div>
          ${MM.conDest(l.fase) && l.dest ? `<span class="dest-chip">${UI.ic('freccia')}Poi ${DEST[l.dest].toLowerCase()}</span>` : ''}</div>
        <div class="lav-stato"><div class="etich">${etich}</div><div class="timer" data-run="${l.id}">${U.fmtTimer(MM.netto(l))}</div>
          <div class="det">Tempo netto, iniziata ${U.fmtDataOra(MM.inizio(l))}${l.seg.length > 1 ? `, ${l.seg.length} sessioni` : ''}</div></div>
      </div>
      ${avviso}
      ${contatori(l.buoni, l.scarti)}
      <div class="capacita" data-cap>${capHtml(l)}</div>
      <div class="azioni"><button class="btn chiaro quadro" type="button" data-a="info" aria-label="Dettaglio ODP">${UI.ic('info')}</button>
        ${on ? `<button class="btn giallo xl" type="button" data-a="pausa">${UI.ic('pausa')}Pausa</button>` : `<button class="btn verde xl" type="button" data-a="riprendi">${UI.ic('play')}Riprendi</button>`}
        <button class="btn rosso xl" type="button" data-a="fine">${UI.ic('stop')}Fine</button></div>
    </div></article>`;
  }

  function lega(el, l) {
    const MM = M();
    const agg = () => { UI.$('[data-a="bn"]', el).textContent = U.fmtInt(l.buoni); UI.$('[data-a="sn"]', el).textContent = U.fmtInt(l.scarti); UI.$('[data-cap]', el).innerHTML = capHtml(l); };
    UI.$$('[data-a]', el).forEach(b => b.onclick = async () => {
      const a = b.dataset.a;
      if (a === 'b+' || a === 'b-' || a === 's-') { UI.vibra(10); if (!MM.conta(l, a === 'b+' ? 1 : a === 'b-' ? -1 : 0, a === 's-' ? -1 : 0)) avvisaLimite(l); agg(); return; }
      if (a === 's+') {
        if (!MM.capacita(l)) return avvisaLimite(l);
        const causa = await FT.views.causaScarto(1); if (!causa) return;
        if (!MM.conta(l, 0, 1, 'op', Date.now(), causa)) avvisaLimite(l); else UI.toast(`Scarto registrato: ${causa}`, { icona: 'scarto' });
        agg(); return;
      }
      if (a === 'bn' || a === 'sn') {
        const buoni = a === 'bn';
        const r = await UI.tastierino({ titolo: buoni ? 'Pezzi buoni' : 'Pezzi scartati', icona: buoni ? 'buono' : 'scarto', conta: true, attuale: buoni ? l.buoni : l.scarti });
        if (!r) return;
        const cur = buoni ? l.buoni : l.scarti; const delta = r.azione === 'add' ? r.n : r.n - cur;
        if (!delta) return;
        const cap = MM.capacita(l);
        if (delta > cap) { UI.vibra(90); UI.toast(cap ? `Puoi registrare al massimo ${U.fmtInt(cap)} pezzi in più. ${MM.spiegaLimite(l.odp, l.fase)}` : MM.spiegaLimite(l.odp, l.fase), { errore: true, durata: 6000 }); return; }
        let causa = null;
        if (!buoni && delta > 0) { causa = await FT.views.causaScarto(delta); if (!causa) return; }
        if (!MM.conta(l, buoni ? delta : 0, buoni ? 0 : delta, 'op', Date.now(), causa)) { avvisaLimite(l); return; }
        agg();
        UI.toast(r.azione === 'add' ? `Aggiunti ${U.fmtInt(r.n)} pezzi` : `Totale impostato a ${U.fmtInt(r.n)}`, { annulla: () => { MM.conta(l, buoni ? -delta : 0, buoni ? 0 : -delta); FT.app.render(); } });
        return;
      }
      if (a === 'info') { location.hash = '#/odp/' + encodeURIComponent(l.odp); return; }
      if (a === 'pausa') return modalePausa(l);
      if (a === 'riprendi') return FT.app.op('Lavorazione ripresa', { mac: l.mac, lavIds: [l.id] }, () => MM.riprendi(l));
      if (a === 'fine') return modaleFine(l);
    });
  }

  function modalePausa(l) {
    const cause = FT.model.dati.settings.causePausa || [];
    UI.modale(`<h2>${UI.ic('pausa')}Pausa, ODP ${U.esc(l.odp)}</h2>
      <p class="md-testo">Il tempo si ferma. Scegli il motivo se vuoi, oppure scrivilo.</p>
      <div class="cause">${cause.map(c => `<button type="button" data-c="${U.esc(c)}">${UI.icCausa(c)}${U.esc(c)}</button>`).join('')}</div>
      <textarea class="nota" data-nota placeholder="Nota (facoltativa)" maxlength="200"></textarea>
      <div class="azioni"><button class="btn chiaro" type="button" data-chiudi>${UI.ic('x')}Annulla</button><button class="btn giallo xl" type="button" data-ok>${UI.ic('pausa')}Metti in pausa</button></div>`, {
      onApri: (md, chiudi) => {
        const nota = UI.$('[data-nota]', md);
        UI.$$('[data-c]', md).forEach(b => b.onclick = () => { const on = !b.classList.contains('on'); UI.$$('[data-c]', md).forEach(x => x.classList.remove('on')); b.classList.toggle('on', on); nota.value = on ? b.dataset.c : ''; UI.vibra(8); });
        UI.$('[data-ok]', md).onclick = () => { chiudi(); FT.app.op('Lavorazione in pausa', { mac: l.mac, lavIds: [l.id] }, () => FT.model.pausa(l, nota.value.trim())); };
      },
    });
  }

  function modaleFine(l) {
    const MM = FT.model; let b = l.buoni, s = l.scarti, dest = l.dest || MM.destPredefinita(l.odp, l.fase) || null, conferma0 = false, causa = null;
    const maxTot = l.buoni + l.scarti + MM.capacita(l);
    const cause = MM.dati.settings.causeScarto || C.IMPOSTAZIONI.causeScarto;
    const nas = MM.conDest(l.fase);
    UI.modale(`<h2>${UI.ic('stop')}Fine lavorazione, ODP ${U.esc(l.odp)}</h2>
      <p class="md-testo">Controlla i pezzi e conferma. Tempo netto <b>${U.fmtDurata(MM.netto(l))}</b>.</p>
      ${contatori(b, s)}
      <p class="md-testo" style="font-size:16px" data-maxt>Massimo registrabile in questa lavorazione: <b>${U.fmtInt(maxTot)}</b> pezzi tra buoni e scarti.</p>
      <div data-causew hidden><div class="titoletto">Causa degli scarti aggiunti</div><div class="cause">${cause.map(c => `<button type="button" data-cs="${U.esc(c)}">${UI.ic('scarto')}${U.esc(c)}</button>`).join('')}</div></div>
      ${nas ? destHtml(l.fase, dest) : ''}
      <textarea class="nota" data-nota placeholder="Nota (facoltativa)" maxlength="300">${U.esc(l.note)}</textarea>
      <div class="avviso-in rosso" data-avv hidden>${UI.ic('attenzione')}<span></span></div>
      <div class="azioni"><button class="btn chiaro" type="button" data-chiudi>${UI.ic('x')}Annulla</button><button class="btn rosso xl" type="button" data-ok>${UI.ic('check')}Conferma fine</button></div>`, {
      onApri: (md, chiudi) => {
        const agg = () => { UI.$('[data-a="bn"]', md).textContent = U.fmtInt(b); UI.$('[data-a="sn"]', md).textContent = U.fmtInt(s); UI.$('[data-causew]', md).hidden = !(s > l.scarti); };
        const no = t => { avv.hidden = false; avv.querySelector('span').textContent = t; UI.vibra(90); };
        UI.$$('[data-cs]', md).forEach(x => x.onclick = () => { causa = x.dataset.cs; UI.$$('[data-cs]', md).forEach(y => y.classList.toggle('on', y === x)); avv.hidden = true; });
        const avv = UI.$('[data-avv]', md);
        UI.$$('[data-a]', md).forEach(x => x.onclick = async () => {
          const a = x.dataset.a; UI.vibra(8); conferma0 = false; avv.hidden = true;
          let nb = b, ns = s;
          if (a === 'b+') nb++; else if (a === 'b-') nb = Math.max(0, nb - 1); else if (a === 's+') ns++; else if (a === 's-') ns = Math.max(0, ns - 1);
          else if (a === 'bn' || a === 'sn') {
            const r = await UI.tastierino({ titolo: a === 'bn' ? 'Pezzi buoni' : 'Pezzi scartati', icona: a === 'bn' ? 'buono' : 'scarto', conta: true, attuale: a === 'bn' ? b : s });
            if (r) { if (a === 'bn') nb = r.azione === 'add' ? b + r.n : r.n; else ns = r.azione === 'add' ? s + r.n : r.n; }
          }
          if (nb + ns > maxTot && nb + ns > b + s) no(`Massimo ${U.fmtInt(maxTot)} pezzi tra buoni e scarti. ${MM.spiegaLimite(l.odp, l.fase)}`);
          else { b = nb; s = ns; }
          agg();
        });
        if (nas) legaDest(md, d => { dest = d; avv.hidden = true; });
        UI.$('[data-ok]', md).onclick = () => {
          if (nas && !dest) { no(msgDest(l.fase)); return; }
          if (s > l.scarti && !causa) { no('Indica la causa degli scarti aggiunti.'); return; }
          if (b + s === 0 && !conferma0) { conferma0 = true; avv.hidden = false; avv.querySelector('span').textContent = 'Nessun pezzo registrato. Tocca di nuovo Conferma fine per chiudere comunque.'; return; }
          if (!MM.limiteOk(l.odp, { lav: l, b, s, dest })) { no('Con questa destinazione i pezzi non tornano con quelli già lavorati nella fase successiva. ' + MM.spiegaLimite(l.odp, l.fase)); return; }
          chiudi();
          FT.app.op('Lavorazione chiusa', { mac: l.mac, lavIds: [l.id], cod: MM.codArt(MM.odp(l.odp)) }, () => MM.chiudi(l, { buoni: b, scarti: s, dest, nota: UI.$('[data-nota]', md).value, causa }));
        };
      },
    });
  }

  /* ======================= scelta ODP ======================= */
  const statoScelta = {};
  FT.views.scegli = ({ id }) => {
    const m = C.macchina(id); if (!m) { location.hash = '#/'; return; }
    const MM = M(), f = C.fase(m.fase);
    const st = statoScelta[id] || (statoScelta[id] = { q: '', linea: '', num: true, limite: 60 });
    UI.barra({ titolo: 'Scegli l\'ODP', sotto: m.nome, indietro: true });
    const scanner = 'BarcodeDetector' in self;
    document.getElementById('vista').innerHTML = `
      <div class="ricerca"><div class="campo-r">${UI.ic('cerca')}<input data-q type="search" enterkeyhint="search" autocomplete="off" inputmode="${st.num ? 'numeric' : 'search'}" placeholder="Numero ODP, codice o descrizione" value="${U.esc(st.q)}" aria-label="Cerca ODP"></div>
        <button class="chip" type="button" data-tast aria-label="Cambia tastiera">${UI.ic(st.num ? 'lettere' : 'tastiera')}${st.num ? 'Lettere' : 'Numeri'}</button>
        ${scanner ? `<button class="chip" type="button" data-scan aria-label="Leggi codice con la fotocamera">${UI.ic('fotocamera')}Leggi</button>` : ''}</div>
      <div class="chips" style="margin-bottom:12px">${['', 'Automatico', 'Manuale', 'Rulliera'].map(x => `<button class="chip ${st.linea === x ? 'on' : ''}" type="button" data-lin="${x}">${x || 'Tutte le linee'}</button>`).join('')}</div>
      <div data-lista></div>`;
    const inp = UI.$('[data-q]');
    const disegna = () => {
      st.q = inp.value; const q = U.normTesto(st.q);
      const ap = new Set(MM.aperte(id).map(l => l.odp));
      let L = [...MM.dati.odp.values()].filter(o => !o.archiviato && (!st.linea || o.linea === st.linea));
      if (q) L = L.filter(o => U.normTesto(`${o.num} ${o.ordLav} ${o.codProd} ${o.codMod} ${o.descr} ${o.cliente}`).includes(q));
      const righe = L.map(o => { const av = MM.avanzamento(o.num); return { o, av, d: MM.disponibili(o.num, m.fase, av), comp: MM.compatibile(o.num, m.fase), fin: MM.faseCompletaAv(av, m.fase) }; });
      const ord = (a, b) => (a.o.consegna || '9').localeCompare(b.o.consegna || '9') || a.o.num.localeCompare(b.o.num);
      const gruppi = [
        ['Pronti per questa fase', righe.filter(r => !r.fin && r.d > 0 && r.comp)],
        ['Pronti, ma di solito vanno su un\'altra lavorazione', righe.filter(r => !r.fin && r.d > 0 && !r.comp)],
        ['Colati prima dell\'avvio dell\'app', righe.filter(r => !r.fin && r.d <= 0 && r.av.riserva > 0)],
        ['Senza pezzi pronti per questa fase', righe.filter(r => !r.fin && r.d <= 0 && !(r.av.riserva > 0))],
        ['Completati in questa fase', righe.filter(r => r.fin)],
      ].map(([t, a]) => [t, a.sort(ord)]).filter(([, a]) => a.length);
      const box = UI.$('[data-lista]');
      if (!MM.dati.odp.size) { box.innerHTML = `<div class="vuoto">${UI.ic('posta')}Nessun ODP caricato. Il supervisore deve importare le estrazioni dal gestionale.</div>`; return; }
      if (!righe.length) { box.innerHTML = `<div class="vuoto">${UI.ic('cerca')}Nessun ODP trovato${st.linea ? ` nella linea ${st.linea}` : ''}.${st.linea || q ? '<br><button class="btn chiaro" type="button" data-reset>Togli i filtri</button>' : ''}</div>`; const r = UI.$('[data-reset]', box); if (r) r.onclick = () => { st.linea = ''; inp.value = ''; FT.views.scegli({ id }); }; return; }
      let resto = st.limite;
      box.innerHTML = `<div class="elenco-odp">${gruppi.map(([t, a]) => {
        const vis = a.slice(0, Math.max(0, resto)); resto -= vis.length;
        return `<div class="sep-elenco">${t} (${a.length})</div>` + vis.map(r => {
          const o = r.o; const perc = MM.percorso(o.num);
          return `<button class="riga-odp${r.fin ? ' fin' : ''}" type="button" data-o="${U.esc(o.num)}">
            <div class="mid"><div class="n">${U.esc(o.num)}${ap.has(o.num) ? '<span class="etich-s giallo">Aperto qui</span>' : ''}${!r.comp && perc ? `<span class="etich-s blu">${U.esc(C.percorso(perc).nome)}</span>` : ''}</div>
              <div class="art"><b>${U.esc(o.codProd)}</b> ${U.esc(o.descr)}</div>
              <div class="cli">${U.esc(o.cliente)}, linea ${U.esc(o.linea)}${o.consegna ? `, consegna ${U.fmtGiorno(o.consegna)}` : ''}</div></div>
            ${r.fin ? `<div class="disp zero"><b>${UI.ic('check')}</b><span>completato</span></div>` : r.d > 0 ? `<div class="disp"><b>${U.fmtInt(r.d)}</b><span>pezzi pronti</span></div>` : r.av.riserva > 0 ? `<div class="disp zero"><b>${U.fmtInt(r.av.riserva)}</b><span>colati prima</span></div>` : `<div class="disp zero"><b>0</b><span>pezzi pronti</span></div>`}
          </button>`; }).join('') + (a.length > vis.length ? '' : '');
      }).join('')}</div>${righe.length > st.limite ? `<div class="vuoto"><button class="btn chiaro" type="button" data-altri>Mostra altri ODP (${righe.length - st.limite})</button><p class="muto">Oppure scrivi il numero nella ricerca.</p></div>` : ''}`;
      UI.$$('[data-o]', box).forEach(b => b.onclick = () => modaleAvvio(MM.odp(b.dataset.o), m));
      const altri = UI.$('[data-altri]', box); if (altri) altri.onclick = () => { st.limite += 100; disegna(); };
    };
    inp.oninput = () => { st.limite = 60; disegna(); };
    UI.$('[data-tast]').onclick = () => { st.num = !st.num; st.q = inp.value; FT.views.scegli({ id }); setTimeout(() => UI.$('[data-q]').focus(), 30); };
    UI.$$('[data-lin]').forEach(b => b.onclick = () => { st.linea = b.dataset.lin; st.limite = 60; UI.$$('[data-lin]').forEach(x => x.classList.toggle('on', x === b)); disegna(); });
    const sc = UI.$('[data-scan]'); if (sc) sc.onclick = () => leggiCodice(cod => { inp.value = cod; disegna(); const hit = [...MM.dati.odp.values()].filter(o => o.num === cod || o.ordLav === cod); if (hit.length === 1) modaleAvvio(hit[0], m); });
    disegna();
  };

  function modaleAvvio(o, m) {
    const MM = FT.model;
    const giaQui = MM.aperte(m.id).find(l => l.odp === o.num);
    if (giaQui && !m.multi) {
      UI.toast('Questo ODP è già aperto su questa postazione');
      history.replaceState(null, '', '#/m/' + m.id); FT.app.render(); return;
    }
    if (MM.faseCompleta(o.num, m.fase)) { UI.vibra(90); UI.toast('ODP completato in questa fase: tutti i pezzi colati sono già stati lavorati', { errore: true, durata: 5000 }); return; }
    const inCorso = !m.multi && MM.aperte(m.id).find(l => l.stato === 'attiva');
    const av = MM.avanzamento(o.num), d = MM.disponibili(o.num, m.fase, av);
    const nas = MM.conDest(m.fase); let dest = nas ? MM.destPredefinita(o.num, m.fase) : null;
    const perc = MM.percorso(o.num);
    UI.modale(`<h2>${UI.ic('play')}Inizia ODP ${U.esc(o.num)}</h2>
      <div class="kv"><div class="largo">Articolo<b>${U.esc(o.codProd)} ${U.esc(o.descr)}</b></div><div>Cliente<b>${U.esc(o.cliente)}</b></div>
        <div>Postazione<b>${U.esc(m.nome)}</b></div><div>Pezzi pronti per questa fase<b>${U.fmtInt(Math.max(0, d))}${av.riserva > 0 ? ` <span class="muto">(+${U.fmtInt(av.riserva)} colati prima dell'avvio)</span>` : ''}</b></div>
        ${perc ? `<div>Percorso sbavatura<b>${U.esc(C.percorso(perc).nome)}</b></div>` : ''}</div>
      ${nas ? destHtml(m.fase, dest) : ''}
      ${inCorso ? `<div class="avviso-in">${UI.ic('pausa')}L'ODP ${U.esc(inCorso.odp)} in corso su questa macchina andrà in pausa.</div>` : ''}
      ${d <= 0 && !(av.riserva > 0) ? `<div class="avviso-in">${UI.ic('attenzione')}<span>Nessun pezzo pronto per questa fase: la fase precedente non ha ancora registrato pezzi per questo ODP. Puoi iniziare, ma potrai segnare i pezzi solo dopo che saranno registrati a monte.</span></div>` : ''}
      ${giaQui ? `<div class="avviso-in">${UI.ic('info')}Questo ODP è già aperto su un'altra postazione con il flessibile: ne apri una nuova.</div>` : ''}
      <div class="avviso-in rosso" data-avv hidden>${UI.ic('attenzione')}<span>${msgDest(m.fase)}</span></div>
      <div class="azioni"><button class="btn chiaro" type="button" data-chiudi>${UI.ic('x')}Annulla</button><button class="btn verde xl" type="button" data-ok>${UI.ic('play')}Inizia</button></div>`, {
      onApri: (md, chiudi) => {
        if (nas) legaDest(md, x => { dest = x; UI.$('[data-avv]', md).hidden = true; });
        UI.$('[data-ok]', md).onclick = () => {
          if (nas && !dest) { UI.$('[data-avv]', md).hidden = false; return; }
          chiudi();
          history.replaceState(null, '', '#/m/' + m.id);
          FT.app.op('Lavorazione iniziata', { mac: m.id, cod: MM.codArt(o) }, () => MM.avvia(o.num, m.id, { dest }));
        };
      },
    });
  }

  // Lettura di codici a barre o QR con la fotocamera (solo se il browser lo supporta).
  function leggiCodice(cb) {
    let stream = null, attivo = true, timer = null;
    const chiudiTutto = () => { attivo = false; clearTimeout(timer); if (stream) stream.getTracks().forEach(t => t.stop()); };
    const chiudiM = UI.modale(`<h2>${UI.ic('fotocamera')}Inquadra il codice</h2><video data-v playsinline muted style="width:100%;border-radius:8px;background:#000;max-height:60vh"></video>
      <p class="md-testo" data-msg>Avvicina il cartellino dell'ODP alla fotocamera.</p><div class="azioni"><button class="btn chiaro" type="button" data-chiudi>${UI.ic('x')}Chiudi</button></div>`, {
      onApri: async (md, chiudi) => {
        UI.$('[data-chiudi]', md).addEventListener('click', chiudiTutto);
        try {
          const det = new BarcodeDetector();
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          const v = UI.$('[data-v]', md); v.srcObject = stream; await v.play();
          const giro = async () => {
            if (!attivo) return;
            try { const r = await det.detect(v); if (r.length) { const cod = String(r[0].rawValue || '').trim(); chiudiTutto(); chiudi(); UI.vibra(40); cb(cod); return; } } catch (e) { /* frame non pronto */ }
            timer = setTimeout(giro, 250);
          };
          giro();
        } catch (e) { UI.$('[data-msg]', md).textContent = 'Fotocamera non disponibile: ' + (e.message || e.name) + '. Scrivi il numero nella ricerca.'; }
      },
    });
    return chiudiM;
  }
})(self.FT = self.FT || {});
