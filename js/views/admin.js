/* Tempi Friber — area supervisore (protetta da PIN). */
(function (FT) {
  'use strict';
  const U = FT.u, C = FT.cfg, UI = FT.ui;
  FT.views = FT.views || {};
  const H = 3600000;
  const PAG = {};
  FT.views.pagineAdmin = PAG;

  const VOCI = [
    ['panoramica', 'Panoramica', 'fabbrica'], ['verifiche', 'Da verificare', 'attenzione'], ['analisi', 'Analisi tempi', 'grafico'],
    ['lavorazioni', 'Lavorazioni', 'strati'], ['odp', 'ODP', 'elenco'], ['articoli', 'Percorsi articoli', 'percorso'], '-',
    ['importa', 'Importa ODP', 'carica'], ['esporta', 'Esporta Excel', 'scarica'], ['backup', 'Backup', 'salva'], ['impostazioni', 'Impostazioni', 'ingranaggio'], '-',
    ['esci', 'Esci', 'esci'],
  ];

  FT.views.admin = ({ pagina = 'panoramica' }) => {
    const vista = document.getElementById('vista');
    if (!FT.app.isAdmin()) {
      UI.barra({ titolo: 'Supervisore', indietro: true });
      vista.innerHTML = `<div class="vuoto">${UI.ic('lucchetto')}Area riservata al supervisore.<br><button class="btn blu" type="button" data-pin>${UI.ic('lucchetto')}Inserisci il PIN</button></div>`;
      UI.$('[data-pin]').onclick = () => FT.app.chiediPin().then(ok => ok && FT.app.render());
      return;
    }
    if (pagina === 'esci') { FT.app.esciAdmin(); location.hash = '#/'; return; }
    if (!PAG[pagina]) pagina = 'panoramica';
    const voce = VOCI.find(v => v[0] === pagina);
    UI.barra({ titolo: 'Supervisore', sotto: voce ? voce[1] : '', indietro: true });
    const nA = FT.model.anomalie().length;
    vista.innerHTML = `<div class="adm"><nav class="rail" aria-label="Sezioni supervisore">${VOCI.map(v => v === '-' ? '<hr>' :
      `<a href="#/admin/${v[0]}" class="${v[0] === pagina ? 'on' : ''}">${UI.ic(v[2])}${v[1]}${v[0] === 'verifiche' && nA ? `<span class="cnt">${nA}</span>` : ''}</a>`).join('')}</nav><div class="adm-main" data-main></div></div>`;
    PAG[pagina](UI.$('[data-main]'));
  };

  /* ======================= panoramica ======================= */
  let giornoGantt = null;
  PAG.panoramica = el => {
    const M = FT.model, S = M.dati.settings, meta = M.dati.meta, ora = Date.now();
    const oggi = U.giorno(); if (!giornoGantt) giornoGantt = oggi;
    const an = M.analisi(U.daGiorno(oggi), U.mezzanotteDopo(U.daGiorno(oggi)), ora);
    const ap = M.aperte(); const q = M.codeReparto();
    const avvisi = [];
    if (S.pinPredefinito) avvisi.push(['rosso', 'lucchetto', 'Il PIN è ancora quello iniziale (1234): cambialo.', '#/admin/impostazioni', 'Cambia PIN']);
    if (!M.dati.odp.size) avvisi.push(['blu', 'carica', 'Nessun ODP caricato: importa le estrazioni del gestionale.', '#/admin/importa', 'Importa']);
    else if (meta.lastImport && ora - meta.lastImport > 2 * 24 * H) avvisi.push(['giallo', 'carica', `Ultimo import ODP ${U.fmtDataOra(meta.lastImport)}.`, '#/admin/importa', 'Importa']);
    if (M.dati.lav.size && (!meta.lastExport || ora - meta.lastExport > 7 * 24 * H)) avvisi.push(['giallo', 'scarica', meta.lastExport ? `Ultimo export dei tempi ${U.fmtDataOra(meta.lastExport)}.` : 'I tempi non sono mai stati esportati.', '#/admin/esporta', 'Esporta']);
    const nA = M.anomalie(ora).length;
    if (nA) avvisi.push(['rosso', 'attenzione', `${U.pz(nA, 'situazione', 'situazioni')} da verificare (chiusure automatiche, lavorazioni senza pezzi o aperte da giorni).`, '#/admin/verifiche', 'Verifica']);
    el.innerHTML = `
      ${avvisi.map(([c, i, t, h, b]) => `<div class="bn ${c}" style="border-radius:var(--r);margin-bottom:10px;border:0">${UI.ic(i)}<span class="bn-t">${t}</span><a class="btn ${c === 'rosso' ? 'rosso' : 'blu'} s" href="${h}">${b}</a></div>`).join('')}
      <div class="kpi">
        <div><div class="k-v">${U.fmtOre(an.kpi.ms)}</div><div class="k-l">Ore nette lavorate oggi</div></div>
        <div><div class="k-v">${U.fmtInt(an.kpi.b)}</div><div class="k-l">Pezzi buoni oggi</div></div>
        <div><div class="k-v">${U.fmtPct((an.kpi.b + an.kpi.s) ? an.kpi.s / (an.kpi.b + an.kpi.s) : null)}</div><div class="k-l">Scarti oggi (${U.fmtInt(an.kpi.s)})</div></div>
        <div><div class="k-v">${ap.filter(l => l.stato === 'attiva').length} / ${ap.filter(l => l.stato === 'pausa').length}</div><div class="k-l">Lavorazioni in corso / in pausa</div></div>
      </div>
      <section class="pannello"><h2>${UI.ic('calendario')}Giornata in reparto<span class="dx"><button class="btn chiaro s" type="button" data-g="-1" aria-label="Giorno precedente">${UI.ic('indietro')}</button> <b data-gtit>${U.nomeGiorno(giornoGantt)} ${U.fmtGiorno(giornoGantt)}</b> <button class="btn chiaro s" type="button" data-g="1" aria-label="Giorno successivo" ${giornoGantt >= oggi ? 'disabled' : ''}>${UI.ic('freccia')}</button></span></h2>
        <div data-gantt></div></section>
      <section class="pannello"><h2>${UI.ic('percorso')}Pezzi in attesa nel reparto</h2><div class="flusso">
        <div class="passo coda"><b>${U.fmtInt(q.taglio.pz)}</b><span>da tagliare, ${q.taglio.odp} ODP</span></div><div class="fr">${UI.ic('freccia')}</div>
        <div class="passo coda"><b>${U.fmtInt(q.sbav.pz)}</b><span>in attesa di sbavatura, ${q.sbav.odp} ODP</span></div><div class="fr">${UI.ic('freccia')}</div>
        <div class="passo coda"><b>${U.fmtInt(q.sab.pz)}</b><span>in attesa di sabbiatura, ${q.sab.odp} ODP</span></div></div></section>`;
    UI.$$('[data-g]', el).forEach(b => b.onclick = () => { giornoGantt = U.giorno(U.aggiungiGiorni(U.daGiorno(giornoGantt), +b.dataset.g)); if (giornoGantt > oggi) giornoGantt = oggi; PAG.panoramica(el); });
    FT.views.gantt(UI.$('[data-gantt]', el), giornoGantt);
  };

  /* Diagramma della giornata: una riga per postazione, le sessioni in verde, le pause in giallo. */
  FT.views.gantt = (box, giorno) => {
    const M = FT.model, ora = Date.now();
    const t0 = U.daGiorno(giorno), t1 = U.mezzanotteDopo(t0);
    const per = M.sessioniIntervallo(t0, t1, ora);
    let a = t0 + 6 * H, b = t0 + 20 * H;
    for (const arr of per.values()) for (const x of arr) { a = Math.min(a, Math.max(t0, x.s)); b = Math.max(b, Math.min(t1, x.e)); }
    if (U.giorno(ora) === giorno) b = Math.max(b, Math.min(t1, ora + 1800000));
    a = t0 + Math.floor((a - t0) / H) * H; b = Math.min(t1, t0 + Math.ceil((b - t0) / H) * H);
    const W = 1000, SX = 150, DX = 30, TOP = 30, LH = 18;
    const x = t => SX + (Math.min(Math.max(t, a), b) - a) / (b - a) * (W - SX - DX);
    const righe = C.MACCHINE.map(m => {
      const segs = per.get(m.id); const corsie = [];
      for (const s of segs) { let k = corsie.findIndex(fineC => fineC <= s.s); if (k < 0) { k = corsie.length; corsie.push(0); } corsie[k] = s.e; s.k = k; }
      return { m, segs, n: Math.max(1, corsie.length) };
    });
    let y = TOP; const items = []; let svg = '';
    const ore = []; const passoOre = (b - a) / H > 14 ? 2 : 1;
    for (let t = a; t <= b; t += H * passoOre) ore.push(t);
    const altezza = TOP + righe.reduce((s, r) => s + r.n * LH + 18, 0) + 6;
    svg += ore.map(t => `<line class="griglia" x1="${x(t)}" y1="${TOP - 6}" x2="${x(t)}" y2="${altezza - 4}"/><text x="${x(t)}" y="${TOP - 12}" text-anchor="middle">${U.fmtOra(t)}</text>`).join('');
    for (const r of righe) {
      const h = r.n * LH + 18;
      svg += `<text class="nome-m" x="8" y="${y + h / 2 + 5}">${U.esc(r.m.breve || r.m.nome)}</text><line class="base" x1="${SX}" y1="${y + h - 1}" x2="${W - DX}" y2="${y + h - 1}"/>`;
      const perLav = new Map(); for (const s of r.segs) { const a2 = perLav.get(s.l.id) || []; a2.push(s); perLav.set(s.l.id, a2); }
      for (const arr of perLav.values()) for (let i = 1; i < arr.length; i++) { const p = arr[i - 1], n = arr[i]; if (n.s > p.e) svg += `<line class="pausa-r" x1="${x(p.e)}" y1="${y + 9 + p.k * LH + 7}" x2="${x(n.s)}" y2="${y + 9 + n.k * LH + 7}"/>`; }
      for (const s of r.segs) {
        const yy = y + 9 + s.k * LH, x1 = x(s.s), x2 = Math.max(x1 + 3, x(s.e));
        items.push(s);
        svg += `<rect class="lav-r" data-k="${items.length - 1}" x="${x1}" y="${yy}" width="${x2 - x1}" height="14" rx="3" tabindex="0"/>`;
        if ((s.tipo === 'auto' || s.tipo === 'turno') && !s.aperta) svg += `<path class="auto-m" d="M${x2} ${yy - 2} l6 -6 h-12 z"/>`;
      }
      y += h;
    }
    if (U.giorno(ora) === giorno && ora >= a && ora <= b) svg += `<line class="ora-l" x1="${x(ora)}" y1="${TOP - 6}" x2="${x(ora)}" y2="${altezza - 4}"/><text class="ora-t" x="${x(ora) + 4}" y="${altezza - 8}">adesso</text>`;
    box.innerHTML = `<svg class="gantt" viewBox="0 0 ${W} ${altezza}" role="img" aria-label="Sessioni di lavoro della giornata per postazione">${svg}</svg>
      <div class="leggenda"><span><i style="background:var(--verde)"></i>In lavorazione</span><span><i style="background:var(--giallo);height:3px;vertical-align:3px"></i>Pausa della stessa lavorazione</span><span><i style="background:var(--rosso);width:10px"></i>Chiusura automatica</span><span><i style="background:var(--blu);width:3px;height:14px;vertical-align:-3px"></i>Adesso</span></div>
      <details style="margin-top:10px"><summary class="muto" style="cursor:pointer;font-weight:600">Vedi le sessioni in tabella (${items.length})</summary>
      <div class="tab-w"><table class="tab"><thead><tr><th>Postazione</th><th>ODP</th><th>Articolo</th><th>Inizio</th><th>Fine</th><th class="n">Durata</th><th>Come è finita</th></tr></thead><tbody>
      ${items.map(s => `<tr><td>${U.esc(C.macchina(s.l.mac).nome)}</td><td>${U.esc(s.l.odp)}</td><td>${U.esc((M.odp(s.l.odp) || {}).codProd || '')}</td><td>${U.fmtOra(s.s)}</td><td>${s.aperta ? 'in corso' : U.fmtOra(s.e)}</td><td class="n">${U.fmtDurata(s.e - s.s)}</td><td>${s.aperta ? 'In corso' : ({ pausa: 'Pausa', fine: 'Fine', auto: 'Chiusura automatica', turno: 'Fine turno automatica' }[s.tipo] || '')}${s.nota ? ': ' + U.esc(s.nota) : ''}</td></tr>`).join('')}
      </tbody></table></div></details>`;
    let tip = null;
    const mostra = (rect, cx, cy) => {
      const s = items[+rect.dataset.k]; if (!s) return;
      const o = M.odp(s.l.odp) || {}; const ps = M.pezziSessioni(s.l)[s.i] || { b: 0, s: 0 };
      if (!tip) { tip = document.createElement('div'); tip.className = 'tooltip'; document.body.appendChild(tip); }
      tip.innerHTML = `<div><b>${U.fmtDurata(s.e - s.s)}</b> ${U.fmtOra(s.s)}-${s.aperta ? 'in corso' : U.fmtOra(s.e)}</div><div>ODP ${U.esc(s.l.odp)} ${U.esc(o.codProd || '')}</div><div>${U.esc(C.macchina(s.l.mac).nome)}</div><div>${U.fmtInt(ps.b)} buoni, ${U.fmtInt(ps.s)} scarti in questa sessione</div>${s.nota ? `<div>${U.esc(s.nota)}</div>` : ''}`;
      const w = tip.offsetWidth; tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, cx - w / 2)) + 'px'; tip.style.top = Math.max(8, cy - tip.offsetHeight - 14) + 'px';
    };
    const nascondi = () => { if (tip) { tip.remove(); tip = null; } };
    UI.$$('.lav-r', box).forEach(r => {
      r.addEventListener('pointerenter', e => mostra(r, e.clientX, e.clientY)); r.addEventListener('pointermove', e => mostra(r, e.clientX, e.clientY));
      r.addEventListener('pointerdown', e => mostra(r, e.clientX, e.clientY)); r.addEventListener('pointerleave', nascondi);
      r.addEventListener('focus', () => { const bb = r.getBoundingClientRect(); mostra(r, bb.left + bb.width / 2, bb.top); }); r.addEventListener('blur', nascondi);
    });
    FT.app.allaUscita(nascondi);
  };

  /* ======================= da verificare ======================= */
  PAG.verifiche = el => {
    const M = FT.model; const A = M.anomalie();
    const TIT = { auto: 'Chiusure automatiche', zero: 'Lavorazioni chiuse senza pezzi', vecchia: 'Lavorazioni aperte da più giorni', fuori: 'Tempi fuori scala', negativo: 'ODP con più pezzi lavorati che disponibili' };
    const DESC = {
      auto: 'La sessione è stata chiusa dall\'app al limite di tempo: controlla l\'orario di fine reale.',
      zero: 'Chiusa senza pezzi buoni né scarti: inserisci i pezzi o elimina se è un errore.',
      vecchia: 'Probabilmente l\'operatore non ha toccato Fine.',
      fuori: 'Minuti per pezzo oltre il triplo o sotto un terzo della mediana dello stesso articolo e fase.',
      negativo: 'I pezzi registrati superano quelli colati o arrivati dalla fase precedente: manca una registrazione o la quantità importata è da aggiornare.',
    };
    if (!A.length) { el.innerHTML = `<div class="pannello"><div class="vuoto">${UI.ic('check')}Niente da verificare.</div></div>`; return; }
    const gr = {}; A.forEach(x => (gr[x.tipo] = gr[x.tipo] || []).push(x));
    el.innerHTML = Object.keys(TIT).filter(k => gr[k]).map(k => `<section class="pannello"><h2>${UI.ic('attenzione')}${TIT[k]}<span class="dx">${gr[k].length}</span></h2><p class="sp">${DESC[k]}</p>
      ${gr[k].slice(0, 100).map((x, i) => {
        if (x.tipo === 'negativo') return `<div class="anom">${UI.ic('attenzione')}<div class="t"><b>ODP ${U.esc(x.o.num)}</b> ${U.esc(x.o.codProd)}<div class="muto">${x.neg.map(([kk, t]) => `${U.fmtInt(x.a[kk])} ${t}`).join(', ')}</div></div><a class="btn chiaro s" href="#/odp/${encodeURIComponent(x.o.num)}">${UI.ic('info')}Apri ODP</a></div>`;
        const l = x.l, o = M.odp(l.odp) || {};
        const det = x.tipo === 'fuori' ? `${U.fmtNum(x.mpz, 2)} min/pezzo contro una mediana di ${U.fmtNum(x.med, 2)}` : x.tipo === 'vecchia' ? `aperta dal ${U.fmtDataOraLunga(M.inizio(l))}` : x.tipo === 'auto' ? (M.ultimoSeg(l) && M.ultimoSeg(l).nota) || l.seg.find(s => s.tipo === 'auto' || s.tipo === 'turno').nota : `chiusa il ${U.fmtDataOraLunga(l.chiuso)}`;
        return `<div class="anom">${UI.icFase(l.fase)}<div class="t"><b>ODP ${U.esc(l.odp)}</b> ${U.esc(o.codProd || '')}, ${U.esc(C.macchina(l.mac).nome)}<div class="muto">${U.esc(det)}, tempo netto ${U.fmtDurata(M.netto(l))}, ${U.fmtInt(l.buoni)} buoni</div></div>
          <button class="btn chiaro s" type="button" data-mod="${l.id}">${UI.ic('modifica')}Correggi</button><button class="btn verde s" type="button" data-ok="${l.id}">${UI.ic('check')}Va bene così</button></div>`;
      }).join('')}</section>`).join('');
    UI.$$('[data-mod]', el).forEach(b => b.onclick = () => FT.views.modificaLav(M.lav(b.dataset.mod)));
    UI.$$('[data-ok]', el).forEach(b => b.onclick = () => { M.verifica(M.lav(b.dataset.ok)); UI.toast('Segnata come verificata'); FT.app.render(); });
  };

  /* ======================= importa ======================= */
  PAG.importa = async (el, filePreparati) => {
    const M = FT.model, meta = M.dati.meta;
    const ricevuti = (await FT.db.inboxTutti()).filter(f => /\.(xlsx|xls|csv)$/i.test(f.nome));
    el.innerHTML = `
      ${ricevuti.length ? `<section class="pannello"><h2>${UI.ic('posta')}File ricevuti da altre app<span class="dx">${ricevuti.length}</span></h2>
        ${ricevuti.map(f => `<div class="riga-l">${UI.ic('nota')}<b>${U.esc(f.nome)}</b><span class="muto">${U.fmtDataOra(f.t)}</span></div>`).join('')}
        <div class="azioni" style="margin-top:10px"><button class="btn blu" type="button" data-ric>${UI.ic('carica')}Controlla e importa</button><button class="btn chiaro" type="button" data-scarta>${UI.ic('cestino')}Scarta</button></div></section>` : ''}
      <section class="pannello"><h2>${UI.ic('carica')}Importa le estrazioni ODP</h2>
        <p class="sp">Salva sul tablet gli Excel ricevuti per email (cartella Download), poi sceglili qui: puoi selezionare insieme i file delle tre linee. Prima di importare vedi cosa cambia. Gli ODP non vengono mai cancellati; si importano solo quelli con colata già avvenuta.</p>
        <button class="btn blu xl" type="button" data-scegli>${UI.ic('carica')}Scegli i file Excel</button></section>
      <div data-ant></div>
      <section class="pannello"><h2>${UI.ic('orologio')}Import precedenti</h2>${(meta.importLog || []).length ? `<div class="tab-w"><table class="tab"><tbody>${meta.importLog.slice(0, 12).map(x => `<tr><td style="white-space:nowrap">${U.fmtDataOraLunga(x.t)}</td><td>${U.esc(x.testo)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="sp">Nessun import ancora.</p>'}</section>`;
    const anteprima = async files => {
      const box = UI.$('[data-ant]', el);
      box.innerHTML = `<section class="pannello"><p class="sp">${UI.ic('orologio')} Lettura dei file in corso…</p></section>`;
      try {
        await UI.caricaScript('vendor/xlsx.full.min.js');
        const letti = [];
        for (const f of files) letti.push(FT.imp.leggi(f.name || f.nome, f.dati || await f.arrayBuffer()));
        const ant = FT.imp.anteprima(letti);
        const ok = ant.nuovi.length + ant.aggiornati.length;
        const S = M.dati.settings;
        box.innerHTML = `<section class="pannello"><h2>${UI.ic('cerca')}Controllo prima dell'import</h2>
          <div class="tab-w"><table class="tab"><thead><tr><th>File</th><th>Linea</th><th class="n">Righe</th><th class="n">ODP</th></tr></thead><tbody>
          ${ant.file.map(f => `<tr><td>${U.esc(f.nome)}</td>${f.errore ? `<td colspan="3" style="color:var(--rosso)">${UI.ic('attenzione')} ${U.esc(f.errore)}</td>` : `<td>${U.esc(f.linea)}</td><td class="n">${U.fmtInt(f.righe)}</td><td class="n">${U.fmtInt(f.nOdp)}</td>`}</tr>`).join('')}</tbody></table></div>
          <div class="kpi" style="margin-top:12px"><div><div class="k-v">${ant.nuovi.length}</div><div class="k-l">ODP nuovi</div></div><div><div class="k-v">${ant.aggiornati.length}</div><div class="k-l">ODP aggiornati</div></div>
            <div><div class="k-v">${ant.invariati.length + ant.parziali.length}</div><div class="k-l">Invariati</div></div><div><div class="k-v">${ant.esclusi.length}</div><div class="k-l">Esclusi, colata non ancora avvenuta</div></div></div>
          ${ant.avvisi.length ? `<div class="resoconto" style="margin-bottom:12px">${UI.ic('attenzione')} <b>Da sapere</b><ul>${ant.avvisi.map(a => `<li>${U.esc(a)}</li>`).join('')}</ul></div>` : ''}
          ${ant.aggiornati.length ? `<details style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600">Cosa cambia negli ODP aggiornati</summary><div class="tab-w"><table class="tab"><tbody>${ant.aggiornati.slice(0, 200).map(x => `<tr><td><b>${U.esc(x.rec.num)}</b></td><td>${U.esc(x.rec.codProd)}</td><td>${U.esc(x.cambi.join(', '))}${x.riattiva ? ', torna tra gli attivi' : ''}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
          <div class="azioni"><button class="btn chiaro" type="button" data-annulla>${UI.ic('x')}Annulla</button><button class="btn verde xl" type="button" data-conf ${ok ? '' : 'disabled'}>${UI.ic('check')}Importa ${ok} ODP</button></div></section>`;
        UI.$('[data-annulla]', box).onclick = () => { box.innerHTML = ''; };
        UI.$('[data-conf]', box).onclick = async () => {
          const r = FT.imp.applica(ant, files.map(f => f.name || f.nome));
          if (filePreparati) for (const f of ricevuti) await FT.db.inboxCancella(f.id);
          UI.toast(`Importati ${r.nuovi} ODP nuovi e ${r.aggiornati} aggiornati`);
          FT.app.render();
        };
      } catch (e) { console.error(e); box.innerHTML = `<section class="pannello"><div class="avviso-in rosso">${UI.ic('attenzione')}Errore nella lettura dei file: ${U.esc(e.message)}</div></section>`; }
    };
    UI.$('[data-scegli]', el).onclick = async () => { const fs = await UI.scegliFile({ accetta: '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel', multipli: true }); if (fs.length) anteprima(fs); };
    const ric = UI.$('[data-ric]', el); if (ric) ric.onclick = () => { filePreparati = true; anteprima(ricevuti); };
    const sc = UI.$('[data-scarta]', el); if (sc) sc.onclick = async () => { for (const f of ricevuti) await FT.db.inboxCancella(f.id); FT.app.render(); };
    if (filePreparati && ricevuti.length) anteprima(ricevuti);
  };

  /* ======================= esporta ======================= */
  const PERIODI = [['tutto', 'Tutti i dati'], ['oggi', 'Oggi'], ['ieri', 'Ieri'], ['7', 'Ultimi 7 giorni'], ['30', 'Ultimi 30 giorni'], ['mese', 'Mese in corso'], ['pers', 'Altro periodo']];
  FT.views.intervallo = (p, da, a) => {
    const oggi = U.giorno();
    if (p === 'oggi') return [oggi, oggi];
    if (p === 'ieri') { const y = U.giorno(U.aggiungiGiorni(U.daGiorno(oggi), -1)); return [y, y]; }
    if (p === '7' || p === '30') return [U.giorno(U.aggiungiGiorni(U.daGiorno(oggi), -(+p - 1))), oggi];
    if (p === 'mese') return [oggi.slice(0, 8) + '01', oggi];
    if (p === 'pers') return [da || '', a || ''];
    return ['', ''];
  };
  FT.views.periodiHtml = (sel, da, a) => `<div class="filtri">${PERIODI.map(([k, t]) => `<button class="chip ${sel === k ? 'on' : ''}" type="button" data-per="${k}">${t}</button>`).join('')}
    ${sel === 'pers' ? `<label class="campo">Dal<input type="date" data-da value="${da || ''}"></label><label class="campo">Al<input type="date" data-a value="${a || ''}"></label>` : ''}</div>`;
  const stExp = { per: '30', da: '', a: '' };
  PAG.esporta = el => {
    const meta = FT.model.dati.meta;
    el.innerHTML = `<section class="pannello"><h2>${UI.ic('scarica')}Esporta i tempi in Excel</h2>
      <p class="sp">Il file ha nove fogli: Lavorazioni, Sessioni, Pause, Scarti, Tempi articolo, Riepilogo ODP, Colate giornaliere, Registro modifiche e Legenda. Le intestazioni restano bloccate e i filtri sono già attivi.</p>
      ${FT.views.periodiHtml(stExp.per, stExp.da, stExp.a)}
      <button class="btn verde xl" type="button" data-prep>${UI.ic('scarica')}Prepara il file Excel</button>
      <p class="sp" style="margin-top:12px">Ultimo export: <b>${meta.lastExport ? U.fmtDataOraLunga(meta.lastExport) : 'mai'}</b></p></section><div data-ris></div>`;
    UI.$$('[data-per]', el).forEach(b => b.onclick = () => { stExp.per = b.dataset.per; PAG.esporta(el); });
    const da = UI.$('[data-da]', el), a = UI.$('[data-a]', el);
    if (da) da.onchange = () => stExp.da = da.value; if (a) a.onchange = () => stExp.a = a.value;
    UI.$('[data-prep]', el).onclick = async () => {
      const [d0, d1] = FT.views.intervallo(stExp.per, stExp.da, stExp.a);
      const box = UI.$('[data-ris]', el); box.innerHTML = `<section class="pannello"><p class="sp">${UI.ic('orologio')} Preparazione del file… con molti dati può richiedere qualche secondo.</p></section>`;
      await new Promise(r => setTimeout(r, 30));
      try {
        const r = await FT.exp.prepara({ da: d0, a: d1 });
        const share = UI.puoCondividere(r.nome, FT.xlsx.MIME);
        box.innerHTML = `<section class="pannello"><h2>${UI.ic('check')}File pronto</h2><p class="sp"><b>${U.esc(r.nome)}</b><br>${U.fmtInt(r.conteggi.lavorazioni)} lavorazioni, ${U.fmtInt(r.conteggi.sessioni)} sessioni, ${U.fmtInt(r.conteggi.pause)} pause, ${U.fmtInt(r.conteggi.odp)} ODP. ${(r.blob.size / 1024).toFixed(0)} kB.</p>
          <div class="azioni"><button class="btn blu xl" type="button" data-salva>${UI.ic('scarica')}Salva in Download</button>${share ? `<button class="btn chiaro xl" type="button" data-cond>${UI.ic('condividi')}Invia</button>` : ''}</div>
          <p class="sp" style="margin-top:10px">Dopo il salvataggio lo trovi nella cartella Download del tablet: allegalo a un'email da Gmail.</p></section>`;
        UI.$('[data-salva]', box).onclick = () => { UI.scarica(r.blob, r.nome); FT.model.salvaMeta({ lastExport: Date.now() }); UI.toast('File salvato in Download'); };
        const c = UI.$('[data-cond]', box); if (c) c.onclick = async () => { try { if (await UI.condividi(r.blob, r.nome, 'Tempi Friber')) FT.model.salvaMeta({ lastExport: Date.now() }); } catch (e) { if (e.name !== 'AbortError') UI.toast('Invio non riuscito: ' + e.message, { errore: true }); } };
      } catch (e) { console.error(e); box.innerHTML = `<section class="pannello"><div class="avviso-in rosso">${UI.ic('attenzione')}Errore nella preparazione: ${U.esc(e.message)}</div></section>`; }
    };
  };

  /* ======================= backup ======================= */
  PAG.backup = async el => {
    const M = FT.model, meta = M.dati.meta;
    const copie = await FT.bak.copie();
    let spazio = '', protetta = null;
    try { if (navigator.storage) { const e = navigator.storage.estimate ? await navigator.storage.estimate() : null; if (e) spazio = `${(e.usage / 1048576).toFixed(1)} MB usati`; protetta = navigator.storage.persisted ? await navigator.storage.persisted() : null; } } catch (e) { /* non disponibile */ }
    el.innerHTML = `<section class="pannello"><h2>${UI.ic('salva')}Backup dei dati</h2>
      <p class="sp">Ogni giorno, al primo tocco sul tablet, l'app salva da sola un backup nella cartella Download (file <b>friber_backup_…json.gz</b>). Conserva quelli recenti e cancella ogni tanto i più vecchi.</p>
      <div class="kv" style="margin-bottom:14px"><div>Ultimo backup automatico<b>${meta.lastBackup ? U.fmtGiorno(meta.lastBackup) : 'mai'}</b></div><div>Dati sul tablet<b>${M.dati.odp.size} ODP, ${M.dati.lav.size} lavorazioni</b></div>
        <div>Archivio protetto dal browser<b>${protetta == null ? 'non verificabile' : protetta ? 'sì' : 'no'}</b></div>${spazio ? `<div>Spazio<b>${spazio}</b></div>` : ''}</div>
      <div class="azioni"><button class="btn blu xl" type="button" data-ora>${UI.ic('scarica')}Salva un backup adesso</button><button class="btn chiaro xl" type="button" data-rip>${UI.ic('carica')}Ripristina da un file</button></div></section>
      <section class="pannello"><h2>${UI.ic('archivio')}Copie interne</h2><p class="sp">L'app tiene anche una copia al giorno degli ultimi 10 giorni e una copia prima di ogni ripristino. Servono se una correzione va storta, non se si cancellano i dati di Chrome.</p>
        ${copie.length ? copie.map(c => `<div class="riga-l">${UI.ic('archivio')}<b>${U.esc(c.etichetta)}</b><span class="dx"><button class="btn chiaro s" type="button" data-copia="${U.esc(c.k)}">${UI.ic('riapri')}Ripristina</button></span></div>`).join('') : '<p class="sp">Nessuna copia ancora.</p>'}</section>
      <section class="pannello"><h2>${UI.ic('cestino')}Cancella tutti i dati</h2><p class="sp">Per ripartire da zero dopo le prove. Prima viene salvato un backup in Download e una copia interna. Le impostazioni e il PIN restano.</p>
        <button class="btn rosso" type="button" data-azz>${UI.ic('cestino')}Cancella ODP e lavorazioni</button></section>`;
    UI.$('[data-ora]', el).onclick = async () => { const b = await FT.bak.crea(); UI.scarica(b.blob, b.nome); M.salvaMeta({ lastBackup: U.giorno() }); UI.toast('Backup salvato in Download'); };
    UI.$('[data-rip]', el).onclick = async () => {
      const [f] = await UI.scegliFile({ accetta: '.json,.gz,application/json,application/gzip' }); if (!f) return;
      FT.views.ripristinaFile(f);
    };
    UI.$$('[data-copia]', el).forEach(b => b.onclick = async () => {
      const c = copie.find(x => x.k === b.dataset.copia);
      if (await UI.conferma({ titolo: 'Ripristinare la copia?', testo: `I dati attuali vengono sostituiti con: <b>${U.esc(c.etichetta)}</b>. Prima viene fatta una copia di quelli attuali.`, ok: 'Ripristina', cls: 'rosso' })) {
        await FT.bak.ripristinaCopia(c.k); UI.toast('Copia ripristinata'); FT.app.render();
      }
    });
    UI.$('[data-azz]', el).onclick = async () => {
      if (!await UI.conferma({ titolo: 'Cancellare tutti i dati?', testo: `Verranno eliminati <b>${M.dati.odp.size} ODP</b> e <b>${M.dati.lav.size} lavorazioni</b>. Prima viene salvato un backup in Download.`, ok: 'Continua', cls: 'rosso' })) return;
      if (!await UI.conferma({ titolo: 'Confermi la cancellazione?', testo: 'Ultima conferma: l\'operazione si annulla solo ripristinando il backup.', ok: 'Cancella tutto', cls: 'rosso', okIcona: 'cestino' })) return;
      const b = await FT.bak.crea(); UI.scarica(b.blob, b.nome);
      await FT.bak.azzera(); UI.toast('Dati cancellati. Backup salvato in Download'); FT.app.render();
    };
  };
  FT.views.ripristinaFile = async f => {
    try {
      const d = await FT.bak.leggi(f); const r = FT.bak.riepilogo(d);
      if (await UI.conferma({ titolo: 'Ripristinare il backup?', testo: `Backup del <b>${r.creato ? U.fmtDataOraLunga(r.creato) : 'data sconosciuta'}</b> con <b>${r.odp} ODP</b> e <b>${r.lav} lavorazioni</b>${r.versione ? ` (versione ${U.esc(r.versione)})` : ''}.<br>I dati attuali vengono sostituiti; prima ne viene fatta una copia interna.`, ok: 'Ripristina', cls: 'rosso' })) {
        await FT.bak.ripristina(d); UI.toast('Backup ripristinato'); FT.app.render(); return true;
      }
    } catch (e) { UI.toast(e.message, { errore: true }); }
    return false;
  };

  /* ======================= file ricevuti (backup) ======================= */
  PAG.ricevuti = async el => {
    const files = await FT.db.inboxTutti();
    if (!files.length) { el.innerHTML = `<div class="pannello"><div class="vuoto">${UI.ic('posta')}Nessun file ricevuto.</div></div>`; return; }
    const excel = files.filter(f => /\.(xlsx|xls|csv)$/i.test(f.nome)), bak = files.filter(f => /\.(json|gz)$/i.test(f.nome)), altri = files.filter(f => !excel.includes(f) && !bak.includes(f));
    if (excel.length && !bak.length) { location.hash = '#/admin/importa'; return; }
    el.innerHTML = `<section class="pannello"><h2>${UI.ic('posta')}File ricevuti</h2>${files.map(f => `<div class="riga-l">${UI.ic('nota')}<b>${U.esc(f.nome)}</b><span class="muto">${(f.dim / 1024).toFixed(0)} kB, ${U.fmtDataOra(f.t)}</span><span class="dx">
      ${excel.includes(f) ? `<a class="btn blu s" href="#/admin/importa">${UI.ic('carica')}Importa</a>` : bak.includes(f) ? `<button class="btn blu s" type="button" data-rip="${f.id}">${UI.ic('riapri')}Ripristina</button>` : '<span class="muto">tipo non gestito</span>'}
      <button class="btn chiaro s" type="button" data-del="${f.id}">${UI.ic('cestino')}Scarta</button></span></div>`).join('')}${altri.length ? '<p class="sp">Si possono importare solo file Excel delle estrazioni e backup dell\'app.</p>' : ''}</section>`;
    UI.$$('[data-del]', el).forEach(b => b.onclick = async () => { await FT.db.inboxCancella(b.dataset.del); FT.app.render(); });
    UI.$$('[data-rip]', el).forEach(b => b.onclick = async () => { const f = files.find(x => x.id === b.dataset.rip); if (await FT.views.ripristinaFile(new Blob([f.dati]))) await FT.db.inboxCancella(f.id); FT.app.render(); });
  };

  /* ======================= impostazioni ======================= */
  PAG.impostazioni = el => {
    const M = FT.model, S = M.dati.settings;
    el.innerHTML = `<section class="pannello"><h2>${UI.ic('lucchetto')}PIN supervisore</h2>
        <p class="sp">${S.pinPredefinito ? '<b style="color:var(--rosso)">Il PIN è ancora quello iniziale (1234).</b> ' : ''}Quando cambi il PIN ricevi un codice di recupero di 12 cifre: annotalo e conservalo in ufficio. Se dimentichi il PIN, scrivi il codice al posto del PIN.</p>
        <button class="btn blu" type="button" data-pin>${UI.ic('lucchetto')}Cambia PIN</button></section>
      <form class="pannello" data-form><h2>${UI.ic('orologio')}Tempi e chiusure automatiche</h2>
        <div class="righe-campi"><label class="campo">Chiusura automatica dopo (ore di lavoro continuo)<input type="number" name="maxOre" min="0.5" max="24" step="0.5" value="${S.maxOre}"></label>
        ${C.FASI.map(f => `<label class="campo">${U.esc(f.nome)} (ore, vuoto = come sopra)<input type="number" name="max_${f.id}" min="0.5" max="24" step="0.5" value="${(S.maxOreFase && S.maxOreFase[f.id]) || ''}"></label>`).join('')}</div>
        <div class="righe-campi"><label class="campo">Pausa automatica agli orari di fine turno<input type="text" name="turni" placeholder="es. 14:00, 22:00" value="${U.esc((S.turni || []).join(', '))}"><span class="aiuto">Vuoto = disattivata. Una sessione ancora aperta dopo la fine turno viene chiusa all'orario indicato.</span></label>
        <label class="campo">Tolleranza dopo la fine turno (minuti)<input type="number" name="tolTurno" min="0" max="120" value="${S.tolTurno}"></label></div>
        <label class="campo" style="max-width:420px">Lavorazione aperta da più di (giorni) = da verificare<input type="number" name="staleGiorni" min="1" max="30" value="${S.staleGiorni}"></label>
        <h2 style="margin-top:8px">${UI.ic('pausa')}Motivi di pausa proposti</h2>
        <label class="campo">Uno per riga<textarea name="cause" rows="5">${U.esc((S.causePausa || []).join('\n'))}</textarea></label>
        <h2 style="margin-top:8px">${UI.ic('scarto')}Cause di scarto proposte</h2>
        <label class="campo">Una per riga<textarea name="causeScarto" rows="4">${U.esc((S.causeScarto || C.IMPOSTAZIONI.causeScarto).join('\n'))}</textarea></label>
        <h2 style="margin-top:8px">${UI.ic('tastiera')}Tablet</h2>
        <div class="righe-campi"><label class="campo">Torna alla pagina iniziale dopo (minuti senza tocchi, 0 = mai)<input type="number" name="homeMin" min="0" max="60" value="${S.homeMin}"></label>
        <label class="campo">Esci dall'area supervisore dopo (minuti)<input type="number" name="adminMin" min="2" max="60" value="${S.adminMin}"></label></div>
        <label class="spunta"><input type="checkbox" name="wake" ${S.wake ? 'checked' : ''}>Schermo sempre acceso quando ci sono lavorazioni in corso</label>
        <label class="spunta"><input type="checkbox" name="vibra" ${S.vibra ? 'checked' : ''}>Vibrazione di conferma ai tocchi</label>
        <div class="azioni" style="margin-top:14px"><button class="btn verde xl" type="submit">${UI.ic('check')}Salva le impostazioni</button></div></form>
      <section class="pannello"><h2>${UI.ic('info')}Informazioni</h2><div class="kv"><div>Versione<b>${FT.VERSIONE}</b></div><div>In uso dal<b>${U.fmtDataOraLunga(M.dati.meta.installato)}</b></div>
        <div>Data e ora del tablet<b>${U.fmtDataOraLunga(Date.now())}</b></div></div></section>`;
    UI.$('[data-pin]', el).onclick = () => FT.app.cambiaPin();
    UI.$('[data-form]', el).onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target); const num = (k, min, max, def) => { const v = parseFloat(String(f.get(k)).replace(',', '.')); return isFinite(v) && v >= min && v <= max ? v : def; };
      const turni = String(f.get('turni') || '').split(/[,;\s]+/).filter(Boolean);
      const male = turni.filter(t => !/^([01]?\d|2[0-3]):[0-5]\d$/.test(t));
      if (male.length) { UI.toast('Orario non valido: ' + male.join(', '), { errore: true }); return; }
      const maxOreFase = {}; C.FASI.forEach(x => { const v = parseFloat(String(f.get('max_' + x.id)).replace(',', '.')); if (isFinite(v) && v > 0) maxOreFase[x.id] = v; });
      const causeS = String(f.get('causeScarto') || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 8);
      const cause = String(f.get('cause') || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 8);
      M.salvaImpostazioni({
        maxOre: num('maxOre', 0.5, 24, S.maxOre), maxOreFase, turni: turni.map(t => t.padStart(5, '0')), tolTurno: num('tolTurno', 0, 120, S.tolTurno),
        staleGiorni: num('staleGiorni', 1, 30, S.staleGiorni), causePausa: cause.length ? cause : C.IMPOSTAZIONI.causePausa, causeScarto: causeS.length ? causeS : C.IMPOSTAZIONI.causeScarto,
        homeMin: num('homeMin', 0, 60, S.homeMin), adminMin: num('adminMin', 2, 60, S.adminMin), wake: !!f.get('wake'), vibra: !!f.get('vibra'),
      });
      FT.app.aggiornaWakeLock();
      UI.toast('Impostazioni salvate'); FT.app.render();
    };
  };
})(self.FT = self.FT || {});
