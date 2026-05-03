// @ts-nocheck
async function generateLessonsForClass(classId: string, semesterId: string) {
    const classroom = await prisma.class.findUnique({ where: { id: classId } });
    const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
  
    if (!classroom || !semester) return;
  
    let currentDate = new Date(semester.startDate);
  
    while (currentDate <= semester.endDate) {
      // Vérifier si c'est une semaine de cours
      if (PlanningService.isLessonWeek(currentDate, semester.startDate, classroom.rhythm)) {
        
        // Exemple : Créer un cours de Math tous les lundis de 8h à 10h
        // On vérifie que ce n'est pas un week-end
        const day = currentDate.getDay();
        if (day === 1) { // Lundi
          await prisma.lesson.create({
            data: {
              startTime: new Date(currentDate.setHours(8, 0)),
              endTime: new Date(currentDate.setHours(10, 0)),
              classId: classroom.id,
              subjectId: "ID_MATH_ICI",
              teacherId: "ID_PROF_ICI",
            }
          });
        }
      }
      // Passer au jour suivant
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }
  }