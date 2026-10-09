"use client";

import { useEffect, useState } from "react";
import { subscribeToPush } from "@/app/actions/push";
import { Bell, CheckCircle2, AlertTriangle, Loader2, Info, Share2, Smartphone } from "lucide-react";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function PushSubscriptionManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    // Détection de l'environnement client
    if (typeof window === "undefined") return;

    const userAgent = window.navigator.userAgent || "";
    const iosDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const standaloneMode = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;

    setIsIOS(iosDevice);
    setIsStandalone(standaloneMode);

    const hasServiceWorker = "serviceWorker" in navigator;
    const hasPushManager = "PushManager" in window;
    const hasNotification = "Notification" in window;

    if (hasNotification) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }

    if (hasServiceWorker && hasPushManager && hasNotification) {
      setIsSupported(true);
      
      // Enregistrement préventif et vérification de la souscription existante
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            setSubscription(sub);
          }
        })
        .catch((err) => {
          console.warn("[PushSubscriptionManager] Échec vérification initiale:", err);
        });
    } else {
      setIsSupported(false);
    }
  }, []);

  const subscribe = async () => {
    setStatusMessage(null);
    setLoading(true);

    try {
      if (!publicVapidKey) {
        throw new Error("La clé publique de notifications (VAPID) n'est pas configurée.");
      }

      // Cas iOS hors PWA standalone
      if (isIOS && !isStandalone) {
        setStatusMessage({
          type: "info",
          text: "Sur iPhone / iPad, ajoutez d'abord Skilla à votre écran d'accueil (bouton Partager ⎋ > « Sur l'écran d'accueil ») pour activer les notifications.",
        });
        setLoading(false);
        return;
      }

      // Vérification du support des APIs
      if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) {
        throw new Error("Ce navigateur ne prend pas en charge les notifications push.");
      }

      // 1. Demande explicite de permission au navigateur (obligatoire sur mobile via geste utilisateur)
      const currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);

      if (currentPermission === "denied") {
        throw new Error("Les notifications sont bloquées. Veuillez les autoriser dans les paramètres de votre navigateur ou de votre téléphone.");
      }

      if (currentPermission !== "granted") {
        throw new Error("Autorisation des notifications refusée ou ignorée.");
      }

      // 2. Assurer l'enregistrement et l'état actif du Service Worker avec délai maximum
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js");
      }

      // Attente active du service worker avec sécurité de timeout (8s)
      const swReadyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Le service worker a mis trop de temps à s'initialiser. Veuillez recharger la page.")), 8000)
      );

      const activeRegistration = await Promise.race([swReadyPromise, timeoutPromise]);

      // 3. Souscription auprès du Push Service du navigateur
      const sub = await activeRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // 4. Enregistrement en base de données
      const subData = JSON.parse(JSON.stringify(sub));
      await subscribeToPush({
        endpoint: subData.endpoint,
        keys: {
          p256dh: subData.keys.p256dh,
          auth: subData.keys.auth,
        },
      });

      setSubscription(sub);
      setStatusMessage({
        type: "success",
        text: "Notifications push activées avec succès sur cet appareil !",
      });
    } catch (error: any) {
      console.error("[PushSubscriptionManager] Erreur souscription:", error);
      setStatusMessage({
        type: "error",
        text: error?.message || "Impossible d'activer les notifications sur cet appareil.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Guide spécifique iPhone Safari hors mode PWA
  if (isIOS && !isStandalone) {
    return (
      <div className="p-3 sm:p-4 border-t border-slate-100 bg-amber-50/70 rounded-b-2xl">
        <div className="flex items-start gap-2.5">
          <Smartphone className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold block text-amber-800 mb-0.5">Notifications sur iPhone / iPad</span>
            Pour recevoir les notifications push sur iOS, ajoutez Skilla à votre écran d'accueil : appuyez sur{" "}
            <span className="font-bold inline-flex items-center gap-0.5 px-1 py-0.2 bg-white rounded border border-amber-200">
              <Share2 className="h-3 w-3 inline" /> Partager
            </span>{" "}
            puis <span className="font-bold">« Sur l'écran d'accueil »</span>.
          </div>
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 text-center">
        Les notifications push ne sont pas disponibles sur ce navigateur.
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/70">
      {statusMessage && (
        <div
          className={`mb-3 p-2.5 rounded-xl text-xs flex items-start gap-2 animate-in fade-in duration-200 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : statusMessage.type === "info"
              ? "bg-sky-50 text-sky-800 border border-sky-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : statusMessage.type === "info" ? (
            <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="leading-snug">{statusMessage.text}</span>
        </div>
      )}

      {!subscription ? (
        <div className="space-y-2">
          <button
            onClick={subscribe}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-sky-600 text-white text-xs font-bold rounded-xl hover:bg-sky-700 active:scale-[0.99] transition shadow-sm shadow-sky-600/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Activation en cours...</span>
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                <span>Activer les notifications sur cet appareil</span>
              </>
            )}
          </button>
          {permission === "denied" && (
            <p className="text-[10px] text-rose-600 text-center font-medium">
              ⚠️ Les notifications sont bloquées. Autorisez-les dans les paramètres de votre navigateur.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 py-2 px-3 rounded-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Notifications push actives sur cet appareil</span>
        </div>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
