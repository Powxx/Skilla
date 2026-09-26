import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { isQualiopiEnabled } from "@/lib/qualiopi";
import { getQualiopiAuditReport } from "@/app/actions/qualiopi-audit";
import QualiopiAutoPilotClient from "@/components/qualiopi/QualiopiAutoPilotClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit & Preuves Qualiopi — Administration",
  description: "Générateur automatique du dossier de preuves pour l'audit Qualiopi.",
};

export default async function AdminQualiopiAuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const enabled = await isQualiopiEnabled();
  if (!enabled) {
    redirect("/admin");
  }

  const res = await getQualiopiAuditReport();
  if (!res.ok) {
    return (
      <div className="p-8 text-center text-slate-500 font-sans">
        <p className="text-red-600 font-bold mb-2">Erreur : {res.error}</p>
        <Link href="/admin/qualiopi" className="text-blue-600 underline text-xs">
          Retour au module Qualiopi
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">
          <Link href="/admin" className="hover:text-slate-600 transition-colors">Admin</Link>
          <span className="mx-2 text-slate-300">/</span>
          <Link href="/admin/qualiopi" className="hover:text-slate-600 transition-colors">Qualiopi</Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-800">Dossier d'Audit RNQ</span>
        </nav>

        <QualiopiAutoPilotClient auditData={res.data} />
      </div>
    </div>
  );
}
