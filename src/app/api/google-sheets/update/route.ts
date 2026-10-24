import { NextRequest, NextResponse } from 'next/server';

export interface GoogleSheetUpdatePayload {
  sheetId: string;
  sheetUrl?: string;
  materia: string;
  grupo: string;
  fecha: string;
  fechaColumna?: string;
  docenteNombre?: string;
  records: Array<{
    num?: number;
    nombre: string;
    matricula: string;
    codigo: string; // 'A', 'Ap', 'App', 'R', 'Rp', 'Rpp', 'F', 'J'
    estadoAsistencia: string; // 'present', 'late', 'absent', 'excused'
    participacion: string; // 'AP', 'RP', 'REGULAR', 'NINGUNA'
    puntos?: number;
    observaciones?: string;
  }>;
  webhookUrl?: string;
}

export interface BatchGoogleSheetUpdatePayload {
  courses?: GoogleSheetUpdatePayload[];
  webhookUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody: any = await req.json();

    // Check if this is a batch request of multiple courses
    const coursesList: GoogleSheetUpdatePayload[] = Array.isArray(rawBody?.courses)
      ? rawBody.courses
      : rawBody?.sheetId && rawBody?.records
      ? [rawBody as GoogleSheetUpdatePayload]
      : [];

    if (coursesList.length === 0) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (sheetId o records o courses[])' },
        { status: 400 }
      );
    }

    const defaultWebhook =
      rawBody.webhookUrl ||
      process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
      process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL;

    const results = [];

    for (const course of coursesList) {
      const targetWebhook = course.webhookUrl || defaultWebhook;

      let webhookResponseStatus: number | null = null;
      let webhookResponseBody: any = null;
      let webhookCalled = false;

      if (targetWebhook && targetWebhook.startsWith('http')) {
        webhookCalled = true;
        try {
          const response = await fetch(targetWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(course),
            redirect: 'follow',
          });
          webhookResponseStatus = response.status;
          try {
            webhookResponseBody = await response.json();
          } catch (_) {
            webhookResponseBody = await response.text();
          }
        } catch (webhookErr: any) {
          console.warn(`Webhook error for ${course.materia}:`, webhookErr?.message);
          webhookResponseBody = { error: webhookErr?.message || 'Error de conexión con Webhook' };
        }
      }

      const records = course.records || [];
      const presentCount = records.filter((r) => r.estadoAsistencia === 'present' || r.codigo === 'A' || r.codigo.startsWith('A')).length;
      const lateCount = records.filter((r) => r.estadoAsistencia === 'late' || r.codigo.startsWith('R')).length;
      const absentCount = records.filter((r) => r.estadoAsistencia === 'absent' || r.codigo === 'F' || !r.codigo).length;
      const partCount = records.filter((r) => r.participacion !== 'NINGUNA' && r.participacion).length;
      const copyableRows = records.map((r) => r.codigo || '').join('\n');

      results.push({
        sheetId: course.sheetId,
        sheetUrl: course.sheetUrl || `https://docs.google.com/spreadsheets/d/${course.sheetId}/edit?gid=0#gid=0`,
        materia: course.materia,
        grupo: course.grupo,
        fecha: course.fecha,
        fechaColumna: course.fechaColumna || course.fecha,
        totalAlumnos: records.length,
        presentes: presentCount,
        retardos: lateCount,
        faltas: absentCount,
        participaciones: partCount,
        copyableColumn: copyableRows,
        webhookCalled,
        webhookStatus: webhookResponseStatus,
        webhookResponse: webhookResponseBody,
      });
    }

    if (results.length === 1) {
      const single = results[0];
      return NextResponse.json({
        success: true,
        message: `Actualización de asistencia y participación para "${single.materia}" procesada exitosamente.`,
        ...single,
        timestamp: new Date().toISOString(),
      });
    }

    const totalAlumnosOverall = results.reduce((sum, r) => sum + r.totalAlumnos, 0);

    return NextResponse.json({
      success: true,
      message: `Actualización procesada para ${results.length} materias oficiales (${totalAlumnosOverall} alumnos en total).`,
      coursesCount: results.length,
      totalAlumnos: totalAlumnosOverall,
      courses: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error en /api/google-sheets/update:', error);
    return NextResponse.json(
      { error: 'Error procesando actualización de Google Sheets', detalle: error?.message },
      { status: 500 }
    );
  }
}
