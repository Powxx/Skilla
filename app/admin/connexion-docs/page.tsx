import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import ConnexionDocsClient from "./connexion-docs-client";

export default async function ConnexionDocsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) redirect("/login");

  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { lastName: 'asc' }
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Générateur de documents de connexion</h1>
      <ConnexionDocsClient users={users} />
    </div>
  );
}
