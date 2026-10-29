export interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: Record<string, unknown>;
  plugins?: Record<string, unknown>;
}

const config: CapacitorConfig = {
  appId: 'com.kisansathi.ai',
  appName: 'Kisan Sathi AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#15803d',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
