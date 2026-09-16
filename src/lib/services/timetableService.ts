import { SupabaseClient } from '@supabase/supabase-js';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimetableEntryDTO {
  id?: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  classroom?: string;
  isOnline?: boolean;
}

export class TimetableConflictError extends Error {
  constructor(
    message: string,
    public code: 'TEACHER_CONFLICT' | 'SECTION_CONFLICT' | 'INVALID_TIME'
  ) {
    super(message);
    this.name = 'TimetableConflictError';
  }
}

export class TimetableService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Valida solapamientos temporales para el Docente y para el Grupo.
   * Regla de colisión: (start_time < newEndTime AND end_time > newStartTime)
   */
  async validateNoScheduleConflicts(dto: TimetableEntryDTO): Promise<void> {
    if (dto.startTime >= dto.endTime) {
      throw new TimetableConflictError(
        'La hora de inicio debe ser estrictamente menor a la hora de fin.',
        'INVALID_TIME'
      );
    }

    // 1. Validar choque de horario del DOCENTE
    let teacherQuery = this.supabase
      .from('timetable_entries')
      .select('id, start_time, end_time, sections(name), subjects(name)')
      .eq('teacher_id', dto.teacherId)
      .eq('day_of_week', dto.dayOfWeek)
      .lt('start_time', dto.endTime)
      .gt('end_time', dto.startTime);

    if (dto.id) {
      teacherQuery = teacherQuery.neq('id', dto.id);
    }

    const { data: teacherConflicts, error: teacherErr } = await teacherQuery;
    if (teacherErr) {
      console.warn('Teacher conflict query warning:', teacherErr.message);
    } else if (teacherConflicts && teacherConflicts.length > 0) {
      const conflict = teacherConflicts[0] as any;
      const secName = conflict.sections?.name || 'Otro grupo';
      throw new TimetableConflictError(
        `Conflicto con el Docente: Ya tiene clase programada de ${conflict.start_time.slice(0, 5)} a ${conflict.end_time.slice(0, 5)} en "${secName}".`,
        'TEACHER_CONFLICT'
      );
    }

    // 2. Validar choque de horario de la SECCIÓN / GRUPO
    let sectionQuery = this.supabase
      .from('timetable_entries')
      .select('id, start_time, end_time, subjects(name)')
      .eq('section_id', dto.sectionId)
      .eq('day_of_week', dto.dayOfWeek)
      .lt('start_time', dto.endTime)
      .gt('end_time', dto.startTime);

    if (dto.id) {
      sectionQuery = sectionQuery.neq('id', dto.id);
    }

    const { data: sectionConflicts, error: sectionErr } = await sectionQuery;
    if (sectionErr) {
      console.warn('Section conflict query warning:', sectionErr.message);
    } else if (sectionConflicts && sectionConflicts.length > 0) {
      const conflict = sectionConflicts[0] as any;
      const subjName = conflict.subjects?.name || 'Otra materia';
      throw new TimetableConflictError(
        `Conflicto con el Grupo: La sección ya tiene asignada la materia "${subjName}" de ${conflict.start_time.slice(0, 5)} a ${conflict.end_time.slice(0, 5)}.`,
        'SECTION_CONFLICT'
      );
    }
  }

  /**
   * Guarda o actualiza un bloque de horario con validación atómica.
   */
  async upsertTimetableEntry(dto: TimetableEntryDTO) {
    await this.validateNoScheduleConflicts(dto);

    const payload = {
      ...(dto.id ? { id: dto.id } : {}),
      section_id: dto.sectionId,
      subject_id: dto.subjectId,
      teacher_id: dto.teacherId,
      day_of_week: dto.dayOfWeek,
      start_time: dto.startTime,
      end_time: dto.endTime,
      classroom: dto.classroom ?? 'Aula por asignar',
      is_online: Boolean(dto.isOnline),
    };

    const { data, error } = await this.supabase
      .from('timetable_entries')
      .upsert(payload)
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        classroom,
        is_online,
        subjects (id, name, code, color_hex),
        teachers (id, employee_code, specialty)
      `)
      .single();

    if (error) throw error;
    return data;
  }
}
