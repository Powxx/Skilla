import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import ImpersonateClient from "./impersonate-client";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Impersonnalisation — Admin",
};

export default async function AdminImpersonatePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Vérification des droits : l'administrateur général (isGeneralAdmin ou SUPER_ADMIN ou canImpersonate)
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { 
      id: true, 
      role: true, 
      isGeneralAdmin: true, 
      canImpersonate: true, 
      email: true, 
      username: true, 
      firstName: true, 
      lastName: true 
    }
  });

  const isGeneralAdmin = Boolean(
    currentUser?.isGeneralAdmin ||
    currentUser?.role === "SUPER_ADMIN" ||
    currentUser?.email?.toLowerCase() === "admin@skilla.edu" ||
    currentUser?.username?.toLowerCase() === "admin" ||
    (currentUser?.firstName?.toLowerCase() === "admin" && currentUser?.lastName?.toLowerCase()?.includes("general"))
  );

  const hasImpersonateRight = isGeneralAdmin || currentUser?.canImpersonate;

  if (!hasImpersonateRight) {
    redirect("/admin");
  }

  // L'administrateur général peut s'impersonnaliser dans TOUS les autres rôles (admins, profs, élèves, parents, tuteurs)
  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id },
      isActive: true
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
    orderBy: [{ role: 'asc' }, { lastName: 'asc' }]
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-slate-900">
          Impersonnalisation Globale
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          En tant qu'administrateur général, vous pouvez vous connecter sous l'identité de n'importe quel utilisateur dans tous les rôles pour auditer ou dépanner leur espace de travail.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/[0.04] overflow-hidden">
        <ImpersonateClient users={users} />
      </div>
    </div>
  );
}
