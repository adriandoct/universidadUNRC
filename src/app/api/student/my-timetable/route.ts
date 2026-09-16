import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export interface TimetableBlock {
  id: string;
  startTime: string;
  endTime: string;
  classroom: string;
  isOnline: boolean;
  subject: {
    id: string;
    code: string;
    name: string;
    colorHex: string;
  };
  teacher: {
    id: string;
    employeeCode: string;
    specialty?: string;
  };
}

export interface WeeklyTimetableResponse {
  student: {
    id: string;
    studentCode: string;
    section: {
      id: string;
      code: string;
      name: string;
      gradeLevel: string;
    };
  };
  schedule: {
    monday: TimetableBlock[];
    tuesday: TimetableBlock[];
    wednesday: TimetableBlock[];
    thursday: TimetableBlock[];
    friday: TimetableBlock[];
    saturday: TimetableBlock[];
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Buscar al estudiante en la tabla `students`
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        section_id,
        sections (
          id,
          code,
          name,
          grade_level
        )
      `)
      .eq('profile_id', user.id)
      .maybeSingle();

    let resolvedStudent = student;
    let resolvedSection = student?.sections as any;

    // Fallback: Si no está en `students`, buscar en `alumnos` por email o matrícula
    if (!resolvedStudent) {
      const userEmail = user.email || '';
      const { data: alumno } = await supabase
        .from('alumnos')
        .select('id, matricula, grupo, grado')
        .or(`matricula.ilike.${userEmail.split('@')[0]},id.eq.${user.id}`)
        .maybeSingle();

      if (alumno) {
        // Encontrar sección correspondiente al grupo del alumno
        const { data: sectionMatch } = await supabase
          .from('sections')
          .select('id, code, name, grade_level')
          .or(`code.ilike.${alumno.grupo},name.ilike.%${alumno.grupo}%`)
          .maybeSingle();

        resolvedStudent = {
          id: alumno.id,
          student_code: alumno.matricula,
          section_id: sectionMatch?.id || alumno.grupo,
          sections: sectionMatch || {
            id: alumno.grupo,
            code: alumno.grupo,
            name: `Grupo ${alumno.grupo}`,
            grade_level: alumno.grado,
          },
        } as any;
        resolvedSection = resolvedStudent?.sections;
      }
    }

    if (!resolvedStudent || !resolvedStudent.section_id) {
      return NextResponse.json(
        { error: 'El alumno no tiene un grupo o sección asignada.' },
        { status: 404 }
      );
    }

    // 3. Consultar los bloques de horario asociados a su sección
    const { data: entries, error: timetableError } = await supabase
      .from('timetable_entries')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        classroom,
        is_online,
        subjects (
          id,
          code,
          name,
          color_hex
        ),
        teachers (
          id,
          employee_code,
          specialty
        )
      `)
      .eq('section_id', resolvedStudent.section_id)
      .order('start_time', { ascending: true });

    if (timetableError) {
      console.warn('Timetable query notice:', timetableError.message);
    }

    // 4. Estructurar el JSON por días de la semana (Lunes a Sábado)
    const formattedSchedule: WeeklyTimetableResponse['schedule'] = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
    };

    if (entries && Array.isArray(entries)) {
      entries.forEach((entry: any) => {
        const dayKey = (entry.day_of_week || '').toLowerCase() as keyof typeof formattedSchedule;
        if (formattedSchedule[dayKey]) {
          formattedSchedule[dayKey].push({
            id: entry.id,
            startTime: (entry.start_time || '').slice(0, 5),
            endTime: (entry.end_time || '').slice(0, 5),
            classroom: entry.classroom || 'Aula por definir',
            isOnline: Boolean(entry.is_online),
            subject: {
              id: entry.subjects?.id || '',
              code: entry.subjects?.code || '',
              name: entry.subjects?.name || 'Materia sin asignar',
              colorHex: entry.subjects?.color_hex || '#3B82F6',
            },
            teacher: {
              id: entry.teachers?.id || '',
              employeeCode: entry.teachers?.employee_code || '',
              specialty: entry.teachers?.specialty || '',
            },
          });
        }
      });
    }

    const responsePayload: WeeklyTimetableResponse = {
      student: {
        id: resolvedStudent.id,
        studentCode: resolvedStudent.student_code,
        section: {
          id: resolvedSection?.id || '',
          code: resolvedSection?.code || '',
          name: resolvedSection?.name || '',
          gradeLevel: resolvedSection?.grade_level || '',
        },
      },
      schedule: formattedSchedule,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error al obtener el horario del estudiante' },
      { status: 500 }
    );
  }
}
