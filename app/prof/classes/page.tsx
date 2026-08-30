import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { getClassStudentsData, getTeacherClasses } from "@/lib/classes-data";
import ClassSelector from "@/components/portal/class-selector";
import ClassPdfExport from "@/components/portal/class-pdf-export";
import { 
  Users, 
  GraduationCap, 
  Clock, 
  GraduationCap as GradCapIcon,
  BookOpen,
  MessageSquare
} from "lucide-react";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Classes — Professeur",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function ProfClassesPage(props: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const rawClassId = searchParams?.classId;
  const classId = Array.isArray(rawClassId) ? rawClassId[0] : rawClassId;

  // Fetch only classes that the teacher possesses (teaches lessons in)
  const teacherClasses = await getTeacherClasses(session.user.id);

  // Validate that the selected class belongs to the teacher
  const isAuthorizedClass = classId ? teacherClasses.some(c => c.id === classId) : false;
  const validClassId = isAuthorizedClass ? classId : undefined;

  const classData = validClassId ? await getClassStudentsData(validClassId) : null;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 pb-12 animate-in fade-in duration-500">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumbs */}
        <nav className="mb-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Link href="/" className="hover:text-slate-700 transition-colors">
            Accueil
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <Link href="/prof" className="hover:text-slate-700 transition-colors">
            Professeur
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-800">Classes</span>
        </nav>

        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                <BookOpen className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase tracking-widest">
                Mes Classes
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-11">
              Consulter les effectifs et données des élèves par classe
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {classData && (
              <ClassPdfExport className={classData.className} targetId="class-report-content" />
            )}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm min-w-[240px]">
              <ClassSelector classes={teacherClasses} selectedClassId={validClassId} baseUrl="/prof/classes" />
            </div>
          </div>
        </header>

        {classId && !isAuthorizedClass ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs font-bold mb-6">
            Vous n'êtes pas autorisé à accéder aux informations de cette classe, ou vous n'y enseignez pas.
          </div>
        ) : null}

        {classData ? (
          <div id="class-report-content" className="space-y-8 p-4 bg-white/40 rounded-3xl border border-slate-100">
            {/* KPI Cards (3 cards for prof: Effectif, Moyenne, Présence) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Effectif</p>
                  <p className="text-xl font-black text-slate-950 mt-1">{classData.stats.totalStudents}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">élèves actifs</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Moyenne Classe</p>
                  <p className="text-xl font-black text-slate-950 mt-1">
                    {classData.stats.classAverage !== null ? `${classData.stats.classAverage}/20` : "N/A"}
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Moyenne générale du semestre</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform duration-300">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Présence</p>
                  <p className="text-xl font-black text-slate-950 mt-1">{classData.stats.attendanceRate}%</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Taux de présence global</p>
                </div>
              </div>
            </div>

            {/* Students Table (without Coordonnées column) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-950/[0.02]">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  Liste des Élèves — {classData.className}
                </h3>
                <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  Semestre Actif
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white">
                      <th scope="col" className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[9px]">
                        Élève
                      </th>
                      <th scope="col" className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[9px]">
                        Moyenne
                      </th>
                      <th scope="col" className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[9px]">
                        Points Conduite
                      </th>
                      <th scope="col" className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[9px]">
                        Assiduité (Abs. / Ret.)
                      </th>
                      <th scope="col" className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[9px] text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {classData.students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                          Aucun élève actif trouvé dans cette classe.
                        </td>
                      </tr>
                    ) : (
                      classData.students.map((student) => {
                        let avgColor = "text-slate-500 bg-slate-50 border-slate-100";
                        let progressColor = "bg-slate-200";
                        if (student.average !== null) {
                          if (student.average >= 14) {
                            avgColor = "text-emerald-700 bg-emerald-50 border-emerald-100/50";
                            progressColor = "bg-emerald-500";
                          } else if (student.average >= 10) {
                            avgColor = "text-blue-700 bg-blue-50 border-blue-100/50";
                            progressColor = "bg-blue-500";
                          } else {
                            avgColor = "text-rose-700 bg-rose-50 border-rose-100/50";
                            progressColor = "bg-rose-500";
                          }
                        }

                        let conductColor = "text-emerald-700 bg-emerald-50 border-emerald-100/50";
                        if (student.conductPoints <= 50) {
                          conductColor = "text-rose-700 bg-rose-50 border-rose-100/50";
                        } else if (student.conductPoints <= 80) {
                          conductColor = "text-amber-700 bg-amber-50 border-amber-100/50";
                        }

                        const initials = `${student.lastName?.[0] || ""}${student.firstName?.[0] || ""}`.toUpperCase();

                        return (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 border border-slate-200">
                                  {initials || "👨"}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                    {student.lastName} <span className="font-normal text-slate-600">{student.firstName}</span>
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">ID: {student.id.substring(0, 8)}...</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              {student.average !== null ? (
                                <div className="flex flex-col gap-1 w-24">
                                  <span className={`inline-flex self-start px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-tighter ${avgColor}`}>
                                    {student.average.toFixed(2)}/20
                                  </span>
                                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${progressColor}`} style={{ width: `${(student.average / 20) * 100}%` }}></div>
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 border border-slate-100 text-slate-400 uppercase tracking-tighter">
                                  Pas de notes
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-black border tracking-tight ${conductColor}`}>
                                {student.conductPoints} / 100
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {student.absencesCount > 0 ? (
                                  <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-black text-rose-700 border border-rose-100/50 uppercase tracking-tighter">
                                    {student.absencesCount} abs.
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 border border-emerald-100/50 uppercase tracking-tighter">
                                    0 abs.
                                  </span>
                                )}
                                
                                {student.excusedCount > 0 && (
                                  <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 border border-slate-200/50 uppercase tracking-tighter">
                                    {student.excusedCount} just.
                                  </span>
                                )}

                                {student.latesCount > 0 && (
                                  <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700 border border-amber-100/50 uppercase tracking-tighter">
                                    {student.latesCount} ret.
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <Link
                                  href={`/messages?userId=${student.id}`}
                                  title="Contacter l'élève"
                                  className="inline-flex items-center justify-center p-1.5 bg-slate-50 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 rounded-xl text-slate-400 hover:text-blue-600 transition"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Link>
                                <Link
                                  href={`/prof/notes?classId=${classData.classId}`}
                                  title="Gérer les notes de la classe"
                                  className="inline-flex items-center justify-center p-1.5 bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 rounded-xl text-slate-400 hover:text-emerald-600 transition"
                                >
                                  <GradCapIcon className="h-4 w-4" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm max-w-xl mx-auto mt-8 flex flex-col items-center">
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <BookOpen className="h-8 w-8" />
            </div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">
              Aucune classe sélectionnée
            </h2>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed max-w-sm">
              Sélectionnez une de vos classes dans le menu déroulant ci-dessus pour afficher la liste des élèves correspondants, leurs moyennes, points de conduite et assiduité.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
