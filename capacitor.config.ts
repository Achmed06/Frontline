import type { CapacitorConfig } from '@capacitor/cli';
// Development identity: replace before registering the app in App Store Connect.
const config: CapacitorConfig = {
  appId: process.env.BUNDLE_ID || 'com.frontlinegame.app',
  appName: 'Frontline',
  webDir: 'dist',
  backgroundColor: '#101f41',
  ios: { contentInset: 'never', preferredContentMode: 'mobile', scrollEnabled: true },
};
export default config;
