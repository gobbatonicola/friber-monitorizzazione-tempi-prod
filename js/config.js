/* Tempi Friber — configurazione del reparto finitura.
   Per aggiungere o modificare macchine e fasi basta intervenire qui. */
(function (FT) {
  'use strict';

  FT.VERSIONE = '2.0.4';

  // Fasi post-colatura. "stadio" è la posizione nella linea: 1 taglio, 2 sbavatura, 3 sabbiatura.
  const FASI = [
    { id: 'TAG', nome: 'Taglio', breve: 'Taglio', stadio: 1, desc: 'Smaterozzatura e tranciatura', ic: 'saw' },
    { id: 'NAS', nome: 'Sbavatura a nastro', breve: 'Nastro', stadio: 2, desc: 'Smerigliatrici doppie a nastro', ic: 'belt' },
    { id: 'MAN', nome: 'Sbavatura manuale e finitura', breve: 'Manuale', stadio: 2, desc: 'Smerigliatrice e flessibile', ic: 'grinder' },
    { id: 'TRE', nome: 'Processo Trebi', breve: 'Trebi', stadio: 2, desc: 'In alternativa alla sbavatura a nastro o manuale', ic: 'robot' },
    { id: 'SAB', nome: 'Sabbiatura', breve: 'Sabbiatura', stadio: 3, desc: 'Un cassone alla volta, un ODP per cassone', ic: 'blast' },
  ];

  const STADI = [
    { n: 1, nome: 'Taglio', fasi: ['TAG'] },
    { n: 2, nome: 'Sbavatura', fasi: ['NAS', 'MAN', 'TRE'] },
    { n: 3, nome: 'Sabbiatura', fasi: ['SAB'] },
  ];

  // multi: true = più postazioni contemporanee (più operatori con lo stesso attrezzo)
  const MACCHINE = [
    { id: 'sega19', nome: 'Sega a nastro 19', breve: 'Sega 19', fase: 'TAG', foto: 'img/sega19.jpg', nota: 'Bassa' },
    { id: 'sega25', nome: 'Sega a nastro 25', breve: 'Sega 25', fase: 'TAG', foto: 'img/sega25.jpg', nota: 'Alta' },
    { id: 'smnas1', nome: 'Smerigliatrice doppia a nastro n.1', breve: 'Nastro n.1', fase: 'NAS', foto: 'img/smnas1.jpg', nota: 'Sereni S100' },
    { id: 'smnas2', nome: 'Smerigliatrice doppia a nastro n.2', breve: 'Nastro n.2', fase: 'NAS', foto: 'img/smnas2.jpg', nota: 'Doppia a nastro' },
    { id: 'smpic', nome: 'Smerigliatrice piccola', breve: 'Smerigl. piccola', fase: 'MAN', foto: 'img/smpic.jpg', nota: 'A mola' },
    { id: 'flex', nome: 'Flessibile portatile', breve: 'Flessibile', fase: 'MAN', foto: 'img/flex.jpg', nota: 'Più postazioni insieme', multi: true },
    { id: 'trebi', nome: 'Robot Trebi AFC450', breve: 'Trebi', fase: 'TRE', foto: 'img/trebi.jpg', nota: 'Automatic Flexible Cell' },
    { id: 'sab17', nome: 'Sabbiatrice 17', breve: 'Sabbiatrice', fase: 'SAB', foto: 'img/sab17.jpg', nota: '2 paranchi da 1000 kg' },
  ];

  // Percorso di sbavatura di un articolo: imparato dalle scelte degli operatori, modificabile dal supervisore.
  const PERCORSI = [
    { id: '', nome: 'Non ancora definito' },
    { id: 'NAS', nome: 'Solo nastro' },
    { id: 'MAN', nome: 'Solo manuale' },
    { id: 'NASMAN', nome: 'Nastro, poi manuale' },
    { id: 'MANNAS', nome: 'Manuale, poi nastro' },
    { id: 'TRE', nome: 'Trebi' },
  ];

  const LINEE = { AUTOMATICO: 'Automatico', MANO: 'Manuale', MANUALE: 'Manuale', RULLIERA: 'Rulliera' };

  const IMPOSTAZIONI = {
    maxOre: 8,              // chiusura automatica di una sessione dopo N ore continue
    maxOreFase: {},         // eventuale valore diverso per fase, es. { SAB: 3 }
    turni: [],              // orari di fine turno per la pausa automatica, es. ['14:00', '22:00'] (vuoto = disattivo)
    tolTurno: 15,           // minuti di tolleranza dopo la fine turno
    homeMin: 3,             // ritorno automatico alla home dopo N minuti senza tocchi (0 = mai)
    adminMin: 10,           // uscita automatica dall'area supervisore
    staleGiorni: 3,         // lavorazione aperta da più di N giorni = da verificare
    wake: false,            // schermo sempre acceso mentre ci sono lavorazioni attive
    vibra: true,            // vibrazione di conferma ai tocchi
    causePausa: ['Fine turno', 'Fermo macchina', 'Attesa materiale', 'Cambio lama o nastro', 'Pausa'],
    causeScarto: ['Difetto di colata', 'Errore di lavorazione', 'Rottura o caduta', 'Altro'],
  };

  FT.cfg = {
    FASI, STADI, MACCHINE, PERCORSI, LINEE, IMPOSTAZIONI,
    PIN_PREDEFINITO: '1234',
    fase: id => FASI.find(f => f.id === id),
    macchina: id => MACCHINE.find(m => m.id === id),
    percorso: id => PERCORSI.find(p => p.id === (id || '')) || PERCORSI[0],
  };
})(self.FT = self.FT || {});
