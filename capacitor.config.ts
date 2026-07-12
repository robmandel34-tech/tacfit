import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tacfit.app",
  appName: "Muster Up",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
    // In development you can point to your dev server:
    // url: "http://YOUR_LOCAL_IP:5000",
    // cleartext: true,
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#181B14",
    preferredContentMode: "mobile",
    // Must stay FALSE: there is no WKAppBoundDomains list in Info.plist, and
    // App-Bound Domain limits can block camera/microphone (WebRTC) access for
    // the embedded team video call at fairmeeting.net inside the WKWebView.
    limitsNavigationsToAppBoundDomains: false,
    scheme: "tacfit",
    minVersion: "16.0",
  },
  plugins: {
    SplashScreen: {
      // Hidden explicitly from JS (main.tsx) once the web layer paints, so the
      // static native launch image hands off seamlessly to the in-app animated
      // splash. launchAutoHide is OFF so iOS never hides it before first paint.
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: "#181B14",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      iosSpinnerStyle: "small",
      spinnerColor: "#D2913C",
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#181B14",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
