"use client";

import { useEffect, useCallback, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

/**
 * Composant pour gérer l'expiration de session après inactivité.
 * Par défaut : 30 minutes d'inactivité avec throttling des événements pour épargner le CPU.
 */
export default function SessionTimeout({ timeoutMs = 30 * 60 * 1000 }: { timeoutMs?: number }) {
  const { data: session } = useSession();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastResetRef = useRef<number>(Date.now());

  const resetTimer = useCallback((force = false) => {
    const now = Date.now();
    // Throttling à 30 secondes pour éviter de détruire/recréer le timer sur chaque pixel de scroll/mousemove
    if (!force && now - lastResetRef.current < 30_000) {
      return;
    }
    lastResetRef.current = now;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (session) {
      timeoutRef.current = setTimeout(() => {
        signOut({ callbackUrl: "/login?reason=timeout" });
      }, timeoutMs);
    }
  }, [session, timeoutMs]);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    if (session) {
      // Initialiser le timer immédiatement
      resetTimer(true);

      const handleEvent = () => resetTimer(false);

      events.forEach((event) => {
        window.addEventListener(event, handleEvent, { passive: true });
      });

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        events.forEach((event) => {
          window.removeEventListener(event, handleEvent);
        });
      };
    }
  }, [session, resetTimer]);

  return null;
}
