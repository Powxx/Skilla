import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import GradesBody from "@/components/student/grades-body";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Mes notes",
};

export default async function StudentGradesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [student, subjectsFromDb] = await Promise.all([
    prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true,
        class: true,
        grades: {
          orderBy: [{ date: "desc" }],
        },
      },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!student) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-slate-600">
        <p className="font-medium text-slate-900">Aucun profil élève lié à ce compte.</p>
        <p className="mt-2 text-sm">
          Si vous êtes élève et que ce message persiste, contactez l&apos;administration.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-sky-800 underline">
          Retour au site
        </Link>
      </div>
    );
  }

  return <GradesBody student={student} subjectsFromDb={subjectsFromDb} />;
}
