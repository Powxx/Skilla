"use client";

import { Suspense } from "react";
import PortalHeader, { type PortalParentChild } from "./portal-header";

type Props = {
  variant: "prof" | "student" | "parent";
  parentChildren?: PortalParentChild[];
};

/** Enveloppe `Suspense` requise pour `useSearchParams` dans Next.js. */
export default function PortalHeaderShell(props: Props) {
  const fallback = (
    <div
      aria-hidden
      className="h-24 animate-pulse border-b border-slate-200 bg-white"
    />
  );
  return (
    <Suspense fallback={fallback}>
      <PortalHeader {...props} />
    </Suspense>
  );
}
