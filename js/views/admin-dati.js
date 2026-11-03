/* Tempi Friber — area supervisore: lavorazioni, ODP, percorsi articoli, analisi dei tempi. */
(function (FT) {
  'use strict';
  const U = FT.u, C = FT.cfg, UI = FT.ui;
  const PAG = FT.views.pagineAdmin;
  const STATO = { attiva: 'In corso', pausa: 'In pausa', chiusa: 'Chiusa' };

  /* ======================= lavorazioni ======================= */
  const stL = { stato: 'aperte', mac: '', q: '', da: '', a: '', limite: 100 };
  PAG.lavorazioni = el => {
    const M = FT.model;
    el.innerHTML = `<section class="pannello"><h2>${UI.ic('strati')}Lavorazioni<span class="dx"><button class="btn blu s" type="button" data-nuova>${UI.ic('piu')}Inserisci a mano</button></span></h2>
      <div class="filtri">${[['aperte', 'Aperte'], ['chiuse', 'Chiuse'], ['tutte', 'Tutte']].map(([k, t]) => `<button class="chip ${stL.stato === k ? 'on' : ''}" type="button" data-st="${k}">${t}</button>`).join('')}
        <label class="campo">Postazione<select data-mac><option value="">Tutte</option>${C.MACCHINE.map(m => `<option value="${m.id}" ${stL.mac === m.id ? 'selected' : ''}>${U.esc(m.nome)}</option>`).join('')}</select></label>
        <label class="campo">ODP o codice<input type="search" data-q value="${U.esc(stL.q)}" placeholder="Cerca"></label>
        <label class="campo">Dal<input type="date" data-da value="${stL.da}"></label><label class="campo">Al<input type="date" data-a value="${stL.a}"></label></div>
      <div data-tab></div></section>`;
    const disegna = () => {
      const q = U.normTesto(stL.q); const t0 = stL.da ? U.daGiorno(stL.da) : 0, t1 = stL.a ? U.mezzanotteDopo(U.daGiorno(stL.a)) : Infinity;
      let L = [...M.dati.lav.values()].filter(l => (stL.stato === 'tutte' || (stL.stato === 'aperte' ? l.stato !== 'chiusa' : l.stato === 'chiusa')) && (!stL.mac || l.mac === stL.mac));
      L = L.filter(l => { const i = M.inizio(l); return i < t1 && (M.ultimaFine(l) || Date.now()) >= t0; });
      if (q) L = L.filter(l => U.normTesto(`${l.odp} ${(M.odp(l.odp) || {}).codProd || ''}`).includes(q));
      L.sort((a, b) => M.inizio(b) - M.inizio(a));
      const tot = L.length; L = L.slice(0, stL.limite);
      const box = UI.$('[data-tab]', el);
      box.innerHTML = tot ? `<div class="tab-w"><table class="tab"><thead><tr><th>ODP</th><th>Articolo</th><th>Postazione</th><th>Stato</th><th>Inizio</th><th>Fine</th><th class="n">Netto</th><th class="n">Buoni</th><th class="n">Scarti</th><th></th></tr></thead><tbody>
        ${L.map(l => { const o = M.odp(l.odp) || {}; return `<tr><td><b>${U.esc(l.odp)}</b></td><td>${U.esc(o.codProd || '')}</td><td>${U.esc(C.macchina(l.mac).breve || C.macchina(l.mac).nome)}</td>
          <td>${STATO[l.stato]}${M.haAuto(l) ? ' ' + UI.ic('attenzione') : ''}${l.man ? ' <span class="muto">manuale</span>' : ''}</td><td>${U.fmtDataOra(M.inizio(l))}</td><td>${l.stato === 'chiusa' ? U.fmtDataOra(M.ultimaFine(l)) : '—'}</td>
          <td class="n">${U.fmtDurata(M.netto(l))}</td><td class="n">${U.fmtInt(l.buoni)}</td><td class="n">${U.fmtInt(l.scarti)}</td><td><button class="btn chiaro s" type="button" data-mod="${l.id}">${UI.ic('modifica')}Correggi</button></td></tr>`; }).join('')}
        </tbody></table></div>${tot > L.length ? `<div class="vuoto"><button class="btn chiaro" type="button" data-altre>Mostra altre (${tot - L.length})</button></div>` : ''}` : `<div class="vuoto">${UI.ic('strati')}Nessuna lavorazione con questi filtri.</div>`;
      UI.$$('[data-mod]', box).forEach(b => b.onclick = () => FT.views.modificaLav(M.lav(b.dataset.mod)));
      const al = UI.$('[data-altre]', box); if (al) al.onclick = () => { stL.limite += 200; disegna(); };
    };
    UI.$$('[data-st]', el).forEach(b => b.onclick = () => { stL.stato = b.dataset.st; stL.limite = 100; UI.$$('[data-st]', el).forEach(x => x.classList.toggle('on', x === b)); disegna(); });
    UI.$('[data-mac]', el).onchange = e => { stL.mac = e.target.value; disegna(); };
    UI.$('[data-q]', el).oninput = e => { stL.q = e.target.value; disegna(); };
    UI.$('[data-da]', el).onchange = e => { stL.da = e.target.value; disegna(); };
    UI.$('[data-a]', el).onchange = e => { stL.a = e.target.value; disegna(); };
    UI.$('[data-nuova]', el).onclick = () => nuovaManuale();
    disegna();
  };

  // Correzione di una lavorazione da parte del supervisore (tutte le modifiche finiscono nel registro).
  FT.views.modificaLav = l => {
    if (!l) return;
    const M = FT.model, o = M.odp(l.odp) || {}, m = C.macchina(l.mac);
    let seg = l.seg.map(s => ({ ...s }));
    UI.modale(`<h2>${UI.ic('modifica')}ODP ${U.esc(l.odp)}, ${U.esc(m.nome)}</h2>
      <p class="md-testo">${U.esc(o.codProd || '')} ${U.esc(o.descr || '')}</p>
      <div class="righe-campi"><label class="campo">Pezzi buoni<input type="number" min="0" data-b value="${l.buoni}"></label><label class="campo">Pezzi scartati<input type="number" min="0" data-s value="${l.scarti}"></label>
        <label class="campo">Stato<select data-st>${Object.entries(STATO).map(([k, t]) => `<option value="${k}" ${l.stato === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        ${M.conDest(l.fase) ? (() => { const alt = l.fase === 'NAS' ? ['MAN', 'Sbavatura manuale'] : ['NAS', 'Sbavatura a nastro']; return `<label class="campo">${l.fase === 'NAS' ? 'Dopo il nastro' : 'Dopo il manuale'}<select data-dest><option value="">Non indicato</option><option value="${alt[0]}" ${l.dest === alt[0] ? 'selected' : ''}>${alt[1]}</option><option value="SAB" ${l.dest === 'SAB' ? 'selected' : ''}>Sabbiatura</option></select></label>`; })() : ''}</div>
      <label class="campo" style="max-width:360px">Causa per gli scarti aggiunti<select data-causa>${(M.dati.settings.causeScarto || C.IMPOSTAZIONI.causeScarto).concat(['Non indicata']).map(c => `<option>${U.esc(c)}</option>`).join('')}</select></label>
      <div class="titoletto">Sessioni di lavoro: inizio e fine</div><div data-sess></div>
      <button class="btn chiaro s" type="button" data-add>${UI.ic('piu')}Aggiungi una sessione</button>
      <label class="campo" style="margin-top:12px">Note<textarea data-note>${U.esc(l.note)}</textarea></label>
      <label class="spunta"><input type="checkbox" data-ver ${l.ver ? 'checked' : ''}>Verificata, non segnalarla tra le anomalie</label>
      ${l.mod.length ? `<details><summary class="muto" style="cursor:pointer;font-weight:600">Registro delle modifiche (${l.mod.length})</summary><div class="tab-w"><table class="tab"><tbody>${l.mod.slice().reverse().map(x => `<tr><td style="white-space:nowrap">${U.fmtDataOraLunga(x.t)}</td><td>${U.esc(x.cosa)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
      <div class="avviso-in rosso" data-err hidden>${UI.ic('attenzione')}<span></span></div>
      <div class="azioni"><button class="btn rosso s quadro" type="button" data-del aria-label="Elimina lavorazione" style="width:auto;padding:0 16px">${UI.ic('cestino')}Elimina</button><span style="flex:1"></span><button class="btn chiaro" type="button" data-chiudi>${UI.ic('x')}Annulla</button><button class="btn verde" type="button" data-ok>${UI.ic('check')}Salva</button></div>`, {
      cls: 'largo',
      onApri: (md, chiudi) => {
        const disegna = () => {
          UI.$('[data-sess]', md).innerHTML = seg.map((s, i) => `<div class="sess-riga"><label class="campo" style="margin:0">Inizio ${i + 1}<input type="datetime-local" data-i="${i}" data-k="s" value="${U.perInput(s.s)}"></label>
            <label class="campo" style="margin:0">Fine ${i + 1}${s.tipo === 'auto' || s.tipo === 'turno' ? ' (automatica)' : ''}<input type="datetime-local" data-i="${i}" data-k="e" value="${s.e ? U.perInput(s.e) : ''}"></label>
            <button class="btn chiaro s" type="button" data-rm="${i}" aria-label="Togli sessione ${i + 1}">${UI.ic('cestino')}</button></div>`).join('') || '<p class="sp">Nessuna sessione.</p>';
          UI.$$('input[data-i]', md).forEach(inp => inp.onchange = () => {
            const s = seg[+inp.dataset.i]; s[inp.dataset.k] = U.daInput(inp.value);
            if (inp.dataset.k === 'e' && (s.tipo === 'auto' || s.tipo === 'turno')) { s.tipo = 'pausa'; s.nota = (s.nota ? s.nota + ', ' : '') + 'fine corretta dal supervisore'; }
          });
          UI.$$('[data-rm]', md).forEach(b => b.onclick = () => { seg.splice(+b.dataset.rm, 1); disegna(); });
        };
        disegna();
        UI.$('[data-add]', md).onclick = () => { const u = seg[seg.length - 1]; const t = u ? (u.e || Date.now()) : Date.now(); seg.push({ s: t, e: t + 3600000, tipo: 'pausa', nota: 'Inserita dal supervisore' }); disegna(); };
        const err = UI.$('[data-err]', md);
        UI.$('[data-ok]', md).onclick = () => {
          const stato = UI.$('[data-st]', md).value; seg.sort((a, b) => a.s - b.s);
          const e = M.validaSessioni(seg, stato);
          if (e) { err.hidden = false; err.querySelector('span').textContent = e; return; }
          const patch = { seg, stato, buoni: parseInt(UI.$('[data-b]', md).value || '0', 10), scarti: parseInt(UI.$('[data-s]', md).value || '0', 10), note: UI.$('[data-note]', md).value.trim(), ver: UI.$('[data-ver]', md).checked };
          const d = UI.$('[data-dest]', md); if (d) patch.dest = d.value || null;
          const cs = UI.$('[data-causa]', md); if (cs) patch.causa = cs.value;
          let diff;
          try { diff = M.modifica(l, patch); } catch (ex) { err.hidden = false; err.querySelector('span').textContent = ex.message; return; }
          chiudi(); UI.toast(diff.length ? 'Lavorazione corretta' : 'Nessuna modifica'); FT.app.render();
        };
        UI.$('[data-del]', md).onclick = async () => {
          chiudi();
          if (!M.puoEliminare(l)) { UI.toast('Non si può eliminare: i suoi pezzi sono già stati lavorati nella fase successiva. Correggi prima quella.', { errore: true, durata: 7000 }); return; }
          if (await UI.conferma({ titolo: 'Eliminare la lavorazione?', testo: `ODP <b>${U.esc(l.odp)}</b> su ${U.esc(m.nome)}, ${U.fmtDurata(M.netto(l))}, ${U.fmtInt(l.buoni)} pezzi buoni. Non sarà più nei tempi né nell'export.`, ok: 'Elimina', cls: 'rosso', okIcona: 'cestino' })) {
            const snap = M.istantanea([l.id]); M.elimina(l); FT.app.render();
            UI.toast('Lavorazione eliminata', { annulla: () => { M.ripristinaIstantanea(snap); FT.app.render(); } });
          }
        };
      },
    });
  };

  function nuovaManuale() {
    const M = FT.model; const ora = Date.now();
    const elenco = [...M.dati.odp.values()].filter(o => !o.archiviato).sort((a, b) => a.num.localeCompare(b.num));
    UI.modale(`<h2>${UI.ic('piu')}Inserisci una lavorazione a mano</h2>
      <p class="md-testo">Per le lavorazioni che l'operatore non ha registrato. Viene segnata come inserita dal supervisore.</p>
      <div class="righe-campi"><label class="campo">Postazione<select data-mac>${C.MACCHINE.map(m => `<option value="${m.id}">${U.esc(m.nome)}</option>`).join('')}</select></label>
        <label class="campo">ODP<input data-odp list="odp-elenco" inputmode="numeric" autocomplete="off"><datalist id="odp-elenco">${elenco.map(o => `<option value="${U.esc(o.num)}">${U.esc(o.codProd)} ${U.esc(o.descr)}</option>`).join('')}</datalist></label>
        <label class="campo">Inizio<input type="datetime-local" data-s value="${U.perInput(ora - 3600000)}"></label><label class="campo">Fine<input type="datetime-local" data-e value="${U.perInput(ora)}"></label>
        <label class="campo">Pezzi buoni<input type="number" min="0" data-b value="0"></label><label class="campo">Pezzi scartati<input type="number" min="0" data-sc value="0"></label>
        <label class="campo" data-destw hidden><span data-destl>Dopo il nastro</span><select data-dest></select></label></div>
      <label class="campo">Note<textarea data-note></textarea></label>
      <div class="avviso-in rosso" data-err hidden>${UI.ic('attenzione')}<span></span></div>
      <div class="azioni"><button class="btn chiaro" type="button" data-chiudi>${UI.ic('x')}Annulla</button><button class="btn verde" type="button" data-ok>${UI.ic('check')}Inserisci</button></div>`, {
      onApri: (md, chiudi) => {
        const mac = UI.$('[data-mac]', md); const dw = UI.$('[data-destw]', md);
        mac.onchange = () => { const f = C.macchina(mac.value).fase; dw.hidden = !M.conDest(f); if (dw.hidden) return; const alt = f === 'NAS' ? ['MAN', 'Sbavatura manuale'] : ['NAS', 'Sbavatura a nastro']; UI.$('[data-destl]', md).textContent = f === 'NAS' ? 'Dopo il nastro' : 'Dopo il manuale'; UI.$('[data-dest]', md).innerHTML = `<option value="${alt[0]}">${alt[1]}</option><option value="SAB" selected>Sabbiatura</option>`; }; mac.onchange();
        const err = UI.$('[data-err]', md); const no = t => { err.hidden = false; err.querySelector('span').textContent = t; };
        UI.$('[data-ok]', md).onclick = () => {
          const num = UI.$('[data-odp]', md).value.trim(); if (!M.odp(num)) return no('ODP non trovato tra quelli importati');
          const s = U.daInput(UI.$('[data-s]', md).value), e = U.daInput(UI.$('[data-e]', md).value);
          if (!s || !e || e <= s) return no('Controlla inizio e fine');
          if (e > Date.now() + 60000) return no('La fine non può essere nel futuro');
          try { M.creaManuale({ mac: mac.value, odp: num, s, e, buoni: parseInt(UI.$('[data-b]', md).value || '0', 10), scarti: parseInt(UI.$('[data-sc]', md).value || '0', 10), dest: M.conDest(C.macchina(mac.value).fase) ? UI.$('[data-dest]', md).value : null, note: UI.$('[data-note]', md).value.trim() }); } catch (ex) { return no(ex.message); }
          chiudi(); UI.toast('Lavorazione inserita'); FT.app.render();
        };
      },
    });
  }

  /* ======================= ODP ======================= */
  const stO = { filtro: 'attivi', q: '', limite: 100 };
  PAG.odp = el => {
    const M = FT.model;
    const nComp = [...M.dati.odp.values()].filter(o => !o.archiviato && M.completato(o.num)).length;
    el.innerHTML = `<section class="pannello"><h2>${UI.ic('elenco')}ODP importati<span class="dx">${M.dati.odp.size}</span></h2>
      <p class="sp">Archivia gli ODP finiti o non più da lavorare: spariscono dalle liste degli operatori e dalle code, ma restano nei dati e nell'export.</p>
      <div class="filtri">${[['attivi', 'Attivi'], ['completati', 'Completati'], ['archiviati', 'Archiviati'], ['senza', 'Senza lavorazioni'], ['tutti', 'Tutti']].map(([k, t]) => `<button class="chip ${stO.filtro === k ? 'on' : ''}" type="button" data-f="${k}">${t}</button>`).join('')}
        <label class="campo">Cerca<input type="search" data-q value="${U.esc(stO.q)}" placeholder="ODP, codice, cliente"></label>
        ${nComp ? `<button class="btn blu s" type="button" data-archcomp>${UI.ic('archivio')}Archivia i completati (${nComp})</button>` : ''}</div>
      <div data-tab></div></section>`;
    const disegna = () => {
      const q = U.normTesto(stO.q);
      let L = [...M.dati.odp.values()];
      if (stO.filtro === 'attivi') L = L.filter(o => !o.archiviato && !M.completato(o.num));
      if (stO.filtro === 'completati') L = L.filter(o => !o.archiviato && M.completato(o.num));
      if (stO.filtro === 'archiviati') L = L.filter(o => o.archiviato);
      if (stO.filtro === 'senza') L = L.filter(o => !M.lavDiOdp(o.num).length);
      if (q) L = L.filter(o => U.normTesto(`${o.num} ${o.ordLav} ${o.codProd} ${o.descr} ${o.cliente}`).includes(q));
      L.sort((a, b) => (a.consegna || '9').localeCompare(b.consegna || '9') || a.num.localeCompare(b.num));
      const tot = L.length; L = L.slice(0, stO.limite);
      const box = UI.$('[data-tab]', el);
      box.innerHTML = tot ? `<div class="tab-w"><table class="tab"><thead><tr><th>ODP</th><th>Articolo</th><th>Cliente</th><th>Linea</th><th>Consegna</th><th class="n">Colati</th><th class="n">Finiti</th><th class="n">Nel ciclo</th><th class="n">Lav.</th><th></th></tr></thead><tbody>
        ${L.map(o => { const a = M.avanzamento(o.num), n = M.lavDiOdp(o.num).length; return `<tr><td><a href="#/odp/${encodeURIComponent(o.num)}"><b>${U.esc(o.num)}</b></a></td><td>${U.esc(o.codProd)} <span class="muto">${U.esc(o.descr.slice(0, 40))}</span></td><td>${U.esc(o.cliente)}</td><td>${U.esc(o.linea)}</td><td>${U.fmtGiorno(o.consegna)}</td>
          <td class="n">${U.fmtInt(o.qta)}</td><td class="n">${U.fmtInt(a.finiti)}</td><td class="n">${U.fmtInt(a.rimanente)}</td><td class="n">${n}</td>
          <td style="white-space:nowrap"><button class="btn chiaro s" type="button" data-arch="${U.esc(o.num)}">${UI.ic('archivio')}${o.archiviato ? 'Riattiva' : 'Archivia'}</button>${!n ? ` <button class="btn chiaro s" type="button" data-del="${U.esc(o.num)}" aria-label="Elimina ODP">${UI.ic('cestino')}</button>` : ''}</td></tr>`; }).join('')}
        </tbody></table></div>${tot > L.length ? `<div class="vuoto"><button class="btn chiaro" type="button" data-altri>Mostra altri (${tot - L.length})</button></div>` : ''}` : `<div class="vuoto">${UI.ic('elenco')}Nessun ODP in questo elenco.</div>`;
      UI.$$('[data-arch]', box).forEach(b => b.onclick = () => { const o = M.odp(b.dataset.arch); M.archivia(o.num, !o.archiviato); UI.toast(o.archiviato ? 'ODP archiviato' : 'ODP riattivato', { annulla: () => { M.archivia(o.num, !o.archiviato); disegna(); } }); disegna(); });
      UI.$$('[data-del]', box).forEach(b => b.onclick = async () => { if (await UI.conferma({ titolo: 'Eliminare l\'ODP?', testo: `L'ODP <b>${U.esc(b.dataset.del)}</b> non ha lavorazioni. Tornerà se lo reimporti.`, ok: 'Elimina', okIcona: 'cestino' })) { M.eliminaOdp(b.dataset.del); disegna(); } });
      const al = UI.$('[data-altri]', box); if (al) al.onclick = () => { stO.limite += 300; disegna(); };
    };
    UI.$$('[data-f]', el).forEach(b => b.onclick = () => { stO.filtro = b.dataset.f; stO.limite = 100; UI.$$('[data-f]', el).forEach(x => x.classList.toggle('on', x === b)); disegna(); });
    UI.$('[data-q]', el).oninput = e => { stO.q = e.target.value; disegna(); };
    const ac = UI.$('[data-archcomp]', el); if (ac) ac.onclick = () => { const n = M.archiviaCompletati(); UI.toast(`${n} ODP archiviati`); PAG.odp(el); };
    disegna();
  };

  /* ======================= percorsi articoli ======================= */
  const stA = { q: '' };
  PAG.articoli = el => {
    const M = FT.model;
    el.innerHTML = `<section class="pannello"><h2>${UI.ic('percorso')}Percorso di sbavatura per articolo</h2>
      <p class="sp">L'app impara il percorso dalle scelte fatte al nastro, al manuale e al Trebi, e lo usa per proporre la destinazione e ordinare gli ODP nelle liste. Se blocchi il percorso, l'app non lo cambia più da sola.</p>
      <div class="filtri"><label class="campo">Cerca<input type="search" data-q value="${U.esc(stA.q)}" placeholder="Codice o descrizione"></label></div><div data-tab></div></section>`;
    const disegna = () => {
      const q = U.normTesto(stA.q);
      let L = M.articoli(); if (q) L = L.filter(a => U.normTesto(a.cod + ' ' + a.descr).includes(q));
      const box = UI.$('[data-tab]', el);
      box.innerHTML = L.length ? `<div class="tab-w"><table class="tab"><thead><tr><th>Codice</th><th>Descrizione</th><th class="n">ODP</th><th>Ultima lavorazione</th><th>Percorso</th><th>Bloccato</th></tr></thead><tbody>
        ${L.slice(0, 400).map(a => `<tr><td><b>${U.esc(a.cod)}</b></td><td>${U.esc(a.descr)}</td><td class="n">${a.nOdp}</td><td>${a.ultima ? U.fmtDataOra(a.ultima) : '—'}</td>
          <td><select data-perc="${U.esc(a.cod)}" style="height:48px;border:2px solid var(--linea);border-radius:8px;padding:0 8px">${C.PERCORSI.map(p => `<option value="${p.id}" ${a.perc === p.id ? 'selected' : ''}>${p.nome}</option>`).join('')}</select></td>
          <td><input type="checkbox" data-fisso="${U.esc(a.cod)}" ${a.fisso ? 'checked' : ''} style="width:26px;height:26px" aria-label="Blocca il percorso di ${U.esc(a.cod)}"></td></tr>`).join('')}</tbody></table></div>` : `<div class="vuoto">${UI.ic('percorso')}Nessun articolo.</div>`;
      UI.$$('[data-perc]', box).forEach(s => s.onchange = () => { const cod = s.dataset.perc; const f = UI.$(`[data-fisso="${CSS.escape(cod)}"]`, box); M.setPercorso(cod, s.value, f ? f.checked : false); UI.toast('Percorso salvato'); });
      UI.$$('[data-fisso]', box).forEach(c => c.onchange = () => { const cod = c.dataset.fisso; const s = UI.$(`[data-perc="${CSS.escape(cod)}"]`, box); M.setPercorso(cod, s.value, c.checked); UI.toast(c.checked ? 'Percorso bloccato' : 'Percorso sbloccato'); });
    };
    UI.$('[data-q]', el).oninput = e => { stA.q = e.target.value; disegna(); };
    disegna();
  };

  /* ======================= analisi dei tempi ======================= */
  const stAn = { per: '30', da: '', a: '', ord: 'cod', q: '' };
  const barre = (righe, valore, fmt, extra) => {
    const max = Math.max(1e-9, ...righe.map(valore));
    return `<div class="tab-w"><table class="tab bt-tab"><tbody>${righe.map(r => `<tr><td>${r.nome}</td><td class="barra-c"><div class="barretta-v"><div class="barretta" style="width:${(valore(r) / max) * 100}%" role="presentation"></div></div></td><td class="n"><b>${fmt(valore(r))}</b></td>${extra ? extra(r) : ''}</tr>`).join('')}</tbody></table></div>`;
  };
  PAG.analisi = el => {
    const M = FT.model;
    const [d0, d1] = FT.views.intervallo(stAn.per, stAn.da, stAn.a);
    const t0 = d0 ? U.daGiorno(d0) : 0, t1 = d1 ? U.mezzanotteDopo(U.daGiorno(d1)) : Date.now() + 1;
    const an = M.analisi(t0, t1);
    const k = an.kpi;
    const macchine = an.macchine.map(x => ({ ...x, nome: U.esc(C.macchina(x.id).nome) })).sort((a, b) => b.ms - a.ms);
    const fasi = an.fasi.map(x => ({ ...x, nome: `${UI.icFase(x.id)} ${U.esc(C.fase(x.id).nome)}` }));
    const cause = an.cause.map(x => ({ ...x, nome: `${UI.icCausa(x.causa)} ${U.esc(x.causa)}` }));
    el.innerHTML = `${FT.views.periodiHtml(stAn.per, stAn.da, stAn.a)}
      <div class="kpi"><div><div class="k-v">${U.fmtOre(k.ms)}</div><div class="k-l">Ore nette lavorate</div></div><div><div class="k-v">${U.fmtInt(k.b)}</div><div class="k-l">Pezzi buoni</div></div>
        <div><div class="k-v">${U.fmtPct((k.b + k.s) ? k.s / (k.b + k.s) : null)}</div><div class="k-l">Scarti (${U.pz(k.s, 'pezzo', 'pezzi')})</div></div><div><div class="k-v">${U.fmtInt(k.chiuse)}</div><div class="k-l">Lavorazioni chiuse</div></div>
        <div><div class="k-v">${U.fmtOre(k.fermiMs)}</div><div class="k-l">Fermi e attese</div></div><div><div class="k-v">${U.fmtInt(k.auto)}</div><div class="k-l">Chiusure automatiche</div></div></div>
      ${k.ms === 0 && !k.b ? `<div class="pannello"><div class="vuoto">${UI.ic('grafico')}Nessuna lavorazione nel periodo scelto.</div></div>` : `
      <div class="griglia-2">
        <section class="pannello"><h2>${UI.ic('fabbrica')}Ore nette per postazione</h2>${barre(macchine, r => r.ms / 3600000, v => U.fmtNum(v, 1) + ' h', r => `<td class="n muto">${U.fmtInt(r.b)} pz</td>`)}</section>
        <section class="pannello"><h2>${UI.ic('strati')}Ore nette per fase</h2>${barre(fasi, r => r.ms / 3600000, v => U.fmtNum(v, 1) + ' h', r => `<td class="n muto">${U.fmtInt(r.b)} pz</td>`)}</section>
        <section class="pannello"><h2>${UI.ic('scarto')}Scarti per causa</h2>${an.causeScarto.length ? barre(an.causeScarto.map(x => ({ ...x, nome: U.esc(x.causa) })), r => r.n, v => U.fmtInt(v) + ' pz') : '<p class="sp">Nessuno scarto nel periodo.</p>'}</section>
        <section class="pannello"><h2>${UI.ic('pausa')}Pause per motivo</h2>${cause.length ? barre(cause, r => r.ms / 3600000, v => U.fmtNum(v, 1) + ' h') : '<p class="sp">Nessuna pausa nel periodo.</p>'}</section>
      </div>
      <section class="pannello" style="margin-top:14px"><h2>${UI.ic('articolo')}Tempi per articolo e fase<span class="dx">lavorazioni chiuse nel periodo</span></h2>
        <p class="sp">La mediana è il valore più affidabile come base per il tempo standard. Sono escluse dalle medie le lavorazioni chiuse in automatico.</p>
        <div class="filtri"><label class="campo">Cerca<input type="search" data-q value="${U.esc(stAn.q)}" placeholder="Codice o descrizione"></label><a class="btn blu s" href="#/admin/esporta">${UI.ic('scarica')}Esporta in Excel</a></div>
        <div data-art></div></section>`}`;
    UI.$$('[data-per]', el).forEach(b => b.onclick = () => { stAn.per = b.dataset.per; PAG.analisi(el); });
    const da = UI.$('[data-da]', el), a = UI.$('[data-a]', el);
    if (da) da.onchange = () => { stAn.da = da.value; PAG.analisi(el); };
    if (a) a.onchange = () => { stAn.a = a.value; PAG.analisi(el); };
    const box = UI.$('[data-art]', el); if (!box) return;
    const COL = [['cod', 'Articolo'], ['fase', 'Fase'], ['n', 'Lav.'], ['b', 'Buoni'], ['scartiPct', 'Scarti'], ['minPz', 'Min/pz media'], ['mediana', 'Min/pz mediana'], ['min', 'Min'], ['max', 'Max']];
    const disegna = () => {
      const q = U.normTesto(stAn.q); let L = an.articoli.filter(r => !q || U.normTesto(r.cod + ' ' + r.descr).includes(q));
      const o = stAn.ord; L.sort((x, y) => o === 'cod' ? x.cod.localeCompare(y.cod) || M.ordineFase(x.fase) - M.ordineFase(y.fase) : o === 'fase' ? M.ordineFase(x.fase) - M.ordineFase(y.fase) : (y[o] ?? -1) - (x[o] ?? -1));
      box.innerHTML = L.length ? `<div class="tab-w"><table class="tab"><thead><tr>${COL.map(([kk, t]) => `<th class="${['cod', 'fase'].includes(kk) ? '' : 'n'} ${stAn.ord === kk ? 'ord' : ''}" data-ord="${kk}">${t}</th>`).join('')}</tr></thead><tbody>
        ${L.map(r => `<tr><td><b>${U.esc(r.cod)}</b> <span class="muto">${U.esc((r.descr || '').slice(0, 36))}</span></td><td>${UI.icFase(r.fase)} ${U.esc(C.fase(r.fase).breve)}</td>
          <td class="n">${r.n}${r.auto ? ` <span class="muto">(${r.auto} escl.)</span>` : ''}</td><td class="n">${U.fmtInt(r.b)}</td><td class="n">${U.fmtPct(r.scartiPct)}</td>
          <td class="n">${U.fmtNum(r.minPz, 2)}</td><td class="n"><b>${U.fmtNum(r.mediana, 2)}</b></td><td class="n">${U.fmtNum(r.min, 2)}</td><td class="n">${U.fmtNum(r.max, 2)}</td></tr>`).join('')}</tbody></table></div>`
        : `<div class="vuoto">${UI.ic('articolo')}Nessuna lavorazione chiusa nel periodo.</div>`;
      UI.$$('[data-ord]', box).forEach(th => th.onclick = () => { stAn.ord = th.dataset.ord; disegna(); });
    };
    UI.$('[data-q]', el).oninput = e => { stAn.q = e.target.value; disegna(); };
    disegna();
  };
})(self.FT = self.FT || {});
