/** Shared existing deck templates for the editor and friend duels. */
import { DEFAULT_DECK, type CardId } from './engine';
export type DeckPreset = { id: string; name: string; tip: string; cards: readonly CardId[] };
export const DECK_PRESETS: readonly DeckPreset[] = [
 { id:'standard', name:'Standard', tip:'Lerne das Zusammenspiel deiner Einheiten. Halte Unterstützung hinter deiner Front.', cards:[...DEFAULT_DECK] },
 { id:'assault', name:'Vorstoß', tip:'Setze Lancer gegen den Core ein und unterstütze den Vorstoß mit Rally. Repulsor schafft Abstand.', cards:['vanguard','ranger','swarm','lancer','raider','sentinel','rally','repulsor'] },
 { id:'hold', name:'Stellung halten', tip:'Bulwark und Medic stabilisieren deine Front. Stasis bremst gegnerische Angriffe.', cards:['vanguard','bulwark','ranger','medic','lancer','sentinel','pulse','stasis'] },
 { id:'control', name:'Kontrolle', tip:'Halte Relais mit einer stabilen Front. Mortar trifft Gruppen; Repulsor drängt Gegner vom Punkt.', cards:['vanguard','bulwark','ranger','medic','mortar','disruptor','stasis','repulsor'] },
 { id:'shieldbreak', name:'Schildbruch', tip:'Breaker entfernt gegnerische Schilde. Halte ihn am Leben und nutze Rally für deinen Gegenangriff.', cards:['vanguard','breaker','ranger','medic','raider','sentinel','stasis','rally'] },
 { id:'territory', name:'Landnahme', tip:'Pionier erobert ungestörte Punkte schneller. Sichere seine Versorgung und halte Gegner mit Stasis fern.', cards:['vanguard','pioneer','ranger','bulwark','disruptor','medic','stasis','repulsor'] },
];
