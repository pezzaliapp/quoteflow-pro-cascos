import { useState, useCallback } from 'react';
import productsData from './data/products.json';
import {
  ChevronRight, RotateCcw, FileText, ShoppingCart,
  MessageCircle, Copy, CheckCircle2, ArrowLeft, AlertCircle, Upload,
  Package, Euro, Wrench, Ruler, Download, BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── PDF SCHEDE TECNICHE — mappa codice → {file, pages (1-indexed)} ──────────
//
// cascos_con_pedana.pdf (con pedana, modelli senza "S"):
//   p.1-2  → C3.2         (13120E)
//   p.3-4  → C3.2 Monofasici (13183E) — non in products.json, skip
//   p.5-6  → C3.2 Comfort  (13120C)
//   p.7-8  → C3.2 Comfort Monofasici (13183C) — skip
//   p.9-10 → C3.5         (13168)
//   p.11-12→ C3.5XL       (13191)
//   p.13-14→ C4            (13194)
//   p.15-16→ C4XL          (13198)
//   p.17-18→ C5 Wagon      (13176)
//   p.19-20→ C5XL Wagon    (13201)
//   p.21-22→ C5.5          (13998)
//   p.23-24→ C5.5 Wagon    (13988)
//
// cascos_senza_pedana.pdf (senza pedana, modelli con "S"):
//   p.1-2  → C3.2S        (13120SE)
//   p.3-4  → C3.2S Sport  (13120SS) — non in products.json, skip
//   p.5-6  → C3.2S Confort(13120SC)
//   p.7-8  → C3.5S        (13169)
//   p.9-10 → C4S          (13194S)
//   p.11-12→ C3.5S XL     (13192)
//   p.13-14→ C4S XL       (13198S)
//   p.15-16→ C5.5S        (13998S)
//   p.17-18→ C5S Wagon    (13177)
//   p.19-20→ C5.5S Wagon  (13988S)

const PDF_SCHEDE = {
  // CON PEDANA
  '13120E':  { file: 'cascos con pedana.pdf',    pages: [1, 2] },
  '13120C':  { file: 'cascos con pedana.pdf',    pages: [5, 6] },
  '13168':   { file: 'cascos con pedana.pdf',    pages: [9, 10] },
  '13191':   { file: 'cascos con pedana.pdf',    pages: [11, 12] },
  '13194':   { file: 'cascos con pedana.pdf',    pages: [13, 14] },
  '13198':   { file: 'cascos con pedana.pdf',    pages: [15, 16] },
  '13176':   { file: 'cascos con pedana.pdf',    pages: [17, 18] },
  '13201':   { file: 'cascos con pedana.pdf',    pages: [19, 20] },
  '13998':   { file: 'cascos con pedana.pdf',    pages: [21, 22] },
  '13988':   { file: 'cascos con pedana.pdf',    pages: [23, 24] },
  // SENZA PEDANA
  '13120SE': { file: 'cascos senza pedana.pdf',  pages: [1, 2] },
  '13120SC': { file: 'cascos senza pedana.pdf',  pages: [5, 6] },
  '13169':   { file: 'cascos senza pedana.pdf',  pages: [7, 8] },
  '13194S':  { file: 'cascos senza pedana.pdf',  pages: [9, 10] },
  '13192':   { file: 'cascos senza pedana.pdf',  pages: [11, 12] },
  '13198S':  { file: 'cascos senza pedana.pdf',  pages: [13, 14] },
  '13998S':  { file: 'cascos senza pedana.pdf',  pages: [15, 16] },
  '13177':   { file: 'cascos senza pedana.pdf',  pages: [17, 18] },
  '13988S':  { file: 'cascos senza pedana.pdf',  pages: [19, 20] },
};

// Cache dei PDF fetchati (evita doppio download per stesso file)
const pdfCache = {};

async function getPdfLib() {
  if (window.PDFLib) return window.PDFLib;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    s.onload = () => resolve(window.PDFLib);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function fetchPdfBytes(fileName) {
  if (pdfCache[fileName]) return pdfCache[fileName];
  // import.meta.env.BASE_URL = '/quoteflow-pro-cascos/' in produzione Vite.
  // I PDF devono essere nella cartella public/ del progetto Vite.
  const base = import.meta.env.BASE_URL || '/';
  const url = base.endsWith('/') ? `${base}${fileName}` : `${base}/${fileName}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`PDF non trovato: ${fileName} (URL: ${url})`);
  const bytes = await response.arrayBuffer();
  pdfCache[fileName] = bytes;
  return bytes;
}

async function extractSchedaTecnica(codice) {
  const mapping = PDF_SCHEDE[codice];
  if (!mapping) throw new Error(`Nessuna scheda tecnica per codice ${codice}`);
  const PDFLib = await getPdfLib();
  const { PDFDocument } = PDFLib;
  const srcBytes = await fetchPdfBytes(mapping.file);
  const srcDoc = await PDFDocument.load(srcBytes);
  const newDoc = await PDFDocument.create();
  for (const pageNum of mapping.pages) {
    const [page] = await newDoc.copyPages(srcDoc, [pageNum - 1]);
    newDoc.addPage(page);
  }
  const newBytes = await newDoc.save();
  return { bytes: newBytes, fileName: `Cascos_${codice}_SchedaTecnica.pdf` };
}

// Unica azione esposta: scarica il PDF estratto.
// "Apri in tab" rimosso: Chrome blocca blob URL su tab aperta programmaticamente.
// Il download funziona in tutti i browser senza restrizioni.
async function downloadSchedaTecnica(codice) {
  const { bytes, fileName } = await extractSchedaTecnica(codice);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── DATI BRACCI DAL PDF ──────────────────────────────────────────────────────

const BRACCI_PER_FAMIGLIA = {
  'C3.2':    { minMm: 710,  maxMm: 1050, note: 'Bracci doppi — utilitarie e citycar' },
  'C3.2S':   { minMm: 710,  maxMm: 1050, note: 'Bracci doppi — utilitarie e citycar' },
  'C3.2_CONFORT':  { minMm: 597, maxMm: 1122, note: '2 braccia triple + 2 doppie — range esteso' },
  'C3.2S_CONFORT': { minMm: 597, maxMm: 1122, note: '2 braccia triple + 2 doppie — range esteso' },
  'C3.5':    { minMm: 690,  maxMm: 1325, note: '4 braccia triple' },
  'C3.5S':   { minMm: 690,  maxMm: 1325, note: '4 braccia triple — senza pedana' },
  'C4':      { minMm: 668,  maxMm: 1341, note: '4 braccia triple — SUV e furgoni leggeri' },
  'C4S':     { minMm: 668,  maxMm: 1341, note: '4 braccia triple — senza pedana' },
  'C5.5':    { minMm: 705,  maxMm: 1335, note: 'Doppio gioco supporti 60-100mm' },
  'C5.5S':   { minMm: 705,  maxMm: 1335, note: 'Doppio gioco supporti 60-100mm — senza pedana' },
  'C5.5_WAGON':  { minMm: 758, maxMm: 1505, note: 'Bracci extra-lunghi — grandi furgoni' },
  'C5.5S_WAGON': { minMm: 758, maxMm: 1505, note: 'Bracci extra-lunghi — senza pedana' },
  'C5':      { minMm: 855,  maxMm: 1810, note: 'Bracci extra-lunghi — passo lungo' },
  'C5S':     { minMm: 855,  maxMm: 1810, note: 'Bracci extra-lunghi — senza pedana' },
};

function getBracciInfo(product) {
  const id = product.id;
  const famiglia = product.famiglia;
  if (id === 'c32_confort')   return BRACCI_PER_FAMIGLIA['C3.2_CONFORT'];
  if (id === 'c32s_confort')  return BRACCI_PER_FAMIGLIA['C3.2S_CONFORT'];
  if (id === 'c55wagon')      return BRACCI_PER_FAMIGLIA['C5.5_WAGON'];
  if (id === 'c55s_wagon')    return BRACCI_PER_FAMIGLIA['C5.5S_WAGON'];
  if (id === 'c5wagon')       return BRACCI_PER_FAMIGLIA['C5'];
  if (id === 'c5xlwagon')     return BRACCI_PER_FAMIGLIA['C5'];
  if (id === 'c5s_wagon')     return BRACCI_PER_FAMIGLIA['C5S'];
  return BRACCI_PER_FAMIGLIA[famiglia] || null;
}

// ─── LOGICA DI SELEZIONE ──────────────────────────────────────────────────────

function selectProducts(products, pavimentazione, veicolo, distanzaMm) {
  return products
    .filter(p => {
      if (p.pavimentazione !== pavimentazione) return false;
      if (!p.veicoli.includes(veicolo)) return false;
      const bracci = getBracciInfo(p);
      if (!bracci) return false;
      return distanzaMm >= bracci.minMm && distanzaMm <= bracci.maxMm;
    })
    .sort((a, b) => a.prezzoNetto - b.prezzoNetto);
}

// ─── TIPI VEICOLO ─────────────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  { id: 'utilitaria', label: 'Utilitaria',              icon: '🚗', desc: 'Fino a 1.400 Kg — Panda, Polo, C1...' },
  { id: 'car',        label: 'Car / Berlina',            icon: '🚙', desc: 'Fino a 2.000 Kg — Golf, Focus, 3008...' },
  { id: 'suv',        label: 'SUV / Fuoristrada',        icon: '🚐', desc: 'Fino a 2.800 Kg — Defender, X5, Grand Cherokee...' },
  { id: 'van',        label: 'Van / Furgone',            icon: '🚚', desc: 'Fino a 3.500 Kg — Transit, Ducato, Sprinter...' },
  { id: 'van_lungo',  label: 'Van Lungo / Passo Lungo',  icon: '🚌', desc: 'Fino a 5.000 Kg — Sprinter XL, Crafter L3...' },
  { id: 'camper',     label: 'Camper / Motorhome',       icon: '🏕️', desc: 'Fino a 5.500 Kg — Camper professionali' },
  { id: 'truck',      label: 'Truck / Veicolo Pesante',  icon: '🚛', desc: 'Oltre 5.000 Kg — veicoli commerciali pesanti' },
];

const FLOOR_TYPES = [
  { id: 'industriale',     label: 'Industriale',     desc: 'Pavimento industriale adatto ad ancoraggio (tasselli diretti)', note: 'Modelli C...S — senza pedana', color: 'blue' },
  { id: 'non_industriale', label: 'Non Industriale', desc: 'Pavimento normale, piastrellato o non adatto ad ancoraggio diretto', note: 'Modelli C — con pedana', color: 'slate' },
];

const DISTANZA_PRESETS = [
  { mm: 750,  label: '~750 mm',  desc: 'Utilitaria compatta (Panda, C1, Polo)',           veicoli: ['utilitaria'] },
  { mm: 950,  label: '~950 mm',  desc: 'Utilitaria / Berlina (Punto, Clio, Golf compact)', veicoli: ['utilitaria', 'car'] },
  { mm: 870,  label: '~870 mm',  desc: 'Berlina media (Golf, Focus, 208)',                 veicoli: ['car'] },
  { mm: 1050, label: '~1050 mm', desc: 'Berlina grande / Wagon (Passat, Octavia)',         veicoli: ['car'] },
  { mm: 1250, label: '~1250 mm', desc: 'Berlina XL / Car spaziosa',                       veicoli: ['car'] },
  { mm: 900,  label: '~900 mm',  desc: 'SUV compatto (Kuga, Qashqai, 2008)',              veicoli: ['suv'] },
  { mm: 1100, label: '~1100 mm', desc: 'SUV medio (X3, RAV4, Tiguan)',                    veicoli: ['suv'] },
  { mm: 1300, label: '~1300 mm', desc: 'SUV grande / Fuoristrada (X5, Defender, Grand Cherokee)', veicoli: ['suv'] },
  { mm: 800,  label: '~800 mm',  desc: 'Van compatto (Berlingo, Connect)',                 veicoli: ['van'] },
  { mm: 1000, label: '~1000 mm', desc: 'Furgone medio (Ducato L2, Transit L2)',            veicoli: ['van'] },
  { mm: 1300, label: '~1300 mm', desc: 'Furgone grande (Sprinter L3, Crafter)',            veicoli: ['van'] },
  { mm: 900,  label: '~900 mm',  desc: 'Van lungo leggero (Sprinter L3)',                  veicoli: ['van_lungo'] },
  { mm: 1200, label: '~1200 mm', desc: 'Van lungo medio (Crafter L4, Transit XL)',         veicoli: ['van_lungo'] },
  { mm: 1400, label: '~1400 mm', desc: 'Van lungo grande (passo lungo XL)',                veicoli: ['van_lungo'] },
  { mm: 1700, label: '~1700 mm', desc: 'Van lungo extra — bracci massimi (855→1810mm)',    veicoli: ['van_lungo'] },
  { mm: 900,  label: '~900 mm',  desc: 'Camper compatto (base Ducato/Sprinter)',           veicoli: ['camper'] },
  { mm: 1200, label: '~1200 mm', desc: 'Camper medio',                                     veicoli: ['camper'] },
  { mm: 1400, label: '~1400 mm', desc: 'Camper grande / Motorhome',                        veicoli: ['camper'] },
  { mm: 1700, label: '~1700 mm', desc: 'Motorhome XL — bracci max (855→1810mm)',           veicoli: ['camper'] },
  { mm: 900,  label: '~900 mm',  desc: 'Truck leggero (Daily 35, Transit pesante)',        veicoli: ['truck'] },
  { mm: 1200, label: '~1200 mm', desc: 'Truck medio',                                      veicoli: ['truck'] },
  { mm: 1450, label: '~1450 mm', desc: 'Truck pesante — bracci max wagon (758→1505mm)',    veicoli: ['truck'] },
];

// ─── HOOKS ───────────────────────────────────────────────────────────────────

function useProducts() {
  const [products, setProducts] = useState(productsData);

  const importFromExcel = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

          let headerIdx = rows.findIndex(r =>
            r.some(c => typeof c === 'string' && c.toLowerCase().includes('riferimento'))
          );
          if (headerIdx === -1) headerIdx = 3;

          const headers = rows[headerIdx];
          const colRef = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('riferimento'));
          const colPre = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('netto'));

          const updated = [...productsData].map(p => {
            for (let i = headerIdx + 1; i < rows.length; i++) {
              const row = rows[i];
              const codiceRow = String(row[colRef] || '').trim();
              if (codiceRow === String(p.codice)) {
                const prezzoVal = parseFloat(String(row[colPre] || '').replace(/[^\d.]/g, ''));
                if (!isNaN(prezzoVal)) return { ...p, prezzoNetto: prezzoVal };
              }
            }
            return p;
          });

          setProducts(updated);
          resolve(updated.length);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }, []);

  return { products, importFromExcel };
}

// ─── FORMATTERS ──────────────────────────────────────────────────────────────

const formatPrice = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);

const today = () => new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

const generateDocumentText = ({ mode, customer, product, config, qty, note, sconto, prezzoTotale, scontoEuro, prezzoFinale }) => {
  const vehicleInfo = VEHICLE_TYPES.find(v => v.id === config.veicolo);
  const floorLabel = FLOOR_TYPES.find(f => f.id === config.pavimentazione)?.label || '—';
  const docType = mode === 'order' ? 'ORDINE' : 'PREVENTIVO';
  const customerName = customer.azienda || customer.nome || '—';
  const bracciInfo = getBracciInfo(product);

  return `${docType} CASCOS BY CORMACH

Data: ${today()}
Cliente: ${customerName}
Contatto: ${customer.telefono || '—'}
Email: ${customer.email || '—'}
Indirizzo: ${customer.indirizzo || '—'}

Pavimentazione: ${floorLabel}
Veicolo: ${vehicleInfo?.label || '—'}
Distanza punti di presa: ${config.distanzaMm} mm
Configurazione: ${product.pavimentazione === 'industriale' ? 'Senza Pedana' : 'Con Pedana'}

Prodotto: ${product.modello}
Codice: ${product.codice}
Descrizione: ${product.descrizione}
Portata: ${product.portata}
Range bracci: ${bracciInfo ? `Min ${bracciInfo.minMm} mm – Max ${bracciInfo.maxMm} mm` : '—'}
Categoria: ${product.categoria}
Quantità: ${qty}
Prezzo unitario netto: ${formatPrice(product.prezzoNetto)}
Totale lordo: ${formatPrice(prezzoTotale)}
` +
    (sconto > 0 ? `Sconto ${sconto}%: -${formatPrice(scontoEuro)}\n` : '') +
    `Totale netto: ${formatPrice(prezzoFinale)}
IVA: esclusa

Note: ${note || '—'}
Note tecniche: ${product.noteTecniche || '—'}

CASCOS by Cormach Correggio Machinery`;
};

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
        <Wrench size={18} className="text-white" />
      </div>
      <div>
        <div className="text-sm font-bold text-white leading-none">QuoteFlow Pro</div>
        <div className="text-xs text-slate-400 leading-none mt-0.5">Cascos Lifts</div>
      </div>
    </div>
  );
}

function Badge({ text, color = 'blue' }) {
  const cls = {
    blue:   'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    green:  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    amber:  'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    slate:  'bg-slate-500/20 text-slate-300 border border-slate-500/30',
    violet: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    red:    'bg-red-500/20 text-red-300 border border-red-500/30',
  }[color] || 'bg-blue-500/20 text-blue-300';
  return <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{text}</span>;
}

function StepIndicator({ current, total = 4 }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
            ${i < current ? 'bg-blue-600 text-white' : i === current ? 'bg-blue-500 text-white ring-2 ring-blue-300/50' : 'bg-slate-700 text-slate-500'}`}>
            {i < current ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          {i < total - 1 && <div className={`h-px w-6 transition-all ${i < current ? 'bg-blue-500' : 'bg-slate-700'}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── SCHEDA TECNICA BUTTON ────────────────────────────────────────────────────

function SchedaTecnicaButton({ codice, modello, compact = false }) {
  const [stato, setStato] = useState('idle'); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const hasPdf = !!PDF_SCHEDE[codice];

  if (!hasPdf) return null;

  const handleDownload = async () => {
    setStato('loading');
    setErrorMsg('');
    try {
      await downloadSchedaTecnica(codice);
      setStato('done');
      setTimeout(() => setStato('idle'), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Errore download PDF');
      setStato('error');
      setTimeout(() => setStato('idle'), 4000);
    }
  };

  const label = stato === 'loading' ? 'Preparazione…'
              : stato === 'done'    ? '✓ Scaricato'
              : stato === 'error'   ? '✗ Errore'
              : 'Scarica Scheda PDF';

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={handleDownload}
          disabled={stato === 'loading'}
          className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-50"
        >
          <Download size={12} />
          {label}
        </button>
        {stato === 'error' && errorMsg && (
          <span className="text-xs text-red-400">{errorMsg}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleDownload}
        disabled={stato === 'loading'}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all
          bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 hover:text-sky-200 disabled:opacity-50"
      >
        <Download size={15} />
        {label}
      </button>
      {stato === 'error' && errorMsg && (
        <p className="text-xs text-red-400 px-1">{errorMsg}</p>
      )}
      <p className="text-xs text-slate-600 px-1">
        Depliant ufficiale Cascos estratto dal catalogo · 2 pagine
      </p>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────

function ProductCard({ product, isRecommended, onSelect, mode }) {
  const floorLabel = product.pavimentazione === 'industriale' ? 'Pav. Industriale' : 'Pav. Standard';
  const floorColor = product.pavimentazione === 'industriale' ? 'blue' : 'slate';
  const bracciInfo = getBracciInfo(product);
  const hasPdf = !!PDF_SCHEDE[product.codice];

  return (
    <div
      className={`relative rounded-xl p-5 transition-all duration-200 animate-slide-up
        ${isRecommended
          ? 'glass border-blue-500/50 ring-1 ring-blue-500/30 hover:ring-blue-400/60'
          : 'glass hover:border-slate-500/60'} glass-hover`}
    >
      {isRecommended && (
        <div className="absolute -top-2.5 left-4">
          <span className="bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
            ★ Consigliato
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-lg font-bold text-white">{product.modello}</div>
          <div className="font-mono text-xs text-slate-400 mt-0.5">Rif. {product.codice}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-blue-400">{formatPrice(product.prezzoNetto)}</div>
          <div className="text-xs text-slate-500">prezzo netto</div>
        </div>
      </div>

      <p className="text-sm text-slate-300 mb-3 leading-relaxed">{product.descrizione}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        <Badge text={product.portata} color="green" />
        <Badge text={floorLabel} color={floorColor} />
        <Badge text={product.categoria} color="amber" />
        {hasPdf && <Badge text="📄 Scheda PDF" color="slate" />}
      </div>

      {bracciInfo && (
        <div className="flex items-center gap-2 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2 mb-3">
          <Ruler size={13} className="flex-shrink-0" />
          <span>
            Bracci: Min <strong>{bracciInfo.minMm} mm</strong> – Max <strong>{bracciInfo.maxMm} mm</strong>
            <span className="text-slate-400 ml-1">· {bracciInfo.note}</span>
          </span>
        </div>
      )}

      <div className="text-xs text-slate-500 border-t border-slate-700 pt-3 mb-3">
        {product.noteTecniche}
      </div>

      {/* Scheda tecnica compact (nella card risultati) */}
      {hasPdf && (
        <div className="border-t border-slate-700/50 pt-3 mb-3">
          <SchedaTecnicaButton codice={product.codice} modello={product.modello} compact />
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => onSelect(product)}
          className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          {mode === 'order' ? <ShoppingCart size={14} /> : <FileText size={14} />}
          {mode === 'order' ? 'Crea Ordine' : 'Crea Preventivo'}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────

function DashboardView({ onStart, onImport, importStatus }) {
  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (file) onImport(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Cascos Lifts</h1>
        <p className="text-slate-400 text-sm">Configuratore preventivi e ordini — Cormach Srl</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => onStart('quote')}
          className="glass glass-hover rounded-xl p-5 text-left hover:scale-[1.02] transition-all"
        >
          <FileText size={22} className="text-blue-400 mb-3" />
          <div className="font-bold text-white mb-1">Preventivo</div>
          <div className="text-xs text-slate-400">Crea un preventivo per il cliente</div>
        </button>
        <button
          onClick={() => onStart('order')}
          className="glass glass-hover rounded-xl p-5 text-left hover:scale-[1.02] transition-all"
        >
          <ShoppingCart size={22} className="text-emerald-400 mb-3" />
          <div className="font-bold text-white mb-1">Ordine</div>
          <div className="text-xs text-slate-400">Crea un ordine confermato</div>
        </button>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Upload size={15} className="text-blue-400" />
            Aggiorna Listino Excel
          </div>
          {importStatus && (
            <Badge
              text={importStatus.includes('Errore') ? importStatus : `✓ ${importStatus}`}
              color={importStatus.includes('Errore') ? 'amber' : 'green'}
            />
          )}
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Importa il file Excel del listino per aggiornare i prezzi netti. Colonne attese: Riferimento, Netto Riv. (€).
        </p>
        <label
          className="block border-2 border-dashed border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500/50 transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileDrop} />
          <span className="text-sm text-slate-400">Trascina qui il file Excel o <span className="text-blue-400 underline">seleziona</span></span>
        </label>
      </div>

      <div className="glass rounded-xl p-4 border border-sky-500/20">
        <div className="flex items-center gap-2 text-sm font-medium text-sky-300 mb-2">
          <BookOpen size={15} />
          Schede Tecniche PDF
        </div>
        <p className="text-xs text-slate-400">
          Per ogni prodotto selezionato puoi aprire o scaricare la scheda tecnica ufficiale Cascos, estratta automaticamente dal catalogo.
          Disponibile nelle schede risultati e nel preventivo generato.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: <Package size={18}/>, label: 'Prodotti', value: productsData.length },
          { icon: <BookOpen size={18}/>, label: 'PDF Schede', value: Object.keys(PDF_SCHEDE).length },
          { icon: <Euro size={18}/>,    label: 'Prezzi',    value: 'Live 2026' },
        ].map((c, i) => (
          <div key={i} className="glass rounded-xl p-3">
            <div className="text-slate-400 flex justify-center mb-1">{c.icon}</div>
            <div className="text-lg font-bold text-white">{c.value}</div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CONFIGURATOR VIEW (4 step) ───────────────────────────────────────────────

function ConfiguratorView({ mode, products, onResult, onBack }) {
  const [step, setStep]               = useState(0);
  const [pavimentazione, setPav]      = useState(null);
  const [veicolo, setVeicolo]         = useState(null);
  const [distanzaMm, setDistanza]     = useState(null);
  const [sliderVal, setSliderVal]     = useState(950);
  const [useSlider, setUseSlider]     = useState(false);

  const handleFloor   = (id) => { setPav(id); setStep(1); };
  const handleVehicle = (id) => { setVeicolo(id); setStep(2); };

  const handlePreset = (mm) => {
    setDistanza(mm);
    const results = selectProducts(products, pavimentazione, veicolo, mm);
    onResult({ pavimentazione, veicolo, distanzaMm: mm, results });
  };

  const handleSliderConfirm = () => {
    const mm = sliderVal;
    setDistanza(mm);
    const results = selectProducts(products, pavimentazione, veicolo, mm);
    onResult({ pavimentazione, veicolo, distanzaMm: mm, results });
  };

  const presetsPerVeicolo = DISTANZA_PRESETS.filter(p =>
    !veicolo || p.veicoli.includes(veicolo)
  ).filter((p, i, arr) => arr.findIndex(x => x.mm === p.mm && x.desc === p.desc) === i);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : onBack()}
          className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
            {mode === 'order' ? 'Nuovo Ordine' : 'Nuovo Preventivo'}
          </div>
          <StepIndicator current={step} total={4} />
        </div>
      </div>

      {step === 0 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-white mb-1">Tipo di Pavimentazione</h2>
          <p className="text-sm text-slate-400 mb-5">
            La pavimentazione determina la famiglia di sollevatori (con o senza pedana).
          </p>
          <div className="space-y-3">
            {FLOOR_TYPES.map(f => (
              <button
                key={f.id}
                onClick={() => handleFloor(f.id)}
                className="w-full glass glass-hover rounded-xl p-5 text-left transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-white mb-1">{f.label}</div>
                    <div className="text-sm text-slate-400">{f.desc}</div>
                  </div>
                  <div className="ml-4">
                    <Badge text={f.note} color={f.color === 'blue' ? 'blue' : 'slate'} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">Tipo di Veicolo</h2>
            <Badge
              text={pavimentazione === 'industriale' ? 'Senza Pedana' : 'Con Pedana'}
              color={pavimentazione === 'industriale' ? 'blue' : 'slate'}
            />
          </div>
          <p className="text-sm text-slate-400 mb-5">Seleziona la categoria del veicolo da sollevare.</p>
          <div className="space-y-2">
            {VEHICLE_TYPES.map(v => (
              <button
                key={v.id}
                onClick={() => handleVehicle(v.id)}
                className="w-full glass glass-hover rounded-xl px-4 py-3.5 text-left flex items-center gap-4 transition-all hover:scale-[1.005]"
              >
                <span className="text-2xl w-8 text-center">{v.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{v.label}</div>
                  <div className="text-xs text-slate-400 truncate">{v.desc}</div>
                </div>
                <ChevronRight size={16} className="text-slate-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="animate-slide-up space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">Distanza Punti di Presa</h2>
              <Badge text="Bracci" color="violet" />
            </div>
            <p className="text-sm text-slate-400">
              Misura la <strong className="text-white">distanza minima</strong> tra i punti di presa del veicolo
              (sill-to-sill). Questo dato determina il modello compatibile secondo le specifiche tecniche Cascos.
            </p>
          </div>

          <div className="glass rounded-xl p-4 border border-violet-500/20">
            <div className="flex items-start gap-2">
              <Ruler size={15} className="text-violet-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-violet-300 mb-1">Come misurare</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Metti il veicolo sul ponte di sollevamento. Misura la distanza orizzontale minima
                  tra i due lati del sottoscocca dove si appoggiano i bracci. Se non conosci la misura
                  esatta, usa i preset qui sotto per il tipo di veicolo selezionato.
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setUseSlider(false)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                !useSlider ? 'bg-blue-600 text-white' : 'glass text-slate-400 hover:text-white'
              }`}
            >
              Preset veicolo
            </button>
            <button
              onClick={() => setUseSlider(true)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                useSlider ? 'bg-blue-600 text-white' : 'glass text-slate-400 hover:text-white'
              }`}
            >
              Valore preciso
            </button>
          </div>

          {!useSlider ? (
            <div className="space-y-2">
              {presetsPerVeicolo.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handlePreset(p.mm)}
                  className="w-full glass glass-hover rounded-xl px-4 py-3 text-left flex items-center gap-4 transition-all hover:scale-[1.005]"
                >
                  <span className="font-mono font-bold text-blue-400 text-sm w-20 flex-shrink-0">{p.label}</span>
                  <span className="text-sm text-slate-300 flex-1 min-w-0 truncate">{p.desc}</span>
                  <ChevronRight size={16} className="text-slate-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="glass rounded-xl p-5 space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white font-mono">{sliderVal} mm</div>
                <div className="text-xs text-slate-500 mt-1">distanza punti di presa</div>
              </div>
              <input
                type="range"
                min={597}
                max={1810}
                step={5}
                value={sliderVal}
                onChange={e => setSliderVal(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>597 mm</span>
                <span>1810 mm</span>
              </div>
              <button
                onClick={handleSliderConfirm}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg py-3 transition-colors"
              >
                Cerca modelli per {sliderVal} mm
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────

function ResultsView({ mode, config, onSelectProduct, onBack, onReset }) {
  const { results = [], veicolo, pavimentazione, distanzaMm } = config;
  const vehicleInfo = VEHICLE_TYPES.find(v => v.id === veicolo);
  const floorLabel  = FLOOR_TYPES.find(f => f.id === pavimentazione)?.label;

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
            {mode === 'order' ? 'Risultati Ordine' : 'Risultati Preventivo'}
          </div>
          <div className="text-white font-semibold">
            {vehicleInfo?.icon} {vehicleInfo?.label} · {distanzaMm} mm · {floorLabel}
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center space-y-3">
          <AlertCircle size={32} className="text-amber-400 mx-auto" />
          <div className="text-white font-semibold">Nessun modello compatibile</div>
          <div className="text-sm text-slate-400">
            Nessun sollevatore Cascos copre la combinazione veicolo/pavimentazione/distanza selezionata.
            Prova a modificare la distanza.
          </div>
          <button onClick={onBack} className="glass glass-hover rounded-xl px-4 py-2 text-sm text-white transition-colors">
            ← Modifica distanza
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              isRecommended={i === 0}
              onSelect={onSelectProduct}
              mode={mode}
            />
          ))}
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full glass glass-hover rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <RotateCcw size={14} /> Nuova Configurazione
      </button>
    </div>
  );
}

// ─── QUOTE VIEW ───────────────────────────────────────────────────────────────

function QuoteView({ mode, product, config, onBack, onReset }) {
  const [customer, setCustomer] = useState({ nome: '', azienda: '', email: '', telefono: '', indirizzo: '' });
  const [qty, setQty]           = useState(1);
  const [note, setNote]         = useState('');
  const [sconto, setSconto]     = useState(0);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied]     = useState(false);

  const vehicleInfo   = VEHICLE_TYPES.find(v => v.id === config.veicolo);
  const floorLabel    = FLOOR_TYPES.find(f => f.id === config.pavimentazione)?.label;
  const bracciInfo    = getBracciInfo(product);
  const prezzoTotale  = product.prezzoNetto * qty;
  const scontoEuro    = prezzoTotale * (sconto / 100);
  const prezzoFinale  = prezzoTotale - scontoEuro;
  const docType       = mode === 'order' ? 'ORDINE' : 'PREVENTIVO';
  const hasPdf        = !!PDF_SCHEDE[product.codice];

  const handleGenerate = () => setGenerated(true);

  const buildDocumentText = () => generateDocumentText({
    mode, customer, product, config, qty, note, sconto, prezzoTotale, scontoEuro, prezzoFinale
  });

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildDocumentText())}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyTxt = async () => {
    try {
      await navigator.clipboard.writeText(buildDocumentText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Copia non riuscita.');
    }
  };

  const inputCls = "w-full glass rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-blue-500 transition-colors";

  if (generated) {
    return (
      <div className="animate-fade-in space-y-5">
        {/* PRINT HEADER */}
        <div className="hidden print:block text-black">
          <div className="flex justify-between items-start border-b-2 border-gray-300 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Cormach Srl — Cascos Lifts</h1>
              <p className="text-gray-600 text-sm">Distribuzione ufficiale Cascos in Italia</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{docType} N° —</div>
              <div className="text-sm text-gray-600">Data: {today()}</div>
            </div>
          </div>
        </div>

        <div className="no-print flex items-center gap-3">
          <button onClick={() => setGenerated(false)} className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">{docType} Generato</div>
            <div className="text-white font-semibold">{product.modello} · {customer.azienda || customer.nome}</div>
          </div>
        </div>

        {/* DOCUMENTO */}
        <div className="glass rounded-xl overflow-hidden print:bg-white print:text-black print:rounded-none print:border-0">
          <div className="bg-slate-800 print:bg-gray-100 p-4 border-b border-slate-700 print:border-gray-300">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs text-slate-400 print:text-gray-500 uppercase tracking-wider">{docType}</div>
                <div className="text-white print:text-black font-bold text-lg">
                  {customer.azienda || customer.nome || '—'}
                </div>
                {customer.email && <div className="text-xs text-slate-400 print:text-gray-500">{customer.email}</div>}
                {customer.telefono && <div className="text-xs text-slate-400 print:text-gray-500">{customer.telefono}</div>}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 print:text-gray-500">Data</div>
                <div className="text-white print:text-black font-mono font-semibold">{today()}</div>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-900/50 print:bg-gray-50 border-b border-slate-700 print:border-gray-300">
            <div className="flex flex-wrap gap-4 text-xs text-slate-400 print:text-gray-600">
              <span>Pavimento: <strong className="text-white print:text-black">{floorLabel}</strong></span>
              <span>Veicolo: <strong className="text-white print:text-black">{vehicleInfo?.label}</strong></span>
              <span>Bracci: <strong className="text-violet-300 print:text-violet-700 font-mono">{config.distanzaMm} mm</strong></span>
              <span>Config.: <strong className="text-white print:text-black">{product.pavimentazione === 'industriale' ? 'Senza Pedana' : 'Con Pedana'}</strong></span>
            </div>
          </div>

          <div className="p-4 border-b border-slate-700 print:border-gray-300">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 print:text-gray-500 text-left">
                  <th className="pb-2">Codice</th>
                  <th className="pb-2">Descrizione</th>
                  <th className="pb-2 text-right">Q.tà</th>
                  <th className="pb-2 text-right">P.Netto</th>
                  <th className="pb-2 text-right">Totale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 text-blue-400 print:text-blue-700 font-mono font-semibold">{product.codice}</td>
                  <td className="py-2 text-white print:text-black">
                    <div className="font-semibold">{product.modello}</div>
                    <div className="text-xs text-slate-400 print:text-gray-500">{product.portata} · {product.categoria}</div>
                    {bracciInfo && (
                      <div className="text-xs text-violet-400 print:text-violet-700">
                        Bracci: {bracciInfo.minMm}–{bracciInfo.maxMm} mm
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-white print:text-black text-right">{qty}</td>
                  <td className="py-2 text-white print:text-black text-right font-mono">{formatPrice(product.prezzoNetto)}</td>
                  <td className="py-2 text-white print:text-black text-right font-mono font-bold">{formatPrice(prezzoTotale)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 border-b border-slate-700 print:border-gray-300">
            <div className="flex flex-col items-end gap-1 text-sm">
              {sconto > 0 && (
                <>
                  <div className="flex gap-6 text-slate-400 print:text-gray-500">
                    <span>Imponibile</span>
                    <span className="font-mono">{formatPrice(prezzoTotale)}</span>
                  </div>
                  <div className="flex gap-6 text-amber-400 print:text-amber-700">
                    <span>Sconto {sconto}%</span>
                    <span className="font-mono">-{formatPrice(scontoEuro)}</span>
                  </div>
                </>
              )}
              <div className="flex gap-6 text-white print:text-black text-lg font-bold border-t border-slate-600 print:border-gray-300 pt-2 mt-1">
                <span>Totale Netto</span>
                <span className="font-mono text-blue-400 print:text-blue-700">{formatPrice(prezzoFinale)}</span>
              </div>
              <div className="text-xs text-slate-500 print:text-gray-500">IVA esclusa</div>
            </div>
          </div>

          {(note || product.noteTecniche) && (
            <div className="p-4">
              {note && (
                <div className="mb-3">
                  <div className="text-xs text-slate-500 print:text-gray-500 uppercase tracking-wider mb-1">Note</div>
                  <div className="text-sm text-slate-300 print:text-gray-700">{note}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-500 print:text-gray-500 uppercase tracking-wider mb-1">Dati Tecnici</div>
                <div className="text-xs text-slate-400 print:text-gray-600">{product.noteTecniche}</div>
              </div>
            </div>
          )}
        </div>

        {/* ─── SCHEDA TECNICA PDF — sezione dedicata nel documento generato ─── */}
        {hasPdf && (
          <div className="no-print glass rounded-xl p-4 border border-sky-500/20 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
              <BookOpen size={15} />
              Scheda Tecnica Ufficiale · {product.modello}
            </div>
            <p className="text-xs text-slate-400">
              Depliant originale Cascos, estratto dal catalogo. Puoi aprirlo, scaricarlo e allegarlo su WhatsApp insieme al preventivo.
            </p>
            <SchedaTecnicaButton codice={product.codice} modello={product.modello} />
            <div className="pt-1 text-xs text-slate-600">
              💡 Per condividere su WhatsApp: scarica il PDF, poi allegalo manualmente alla chat WhatsApp col cliente.
            </div>
          </div>
        )}

        {/* AZIONI */}
        <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleWhatsApp}
            className="glass glass-hover rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-white font-medium transition-colors"
          >
            <MessageCircle size={16} /> Condividi Testo WhatsApp
          </button>
          <button
            onClick={handleCopyTxt}
            className="glass glass-hover rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-white font-medium transition-colors"
          >
            <Copy size={16} /> {copied ? 'Copiato ✓' : 'Copia Testo'}
          </button>
          <button
            onClick={onReset}
            className="glass glass-hover rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw size={16} /> Nuovo
          </button>
        </div>
      </div>
    );
  }

  // ─── FORM PREVENTIVO ──────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Dati {docType}</div>
          <div className="text-white font-semibold">{product.modello} · {product.codice}</div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold text-white">{product.modello}</div>
            <div className="text-xs text-slate-400 font-mono">Rif. {product.codice}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge text={product.portata} color="green" />
              {bracciInfo && <Badge text={`Bracci ${bracciInfo.minMm}–${bracciInfo.maxMm} mm`} color="violet" />}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-blue-400">{formatPrice(product.prezzoNetto)}</div>
            <div className="text-xs text-slate-500">p. unitario netto</div>
          </div>
        </div>
        {hasPdf && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <SchedaTecnicaButton codice={product.codice} modello={product.modello} compact />
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-300 mb-1">Dati Cliente</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Nome / Ragione Sociale *" value={customer.nome} onChange={e => setCustomer(s => ({...s, nome: e.target.value}))} />
          <input className={inputCls} placeholder="Azienda" value={customer.azienda} onChange={e => setCustomer(s => ({...s, azienda: e.target.value}))} />
          <input className={inputCls} placeholder="Email" type="email" value={customer.email} onChange={e => setCustomer(s => ({...s, email: e.target.value}))} />
          <input className={inputCls} placeholder="Telefono" type="tel" value={customer.telefono} onChange={e => setCustomer(s => ({...s, telefono: e.target.value}))} />
        </div>
        <input className={inputCls} placeholder="Indirizzo di consegna" value={customer.indirizzo} onChange={e => setCustomer(s => ({...s, indirizzo: e.target.value}))} />
      </div>

      <div className="glass rounded-xl p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-300 mb-1">Dettagli {docType}</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Quantità</label>
            <input
              className={inputCls}
              type="number"
              min="1"
              max="99"
              value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Sconto % (opzionale)</label>
            <input
              className={inputCls}
              type="number"
              min="0"
              max="50"
              placeholder="0"
              value={sconto || ''}
              onChange={e => setSconto(Math.min(50, Math.max(0, parseFloat(e.target.value) || 0)))}
            />
          </div>
        </div>
        <textarea
          className={`${inputCls} resize-none h-20`}
          placeholder="Note aggiuntive, condizioni speciali..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex justify-between items-center text-sm text-slate-400 mb-1">
          <span>{qty} x {formatPrice(product.prezzoNetto)}</span>
          <span>{formatPrice(prezzoTotale)}</span>
        </div>
        {sconto > 0 && (
          <div className="flex justify-between items-center text-sm text-amber-400 mb-1">
            <span>Sconto {sconto}%</span>
            <span>-{formatPrice(scontoEuro)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-lg font-bold text-white border-t border-slate-700 pt-2">
          <span>Totale Netto</span>
          <span className="text-blue-400">{formatPrice(prezzoFinale)}</span>
        </div>
        <div className="text-xs text-slate-500 text-right mt-0.5">IVA esclusa</div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!customer.nome}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-colors"
      >
        {mode === 'order' ? <ShoppingCart size={18} /> : <FileText size={18} />}
        Genera {docType}
        <ChevronRight size={18} />
      </button>

      {!customer.nome && (
        <p className="text-xs text-slate-500 text-center">* Inserisci almeno il nome cliente per procedere</p>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const { products, importFromExcel } = useProducts();
  const [view, setView]                   = useState('dashboard');
  const [mode, setMode]                   = useState('quote');
  const [config, setConfig]               = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [importStatus, setImportStatus]   = useState(null);

  const handleStart          = (m) => { setMode(m); setView('configurator'); };
  const handleConfigResult   = (cfg) => { setConfig(cfg); setView('results'); };
  const handleSelectProduct  = (p) => { setSelectedProduct(p); setView('quote'); };
  const handleReset          = () => { setView('dashboard'); setConfig(null); setSelectedProduct(null); };

  const handleImport = async (file) => {
    try {
      const count = await importFromExcel(file);
      setImportStatus(`Listino aggiornato (${count} prodotti)`);
    } catch {
      setImportStatus('Errore import — verifica formato');
    }
  };

  return (
    <div className="min-h-screen bg-navy-900">
      <header className="sticky top-0 z-40 glass border-b border-slate-800/60 no-print">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Logo />
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-20">
        {view === 'dashboard' && (
          <DashboardView onStart={handleStart} onImport={handleImport} importStatus={importStatus} />
        )}
        {view === 'configurator' && (
          <ConfiguratorView
            mode={mode}
            products={products}
            onResult={handleConfigResult}
            onBack={() => setView('dashboard')}
          />
        )}
        {view === 'results' && config && (
          <ResultsView
            mode={mode}
            config={config}
            onSelectProduct={handleSelectProduct}
            onBack={() => setView('configurator')}
            onReset={handleReset}
          />
        )}
        {view === 'quote' && selectedProduct && config && (
          <QuoteView
            mode={mode}
            product={selectedProduct}
            config={config}
            onBack={() => setView('results')}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
