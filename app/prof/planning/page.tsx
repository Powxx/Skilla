import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import PlanningClient from "@/components/planning-client";

export const metadata = {
  title: "Mon Planning — Professeur",
};

export default async function ProfPlanningPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl mb-8">
        Mon Planning
      </h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.04]">
        <PlanningClient teacherId={session.user.id} />
      </div>
    </div>
  );
}
