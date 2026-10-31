import type { CapacitorConfig } from '@capacitor/cli';

const PRODUCTION_URL = 'https://mykost.zeinkunn.my.id';

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  PRODUCTION_URL;

const isHttp = serverUrl.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'id.mykost.app',
  appName: 'MyKost',
  webDir: 'mobile-shell',
  server: {
    url: serverUrl,
    cleartext: isHttp,
    errorPath: 'offline.html',
    allowNavigation: ['mykost.zeinkunn.my.id', '*.zeinkunn.my.id'],
  },
  android: {
    allowMixedContent: isHttp,
  },
};

export default config;
