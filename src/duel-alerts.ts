import { MATCH_DURATION, OVERTIME_DURATION, type MatchState } from './engine';
const FINAL_SECONDS = 30;
const CRITICAL_CORE_RATIO = 0.25;
/** Presentation derived from the authoritative match; never a separate timer. */
export function duelAlerts(state: MatchState) {
  const remaining = Math.max(0, Math.ceil((state.phase === 'overtime' ? MATCH_DURATION + OVERTIME_DURATION : MATCH_DURATION) - state.time));
  const active = state.phase !== 'ended';
  const critical = active && state.cores.player.hp / state.cores.player.maxHp <= CRITICAL_CORE_RATIO;
  const overtime = active && state.phase === 'overtime';
  const final = active && !overtime && remaining <= FINAL_SECONDS;
  const messages: string[] = [];
  if (critical) messages.push('Dein Core ist kritisch – Basis verteidigen.');
  if (overtime) messages.push('Verlängerung: Core-Leben und Gebiete entscheiden bei Zeitablauf.');
  else if (final) messages.push('Letzte 30 Sekunden – prüfe das Siegziel und sichere deinen Vorsprung.');
  return { remaining, critical, overtime, final, message: messages.join(' ') };
}
