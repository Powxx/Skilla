"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  X,
  Smartphone,
  ChevronRight,
  CheckCircle,
  Sparkles,
} from "lucide-react";

export default function PwaInstallBanner() {
  const [isClient, setIsClient] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);

    // 1. Vérification : est-on déjà en mode application (standalone / PWA) ?
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      // Déjà en mode PWA : ne rien afficher
      return;
    }

    // 2. Vérification : est-ce consulté depuis un appareil mobile ?
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isSmallTouchScreen =
      window.innerWidth <= 850 &&
      (navigator.maxTouchPoints > 0 || "ontouchstart" in window);

    const isMobile = isMobileUA || isSmallTouchScreen;
    if (!isMobile) {
      // Non mobile : ne pas afficher
      return;
    }

    // 3. Détecter l'OS (iOS ou Android)
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS) {
      setPlatform("ios");
    } else if (/Android/i.test(ua)) {
      setPlatform("android");
    } else {
      setPlatform("other");
    }

    // 4. Vérifier si l'utilisateur a fermé le bandeau récemment (ex: masqué pour 7 jours)
    const dismissedAt = localStorage.getItem("skilla_pwa_banner_dismissed_at");
    if (dismissedAt) {
      const daysSinceDismissed =
        (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Petit délai pour une transition douce après le chargement de la page
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1500);

    // 5. Écoute de l'événement beforeinstallprompt (pour navigateurs Chromium / Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem("skilla_pwa_banner_dismissed_at", Date.now().toString());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsExpanded(false);
    // Masquer pour 7 jours
    localStorage.setItem("skilla_pwa_banner_dismissed_at", Date.now().toString());
  };

  const handleDirectInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      setIsExpanded(true);
    }
  };

  if (!isClient || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-3 inset-x-3 z-[9998] sm:max-w-md sm:mx-auto animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl shadow-2xl p-4 transition-all">
        {/* Bandeau Compact */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-11 w-11 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
              <Image
                src="/SKILLA-Logo.png"
                alt="Skilla App"
                width={36}
                height={36}
                className="object-contain"
                onError={(e) => {
                  // Fallback icon si l'image ne charge pas
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <Smartphone className="w-5 h-5 text-amber-400 absolute" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-tight text-white truncate">
                  Installer l'application Skilla
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase shrink-0">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                Accès direct 1 clic & notifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {deferredPrompt ? (
              <button
                type="button"
                onClick={handleDirectInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-md active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Installer</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-400 font-bold text-xs rounded-xl transition shadow-sm active:scale-95"
              >
                <span>{isExpanded ? "Fermer" : "Guide"}</span>
                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Ne plus afficher"
              aria-label="Fermer le bandeau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panneau Déplié : Procédure d'installation étape par étape */}
        {isExpanded && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-800 space-y-3 animate-in fade-in duration-200">
            {/* Sélecteur d'OS si nécessaire */}
            <div className="flex bg-slate-800/80 p-1 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setPlatform("ios")}
                className={`flex-1 py-1 rounded-lg transition text-center ${
                  platform === "ios"
                    ? "bg-slate-700 text-white shadow-xs font-black"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🍎 iPhone / iPad (Safari)
              </button>
              <button
                type="button"
                onClick={() => setPlatform("android")}
                className={`flex-1 py-1 rounded-lg transition text-center ${
                  platform !== "ios"
                    ? "bg-slate-700 text-white shadow-xs font-black"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🤖 Android (Chrome)
              </button>
            </div>

            {/* Procédure iOS */}
            {platform === "ios" ? (
              <div className="space-y-2 bg-slate-800/50 p-3 rounded-xl border border-slate-750 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="leading-snug">
                    <span>Dans Safari, appuyez sur le bouton </span>
                    <strong className="text-white inline-flex items-center gap-1 font-bold bg-slate-700/80 px-1.5 py-0.5 rounded text-[11px]">
                      Partager <Share className="w-3 h-3 text-blue-400 inline" />
                    </strong>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      (icône carrée avec la flèche vers le haut en bas de votre écran)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="leading-snug">
                    <span>Faites défiler vers le bas et touchez </span>
                    <strong className="text-white inline-flex items-center gap-1 font-bold bg-slate-700/80 px-1.5 py-0.5 rounded text-[11px]">
                      Sur l'écran d'accueil <PlusSquare className="w-3 h-3 text-amber-400 inline" />
                    </strong>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="leading-snug">
                    <span>Appuyez sur </span>
                    <strong className="text-amber-300 font-bold">« Ajouter »</strong>
                    <span> en haut à droite. L'icône Skilla est prête sur votre écran d'accueil !</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Procédure Android */
              <div className="space-y-2 bg-slate-800/50 p-3 rounded-xl border border-slate-750 text-xs">
                {deferredPrompt ? (
                  <div className="text-center py-1">
                    <p className="text-xs text-slate-300 mb-2">
                      Votre navigateur supporte l'installation instantanée en un clic :
                    </p>
                    <button
                      type="button"
                      onClick={handleDirectInstall}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      Installer Skilla maintenant
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="leading-snug">
                        <span>Dans Chrome, appuyez sur les </span>
                        <strong className="text-white inline-flex items-center gap-0.5 font-bold bg-slate-700/80 px-1.5 py-0.5 rounded text-[11px]">
                          3 points <MoreVertical className="w-3 h-3 text-amber-400 inline" />
                        </strong>
                        <span className="text-slate-400 text-[11px] block mt-0.5">
                          (en haut à droite du navigateur)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="leading-snug">
                        <span>Sélectionnez </span>
                        <strong className="text-white font-bold bg-slate-700/80 px-1.5 py-0.5 rounded text-[11px]">
                          « Installer l'application »
                        </strong>
                        <span className="text-slate-400 text-[11px]"> ou </span>
                        <strong className="text-white font-bold bg-slate-700/80 px-1.5 py-0.5 rounded text-[11px]">
                          « Ajouter à l'écran d'accueil »
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="leading-snug">
                        <span>Validez pour lancer Skilla comme une véritable application native.</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Avantages & bouton fermeture */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <Sparkles className="w-3 h-3" />
                Plein écran & sans barre d'adresse
              </span>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-amber-400 hover:text-amber-300 font-bold underline transition"
              >
                J'ai compris
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
