/** New save-transfer UI; the existing local saves remain the sole gameplay storage. */
import { BACKUP_LIMIT, createBackup, parseBackup, restoreBackup } from './save-backup';
import { nativeApp } from './mobile';
export function renderBackupMenu(container: HTMLElement, close: () => void): void {
  container.innerHTML = `<div class="eyebrow">DEIN FORTSCHRITT · DEINE SICHERUNG</div><h2>Spielstand sichern</h2><p>Kampagne, Meisterung, Lernaufträge, Deckplätze, Kommando und Einsatzserie zwischen Browser und App übertragen. Käufe werden ausschließlich bei Apple wiederhergestellt. Laufende Gefechte und Online-Sitzungen sind nicht enthalten.</p><button id="backup-export" class="primary">AKTUELLEN STAND SICHERN</button><section id="backup-output-panel" hidden><label for="backup-output">Sicherungstext · außerhalb dieser App aufbewahren</label><textarea id="backup-output" readonly spellcheck="false" rows="4"></textarea><button id="backup-copy" class="secondary">TEXT KOPIEREN</button><button id="backup-download" class="secondary" ${nativeApp ? 'hidden' : ''}>DATEI SPEICHERN</button></section><h3>Sicherung wiederherstellen</h3><label for="backup-input">Vollständigen Sicherungstext einfügen</label><textarea id="backup-input" rows="4" spellcheck="false" autocomplete="off" maxlength="${BACKUP_LIMIT}"></textarea><label for="backup-file">Oder eine Sicherungsdatei auswählen</label><input id="backup-file" type="file" accept="application/json,.json"><button id="backup-check" class="secondary">SICHERUNG PRÜFEN</button><section id="backup-preview" hidden><p id="backup-summary"></p><p>Dieser Stand ersetzt deinen bisherigen lokalen Fortschritt. Sichere ihn zuerst, falls du ihn behalten möchtest.</p><button id="backup-restore" class="primary">LOKALEN STAND ERSETZEN & NEU STARTEN</button></section><p id="backup-status" role="status" aria-live="polite"></p><button id="backup-close" class="secondary">ZUR BASIS</button>`;
  const el = <T extends HTMLElement>(id: string) => container.querySelector<T>('#' + id)!;
  const input = el<HTMLTextAreaElement>('backup-input');
  const output = el<HTMLTextAreaElement>('backup-output');
  const status = el<HTMLElement>('backup-status');
  let checkedText: string | null = null;
  let fileRequest = 0;
  function invalidate() { checkedText = null; el('backup-preview').hidden = true; }
  input.oninput = () => { fileRequest++; invalidate(); };
  el('backup-close').onclick = close;
  el('backup-export').onclick = () => {
    try { output.value = createBackup(); el('backup-output-panel').hidden = false; status.textContent = 'Sicherung erstellt. Speichere die Datei oder kopiere den vollständigen Text außerhalb dieser App. Erst dann ist er vor einer Deinstallation geschützt.'; }
    catch (error) { status.textContent = (error as Error).message; }
  };
  el('backup-copy').onclick = async () => {
    try { await navigator.clipboard.writeText(output.value); status.textContent = 'Text kopiert. Jetzt außerhalb dieser App einfügen und aufbewahren.'; }
    catch { output.focus(); output.select(); status.textContent = 'Text markiert. Über das Kopiermenü kopieren und außerhalb der App aufbewahren.'; }
  };
  el('backup-download').onclick = () => {
    if (!output.value) return;
    const url = URL.createObjectURL(new Blob([output.value], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `frontline-save-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Download angefordert. Prüfe, ob die Sicherungsdatei gespeichert wurde.';
  };
  el<HTMLInputElement>('backup-file').onchange = async event => {
    const file = (event.target as HTMLInputElement).files?.[0];
    invalidate(); const request = ++fileRequest;
    if (!file) return;
    if (file.size > BACKUP_LIMIT) { status.textContent = 'Datei zu groß. Maximal 256 KB.'; return; }
    try { const text = await file.text(); if (request !== fileRequest || !container.contains(input)) return; input.value = text; status.textContent = 'Datei geladen. Jetzt Sicherung prüfen.'; }
    catch { status.textContent = 'Datei konnte nicht gelesen werden.'; }
  };
  el('backup-check').onclick = () => {
    invalidate();
    try {
      const backup = parseBackup(input.value);
      checkedText = input.value;
      const campaign = backup.data['campaign-v1'] as Record<string, { stars: number }>;
      el('backup-summary').textContent = `${new Date(backup.createdAt).toLocaleString('de-DE')} · ${Object.keys(campaign).length}/24 Einsätze · ${Object.values(campaign).reduce((sum, value) => sum + value.stars, 0)} Sterne`;
      el('backup-preview').hidden = false;
      status.textContent = 'Sicherung gültig. Noch wurde nichts ersetzt.';
    } catch (error) { status.textContent = (error as Error).message; }
  };
  el('backup-restore').onclick = () => {
    if (!checkedText || input.value !== checkedText) { invalidate(); return; }
    try { restoreBackup(checkedText); location.reload(); }
    catch (error) { status.textContent = (error as Error).message; }
  };
}
