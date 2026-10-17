import type { Alumno, Asistencia, Participacion, EstadoAsistencia } from './db';

export const LAC_SHEET_ID = '1dlbgIr_vf1RANLT9c2NbjvpnKaGBp9rt8V_VdZN-7yM';
export const LAC_SHEET_GID = '0';
export const LAC_GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${LAC_SHEET_ID}/edit?gid=${LAC_SHEET_GID}#gid=${LAC_SHEET_GID}`;
export const LAC_CSV_EXPORT_URL = `https://docs.google.com/spreadsheets/d/${LAC_SHEET_ID}/export?format=csv&gid=${LAC_SHEET_GID}`;

export const LAC_COURSE_INFO = {
  courseId: 'course-phlac-203-tij-matematicas',
  grupo: 'PHLAC-203-TIJ',
  materia: 'Matemáticas para la Administración',
  carrera: 'Licenciatura en Administración',
  carreraId: 'c5555555-5555-5555-5555-555555555555',
  sedeId: 'sede-tij',
  sedeNombre: 'Campus Tijuana',
  docenteNombre: 'Dr. Adrian Silva',
  docenteId: 'DOC-UNRC-03',
  ciclo: '2026-2',
};

// Fechas oficiales de las 11 clases registradas en la Hoja de Cálculo
export const LAC_CLASS_DATES = [
  '2026-09-02', // 02-09-26 (Miércoles)
  '2026-09-05', // 05-09 (Sábado)
  '2026-09-09', // 09 09 (Miércoles)
  '2026-09-12', // 12 sep (Sábado)
  '2026-09-19', // 19 sep (Sábado)
  '2026-09-23', // 23 sep (Miércoles)
  '2026-09-26', // 26 sep (Sábado)
  '2026-09-30', // 30 sep (Miércoles)
  '2026-10-03', // 3 oct (Sábado)
  '2026-10-07', // 7 oct (Miércoles)
  '2026-10-10', // 10 oct (Sábado)
];

export interface LacStudentRaw {
  num: number;
  rawName: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  matricula: string;
  records: string[]; // 11 entries corresponding to LAC_CLASS_DATES
}

export const LAC_STUDENTS_OFFICIAL: LacStudentRaw[] = [
  {
    num: 1,
    rawName: 'Gabriela Erandi Capilla Manuel',
    nombre: 'Gabriela Erandi',
    apellidoPaterno: 'Capilla',
    apellidoMaterno: 'Manuel',
    matricula: 'LAC-2026-001',
    records: ['A', 'Ap', 'Ap', 'Ap', 'Ap', 'Ap', 'Ap', 'App', 'A', '', 'Ap'],
  },
  {
    num: 2,
    rawName: 'Angélica Altamirano Solórzano',
    nombre: 'Angélica',
    apellidoPaterno: 'Altamirano',
    apellidoMaterno: 'Solórzano',
    matricula: 'LAC-2026-002',
    records: ['A', 'Ap', 'A', 'Ap', 'Ap', 'Ap', 'Ap', 'App', 'A', 'A', 'Ap'],
  },
  {
    num: 3,
    rawName: 'Magali Arce Garcia',
    nombre: 'Magali',
    apellidoPaterno: 'Arce',
    apellidoMaterno: 'Garcia',
    matricula: 'LAC-2026-003',
    records: ['A', '', 'Rp', 'A', 'A', 'Ap', 'Ap', 'A', 'A', 'App', 'A'],
  },
  {
    num: 4,
    rawName: 'Michell Evelin Cruz Alcantara',
    nombre: 'Michell Evelin',
    apellidoPaterno: 'Cruz',
    apellidoMaterno: 'Alcantara',
    matricula: 'LAC-2026-004',
    records: ['A', 'A', 'Ap', 'A', 'A', 'Ap', 'A', 'App', 'A', '', ''],
  },
  {
    num: 5,
    rawName: 'Michel Monserrat De anda Montalvo',
    nombre: 'Michel Monserrat',
    apellidoPaterno: 'De anda',
    apellidoMaterno: 'Montalvo',
    matricula: 'LAC-2026-005',
    records: ['A', '', '', 'A', 'A', '', 'A', 'App', '', 'A', 'A'],
  },
  {
    num: 6,
    rawName: 'Samuel Anthony De la cruz López',
    nombre: 'Samuel Anthony',
    apellidoPaterno: 'De la cruz',
    apellidoMaterno: 'López',
    matricula: 'LAC-2026-006',
    records: ['A', '', '', '', '', 'R', '', 'R', '', 'Ap', ''],
  },
  {
    num: 7,
    rawName: 'Espinosa Aguilar Estefanía',
    nombre: 'Estefanía',
    apellidoPaterno: 'Espinosa',
    apellidoMaterno: 'Aguilar',
    matricula: 'LAC-2026-007',
    records: ['A', '', 'Ap', 'A', 'Ap', 'Ap', 'A', 'App', 'A', 'A', 'Ap'],
  },
  {
    num: 8,
    rawName: 'Maria Dolores Garcia Delgado',
    nombre: 'Maria Dolores',
    apellidoPaterno: 'Garcia',
    apellidoMaterno: 'Delgado',
    matricula: 'LAC-2026-008',
    records: ['A', 'A', 'Ap', 'A', 'Ap', 'Ap', 'Ap.', 'App', 'A', 'A', 'Ap'],
  },
  {
    num: 9,
    rawName: 'Ana maria Jimenez ramirez',
    nombre: 'Ana Maria',
    apellidoPaterno: 'Jimenez',
    apellidoMaterno: 'Ramirez',
    matricula: 'LAC-2026-009',
    records: ['A', '', '', 'A', 'A', 'A', 'A', 'Ap', 'A', 'A', 'A'],
  },
  {
    num: 10,
    rawName: 'Jaciel Berenice Mendoza Hacho',
    nombre: 'Jaciel Berenice',
    apellidoPaterno: 'Mendoza',
    apellidoMaterno: 'Hacho',
    matricula: 'LAC-2026-010',
    records: ['A', '', 'R', '', '', 'R', '', 'A', '', 'Ap', ''],
  },
  {
    num: 11,
    rawName: 'Sherlyn de Jesus Vergara Puga',
    nombre: 'Sherlyn de Jesus',
    apellidoPaterno: 'Vergara',
    apellidoMaterno: 'Puga',
    matricula: 'LAC-2026-011',
    records: ['A', '', 'Ap', 'A', 'A', '', 'A', 'App', 'A', 'A', ''],
  },
  {
    num: 12,
    rawName: 'Francisco Raul Riego Manzano',
    nombre: 'Francisco Raul',
    apellidoPaterno: 'Riego',
    apellidoMaterno: 'Manzano',
    matricula: 'LAC-2026-012',
    records: ['A', 'Ap', '', 'R', 'A', 'R', 'Ap', 'R', 'A', '', 'Ap'],
  },
  {
    num: 13,
    rawName: 'Juan Carlos román perez',
    nombre: 'Juan Carlos',
    apellidoPaterno: 'Román',
    apellidoMaterno: 'Pérez',
    matricula: 'LAC-2026-013',
    records: ['A', '', 'R', '', '', '', '', 'Rpp', '', 'A', 'A'],
  },
  {
    num: 14,
    rawName: 'Diana Cruz Soriano',
    nombre: 'Diana',
    apellidoPaterno: 'Cruz',
    apellidoMaterno: 'Soriano',
    matricula: 'LAC-2026-014',
    records: ['', 'R', 'R', 'A', '', '', 'A', '', 'A', 'A', 'A'],
  },
  {
    num: 15,
    rawName: 'Cristian Jeova Trejo Flores',
    nombre: 'Cristian Jeova',
    apellidoPaterno: 'Trejo',
    apellidoMaterno: 'Flores',
    matricula: 'LAC-2026-015',
    records: ['A', '', 'A', '', '', '', '', 'A', 'A', 'A', 'A'],
  },
  {
    num: 16,
    rawName: 'Jackelyn Uribe Zuñiga',
    nombre: 'Jackelyn',
    apellidoPaterno: 'Uribe',
    apellidoMaterno: 'Zuñiga',
    matricula: 'LAC-2026-016',
    records: ['A', 'A', 'Ap', 'Ap', 'A', 'Ap', 'A', 'App', '', '', ''],
  },
  {
    num: 17,
    rawName: 'Angel Alfredo Zarate Cobilt',
    nombre: 'Angel Alfredo',
    apellidoPaterno: 'Zarate',
    apellidoMaterno: 'Cobilt',
    matricula: 'LAC-2026-017',
    records: ['A', '', '', '', '', '', '', 'Rp', '', 'A', ''],
  },
  {
    num: 18,
    rawName: 'Hector Rivera Murillo',
    nombre: 'Hector',
    apellidoPaterno: 'Rivera',
    apellidoMaterno: 'Murillo',
    matricula: 'LAC-2026-018',
    records: ['A', '', 'Ap', 'Ap', 'Ap', 'Ap', 'Ap', 'Ap', 'A', 'A', 'Ap'],
  },
  {
    num: 19,
    rawName: 'Miguel Ángel Romo Sandoval',
    nombre: 'Miguel Ángel',
    apellidoPaterno: 'Romo',
    apellidoMaterno: 'Sandoval',
    matricula: 'LAC-2026-019',
    records: ['A', '', '', '', '', 'Ap', 'A', 'Rp', 'A', 'A', ''],
  },
  {
    num: 20,
    rawName: 'Jessica Lizeth Mata Bautista',
    nombre: 'Jessica Lizeth',
    apellidoPaterno: 'Mata',
    apellidoMaterno: 'Bautista',
    matricula: 'LAC-2026-020',
    records: ['', '', 'A', 'A', 'A', '', 'A', 'A', '', '', 'A'],
  },
  {
    num: 21,
    rawName: 'Torres Reyes Berenice Malena',
    nombre: 'Berenice Malena',
    apellidoPaterno: 'Torres',
    apellidoMaterno: 'Reyes',
    matricula: 'LAC-2026-021',
    records: ['', '', 'R', 'A', '', '', 'R', 'A', 'A', 'Ap', 'A'],
  },
  {
    num: 22,
    rawName: 'Magallon Vázquez Lizbeth',
    nombre: 'Lizbeth',
    apellidoPaterno: 'Magallon',
    apellidoMaterno: 'Vázquez',
    matricula: 'LAC-2026-022',
    records: ['', '', 'R', '', 'A', 'Ap', 'A', 'Rpp', 'A', 'A', 'Ap'],
  },
];

export interface DecodedCell {
  estadoAsistencia: EstadoAsistencia | null;
  participacionTipo: 'AP' | 'RP' | null;
  participacionPuntos: number;
  participacionConteo: number; // 0, 1, or 2
  rawSymbol: string;
}

export function decodeSheetCell(rawSymbol: string): DecodedCell {
  const clean = (rawSymbol || '').trim().replace(/\.$/, ''); // clean trailing dot like Ap.

  if (!clean) {
    return {
      estadoAsistencia: 'F', // Falta / Inasistencia
      participacionTipo: null,
      participacionPuntos: 0,
      participacionConteo: 0,
      rawSymbol: '',
    };
  }

  // Double participation with asistencia: App
  if (/^App$/i.test(clean)) {
    return {
      estadoAsistencia: 'A',
      participacionTipo: 'AP',
      participacionPuntos: 20,
      participacionConteo: 2,
      rawSymbol: clean,
    };
  }

  // Single participation with asistencia: Ap
  if (/^Ap$/i.test(clean)) {
    return {
      estadoAsistencia: 'A',
      participacionTipo: 'AP',
      participacionPuntos: 10,
      participacionConteo: 1,
      rawSymbol: clean,
    };
  }

  // Simple asistencia: A
  if (/^A$/i.test(clean)) {
    return {
      estadoAsistencia: 'A',
      participacionTipo: null,
      participacionPuntos: 0,
      participacionConteo: 0,
      rawSymbol: clean,
    };
  }

  // Double participation with retardo: Rpp
  if (/^Rpp$/i.test(clean)) {
    return {
      estadoAsistencia: 'R',
      participacionTipo: 'RP',
      participacionPuntos: 10, // 2x 5pts
      participacionConteo: 2,
      rawSymbol: clean,
    };
  }

  // Single participation with retardo: Rp
  if (/^Rp$/i.test(clean)) {
    return {
      estadoAsistencia: 'R',
      participacionTipo: 'RP',
      participacionPuntos: 5,
      participacionConteo: 1,
      rawSymbol: clean,
    };
  }

  // Simple retardo: R
  if (/^R$/i.test(clean)) {
    return {
      estadoAsistencia: 'R',
      participacionTipo: null,
      participacionPuntos: 0,
      participacionConteo: 0,
      rawSymbol: clean,
    };
  }

  // Fallback default
  return {
    estadoAsistencia: 'A',
    participacionTipo: null,
    participacionPuntos: 0,
    participacionConteo: 0,
    rawSymbol: clean,
  };
}

export interface SyncStatsResult {
  success: boolean;
  source: 'google_sheets_live' | 'embedded_official_dataset';
  studentsCount: number;
  asistenciasCount: number;
  participacionesCount: number;
  totalPoints: number;
  datesCount: number;
  message: string;
}

/**
 * Aplica los datos de alumnos, asistencias y participaciones en localStorage
 */
export function applyStudentsDataToStorage(
  studentsData: LacStudentRaw[],
  source: 'google_sheets_live' | 'embedded_official_dataset'
): SyncStatsResult {
  if (typeof window === 'undefined') {
    return {
      success: false,
      source,
      studentsCount: 0,
      asistenciasCount: 0,
      participacionesCount: 0,
      totalPoints: 0,
      datesCount: 0,
      message: 'Ambiente del servidor no soporta almacenamiento local.',
    };
  }

  // 1. Obtener lista actual de alumnos y sincronizar los 22 de LAC
  const rawAlumnos = localStorage.getItem('unrc_alumnos');
  let alumnosList: Alumno[] = rawAlumnos ? JSON.parse(rawAlumnos) : [];

  studentsData.forEach((st) => {
    const existingIndex = alumnosList.findIndex(
      (a) => a.matricula === st.matricula || a.id === st.matricula
    );

    const alumnoObj: Alumno = {
      id: st.matricula, // Usamos la matrícula como ID canónico para evitar discrepancias
      matricula: st.matricula,
      nombre: st.nombre,
      apellido_paterno: st.apellidoPaterno,
      apellido_materno: st.apellidoMaterno,
      grado: '2° Semestre',
      grupo: LAC_COURSE_INFO.grupo,
      carrera: LAC_COURSE_INFO.carrera,
      carrera_id: LAC_COURSE_INFO.carreraId,
      grupo_id: LAC_COURSE_INFO.grupo,
      sede_id: LAC_COURSE_INFO.sedeId,
      sede_nombre: LAC_COURSE_INFO.sedeNombre,
      ciclo_id: LAC_COURSE_INFO.ciclo,
      estado_matricula: 'activo',
      tutor: 'Tutor UNRC',
      telefono: `+52 664 123 45${st.num < 10 ? '0' + st.num : st.num}`,
      docente_nombre: LAC_COURSE_INFO.docenteNombre,
      docente_id: LAC_COURSE_INFO.docenteId,
      qr_code: st.matricula,
      password: `${st.matricula}-${LAC_COURSE_INFO.ciclo}`,
      created_at: '2026-09-01T08:00:00.000Z',
    };

    if (existingIndex >= 0) {
      alumnosList[existingIndex] = {
        ...alumnosList[existingIndex],
        ...alumnoObj,
      };
    } else {
      alumnosList.push(alumnoObj);
    }
  });

  localStorage.setItem('unrc_alumnos', JSON.stringify(alumnosList));

  // 2. Sincronizar Asistencias históricas de las 11 fechas
  const rawAsist = localStorage.getItem('unrc_asistencias');
  let asistList: Asistencia[] = rawAsist ? JSON.parse(rawAsist) : [];

  // Remover asistencias previas de este grupo y fechas para regenerarlas limpiamente
  const datesSet = new Set(LAC_CLASS_DATES);
  const matriculasSet = new Set(studentsData.map((s) => s.matricula));

  asistList = asistList.filter(
    (a) =>
      !(
        (a.grupo_id === LAC_COURSE_INFO.grupo || (a as any).curso_id === LAC_COURSE_INFO.courseId) &&
        datesSet.has(a.fecha) &&
        matriculasSet.has(a.alumno_id)
      )
  );

  let asistenciasGenerated = 0;
  studentsData.forEach((st) => {
    st.records.forEach((rec, idx) => {
      const fecha = LAC_CLASS_DATES[idx];
      if (!fecha) return;
      const decoded = decodeSheetCell(rec);
      if (!decoded.estadoAsistencia) return;

      const alumnoRef = alumnosList.find((a) => a.matricula === st.matricula);

      asistList.push({
        id: `as-lac-${st.matricula.toLowerCase()}-${fecha}`,
        alumno_id: st.matricula,
        grupo_id: LAC_COURSE_INFO.grupo,
        tipo: 'entrada',
        estado: decoded.estadoAsistencia,
        fecha,
        hora: '07:00:00',
        dispositivo: 'Sincronizador Google Sheets LAC',
        ubicacion: 'Campus Tijuana - Aula 203',
        escaneado_por: LAC_COURSE_INFO.docenteNombre,
        observaciones:
          decoded.estadoAsistencia === 'A'
            ? `Presente (${decoded.rawSymbol || 'A'})`
            : decoded.estadoAsistencia === 'R'
            ? `Retardo (${decoded.rawSymbol})`
            : 'Inasistencia oficial',
        created_at: `${fecha}T07:00:00.000Z`,
        alumno: alumnoRef,
      });
      asistenciasGenerated++;
    });
  });

  localStorage.setItem('unrc_asistencias', JSON.stringify(asistList));

  // 3. Sincronizar Participaciones históricas de las 11 fechas
  const rawPart = localStorage.getItem('unrc_participaciones');
  let partList: Participacion[] = rawPart ? JSON.parse(rawPart) : [];

  // Remover participaciones previas de este curso/materia en estas fechas
  partList = partList.filter(
    (p) =>
      !(
        (p.curso_id === LAC_COURSE_INFO.courseId ||
          p.materia === LAC_COURSE_INFO.materia ||
          p.grupo_id === LAC_COURSE_INFO.grupo) &&
        datesSet.has(p.fecha) &&
        matriculasSet.has(p.alumno_id)
      )
  );

  let participacionesGenerated = 0;
  let totalPointsGenerated = 0;

  studentsData.forEach((st) => {
    st.records.forEach((rec, idx) => {
      const fecha = LAC_CLASS_DATES[idx];
      if (!fecha) return;
      const decoded = decodeSheetCell(rec);
      if (!decoded.participacionTipo || decoded.participacionPuntos <= 0) return;

      const alumnoRef = alumnosList.find((a) => a.matricula === st.matricula);

      // Si fue doble participación (App o Rpp), generamos los registros correspondientes
      const partsToGenerate = decoded.participacionConteo >= 2 ? 2 : 1;
      const pointsPerPart = decoded.participacionPuntos / partsToGenerate;

      for (let pIdx = 1; pIdx <= partsToGenerate; pIdx++) {
        partList.push({
          id: `part-lac-${st.matricula.toLowerCase()}-${fecha}-${pIdx}`,
          alumno_id: st.matricula,
          grupo_id: LAC_COURSE_INFO.grupo,
          curso_id: LAC_COURSE_INFO.courseId,
          materia: LAC_COURSE_INFO.materia,
          fecha,
          tipo: decoded.participacionTipo,
          puntos: pointsPerPart,
          observaciones:
            partsToGenerate > 1
              ? `Participación ${pIdx}/2 en clase (${decoded.rawSymbol}) - ${LAC_COURSE_INFO.materia}`
              : `Participación destacada en clase (${decoded.rawSymbol}) - ${LAC_COURSE_INFO.materia}`,
          created_at: `${fecha}T07:15:00.000Z`,
          alumno: alumnoRef,
        });
        participacionesGenerated++;
        totalPointsGenerated += pointsPerPart;
      }
    });
  });

  localStorage.setItem('unrc_participaciones', JSON.stringify(partList));
  localStorage.setItem('unrc_lac_matematicas_v1_synced', 'true');
  localStorage.setItem('unrc_lac_matematicas_synced_at', new Date().toISOString());

  return {
    success: true,
    source,
    studentsCount: studentsData.length,
    asistenciasCount: asistenciasGenerated,
    participacionesCount: participacionesGenerated,
    totalPoints: totalPointsGenerated,
    datesCount: LAC_CLASS_DATES.length,
    message: `Sincronizados exitosamente ${studentsData.length} alumnos, ${asistenciasGenerated} asistencias y ${participacionesGenerated} participaciones (${totalPointsGenerated} pts) desde ${source === 'google_sheets_live' ? 'Google Sheets en vivo' : 'catálogo oficial verificado'}.`,
  };
}

/**
 * Sembrado sincrónico inmediato para inicialización de sesión
 */
export function seedLacMatematicasDataSync(force = false): SyncStatsResult {
  if (!force && typeof window !== 'undefined' && localStorage.getItem('unrc_lac_matematicas_v1_synced')) {
    return {
      success: true,
      source: 'embedded_official_dataset',
      studentsCount: 22,
      asistenciasCount: 0,
      participacionesCount: 0,
      totalPoints: 0,
      datesCount: 11,
      message: 'Datos oficiales de LAC ya sembrados.',
    };
  }
  return applyStudentsDataToStorage(LAC_STUDENTS_OFFICIAL, 'embedded_official_dataset');
}

/**
 * Live sync or local seed of the 22 students and 11 session logs from Google Sheets
 */
export async function syncLacMatematicasSheet(force = false): Promise<SyncStatsResult> {
  if (typeof window === 'undefined') {
    return {
      success: false,
      source: 'embedded_official_dataset',
      studentsCount: 0,
      asistenciasCount: 0,
      participacionesCount: 0,
      totalPoints: 0,
      datesCount: 0,
      message: 'Ambiente del servidor no soporta sincronización directa.',
    };
  }

  let source: 'google_sheets_live' | 'embedded_official_dataset' = 'embedded_official_dataset';
  let studentsData = LAC_STUDENTS_OFFICIAL;

  // Intento de descarga en vivo desde Google Sheets CSV
  try {
    const res = await fetch(LAC_CSV_EXPORT_URL, { cache: 'no-store' });
    if (res.ok) {
      const csvText = await res.text();
      if (csvText && csvText.includes('Gabriela Erandi Capilla Manuel')) {
        const parsed = parseGoogleSheetsCsv(csvText);
        if (parsed.length === 22) {
          studentsData = parsed;
          source = 'google_sheets_live';
        }
      }
    }
  } catch (err) {
    // Si falla fetch por CORS o red, recurre sin interrupción al dataset oficial embebido
    source = 'embedded_official_dataset';
  }

  return applyStudentsDataToStorage(studentsData, source);
}

/**
 * Parser de CSV proveniente de Google Sheets
 */
function parseGoogleSheetsCsv(csvText: string): LacStudentRaw[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const result: LacStudentRaw[] = [];

  for (const line of lines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 3) continue;

    const numParsed = parseInt(parts[0], 10);
    if (isNaN(numParsed) || numParsed < 1 || numParsed > 22) continue;

    const rawName = parts[1];
    const records = parts.slice(2, 13); // 11 date columns

    // Buscar en el catálogo oficial para mantener estandarización de nombres
    const officialRef = LAC_STUDENTS_OFFICIAL.find((o) => o.num === numParsed);

    result.push({
      num: numParsed,
      rawName: rawName || officialRef?.rawName || `Alumno LAC ${numParsed}`,
      nombre: officialRef?.nombre || rawName,
      apellidoPaterno: officialRef?.apellidoPaterno || '',
      apellidoMaterno: officialRef?.apellidoMaterno || '',
      matricula: officialRef?.matricula || `LAC-2026-${numParsed < 10 ? '00' + numParsed : '0' + numParsed}`,
      records,
    });
  }

  return result;
}
