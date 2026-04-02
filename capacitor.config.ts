import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tacfit.app",
  appName: "TacFit",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
    // In development you can point to your dev server:
    // url: "http://YOUR_LOCAL_IP:5000",
    // cleartext: true,
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0a0f0a",
    preferredContentMode: "mobile",
    limitsNavigationsToAppBoundDomains: true,
    scheme: "tacfit",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0a0f0a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      iosSpinnerStyle: "small",
      spinnerColor: "#4ade80",
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0a0f0a",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
