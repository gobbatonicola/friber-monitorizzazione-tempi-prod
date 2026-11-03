/* Tempi Friber — scrittura di file Excel (.xlsx) senza librerie esterne.
   Intestazioni evidenziate, prima riga bloccata, filtri, larghezze colonne, formati numerici e date reali.
   Tipi di colonna: s testo, n numero (#,##0.00), id codice numerico (0), dt data e ora, d data, pct percentuale (0.00%). */
(function (FT) {
  'use strict';
  const X = {};
  const enc = new TextEncoder();
  X.MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const escXml = s => String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colName = i => { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const STILE = { h: 1, n: 2, dt: 3, d: 4, id: 5, pct: 6, s: 0 };
  X.seriale = ms => (ms - new Date(ms).getTimezoneOffset() * 60000) / 86400000 + 25569;
  const serialeGiorno = iso => { const [y, m, d] = String(iso).split('-').map(Number); return X.seriale(new Date(y, m - 1, d).getTime()); };

  function cella(ref, v, t) {
    if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return '';
    const str = () => `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escXml(v)}</t></is></c>`;
    switch (t) {
      case 'n': case 'pct': {
        const n = typeof v === 'number' ? v : Number(v);
        return isFinite(n) ? `<c r="${ref}" s="${STILE[t]}"><v>${n}</v></c>` : str();
      }
      case 'id': return /^\d{1,15}$/.test(String(v)) ? `<c r="${ref}" s="5"><v>${Number(v)}</v></c>` : str();
      case 'dt': return typeof v === 'number' ? `<c r="${ref}" s="3"><v>${X.seriale(v)}</v></c>` : str();
      case 'd': return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? `<c r="${ref}" s="4"><v>${serialeGiorno(v)}</v></c>` : str();
      default: return str();
    }
  }

  function foglioXml(sh, primo) {
    const nc = sh.cols.length, nr = sh.rows.length + 1;
    const lettere = sh.cols.map((_, i) => colName(i));
    const ref = `A1:${lettere[nc - 1]}${nr}`;
    const p = [];
    p.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">');
    p.push(`<dimension ref="${ref}"/>`);
    p.push(`<sheetViews><sheetView workbookViewId="0"${primo ? ' tabSelected="1"' : ''}><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>`);
    p.push('<sheetFormatPr defaultRowHeight="15"/>');
    p.push('<cols>' + sh.cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.w || 12}" customWidth="1"/>`).join('') + '</cols>');
    p.push('<sheetData>');
    p.push('<row r="1" ht="30" customHeight="1">' + sh.cols.map((c, i) => `<c r="${lettere[i]}1" t="inlineStr" s="1"><is><t xml:space="preserve">${escXml(c.h)}</t></is></c>`).join('') + '</row>');
    for (let r = 0; r < sh.rows.length; r++) {
      const row = sh.rows[r], n = r + 2; let x = `<row r="${n}">`;
      for (let i = 0; i < nc; i++) x += cella(lettere[i] + n, row[i], sh.cols[i].t);
      p.push(x + '</row>');
    }
    p.push('</sheetData>');
    if (sh.filtro !== false && sh.rows.length) p.push(`<autoFilter ref="${ref}"/>`);
    p.push('<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>');
    p.push('<pageSetup orientation="landscape" paperSize="9"/>');
    p.push('</worksheet>');
    return p.join('');
  }

  const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<numFmts count="5"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy hh:mm"/><numFmt numFmtId="166" formatCode="dd/mm/yyyy"/><numFmt numFmtId="167" formatCode="0"/><numFmt numFmtId="168" formatCode="0.00%"/></numFmts>'
    + '<fonts count="2"><font><sz val="11"/><color rgb="FF1C2124"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font></fonts>'
    + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2E3439"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="7">'
    + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
    + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
    + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0"/></styleSheet>';

  /* ---------- ZIP (deflate se disponibile, altrimenti senza compressione) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  X.crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function comprimi(u8) {
    if (typeof CompressionStream === 'undefined') return null;
    try {
      const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(s).arrayBuffer());
    } catch (e) { return null; }
  }
  X.zip = async files => {
    const parti = [], centrale = []; let off = 0;
    const d = new Date();
    const tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of files) {
      const nome = enc.encode(f.nome), dati = f.dati, crc = X.crc32(dati);
      const c = await comprimi(dati); const metodo = c && c.length < dati.length ? 8 : 0; const corpo = metodo ? c : dati;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, metodo, true);
      lh.setUint16(10, tm, true); lh.setUint16(12, dt, true); lh.setUint32(14, crc, true); lh.setUint32(18, corpo.length, true);
      lh.setUint32(22, dati.length, true); lh.setUint16(26, nome.length, true); lh.setUint16(28, 0, true);
      parti.push(new Uint8Array(lh.buffer), nome, corpo);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, metodo, true);
      ch.setUint16(12, tm, true); ch.setUint16(14, dt, true); ch.setUint32(16, crc, true); ch.setUint32(20, corpo.length, true); ch.setUint32(24, dati.length, true);
      ch.setUint16(28, nome.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true); ch.setUint32(42, off, true);
      centrale.push(new Uint8Array(ch.buffer), nome);
      off += 30 + nome.length + corpo.length;
    }
    const dimC = centrale.reduce((s, b) => s + b.length, 0);
    const fineR = new DataView(new ArrayBuffer(22));
    fineR.setUint32(0, 0x06054b50, true); fineR.setUint16(8, files.length, true); fineR.setUint16(10, files.length, true);
    fineR.setUint32(12, dimC, true); fineR.setUint32(16, off, true);
    return new Blob([...parti, ...centrale, new Uint8Array(fineR.buffer)], { type: X.MIME });
  };

  // fogli: [{ nome, cols: [{ h, t, w }], rows: [[...]], filtro }]
  X.crea = async fogli => {
    const nomi = fogli.map((f, i) => (String(f.nome).replace(/[\[\]:*?\/\\]/g, ' ').slice(0, 31) || 'Foglio' + (i + 1)));
    const files = [];
    const ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + fogli.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
      + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
      + '</Types>';
    const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
      + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
      + '</Relationships>';
    const iso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      + `<dc:title>Tempi di produzione Friber</dc:title><dc:creator>Tempi Friber ${FT.VERSIONE || ''}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`;
    const app = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Tempi Friber</Application></Properties>';
    const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + fogli.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${fogli.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const filtri = fogli.map((f, i) => (f.filtro !== false && f.rows.length)
      ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${nomi[i].replace(/'/g, "''")}'!$A$1:$${colName(f.cols.length - 1)}$${f.rows.length + 1}</definedName>` : '').join('');
    const wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<bookViews><workbookView activeTab="0"/></bookViews><sheets>'
      + nomi.map((n, i) => `<sheet name="${escXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets>'
      + (filtri ? `<definedNames>${filtri}</definedNames>` : '') + '</workbook>';
    files.push({ nome: '[Content_Types].xml', dati: enc.encode(ct) });
    files.push({ nome: '_rels/.rels', dati: enc.encode(rels) });
    files.push({ nome: 'docProps/core.xml', dati: enc.encode(core) });
    files.push({ nome: 'docProps/app.xml', dati: enc.encode(app) });
    files.push({ nome: 'xl/workbook.xml', dati: enc.encode(wb) });
    files.push({ nome: 'xl/_rels/workbook.xml.rels', dati: enc.encode(wbRels) });
    files.push({ nome: 'xl/styles.xml', dati: enc.encode(STYLES) });
    fogli.forEach((f, i) => files.push({ nome: `xl/worksheets/sheet${i + 1}.xml`, dati: enc.encode(foglioXml(f, i === 0)) }));
    return X.zip(files);
  };

  FT.xlsx = X;
})(self.FT = self.FT || {});
