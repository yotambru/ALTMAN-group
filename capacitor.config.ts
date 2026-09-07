import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "il.co.altmangroup.app",
  appName: "ALTMAN Group",
  webDir: "www",
  server: {
    // Production web app — content updates via Vercel deploy.
    url: "https://altman-group.vercel.app",
    cleartext: false,
    allowNavigation: ["altman-group.vercel.app", "*.vercel.app"],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: "#14285a",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#14285a",
      overlaysWebView: true,
    },
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
  },
  ios: {
    // CSS env(safe-area-inset-*) on .app-shell owns the insets.
    contentInset: "never",
    preferredContentMode: "mobile",
    backgroundColor: "#14285a",
    scheme: "AltmanGroup",
  },
  android: {
    // Play Console package is il.co.altmangroup.android (set in android/app/build.gradle).
    // Do not change appId above — iOS still uses il.co.altmangroup.app.
    allowMixedContent: false,
    backgroundColor: "#14285a",
  },
};

export default config;
