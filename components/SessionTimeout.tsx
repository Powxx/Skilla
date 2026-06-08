"use client";

import { useEffect, useCallback, useRef } from "react";
import { signOut, useSession } from "next-auth/react";

/**
 * Composant pour gérer l'expiration de session après inactivité.
 * Par défaut : 30 minutes d'inactivité.
 */
export default function SessionTimeout({ timeoutMs = 30 * 60 * 1000 }: { timeoutMs?: number }) {
  const { data: session } = useSession();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
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
      // Initialiser le timer
      resetTimer();

      // Ajouter les écouteurs d'événements
      events.forEach((event) => {
        window.addEventListener(event, resetTimer);
      });
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session, resetTimer]);

  return null;
}
