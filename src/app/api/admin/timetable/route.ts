import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { TimetableService, TimetableConflictError } from '@/lib/services/timetableService';

const timetableSchema = z.object({
  id: z.string().uuid().optional(),
  sectionId: z.string().uuid({ message: 'ID de sección requerido en formato UUID' }),
  subjectId: z.string().uuid({ message: 'ID de materia requerido en formato UUID' }),
  teacherId: z.string().uuid({ message: 'ID de docente requerido en formato UUID' }),
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Formato de hora HH:mm requerido'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Formato de hora HH:mm requerido'),
  classroom: z.string().optional(),
  isOnline: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const parsedData = timetableSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: parsedData.error.flatten() },
        { status: 400 }
      );
    }

    const service = new TimetableService(supabase);
    const result = await service.upsertTimetableEntry(parsedData.data);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof TimetableConflictError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor al procesar horario' },
      { status: 500 }
    );
  }
}
