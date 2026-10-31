import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://10.0.2.2:3000';

const isHttp = serverUrl.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'id.mykost.app',
  appName: 'MyKost',
  webDir: 'mobile-shell',
  server: {
    url: serverUrl,
    cleartext: isHttp,
    errorPath: 'offline.html',
  },
  android: {
    allowMixedContent: isHttp,
  },
};

export default config;
