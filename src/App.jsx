import { useState, useCallback } from 'react';
import productsData from './data/products.json';
import { VEHICLE_TYPES, FLOOR_TYPES, selectProducts, generateMotivazione } from './data/rules.js';
import {
  ChevronRight, RotateCcw, FileText, ShoppingCart, Building2,
  Truck, Download, CheckCircle2, ArrowLeft, AlertCircle, Upload,
  Package, Euro, Gauge, Wrench
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

          // Find header row (contains "Riferimento" or "Modello")
          let headerIdx = rows.findIndex(r =>
            r.some(c => typeof c === 'string' && c.toLowerCase().includes('riferimento'))
          );
          if (headerIdx === -1) headerIdx = 3;

          const headers = rows[headerIdx];
          const colRef = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('riferimento'));
          const colMod = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('modello'));
          const colPor = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('portata'));
          const colPre = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('netto'));

          const updated = [...productsData].map(p => {
            for (let i = headerIdx + 1; i < rows.length; i++) {
              const row = rows[i];
              const codiceRow = String(row[colRef] || '').trim();
              if (codiceRow === String(p.codice)) {
                const prezzoVal = parseFloat(String(row[colPre] || '').replace(/[^\d.]/g, ''));
                if (!isNaN(prezzoVal)) {
                  return { ...p, prezzoNetto: prezzoVal };
                }
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
    blue: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    green: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    amber: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    slate: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  }[color] || 'bg-blue-500/20 text-blue-300';
  return <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{text}</span>;
}

function StepIndicator({ current, total = 3 }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
            ${i < current ? 'bg-blue-600 text-white' : i === current ? 'bg-blue-500 text-white ring-2 ring-blue-300/50' : 'bg-slate-700 text-slate-500'}`}>
            {i < current ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          {i < total - 1 && <div className={`h-px w-8 transition-all ${i < current ? 'bg-blue-500' : 'bg-slate-700'}`} />}
        </div>
      ))}
    </div>
  );
}

function ProductCard({ product, isRecommended, onSelect, mode }) {
  const floorLabel = product.pavimentazione === 'industriale' ? 'Pav. Industriale' : 'Pav. Standard';
  const floorColor = product.pavimentazione === 'industriale' ? 'blue' : 'slate';

  return (
    <div
      onClick={() => onSelect(product)}
      className={`relative rounded-xl p-5 cursor-pointer transition-all duration-200 animate-slide-up
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
      </div>

      <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
        {product.noteTecniche}
      </div>

      <div className="mt-3 flex justify-end">
        <button className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">
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
    <div className="animate-fade-in space-y-8">
      {/* Hero */}
      <div className="text-center pt-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          <span className="text-gradient">QuoteFlow Pro</span>
        </h1>
        <p className="text-slate-400 text-base max-w-md mx-auto">
          Configura il sollevatore Cascos corretto e genera preventivi e ordini in pochi secondi.
        </p>
      </div>

      {/* Main CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onStart('quote')}
          className="glass glass-hover rounded-2xl p-6 text-left group transition-all duration-200 hover:scale-[1.02]"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
            <FileText size={22} className="text-white" />
          </div>
          <div className="text-xl font-bold text-white mb-1">Nuovo Preventivo</div>
          <div className="text-sm text-slate-400">
            Guida rapida: seleziona pavimentazione e veicolo, ottieni il modello corretto con prezzo.
          </div>
          <div className="mt-4 flex items-center gap-1 text-blue-400 text-sm font-medium">
            Inizia <ChevronRight size={16} />
          </div>
        </button>

        <button
          onClick={() => onStart('order')}
          className="glass glass-hover rounded-2xl p-6 text-left group transition-all duration-200 hover:scale-[1.02]"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center mb-4 group-hover:bg-emerald-600 transition-colors">
            <ShoppingCart size={22} className="text-white" />
          </div>
          <div className="text-xl font-bold text-white mb-1">Nuovo Ordine</div>
          <div className="text-sm text-slate-400">
            Compila l'ordine direttamente con dati cliente, quantità e note specifiche.
          </div>
          <div className="mt-4 flex items-center gap-1 text-emerald-400 text-sm font-medium">
            Inizia <ChevronRight size={16} />
          </div>
        </button>
      </div>

      {/* Import Excel */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Upload size={16} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-300">Aggiorna Listino Excel</span>
          {importStatus && (
            <Badge
              text={importStatus.includes('Errore') ? importStatus : `✓ ${importStatus}`}
              color={importStatus.includes('Errore') ? 'amber' : 'green'}
            />
          )}
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Importa il file Excel del listino per aggiornare i prezzi netti. Le colonne attese: Riferimento, Modello, Portata, Netto Riv. (€).
        </p>
        <label className="block border-2 border-dashed border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500/50 transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileDrop} />
          <span className="text-sm text-slate-400">Trascina qui il file Excel o <span className="text-blue-400 underline">seleziona</span></span>
        </label>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: <Package size={18}/>, label: 'Prodotti', value: productsData.length },
          { icon: <Gauge size={18}/>, label: 'Da C3.2 a C7', value: '2 col.' },
          { icon: <Euro size={18}/>, label: 'Prezzi', value: 'Live 2026' },
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

function ConfiguratorView({ mode, products, onResult, onBack }) {
  const [step, setStep] = useState(0);
  const [pavimentazione, setPavimentazione] = useState(null);
  const [veicolo, setVeicolo] = useState(null);

  const handleFloor = (id) => { setPavimentazione(id); setStep(1); };
  const handleVehicle = (id) => {
    setVeicolo(id);
    const results = selectProducts(products, pavimentazione, id);
    onResult({ pavimentazione, veicolo: id, results });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
            {mode === 'order' ? 'Nuovo Ordine' : 'Nuovo Preventivo'}
          </div>
          <StepIndicator current={step} />
        </div>
      </div>

      {step === 0 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-white mb-1">Tipo di Pavimentazione</h2>
          <p className="text-sm text-slate-400 mb-5">
            La scelta del pavimento determina la famiglia di sollevatori (con o senza pedana).
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
                  <div className="text-right ml-4">
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
    </div>
  );
}

function ResultsView({ mode, config, onSelectProduct, onBack, onReset }) {
  const { pavimentazione, veicolo, results } = config;
  const floorLabel = FLOOR_TYPES.find(f => f.id === pavimentazione)?.label;
  const vehicleInfo = VEHICLE_TYPES.find(v => v.id === veicolo);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
            {mode === 'order' ? 'Nuovo Ordine' : 'Nuovo Preventivo'} — Risultati
          </div>
          <StepIndicator current={3} />
        </div>
      </div>

      {/* Config summary */}
      <div className="glass rounded-xl p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Building2 size={14} className="text-slate-400" />
          <span className="text-slate-400">Pavimento:</span>
          <span className="text-white font-medium">{floorLabel}</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div className="flex items-center gap-2 text-sm">
          <Truck size={14} className="text-slate-400" />
          <span className="text-slate-400">Veicolo:</span>
          <span className="text-white font-medium">{vehicleInfo?.label}</span>
        </div>
        <div className="w-px h-4 bg-slate-700" />
        <div className="flex items-center gap-2 text-sm">
          <Package size={14} className="text-slate-400" />
          <span className="text-slate-400">Trovati:</span>
          <span className="text-white font-medium">{results.length} modelli</span>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
          <div className="text-white font-bold mb-1">Nessun modello trovato</div>
          <div className="text-sm text-slate-400 mb-4">
            Non ci sono sollevatori configurati per questa combinazione. Contatta l'ufficio tecnico.
          </div>
          <button onClick={onReset} className="btn-secondary">
            Nuova ricerca
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

function QuoteView({ mode, product, config, onBack, onReset }) {
  const [customer, setCustomer] = useState({ nome: '', azienda: '', email: '', telefono: '', indirizzo: '' });
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [sconto, setSconto] = useState(0);
  const [generated, setGenerated] = useState(false);

  const vehicleInfo = VEHICLE_TYPES.find(v => v.id === config.veicolo);
  const floorLabel = FLOOR_TYPES.find(f => f.id === config.pavimentazione)?.label;
  const prezzoTotale = product.prezzoNetto * qty;
  const scontoEuro = prezzoTotale * (sconto / 100);
  const prezzoFinale = prezzoTotale - scontoEuro;
  const docType = mode === 'order' ? 'ORDINE' : 'PREVENTIVO';

  const handleGenerate = () => setGenerated(true);

  const handlePrint = () => {
    window.print();
  };

  const inputCls = "w-full glass rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-blue-500 transition-colors";

  if (generated) {
    return (
      <div className="animate-fade-in space-y-5">
        {/* Print header — visible only in print */}
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

        {/* Document preview */}
        <div className="glass rounded-xl overflow-hidden print:bg-white print:text-black print:rounded-none print:border-0">
          {/* Header */}
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

          {/* Context */}
          <div className="px-4 py-3 bg-slate-900/50 print:bg-gray-50 border-b border-slate-700 print:border-gray-300">
            <div className="flex flex-wrap gap-4 text-xs text-slate-400 print:text-gray-600">
              <span>Pavimento: <strong className="text-white print:text-black">{floorLabel}</strong></span>
              <span>Veicolo: <strong className="text-white print:text-black">{vehicleInfo?.label}</strong></span>
              <span>Configurazione: <strong className="text-white print:text-black">{product.pavimentazione === 'industriale' ? 'Senza Pedana' : 'Con Pedana'}</strong></span>
            </div>
          </div>

          {/* Product */}
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
                  </td>
                  <td className="py-2 text-white print:text-black text-right">{qty}</td>
                  <td className="py-2 text-white print:text-black text-right font-mono">{formatPrice(product.prezzoNetto)}</td>
                  <td className="py-2 text-white print:text-black text-right font-mono font-bold">{formatPrice(prezzoTotale)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
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

          {/* Notes */}
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

        {/* Actions */}
        <div className="no-print grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="glass glass-hover rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-white font-medium transition-colors"
          >
            <Download size={16} /> Stampa / PDF
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

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
            Dati {docType}
          </div>
          <div className="text-white font-semibold">{product.modello} · {product.codice}</div>
        </div>
      </div>

      {/* Product summary */}
      <div className="glass rounded-xl p-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold text-white">{product.modello}</div>
            <div className="text-xs text-slate-400 font-mono">Rif. {product.codice}</div>
            <div className="mt-1"><Badge text={product.portata} color="green" /></div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-blue-400">{formatPrice(product.prezzoNetto)}</div>
            <div className="text-xs text-slate-500">p. unitario netto</div>
          </div>
        </div>
      </div>

      {/* Customer data */}
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

      {/* Order details */}
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

      {/* Price preview */}
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

const VIEWS = { dashboard: 0, configurator: 1, results: 2, quote: 3 };

export default function App() {
  const { products, importFromExcel } = useProducts();
  const [view, setView] = useState('dashboard');
  const [mode, setMode] = useState('quote');
  const [config, setConfig] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [importStatus, setImportStatus] = useState(null);

  const handleStart = (m) => { setMode(m); setView('configurator'); };
  const handleConfigResult = (cfg) => { setConfig(cfg); setView('results'); };
  const handleSelectProduct = (p) => { setSelectedProduct(p); setView('quote'); };
  const handleReset = () => { setView('dashboard'); setConfig(null); setSelectedProduct(null); };

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
      {/* Top bar */}
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

      {/* Content */}
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
