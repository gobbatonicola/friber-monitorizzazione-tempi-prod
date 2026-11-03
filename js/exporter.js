/* Tempi Friber — export dei tempi in Excel per il controllo di gestione. */
(function (FT) {
  'use strict';
  const U = FT.u, C = FT.cfg;
  const E = {};
  const STATO = { attiva: 'In corso', pausa: 'In pausa', chiusa: 'Chiusa' };
  const TIPO_FINE = { pausa: 'Pausa', fine: 'Fine lavorazione', auto: 'Chiusura automatica', turno: 'Pausa automatica fine turno' };
  const DEST = { NAS: 'Sbavatura a nastro', MAN: 'Sbavatura manuale', SAB: 'Sabbiatura' };
  const min = ms => ms / 60000;

  E.prepara = async ({ da = '', a = '' } = {}) => {
    const M = FT.model, ora = Date.now();
    const t0 = da ? U.daGiorno(da) : 0, t1 = a ? U.mezzanotteDopo(U.daGiorno(a)) : Infinity;
    const o = num => M.odp(num) || {};
    const mac = id => (C.macchina(id) || { nome: id }).nome;
    const fase = id => (C.fase(id) || { nome: id }).nome;
    const L = [...M.dati.lav.values()]
      .filter(l => M.inizio(l) < t1 && (l.stato === 'chiusa' ? (M.ultimaFine(l) || l.chiuso) : ora) >= t0)
      .sort((x, y) => M.inizio(x) - M.inizio(y));

    const lav = L.map(l => {
      const n = M.netto(l, ora); const fineL = l.stato === 'chiusa' ? (M.ultimaFine(l) || l.chiuso) : null;
      const lordo = (fineL || ora) - M.inizio(l);
      return [l.id, l.odp, o(l.odp).codProd, o(l.odp).descr, o(l.odp).cliente, o(l.odp).linea, fase(l.fase), mac(l.mac), M.conDest(l.fase) ? (DEST[l.dest] || '') : '',
        STATO[l.stato], M.inizio(l), fineL, min(n), min(Math.max(0, lordo - n)), l.seg.length, l.buoni, l.scarti,
        (l.buoni + l.scarti) ? l.scarti / (l.buoni + l.scarti) : null, l.buoni > 0 ? min(n) / l.buoni : null,
        l.seg.filter(s => s.tipo === 'auto' || s.tipo === 'turno').length, l.mod.some(m => m.cosa.startsWith('Supervisore')) ? 'Sì' : 'No', l.man ? 'Sì' : 'No', l.note];
    });
    const sess = [];
    for (const l of L) {
      const ps = M.pezziSessioni(l);
      l.seg.forEach((sg, i) => {
        const e = sg.e == null ? ora : sg.e; if (e < t0 || sg.s >= t1) return;
        sess.push([l.id, l.odp, o(l.odp).codProd, o(l.odp).descr, fase(l.fase), mac(l.mac), i + 1, sg.s, sg.e, min(e - sg.s), ps[i].b, ps[i].s, sg.e == null ? 'In corso' : (TIPO_FINE[sg.tipo] || ''), sg.nota]);
      });
    }
    const pause = [];
    for (const l of L) for (const p of M.pause(l, ora)) {
      if (p.a < t0 || p.da >= t1) continue;
      pause.push([l.id, l.odp, o(l.odp).codProd, fase(l.fase), mac(l.mac), p.da, p.inCorso ? null : p.a, min(p.a - p.da), M.causa(p.tipo, p.nota), p.nota, p.inCorso ? 'Sì' : 'No']);
    }
    const scarti = [];
    for (const l of L) for (const c of l.cnt) if (c.s && c.t >= t0 && c.t < t1) scarti.push([c.t, l.id, l.odp, o(l.odp).codProd, o(l.odp).descr, fase(l.fase), mac(l.mac), c.s, c.causa || 'Non indicata', c.src === 'sup' ? 'Supervisore' : 'Operatore']);
    scarti.sort((x, y) => x[0] - y[0]);
    const art = M.tempiArticoli(t0, t1).map(r => [r.cod, r.descr, fase(r.fase), r.n, r.nValide, r.auto, r.odp, r.b, r.s, r.scartiPct, min(r.ms), r.minPz, r.mediana, r.min, r.max, r.minPz ? 60 / r.minPz : null]);
    const odps = [...M.dati.odp.values()].sort((x, y) => x.num.localeCompare(y.num));
    const riep = odps.map(x => {
      const v = M.avanzamento(x.num), pf = M.perFase(x.num);
      const r = [x.num, x.ordLav, x.codProd, x.descr, x.cliente, x.linea, x.consegna, x.stato, x.qta, C.percorso(M.percorso(x.num)).nome];
      C.FASI.forEach(f => r.push(pf[f.id].b, pf[f.id].s, min(pf[f.id].ms)));
      r.push(v.daTagliare, v.attesaSbav, v.attesaMan, v.attesaNas, v.attesaSab, v.finiti, v.scarti, v.rimanente, x.archiviato ? 'Sì' : 'No');
      return r;
    });
    const colRiep = [
      { h: 'ODP', t: 'id', w: 12 }, { h: 'N. lavorazione', t: 'id', w: 11 }, { h: 'Cod. prodotto', t: 's', w: 14 }, { h: 'Descrizione', t: 's', w: 40 },
      { h: 'Cliente', t: 's', w: 28 }, { h: 'Linea', t: 's', w: 11 }, { h: 'Data consegna', t: 'd', w: 12 }, { h: 'Stato ERP', t: 's', w: 8 },
      { h: 'Colati (gestionale)', t: 'n', w: 12 }, { h: 'Percorso sbavatura', t: 's', w: 18 },
    ];
    C.FASI.forEach(f => colRiep.push({ h: `${f.nome}: buoni`, t: 'n', w: 12 }, { h: `${f.nome}: scarti`, t: 'n', w: 12 }, { h: `${f.nome}: minuti netti`, t: 'n', w: 13 }));
    colRiep.push({ h: 'Da tagliare', t: 'n', w: 11 }, { h: 'In attesa di sbavatura', t: 'n', w: 13 }, { h: 'In attesa di manuale (dopo nastro)', t: 'n', w: 15 }, { h: 'In attesa di nastro (dopo manuale)', t: 'n', w: 15 },
      { h: 'In attesa di sabbiatura', t: 'n', w: 13 }, { h: 'Finiti', t: 'n', w: 10 }, { h: 'Scarti totali', t: 'n', w: 10 }, { h: 'Rimanente', t: 'n', w: 11 }, { h: 'Archiviato', t: 's', w: 10 });
    const colate = [];
    for (const x of odps) for (const c of x.colate || []) colate.push([x.num, x.codProd, x.descr, x.linea, c.data, c.qCompl, c.qPian, c.qRes]);
    const reg = [];
    for (const l of M.dati.lav.values()) for (const m of l.mod) if (m.t >= t0 && m.t < t1) reg.push([m.t, l.id, l.odp, mac(l.mac), m.cosa]);
    reg.sort((x, y) => x[0] - y[0]);
    const S = M.dati.settings;
    const legenda = [
      ['Periodo esportato', (da || a) ? `${da ? U.fmtGiorno(da) : 'inizio'} - ${a ? U.fmtGiorno(a) : 'oggi'}` : 'Tutti i dati'],
      ['Creato il', U.fmtDataOraLunga(ora)],
      ['Versione app', FT.VERSIONE],
      ['Tempo netto', 'Somma delle sessioni di lavoro, pause escluse.'],
      ['Sessione', 'Intervallo continuo di lavoro tra un avvio (o ripresa) e una pausa o la fine.'],
      ['Chiusura automatica', `Una sessione aperta oltre ${S.maxOre} ore viene chiusa al limite (valore modificabile per fase). Le lavorazioni chiuse in automatico sono escluse dalle medie di "Tempi articolo".`],
      ['Pezzi per sessione', 'Ogni conteggio dell\'operatore viene attribuito alla sessione in corso in quel momento.'],
      ['Min/pezzo (media ponderata)', 'Minuti netti totali diviso pezzi buoni totali, sulle lavorazioni chiuse nel periodo.'],
      ['Min/pezzo (mediana)', 'Valore centrale dei minuti per pezzo delle singole lavorazioni: meno sensibile ai casi anomali, utile come base per il tempo standard.'],
      ['Flusso dei pezzi', 'Colati → Taglio → Sbavatura (solo nastro, solo manuale, nastro poi manuale, manuale poi nastro, oppure Trebi) → Sabbiatura → Finiti.'],
      ['Destinazione dopo la sbavatura', 'Nastro e manuale sono intercambiabili. Ogni lavorazione al nastro indica se i pezzi vanno alla sbavatura manuale o in sabbiatura; ogni lavorazione manuale indica se vanno al nastro o in sabbiatura.'],
      ['Limiti sui pezzi', 'Al taglio buoni + scarti non superano i pezzi colati dell\'ODP; nelle fasi successive non superano i pezzi arrivati dalla fase precedente. Quando tutti i pezzi colati sono passati da una fase, quella fase per l\'ODP non si può più riaprire.'],
      ['Rimanente', 'Pezzi ancora nel ciclo: da tagliare + in attesa di sbavatura + in attesa di manuale (dopo il nastro) + in attesa di nastro (dopo il manuale) + in attesa di sabbiatura.'],
    ];

    const fogli = [
      { nome: 'Lavorazioni', rows: lav, cols: [
        { h: 'ID lavorazione', t: 's', w: 15 }, { h: 'ODP', t: 'id', w: 12 }, { h: 'Cod. prodotto', t: 's', w: 14 }, { h: 'Descrizione', t: 's', w: 40 }, { h: 'Cliente', t: 's', w: 26 },
        { h: 'Linea', t: 's', w: 11 }, { h: 'Fase', t: 's', w: 26 }, { h: 'Macchina', t: 's', w: 30 }, { h: 'Destinazione dopo sbavatura', t: 's', w: 19 }, { h: 'Stato', t: 's', w: 10 },
        { h: 'Primo inizio', t: 'dt', w: 16 }, { h: 'Ultima fine', t: 'dt', w: 16 }, { h: 'Tempo netto (min)', t: 'n', w: 12 }, { h: 'Tempo in pausa (min)', t: 'n', w: 12 },
        { h: 'N. sessioni', t: 'n', w: 10 }, { h: 'Pezzi buoni', t: 'n', w: 10 }, { h: 'Pezzi scartati', t: 'n', w: 10 }, { h: 'Scarti %', t: 'pct', w: 9 },
        { h: 'Min netti per pezzo buono', t: 'n', w: 13 }, { h: 'Chiusure automatiche', t: 'n', w: 12 }, { h: 'Modificata dal supervisore', t: 's', w: 13 }, { h: 'Inserita manualmente', t: 's', w: 12 }, { h: 'Note', t: 's', w: 30 }] },
      { nome: 'Sessioni', rows: sess, cols: [
        { h: 'ID lavorazione', t: 's', w: 15 }, { h: 'ODP', t: 'id', w: 12 }, { h: 'Cod. prodotto', t: 's', w: 14 }, { h: 'Descrizione', t: 's', w: 40 }, { h: 'Fase', t: 's', w: 26 },
        { h: 'Macchina', t: 's', w: 30 }, { h: 'N. sessione', t: 'n', w: 10 }, { h: 'Inizio', t: 'dt', w: 16 }, { h: 'Fine', t: 'dt', w: 16 }, { h: 'Durata (min)', t: 'n', w: 11 },
        { h: 'Pezzi buoni', t: 'n', w: 10 }, { h: 'Pezzi scartati', t: 'n', w: 10 }, { h: 'Tipo fine', t: 's', w: 22 }, { h: 'Nota', t: 's', w: 30 }] },
      { nome: 'Pause', rows: pause, cols: [
        { h: 'ID lavorazione', t: 's', w: 15 }, { h: 'ODP', t: 'id', w: 12 }, { h: 'Cod. prodotto', t: 's', w: 14 }, { h: 'Fase', t: 's', w: 26 }, { h: 'Macchina', t: 's', w: 30 },
        { h: 'Inizio pausa', t: 'dt', w: 16 }, { h: 'Fine pausa', t: 'dt', w: 16 }, { h: 'Durata (min)', t: 'n', w: 11 }, { h: 'Causa', t: 's', w: 22 }, { h: 'Nota', t: 's', w: 30 }, { h: 'Ancora in pausa', t: 's', w: 10 }] },
      { nome: 'Scarti', rows: scarti, cols: [
        { h: 'Data', t: 'dt', w: 16 }, { h: 'ID lavorazione', t: 's', w: 15 }, { h: 'ODP', t: 'id', w: 12 }, { h: 'Cod. prodotto', t: 's', w: 14 }, { h: 'Descrizione', t: 's', w: 40 },
        { h: 'Fase', t: 's', w: 26 }, { h: 'Macchina', t: 's', w: 30 }, { h: 'Pezzi (negativo = correzione)', t: 'n', w: 14 }, { h: 'Causa', t: 's', w: 24 }, { h: 'Registrato da', t: 's', w: 14 }] },
      { nome: 'Tempi articolo', rows: art, cols: [
        { h: 'Cod. prodotto', t: 's', w: 14 }, { h: 'Descrizione', t: 's', w: 40 }, { h: 'Fase', t: 's', w: 26 }, { h: 'Lavorazioni chiuse', t: 'n', w: 11 }, { h: 'Di cui usate per le medie', t: 'n', w: 12 },
        { h: 'Escluse (chiusura automatica)', t: 'n', w: 13 }, { h: 'ODP', t: 'n', w: 8 }, { h: 'Pezzi buoni', t: 'n', w: 10 }, { h: 'Pezzi scartati', t: 'n', w: 10 }, { h: 'Scarti %', t: 'pct', w: 9 },
        { h: 'Minuti netti', t: 'n', w: 11 }, { h: 'Min/pezzo (media ponderata)', t: 'n', w: 13 }, { h: 'Min/pezzo (mediana)', t: 'n', w: 12 }, { h: 'Min/pezzo minimo', t: 'n', w: 11 }, { h: 'Min/pezzo massimo', t: 'n', w: 11 }, { h: 'Pezzi/ora', t: 'n', w: 10 }] },
      { nome: 'Riepilogo ODP', rows: riep, cols: colRiep },
      { nome: 'Colate giornaliere', rows: colate, cols: [
        { h: 'ODP', t: 'id', w: 12 }, { h: 'Cod. prodotto', t: 's', w: 14 }, { h: 'Descrizione', t: 's', w: 40 }, { h: 'Linea', t: 's', w: 11 }, { h: 'Data programma', t: 'd', w: 13 },
        { h: 'Q.tà completata', t: 'n', w: 12 }, { h: 'Q.tà pianificata', t: 'n', w: 12 }, { h: 'Q.tà residua', t: 'n', w: 11 }] },
      { nome: 'Registro modifiche', rows: reg, cols: [{ h: 'Data', t: 'dt', w: 16 }, { h: 'ID lavorazione', t: 's', w: 15 }, { h: 'ODP', t: 'id', w: 12 }, { h: 'Macchina', t: 's', w: 30 }, { h: 'Modifica', t: 's', w: 90 }] },
      { nome: 'Legenda', rows: legenda, filtro: false, cols: [{ h: 'Voce', t: 's', w: 28 }, { h: 'Significato', t: 's', w: 110 }] },
    ];
    const blob = await FT.xlsx.crea(fogli);
    const d = new Date(ora);
    return { blob, nome: `friber_tempi_${U.giorno(ora)}_${U.pad2(d.getHours())}${U.pad2(d.getMinutes())}.xlsx`, conteggi: { lavorazioni: lav.length, sessioni: sess.length, pause: pause.length, odp: riep.length } };
  };

  FT.exp = E;
})(self.FT = self.FT || {});
