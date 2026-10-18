import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rltnewside.jbirthdays',
  appName: 'JBirthdays',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    SystemBars: {
      style: 'DARK',
    },
    LocalNotifications: {
      iconColor: '#fb7185',
    },
  },
};

export default config;
