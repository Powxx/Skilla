import pathlib

p = pathlib.Path(r"C:\Users\rosse\OneDrive\Bureau\Prog\Skilla\components\student\grades-body.tsx")
old = p.read_text(encoding="utf-8")

new = old.replace(
    "type Props = {\n  student: User & {\n    class: Class | null;\n    grades: Grade[];\n    reportCards: ReportCardLite[];\n  };\n  subjectsFromDb: SubjectLite[];\n  /** Bandeau informatif (ex. consultation parent). */\n  contextNote?: string;\n  reportCardsVisible?: boolean;\n};\n\nexport default function GradesBody({\n  student,\n  subjectsFromDb,\n  contextNote,\n  reportCardsVisible = true,\n}: Props) {\n  const subjectByExactName = new Map(\n    subjectsFromDb.map((s) => [s.name.trim(), s] as const),\n  );\n\n  const grades = student.grades;\n  const generalAvg = weightedAverage(grades.map((g) => g));",
    "type SemesterLite = {\n  id: string;\n  name: string;\n};\n\ntype Props = {\n  student: User & {\n    class: Class | null;\n    grades: (Grade & { semester?: { name: string } | null })[];\n    reportCards: ReportCardLite[];\n  };\n  subjectsFromDb: SubjectLite[];\n  semesters: SemesterLite[];\n  /** Bandeau informatif (ex. consultation parent). */\n  contextNote?: string;\n  reportCardsVisible?: boolean;\n};\n\nexport default function GradesBody({\n  student,\n  subjectsFromDb,\n  semesters,\n  contextNote,\n  reportCardsVisible = true,\n}: Props) {\n  const [selectedSemesterId, setSelectedSemesterId] = useState(\n    semesters[0]?.id || \"\"\n  );\n\n  const subjectByExactName = new Map(\n    subjectsFromDb.map((s) => [s.name.trim(), s] as const),\n  );\n\n  // Filter grades and report cards by selected semester\n  const grades = selectedSemesterId\n    ? student.grades.filter((g) => g.semesterId === selectedSemesterId)\n    : student.grades;\n  const filteredReportCards = selectedSemesterId\n    ? student.reportCards.filter((rc) => rc.semesterId === selectedSemesterId)\n    : student.reportCards;\n\n  const generalAvg = weightedAverage(grades.map((g) => g));"
)

# Update header insert
new = new.replace(
    "        </p>\n      </header>\n\n      {grades.length === 0 ? (",
    "        </p>\n\n        {/* Semester selector */}\n        {semesters.length > 1 && (\n          <div className=\"mt-4 flex items-center gap-2\">\n            <label className=\"text-[10px] font-black uppercase tracking-widest text-slate-400\">\n              Semestre :\n            </label>\n            <select\n              className=\"rounded-xl border-slate-200 text-sm font-bold focus:ring-slate-900 focus:border-slate-900 h-10\"\n              value={selectedSemesterId}\n              onChange={(e) => setSelectedSemesterId(e.target.value)}\n            >\n              {semesters.map((s) => (\n                <option key={s.id} value={s.id}>\n                  {s.name}\n                </option>\n              ))}\n            </select>\n          </div>\n        )}\n      </header>\n\n      {grades.length === 0 ? ("
)

# Update report cards usage
new = new.replace(
    "          {reportCardsVisible && student.reportCards && student.reportCards.length > 0 && (\n            <section className=\"mb-10 animate-in fade-in slide-in-from-top-4 duration-700\">\n               <h2 className=\"mb-4 text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2\">\n                 <span className=\"h-2 w-2 rounded-full bg-blue-600\"></span>\n                 Bilan du dernier bulletin\n               </h2>",
    "          {reportCardsVisible && filteredReportCards.length > 0 && (\n            <section className=\"mb-10 animate-in fade-in slide-in-from-top-4 duration-700\">\n               <h2 className=\"mb-4 text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2\">\n                 <span className=\"h-2 w-2 rounded-full bg-blue-600\"></span>\n                 Bulletin du semestre\n               </h2>"
)

# Update report card content
new = new.replace(
    "                      &quot;{student.reportCards[0].generalAppraisal}&quot;\n                    </p>\n                    {student.reportCards[0].distinction && (",
    "                      &quot;{filteredReportCards[0].generalAppraisal}&quot;\n                    </p>\n                    {filteredReportCards[0].semester && (\n                      <p className=\"mt-2 text-xs text-slate-400\">\n                        {filteredReportCards[0].semester.name}\n                      </p>\n                    )}\n                    {filteredReportCards[0].distinction && ("
)

# Update synthesis section with semester info
new = new.replace(
    "                  matière(s)\n                </li>\n              </ul>",
    "                  matière(s)\n                </li>\n                <li>\n                  Semestre : <span className=\"font-medium text-slate-800\">{semesters.find((s) => s.id === selectedSemesterId)?.name || \"Tous\"}</span>\n                </li>\n              </ul>"
)

# Update detail section title
new = new.replace(
    '              Détail des notes\n            </h2>',
    '              Détail des notes{selectedSemesterId && ` — ${semesters.find((s) => s.id === selectedSemesterId)?.name || ""}`}\n            </h2>'
)

# Update message when no grades
new = new.replace(
    "          Aucune note enregistrée pour cet élève.\n",
    "          Aucune note enregistrée pour ce semestre.\n"
)

p.write_text(new, encoding="utf-8")
print(f"Patched {p}")
print("Counting grades-body replacements done.")
