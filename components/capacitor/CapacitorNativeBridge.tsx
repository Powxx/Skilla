"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function CapacitorNativeBridge() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let cleanupBackButton: (() => void) | undefined;
    let cleanupNetwork: (() => void) | undefined;
    let cleanupHaptics: (() => void) | undefined;

    async function initNativeFeatures() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) {
          return;
        }

        // 1. Barre de statut native (Android / iOS)
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setStyle({ style: Style.Dark });
          if (Capacitor.getPlatform() === "android") {
            await StatusBar.setBackgroundColor({ color: "#0f172a" });
          }
        } catch {
          // Ignoré si le plugin n'est pas disponible sur la plateforme
        }

        // 2. Masquer l'écran de lancement une fois l'application chargée
        try {
          const { SplashScreen } = await import("@capacitor/splash-screen");
          await SplashScreen.hide();
        } catch {
          // Ignoré
        }

        // 3. Gestion du bouton Retour matériel sur Android
        try {
          const { App } = await import("@capacitor/app");
          const backHandler = await App.addListener("backButton", ({ canGoBack }) => {
            if (canGoBack && window.history.length > 1) {
              window.history.back();
            } else {
              App.exitApp();
            }
          });
          cleanupBackButton = () => {
            backHandler.remove();
          };
        } catch {
          // Ignoré
        }

        // 4. Surveillance de l'état du réseau (en ligne / hors ligne)
        try {
          const { Network } = await import("@capacitor/network");
          const status = await Network.getStatus();
          setIsOffline(!status.connected);

          const netHandler = await Network.addListener("networkStatusChange", (s) => {
            setIsOffline(!s.connected);
          });
          cleanupNetwork = () => {
            netHandler.remove();
          };
        } catch {
          // Ignoré
        }
        // 5. Retour haptique natif sur les boutons et liens (expérience « app » native)
        try {
          const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
          const onTap = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("button, a, [role='button']")) {
              Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
            }
          };
          document.addEventListener("click", onTap, { passive: true });
          cleanupHaptics = () => document.removeEventListener("click", onTap);
        } catch {
          // Ignoré
        }

        // 6. Clavier : masque la barre d'accessoires sur iOS
        try {
          if (Capacitor.getPlatform() === "ios") {
            const { Keyboard } = await import("@capacitor/keyboard");
            await Keyboard.setAccessoryBarVisible({ isVisible: false });
          }
        } catch {
          // Ignoré
        }
      } catch {
        // Exécution web standard hors Capacitor
      }
    }

    initNativeFeatures();

    return () => {
      cleanupBackButton?.();
      cleanupNetwork?.();
      cleanupHaptics?.();
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-2 inset-x-3 z-[9999] sm:max-w-md sm:mx-auto animate-in fade-in duration-200">
      <div className="bg-rose-950/95 backdrop-blur-md text-rose-100 border border-rose-700/80 rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold">
        <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
        <span>Connexion Internet perdue. Certaines fonctions sont indisponibles.</span>
      </div>
    </div>
  );
}
