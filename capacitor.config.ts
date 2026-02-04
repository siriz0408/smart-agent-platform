import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.smartagent.app',
  appName: 'Smart Agent',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development, you can use a local server
    // url: 'http://localhost:8080',
    // cleartext: true,
  },
  plugins: {
    // Push notifications configuration (for future implementation)
    // PushNotifications: {
    //   presentationOptions: ['badge', 'sound', 'alert'],
    // },
    // Keyboard configuration for better mobile experience
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    // Status bar configuration
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a',
    },
    // Splash screen configuration
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Scheme for OAuth redirects
    scheme: 'smartagent',
  },
  android: {
    // Build variants
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
