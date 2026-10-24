import { NextRequest, NextResponse } from 'next/server';
import { OFFICIAL_GOOGLE_SHEETS_REGISTRY, HOSPEDAJE_STUDENTS_OFFICIAL, LAC_STUDENTS_OFFICIAL } from '@/lib/googleSheetsSync';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedCourseId = searchParams.get('courseId') || 'all';

    const coursesToSync = requestedCourseId === 'all'
      ? OFFICIAL_GOOGLE_SHEETS_REGISTRY
      : OFFICIAL_GOOGLE_SHEETS_REGISTRY.filter((c) => c.id === requestedCourseId);

    if (coursesToSync.length === 0) {
      return NextResponse.json(
        { error: `No se encontró configuración para el curso: ${requestedCourseId}` },
        { status: 404 }
      );
    }

    const results = [];

    for (const config of coursesToSync) {
      let liveCsv: string | null = null;
      let isLive = false;

      try {
        const response = await fetch(config.csvExportUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          next: { revalidate: 60 }, // Cache up to 1 minute
        });

        if (response.ok) {
          const text = await response.text();
          // If response starts with HTML login, it's not public
          if (!text.trim().startsWith('<!DOCTYPE html') && !text.includes('<html')) {
            liveCsv = text;
            isLive = true;
          }
        }
      } catch (err: any) {
        console.warn(`Could not fetch live CSV for ${config.id}:`, err?.message);
      }

      if (isLive && liveCsv) {
        // Parse CSV lines
        const lines = liveCsv
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length > 1) {
          // Parse Header (Line 0)
          const headerCols = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
          // Columns 2 onwards are dates (Col 0: index/blank, Col 1: 'Nombre')
          const parsedDates = headerCols.slice(2).filter(Boolean);

          // Parse Students (Lines 1..)
          const parsedStudents = [];
          for (let i = 1; i < lines.length; i++) {
            const rowCols = lines[i].split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());
            const num = parseInt(rowCols[0], 10) || i;
            const rawName = rowCols[1] || '';
            if (!rawName) continue;

            const records = rowCols.slice(2);
            parsedStudents.push({
              num,
              rawName,
              records,
            });
          }

          results.push({
            courseId: config.id,
            materia: config.materia,
            grupo: config.grupo,
            sheetId: config.sheetId,
            sheetUrl: config.sheetUrl,
            source: 'google_sheets_live',
            totalStudents: parsedStudents.length,
            dates: parsedDates.length > 0 ? parsedDates : config.classDates,
            students: parsedStudents,
          });
          continue;
        }
      }

      // Fallback to verified official embedded dataset
      if (config.id === 'hospedaje') {
        results.push({
          courseId: config.id,
          materia: config.materia,
          grupo: config.grupo,
          sheetId: config.sheetId,
          sheetUrl: config.sheetUrl,
          source: 'embedded_official_dataset',
          totalStudents: HOSPEDAJE_STUDENTS_OFFICIAL.length,
          dates: config.classDates,
          students: HOSPEDAJE_STUDENTS_OFFICIAL.map((s) => ({
            num: s.num,
            rawName: s.rawName,
            records: s.records,
          })),
        });
      } else if (config.id === 'lac_matematicas') {
        results.push({
          courseId: config.id,
          materia: config.materia,
          grupo: config.grupo,
          sheetId: config.sheetId,
          sheetUrl: config.sheetUrl,
          source: 'embedded_official_dataset',
          totalStudents: LAC_STUDENTS_OFFICIAL.length,
          dates: config.classDates,
          students: LAC_STUDENTS_OFFICIAL.map((s) => ({
            num: s.num,
            rawName: s.rawName,
            records: s.records,
          })),
        });
      } else {
        results.push({
          courseId: config.id,
          materia: config.materia,
          grupo: config.grupo,
          sheetId: config.sheetId,
          sheetUrl: config.sheetUrl,
          source: 'embedded_official_dataset',
          totalStudents: 6,
          dates: config.classDates,
          students: [],
        });
      }
    }

    return NextResponse.json({
      success: true,
      coursesCount: results.length,
      data: requestedCourseId === 'all' ? results : results[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in /api/google-sheets/fetch-live:', error);
    return NextResponse.json(
      { error: 'Error al consultar hojas de cálculo de Google', detalle: error?.message },
      { status: 500 }
    );
  }
}
