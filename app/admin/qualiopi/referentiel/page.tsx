import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { isQualiopiEnabled } from "@/lib/qualiopi";
import QualiopiReferentielClient from "@/components/qualiopi/QualiopiReferentielClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Guide des 32 Indicateurs Qualiopi RNQ — Skilla",
  description: "Le guide ultime et exhaustif des 7 critères et 32 indicateurs pour réussir votre certification Qualiopi.",
};

export default async function AdminQualiopiReferentielPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const enabled = await isQualiopiEnabled();
  if (!enabled) {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">
          <Link href="/admin" className="hover:text-slate-600 transition-colors">Admin</Link>
          <span className="mx-2 text-slate-300">/</span>
          <Link href="/admin/qualiopi" className="hover:text-slate-600 transition-colors">Qualiopi</Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-800">Guide des 32 Indicateurs RNQ</span>
        </nav>

        <QualiopiReferentielClient />
      </div>
    </div>
  );
}
