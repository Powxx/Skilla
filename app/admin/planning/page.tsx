import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import AdminPlanningClient from "./admin-planning-client";

export const metadata = {
  title: "Gestion du Planning — Admin",
};

export default async function AdminPlanningPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  // Load data for the dropdowns
  const classes = await prisma.class.findMany({ select: { id: true, name: true }});
  const teachers = await prisma.user.findMany({ 
    where: { role: "TEACHER" },
    select: { id: true, firstName: true, lastName: true }
  });
  const subjects = await prisma.subject.findMany({ select: { id: true, name: true }});

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl mb-8">
        Gestion du Planning & Affectation des Cours
      </h1>
      
      <AdminPlanningClient 
        classes={classes} 
        teachers={teachers} 
        subjects={subjects} 
      />
    </div>
  );
}
