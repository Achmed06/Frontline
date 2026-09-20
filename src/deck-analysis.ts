import { CARDS, CAPTURE_RADIUS, type CardId } from './engine';
const CHEAP_COST = 2;
const HEAVY_AVERAGE = 3.5;
/** Describes composition; this is guidance, not a win-rate prediction. */
export function analyzeDeck(deck: readonly CardId[]) {
 const cards = CARDS.filter(card => deck.includes(card.id));
 const units = cards.filter(card => card.kind === 'unit');
 const support = units.filter(card => card.id === 'medic');
 const frontline = units.filter(card => card.id !== 'medic' && (card.range ?? 0) <= CAPTURE_RADIUS);
 const ranged = units.filter(card => card.id !== 'medic' && (card.range ?? 0) > CAPTURE_RADIUS);
 const cheap = units.filter(card => card.cost <= CHEAP_COST);
 const average = cards.length ? cards.reduce((sum, card) => sum + card.cost, 0) / cards.length : 0;
 const hints: string[] = [];
 if (!cards.length) hints.push('Wähle zuerst Karten für deine Aufstellung.');
 else {
  if (!frontline.length) hints.push('Keine Nahkampftruppen: Achte darauf, wie du Gegner von deinen Fernkämpfern fernhältst.');
  if (!ranged.length) hints.push('Kein Fernkampf: Deine Einheiten müssen für Angriffe nahe an den Gegner heran.');
  if (!cheap.length) hints.push('Keine Einheit für höchstens 2 Energie: Plane eine Reserve für schnelle Reaktionen ein.');
  if (average >= HEAVY_AVERAGE) hints.push('Hoher Energiebedarf: Setze teure Karten nacheinander ein, statt deine Reserve sofort aufzubrauchen.');
  if (!hints.length) hints.push('Nah- und Fernkampf sowie günstige Einheiten vorhanden. Erprobe, welche Karten gemeinsam Druck aufbauen.');
 }
 return { frontline: frontline.length, ranged: ranged.length, support: support.length, cheap: cheap.length, average, hints };
}
