/** New native integration; the existing browser game remains the source of gameplay. */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
export const nativeApp = Capacitor.isNativePlatform();
export function watchAppState(onChange: (active: boolean) => void): void {
  if (!nativeApp) return;
  void App.addListener('appStateChange', state => onChange(state.isActive))
    .catch(error => console.warn('App lifecycle unavailable', error));
}
