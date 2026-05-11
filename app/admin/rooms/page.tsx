import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import RoomsClient from "./rooms-client";
import Link from "next/link";

export const metadata = {
  title: "Salles de Classe — Administration",
};

export default async function AdminRoomsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || (String(session.user.role) !== "ADMIN" && String(session.user.role) !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const rooms = await prisma.room.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/" className="font-medium hover:text-slate-700">Accueil</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <Link href="/admin" className="font-medium hover:text-slate-700">Admin</Link>
          <span aria-hidden className="mx-2 text-slate-300">/</span>
          <span className="text-slate-900">Salles de classe</span>
        </nav>

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Salles de Classe
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Gérez les locaux de l'établissement pour l'affectation des cours.
            </p>
          </div>
        </header>

        <RoomsClient initialRooms={rooms} />
      </div>
    </div>
  );
}
