"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import SessionTimeout from "@/components/SessionTimeout";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionTimeout timeoutMs={30 * 60 * 1000} /> {/* 30 minutes d'inactivité */}
      {children}
    </SessionProvider>
  );
}
