"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import SessionTimeout from "@/components/SessionTimeout";
import PwaInstallBanner from "@/components/pwa/pwa-install-banner";
import CapacitorNativeBridge from "@/components/capacitor/CapacitorNativeBridge";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CapacitorNativeBridge />
      <SessionTimeout timeoutMs={30 * 60 * 1000} /> {/* 30 minutes d'inactivité */}
      {children}
      <PwaInstallBanner />
    </SessionProvider>
  );
}
