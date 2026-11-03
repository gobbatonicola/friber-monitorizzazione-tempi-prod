/* Tempi Friber — backup (file compresso), ripristino e copie interne giornaliere. */
(function (FT) {
  'use strict';
  const U = FT.u;
  const B = {};
  const GIORNO = /^\d{4}-\d{2}-\d{2}$/;

  B.dati = () => Object.assign({ app: 'friber-tempi', schema: 2, versione: FT.VERSIONE, creato: new Date().toISOString() }, FT.model.esporta());

  B.crea = async () => {
    const json = JSON.stringify(B.dati()); const d = new Date();
    const base = `friber_backup_${U.giorno()}_${U.pad2(d.getHours())}${U.pad2(d.getMinutes())}`;
    if (typeof CompressionStream !== 'undefined') {
      try {
        const s = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
        return { blob: new Blob([await new Response(s).arrayBuffer()], { type: 'application/gzip' }), nome: base + '.json.gz' };
      } catch (e) { /* si ripiega sul file non compresso */ }
    }
    return { blob: new Blob([json], { type: 'application/json' }), nome: base + '.json' };
  };

  // Legge un backup (compresso o no, anche della versione 1.0) e lo restituisce normalizzato.
  B.leggi = async src => {
    let u8 = new Uint8Array(src instanceof ArrayBuffer ? src : await src.arrayBuffer());
    if (u8[0] === 0x1f && u8[1] === 0x8b) {
      if (typeof DecompressionStream === 'undefined') throw new Error('Questo dispositivo non riesce ad aprire i backup compressi');
      const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
      u8 = new Uint8Array(await new Response(s).arrayBuffer());
    }
    let j;
    try { j = JSON.parse(new TextDecoder().decode(u8)); } catch (e) { throw new Error('Il file non è un backup leggibile'); }
    if (!j || j.app !== 'friber-tempi') throw new Error('Il file non è un backup di Tempi Friber');
    if (j.stato) return Object.assign(FT.db.convertiV1(j.stato), { creato: j.creato, versione: j.versione || '1.0' });
    if (!Array.isArray(j.odp) || !Array.isArray(j.lav)) throw new Error('Il backup è incompleto');
    return { odp: j.odp, lav: j.lav, art: j.art || [], settings: j.settings || null, meta: j.meta || null, creato: j.creato, versione: j.versione };
  };

  B.riepilogo = d => ({ odp: d.odp.length, lav: d.lav.length, creato: d.creato ? new Date(d.creato).getTime() : null, versione: d.versione || '' });

  // Copia interna: una al giorno (ultime 10) più una prima di ogni ripristino o azzeramento (ultime 3).
  B.copia = async (tipo = 'giorno') => {
    const k = tipo === 'giorno' ? U.giorno() : `${tipo}-${Date.now()}`;
    const chiavi = await FT.db.snapChiavi();
    if (tipo === 'giorno' && chiavi.includes(k)) return false;
    await FT.db.snapScrivi(k, Object.assign({ creato: new Date().toISOString(), versione: FT.VERSIONE }, U.clona(FT.model.esporta())));
    const tutte = (await FT.db.snapChiavi()).map(String).sort();
    const giorni = tutte.filter(x => GIORNO.test(x)); while (giorni.length > 10) await FT.db.snapCancella(giorni.shift());
    const altre = tutte.filter(x => !GIORNO.test(x)); while (altre.length > 3) await FT.db.snapCancella(altre.shift());
    return true;
  };
  B.copie = async () => (await FT.db.snapChiavi()).map(String).sort((a, b) => {
    const ta = GIORNO.test(a) ? U.daGiorno(a) : +a.split('-').pop(); const tb = GIORNO.test(b) ? U.daGiorno(b) : +b.split('-').pop(); return tb - ta;
  }).map(k => ({ k, etichetta: GIORNO.test(k) ? `Copia del ${U.fmtGiorno(k)}` : (k.startsWith('prima-ripristino') ? 'Prima del ripristino del ' : 'Prima dell\'azzeramento del ') + U.fmtDataOraLunga(+k.split('-').pop()) }));

  B.ripristina = async d => {
    await B.copia('prima-ripristino');
    const meta = Object.assign({}, d.meta || {}, { lastBackup: FT.model.dati.meta.lastBackup });
    const dati = { odp: d.odp, lav: d.lav, art: d.art || [], settings: d.settings || FT.model.dati.settings, meta };
    await FT.db.sostituisciTutto(dati);
    FT.model.carica(dati);
  };
  B.ripristinaCopia = async k => {
    const d = await FT.db.snapLeggi(k); if (!d) throw new Error('Copia non trovata');
    await B.ripristina(d);
  };
  B.azzera = async () => {
    await B.copia('prima-azzeramento');
    const s = FT.model.dati.settings;
    const settings = Object.assign({}, s, { dataAvvio: '' });
    const dati = { odp: [], lav: [], art: [], settings, meta: FT.model.metaIniziale() };
    await FT.db.sostituisciTutto(dati);
    FT.model.carica(dati);
  };
  B.dovuto = () => { const D = FT.model.dati; return D.meta.lastBackup !== U.giorno() && (D.lav.size > 0 || D.odp.size > 0); };

  FT.bak = B;
})(self.FT = self.FT || {});
