import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import ImpersonateClient from "./impersonate-client";

export const metadata = {
  title: "Impersonnalisation — Admin",
};

export default async function AdminImpersonatePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  // Fetch all non-admin users
  const users = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" }
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
    orderBy: { lastName: 'asc' }
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl mb-4">
        Impersonnalisation
      </h1>
      <p className="text-slate-600 mb-8">
        Sélectionnez un utilisateur pour vous connecter en tant que lui et voir l'interface exactement comme il la voit.
      </p>
      
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.04] overflow-hidden">
        <ImpersonateClient users={users} />
      </div>
    </div>
  );
}
