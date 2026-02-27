import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.babc526d6412472c92337bdfe59c49c8',
  appName: 'ton-miner-blast',
  webDir: 'dist',
  server: {
    url: 'https://babc526d-6412-472c-9233-7bdfe59c49c8.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;