/* Tempi Friber — home: la linea di processo del reparto finitura. */
(function (FT) {
  'use strict';
  const U = FT.u, C = FT.cfg, UI = FT.ui;
  FT.views = FT.views || {};

  FT.views.statoMacchina = m => {
    const M = FT.model;
    const ap = M.aperte(m.id), att = ap.filter(l => l.stato === 'attiva');
    const auto = ap.find(l => l.stato === 'pausa' && ['auto', 'turno'].includes((M.ultimoSeg(l) || {}).tipo));
    if (att.length) {
      const l = att[0], min = M.minutiAlLimite(l), vicino = min != null && min < 30;
      const o = M.odp(l.odp) || {};
      return {
        cls: vicino ? 'al' : 'on', testo: 'In lavorazione',
        html: `${UI.ic('play')}<span>${att.length > 1 ? `${att.length} postazioni` : 'ODP ' + U.esc(l.odp)}</span><span class="tm" data-run="${l.id}">${U.fmtTimer(M.netto(l))}</span>`,
        sotto: vicino ? `${UI.ic('attenzione')} Chiusura automatica tra ${Math.max(0, Math.round(min))} min` : (att.length > 1 ? (ap.length > att.length ? `${ap.length - att.length} in pausa` : '') : U.esc(o.codProd || '')),
      };
    }
    if (auto) return { cls: 'al', testo: 'Chiusa in automatico', html: `${UI.ic('attenzione')}<span>Chiusa in automatico</span>`, sotto: 'ODP ' + U.esc(auto.odp) };
    if (ap.length) {
      const l = ap[ap.length - 1];
      return { cls: 'ps', testo: 'In pausa', html: `${UI.ic('pausa')}<span>${ap.length > 1 ? ap.length + ' ODP in pausa' : 'In pausa'}</span><span class="tm" data-pausa="${l.id}">${U.fmtTimer(Date.now() - M.inPausaDa(l))}</span>`, sotto: 'ODP ' + U.esc(l.odp) };
    }
    return { cls: '', testo: 'Libera', html: `${UI.ic('orologio')}<span>Libera</span>`, sotto: '' };
  };

  const tile = m => {
    const st = FT.views.statoMacchina(m);
    return `<button class="tile ${st.cls}" type="button" data-m="${m.id}" aria-label="${U.esc(m.nome)}: ${st.testo}">
      <div class="foto" style="background-image:url('${m.foto}')"></div><div class="lamp"></div>
      <div class="corpo"><div class="nome">${U.esc(m.nome)}</div><div class="nota">${U.esc(m.nota)}</div>
      <div class="st">${st.html}</div>${st.sotto ? `<div class="st2">${st.sotto}</div>` : ''}</div></button>`;
  };
  const testa = (n, nome, coda, etichetta) => `<div class="stadio-h"><span class="stadio-n">${n}</span>
    <div class="stadio-t"><div class="stadio-nome">${nome}</div><div class="st-coda"><b>${U.fmtInt(coda.pz)} pz</b> ${etichetta}</div><div class="st-odp">${coda.odp ? U.pz(coda.odp, 'ODP', 'ODP') : 'nessun ODP'}</div></div></div>`;
  const gruppo = fase => { const f = C.fase(fase); return `<div><div class="gruppo-h">${UI.icFase(fase)}${f.breve}</div><div class="pila">${C.MACCHINE.filter(m => m.fase === fase).map(tile).join('')}</div></div>`; };

  FT.views.home = () => {
    const M = FT.model;
    UI.barra({ titolo: 'Reparto finitura', sotto: 'Friber, lavorazioni post-colatura' });
    const q = M.codeReparto();
    const oggi = M.pezziGiorno();
    const tot = Object.values(oggi).reduce((s, x) => s + x.b, 0), totS = Object.values(oggi).reduce((s, x) => s + x.s, 0);
    const frecce = `<div class="freccia-linea" aria-hidden="true">${UI.ic('freccia')}</div>`;
    document.getElementById('vista').innerHTML = `
      <div class="linea">
        <section class="stadio" aria-label="Stadio 1, taglio">${testa(1, 'Taglio', q.taglio, 'da tagliare')}<div class="pila">${C.MACCHINE.filter(m => m.fase === 'TAG').map(tile).join('')}</div></section>
        ${frecce}
        <section class="stadio" aria-label="Stadio 2, sbavatura">${testa(2, 'Sbavatura', q.sbav, 'in attesa')}<div class="gruppi">${gruppo('NAS')}${gruppo('MAN')}${gruppo('TRE')}</div></section>
        ${frecce}
        <section class="stadio" aria-label="Stadio 3, sabbiatura">${testa(3, 'Sabbiatura', q.sab, 'in attesa')}<div class="pila">${C.MACCHINE.filter(m => m.fase === 'SAB').map(tile).join('')}</div></section>
      </div>
      <div class="reparto-piede">
        <span><i class="sw"></i>Libera</span><span><i class="sw on"></i>In lavorazione</span><span><i class="sw ps"></i>In pausa</span><span><i class="sw al"></i>Da controllare</span>
        <span style="margin-left:auto">Oggi registrati: <b>${U.pz(tot, 'pezzo buono', 'pezzi buoni')}</b>, <b>${U.pz(totS, 'scarto', 'scarti')}</b>, <b>${U.pz(oggi.SAB.b, 'sabbiato', 'sabbiati')}</b></span>
      </div>`;
    UI.$$('[data-m]').forEach(b => b.onclick = () => { UI.vibra(10); location.hash = '#/m/' + b.dataset.m; });
  };
})(self.FT = self.FT || {});
