import type { CapacitorConfig } from "@capacitor/cli";

// URL du serveur Next.js : production par défaut, surchargeable via CAPACITOR_SERVER_URL
// (ex. http://192.168.1.XX:3000 pour tester en local)
const serverUrl =
  process.env.CAPACITOR_SERVER_URL || "https://skilla.ecm-academie.com";

const config: CapacitorConfig = {
  appId: "fr.ecmacademie.skilla",
  appName: "Skilla",
  webDir: "mobile-dist",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
          androidScheme: "https",
        },
      }
    : {
        server: {
          androidScheme: "https",
        },
      }),
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a",
      overlaysWebView: false,
    },
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
    },
  },
};

export default config;
