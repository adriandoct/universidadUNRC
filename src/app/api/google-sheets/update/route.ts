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

export async function POST(req: NextRequest) {
  try {
    const body: GoogleSheetUpdatePayload = await req.json();

    if (!body.sheetId || !body.records || !Array.isArray(body.records)) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (sheetId o records)' },
        { status: 400 }
      );
    }

    const targetWebhook =
      body.webhookUrl ||
      process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
      process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBHOOK_URL;

    let webhookResponseStatus: number | null = null;
    let webhookResponseBody: any = null;
    let webhookCalled = false;

    if (targetWebhook && targetWebhook.startsWith('http')) {
      webhookCalled = true;
      try {
        const response = await fetch(targetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          // Google Apps Script usually returns 302 redirect
          redirect: 'follow',
        });
        webhookResponseStatus = response.status;
        try {
          webhookResponseBody = await response.json();
        } catch (_) {
          webhookResponseBody = await response.text();
        }
      } catch (webhookErr: any) {
        console.warn('Google Sheets Webhook dispatch notice:', webhookErr?.message);
        webhookResponseBody = { error: webhookErr?.message || 'Error de conexión con Webhook' };
      }
    }

    // Retornamos un resumen completo de la actualización
    const presentCount = body.records.filter((r) => r.estadoAsistencia === 'present').length;
    const lateCount = body.records.filter((r) => r.estadoAsistencia === 'late').length;
    const absentCount = body.records.filter((r) => r.estadoAsistencia === 'absent').length;
    const partCount = body.records.filter((r) => r.participacion !== 'NINGUNA').length;

    // Generar formato de texto tabular / CSV listo para pegar en Google Sheets
    const copyableRows = body.records.map((r) => r.codigo).join('\n');

    return NextResponse.json({
      success: true,
      message: `Actualización de asistencia y participación para "${body.materia}" procesada exitosamente.`,
      sheetId: body.sheetId,
      sheetUrl: body.sheetUrl || `https://docs.google.com/spreadsheets/d/${body.sheetId}/edit?gid=0#gid=0`,
      fecha: body.fecha,
      fechaColumna: body.fechaColumna || body.fecha,
      totalAlumnos: body.records.length,
      presentes: presentCount,
      retardos: lateCount,
      faltas: absentCount,
      participaciones: partCount,
      copyableColumn: copyableRows,
      webhookCalled,
      webhookStatus: webhookResponseStatus,
      webhookResponse: webhookResponseBody,
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
