# QuoteFlow Pro – Cascos Lifts

**Configuratore e generatore di preventivi/ordini per sollevatori Cascos.**

PWA professionale per uso commerciale: funziona offline, installabile su smartphone e desktop.

---

## Stack

- React 18 + Vite 5
- Tailwind CSS
- vite-plugin-pwa (service worker + manifest)
- xlsx (import listino Excel)
- Lucide React (icone)

---

## Setup Rapido

```bash
# 1. Clona il repo
git clone https://github.com/TUO_USERNAME/quoteflow-pro-cascos.git
cd quoteflow-pro-cascos

# 2. Installa dipendenze
npm install

# 3. Sviluppo locale
npm run dev

# 4. Build produzione
npm run build
```

---

## Deploy su GitHub Pages

### Automatico (raccomandato)

1. Crea un repository GitHub (es. `quoteflow-pro-cascos`)
2. In `vite.config.js` lascia `base: './'` per evitare schermate bianche su GitHub Pages
3. Push su `main` → il workflow `.github/workflows/deploy.yml` si occupa del deploy
4. Vai su **Settings → Pages → Source: GitHub Actions**

### Manuale (Vercel)

1. Importa il repo su [vercel.com](https://vercel.com)
2. Framework: Vite
3. Puoi lasciare `base: './'` anche su Vercel
4. Deploy automatico ad ogni push

---

## Struttura

```
src/
├── data/
│   ├── products.json   ← Catalogo prodotti (modelli, prezzi, compatibilità)
│   └── rules.js        ← Logica selezione + tipi veicolo/pavimento
├── App.jsx             ← App completa (tutte le view)
├── main.jsx
└── index.css
```

---

## Aggiornare i Prezzi

**Metodo 1 – Import Excel (UI):**
Dalla dashboard, trascina il file `.xlsx` del listino. Il sistema legge automaticamente le colonne `Riferimento` e `Netto Riv. (€)` e aggiorna i prezzi.

**Metodo 2 – Modifica diretta JSON:**
Apri `src/data/products.json` e modifica il campo `prezzoNetto` per ogni modello.

---

## Aggiungere Nuovi Modelli

Aggiungi un oggetto a `src/data/products.json`:

```json
{
  "id": "id_univoco",
  "codice": "CODICE_CASCOS",
  "modello": "Nome Modello",
  "descrizione": "Descrizione commerciale breve",
  "prezzoNetto": 0000,
  "portata": "X.X Tn",
  "portataKg": 0000,
  "pavimentazione": "industriale",
  "veicoli": ["car", "suv", "van"],
  "famiglia": "CX",
  "noteTecniche": "Dati tecnici dal depliant",
  "categoria": "2 Col. senza Pedana",
  "badge": "Consigliato"
}
```

**Valori `pavimentazione`:** `"industriale"` | `"non_industriale"`

**Valori `veicoli`:** `"utilitaria"` | `"car"` | `"suv"` | `"van"` | `"van_lungo"` | `"camper"` | `"truck"`

---

## Regola Tecnica Principale

| Pavimentazione | Famiglia |
|---|---|
| Industriale (ancoraggio diretto) | C...S — senza pedana |
| Non Industriale (normale) | C — con pedana |

---

## Licenza

Uso interno Cormach Srl / PezzaliApp. Non distribuire senza autorizzazione.
