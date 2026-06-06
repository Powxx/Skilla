import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    const role = (session.user as any).role;
    if (role === 'STUDENT') redirect('/student/dashboard');
    if (role === 'TEACHER') redirect('/prof');
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') redirect('/admin');
    if (role === 'COMPANY_TUTOR') redirect('/employer');
    if (role === 'RESPONSIBLE') redirect('/parent');
    redirect('/login');
  }

  redirect('/login');
}
