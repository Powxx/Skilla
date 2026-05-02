import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import AbsencesBody from "@/components/student/absences-body";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Absences & retards",
};

export default async function StudentAbsencesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      class: true,
      attendances: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!student) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <p className="font-medium text-slate-900">Aucun profil élève lié à ce compte.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-sky-800 underline">
          Retour au site
        </Link>
      </div>
    );
  }

  return <AbsencesBody student={student} />;
}
