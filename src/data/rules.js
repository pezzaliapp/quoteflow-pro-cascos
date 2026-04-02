// Mapping veicoli con descrizioni UI
export const VEHICLE_TYPES = [
  { id: 'utilitaria', label: 'Utilitaria', icon: '🚗', desc: 'Fino a 1.400 Kg (Panda, Polo, C1...)', maxKg: 1400 },
  { id: 'car',        label: 'Car / Berlina', icon: '🚙', desc: 'Fino a 2.000 Kg (Golf, Focus, 3008...)', maxKg: 2000 },
  { id: 'suv',        label: 'SUV / Fuoristrada', icon: '🚐', desc: 'Fino a 2.800 Kg (Defender, X5, Grand Cherokee...)', maxKg: 2800 },
  { id: 'van',        label: 'Van / Furgone', icon: '🚚', desc: 'Fino a 3.500 Kg (Transit, Ducato, Sprinter...)', maxKg: 3500 },
  { id: 'van_lungo',  label: 'Van Lungo / Passo Lungo', icon: '🚌', desc: 'Fino a 5.000 Kg (Sprinter XL, Crafter L3...)', maxKg: 5000 },
  { id: 'camper',     label: 'Camper / Motorhome', icon: '🏕️', desc: 'Fino a 5.500 Kg (Camper professionali)', maxKg: 5500 },
  { id: 'truck',      label: 'Truck / Veicolo Pesante', icon: '🚛', desc: 'Oltre 5.000 Kg (veicoli commerciali pesanti)', maxKg: 6000 },
];

export const FLOOR_TYPES = [
  {
    id: 'industriale',
    label: 'Industriale',
    desc: 'Pavimento industriale adatto ad ancoraggio (tasselli diretti)',
    note: 'Modelli C...S — senza pedana',
    color: 'blue',
  },
  {
    id: 'non_industriale',
    label: 'Non Industriale',
    desc: 'Pavimento normale, piastrellato o non adatto ad ancoraggio diretto',
    note: 'Modelli C — con pedana',
    color: 'slate',
  },
];

// Seleziona i prodotti compatibili, ordinati per prezzo
export function selectProducts(products, pavimentazione, veicolo) {
  if (!pavimentazione || !veicolo) return [];
  
  return products
    .filter(p =>
      p.pavimentazione === pavimentazione &&
      p.veicoli.includes(veicolo)
    )
    .sort((a, b) => a.prezzoNetto - b.prezzoNetto);
}

// Genera la motivazione tecnica per la proposta
export function generateMotivazione(product, veicolo, pavimentazione) {
  const veicoloInfo = VEHICLE_TYPES.find(v => v.id === veicolo);
  const floorInfo = FLOOR_TYPES.find(f => f.id === pavimentazione);
  
  const pav = pavimentazione === 'industriale'
    ? 'Il pavimento industriale consente l\'installazione senza pedana, ottimizzando lo spazio in officina.'
    : 'La configurazione con pedana è indicata per pavimenti standard senza ancoraggio diretto.';

  return `${product.modello} con portata ${product.portata} è la soluzione ottimale per ${veicoloInfo?.label}. ${pav}`;
}
