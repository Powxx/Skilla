import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getQualiopiData } from "@/app/actions/qualiopi";
import { isQualiopiEnabled } from "@/lib/qualiopi";
import QualiopiClient from "./qualiopi-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Qualiopi — Satisfaction & Réclamations",
};

export default async function QualiopiPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const enabled = await isQualiopiEnabled();
  if (!enabled) {
    redirect("/admin");
  }

  const { complaints, surveys, campaigns, classes } = await getQualiopiData();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <nav className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">
          <Link href="/admin" className="hover:text-slate-600 transition-colors">Admin</Link>
          <span className="mx-2 text-slate-300">/</span>
          <Link href="/admin/dashboard" className="hover:text-slate-600 transition-colors">Tour de contrôle</Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-800">Qualiopi</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900 sm:text-3xl">
            Qualiopi — Satisfaction & Réclamations
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Diffusez des enquêtes de satisfaction et suivez les indicateurs qualité.
          </p>
        </header>
        <QualiopiClient
          complaints={complaints as any}
          surveys={surveys as any}
          campaigns={campaigns as any}
          classes={classes}
        />
      </div>
    </div>
  );
}
