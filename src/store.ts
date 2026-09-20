/** New native cosmetic store. Never persist purchase ownership in browser storage. */
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { nativeApp, watchAppState } from './mobile';
import { headquartersSvg } from './headquarters';
interface Catalog { available: boolean; price: string; testOnly: boolean }
interface StorePlugin {
  entitlements(): Promise<{ owned: boolean }>;
  catalog(): Promise<Catalog>;
  purchase(): Promise<{ status: 'purchased' | 'cancelled' | 'pending'; owned: boolean }>;
  restore(): Promise<{ owned: boolean }>;
  addListener(event: 'entitlementsChanged', callback: (data: { owned: boolean }) => void): Promise<PluginListenerHandle>;
}
const Store = registerPlugin<StorePlugin>('FrontlineStore');
export let supporterOwned = false;
let changed: () => void = () => {};
let ownershipRevision = 0;
let storeChanged: (() => void) | null = null;
function setOwned(owned: boolean) {
  if (supporterOwned === owned) return;
  supporterOwned = owned;
  changed();
  storeChanged?.();
}
async function refreshOwnership(): Promise<void> {
  const revision = ++ownershipRevision;
  const result = await Store.entitlements();
  // An Apple event or a newer refresh supersedes an older asynchronous response.
  if (revision === ownershipRevision) setOwned(result.owned);
}
export function initializeStore(onChange: () => void): void {
  changed = onChange;
  if (!nativeApp) return;
  const refresh = () => refreshOwnership().catch(() => {});
  void Store.addListener('entitlementsChanged', data => { ownershipRevision++; setOwned(data.owned); }).catch(() => {});
  watchAppState(active => { if (active) void refresh(); });
  void refresh();
}
export function renderStore(container: HTMLElement, stage: number, close: () => void, equip: () => void): void {
  container.innerHTML = `<div class="eyebrow">UNTERSTÜTZERPAKET · GERÄTETEST</div><h2>Kommandogold</h2><div class="hq-art store-preview">${headquartersSvg(stage, '#ffe17d')}</div><p>Goldene Akzente für dein Hauptquartier und deine Einsatzbasis. Einmal freischalten, dauerhaft gestalten. Keine stärkeren Truppen, keine zusätzlichen Kampfwerte.</p><p class="store-test-note">Testbetrieb · Testkäufe bringen noch keine Einnahmen. Fortschritt und Basisstufe bleiben unverändert.</p><p id="store-status" role="status" aria-live="polite"></p><button id="store-buy" class="primary" disabled>APPLE-SHOP LADEN …</button><button id="store-equip" class="primary" hidden>KOMMANDOGOLD AUSRÜSTEN</button><button id="store-restore" class="secondary">KÄUFE WIEDERHERSTELLEN</button><button id="store-retry" class="secondary" hidden>APPLE-SHOP ERNEUT LADEN</button><button id="store-close" class="secondary">ZURÜCK ZUM HAUPTQUARTIER</button>`;
  const status = container.querySelector<HTMLElement>('#store-status')!;
  const buy = container.querySelector<HTMLButtonElement>('#store-buy')!;
  const restore = container.querySelector<HTMLButtonElement>('#store-restore')!;
  const equipButton = container.querySelector<HTMLButtonElement>('#store-equip')!;
  const retry = container.querySelector<HTMLButtonElement>('#store-retry')!;
  const closeButton = container.querySelector<HTMLButtonElement>('#store-close')!;
  let catalog: Catalog | null = null;
  let busy = false;
  let loading = false;
  let interactionRevision = 0;
  const current = () => container.contains(status);
  function update() {
    if (!current()) return;
    buy.hidden = supporterOwned;
    equipButton.hidden = !supporterOwned;
    buy.disabled = busy || loading || !catalog?.available;
    equipButton.disabled = busy;
    restore.disabled = busy || !nativeApp;
    retry.hidden = !nativeApp || supporterOwned || Boolean(catalog?.available);
    retry.disabled = busy || loading;
    closeButton.disabled = busy;
    buy.textContent = catalog?.available ? `TESTKAUF · ${catalog.price}` : 'KAUF NOCH NICHT VERFÜGBAR';
  }
  storeChanged = () => {
    if (!current()) return;
    interactionRevision++;
    status.textContent = supporterOwned ? 'Kommandogold ist freigeschaltet. Jetzt ausrüsten.' : 'Keine aktive Kaufberechtigung. Wiederherstellung ist über Apple möglich.';
    update();
  };
  closeButton.onclick = () => { storeChanged = null; close(); };
  equipButton.onclick = () => { if (supporterOwned) equip(); };
  async function load() {
    if (!nativeApp) {
      status.textContent = 'Vorschau im Browser. Kaufen und Wiederherstellen werden im iPhone-Testbuild über Apple geprüft.';
      update(); return;
    }
    if (loading || busy) return;
    const revision = interactionRevision;
    loading = true; catalog = null; update();
    status.textContent = 'Apple-Shop laden …';
    // Ownership refresh completes independently even if product lookup fails or stalls.
    void refreshOwnership().catch(() => {});
    try {
      catalog = await Store.catalog();
      if (revision !== interactionRevision) return;
      status.textContent = supporterOwned ? 'Kommandogold ist freigeschaltet.' : catalog.available ? 'Apple-Testumgebung bereit. Kein Echtgeldkauf.' : 'Apple-Testprodukt oder Testumgebung noch nicht verfügbar. Solo-Spielen funktioniert weiterhin.';
    } catch (error) { if (revision !== interactionRevision) return; status.textContent = supporterOwned ? 'Kommandogold ist freigeschaltet. Der Shop ist gerade nicht erreichbar; deine Gestaltung bleibt auswählbar.' : error instanceof Error ? error.message : 'Apple-Shop nicht erreichbar.'; }
    finally { loading = false; update(); }
  }
  async function transact(kind: 'buy' | 'restore') {
    if (busy || (kind === 'buy' && loading) || !nativeApp) return;
    interactionRevision++;
    busy = true; update();
    status.textContent = kind === 'buy' ? 'Apple-Kaufbestätigung öffnen …' : 'Käufe bei Apple prüfen …';
    try {
      const result = kind === 'buy' ? await Store.purchase() : await Store.restore();
      await refreshOwnership();
      status.textContent = supporterOwned ? 'Kommandogold freigeschaltet. Jetzt ausrüsten.' : 'status' in result && result.status === 'pending' ? 'Freigabe ausstehend. Apple meldet die Bestätigung automatisch.' : 'status' in result && result.status === 'cancelled' ? 'Kauf abgebrochen.' : 'Kein bestätigter Kauf gefunden.';
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'Apple-Anfrage fehlgeschlagen.'; }
    finally { busy = false; update(); }
  }
  retry.onclick = () => void load();
  buy.onclick = () => void transact('buy');
  restore.onclick = () => void transact('restore');
  void load();
}
