import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Docente, HorarioDocenteItem } from './db';

const DIAS_ORDEN: Record<string, number> = {
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Miercoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
  Sabado: 6,
  Domingo: 7,
};

const DIAS_ICS_CODE: Record<string, string> = {
  Lunes: 'MO',
  Martes: 'TU',
  Miércoles: 'WE',
  Miercoles: 'WE',
  Jueves: 'TH',
  Viernes: 'FR',
  Sábado: 'SA',
  Sabado: 'SA',
  Domingo: 'SU',
};

/**
 * Calcula la próxima fecha para un día de la semana específico
 */
function getNextDateForDay(diaNombre: string): Date {
  const targetDay = DIAS_ORDEN[diaNombre] || 1; // 1 = Lunes
  const now = new Date();
  const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // 1 = Lunes, 7 = Domingo

  let diff = targetDay - currentDay;
  if (diff < 0) diff += 7;
  if (diff === 0) diff = 0; // Hoy mismo

  const result = new Date(now);
  result.setDate(now.getDate() + diff);
  return result;
}

/**
 * Formatea una fecha al estándar iCalendar / Google (YYYYMMDDTHHMMSSZ)
 */
function formatToCalDate(date: Date): string {
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Genera el enlace directo para añadir un bloque de horario a Google Calendar
 * con el correo del docente como invitado y recordatorio de modalidad (Presencial o En línea).
 */
export function createGoogleCalendarUrl(horario: HorarioDocenteItem, docente: Docente): string {
  const isOnline = Boolean(horario.es_en_linea);
  const modalidadTag = isOnline ? '🌐 EN LÍNEA' : '🏛️ PRESENCIAL';
  const title = `[UNRC ${modalidadTag}] ${horario.materia} (${horario.grupo})`;

  const nextDate = getNextDateForDay(horario.dia);
  const [startH, startM] = (horario.hora_inicio || '07:00').split(':').map((v) => parseInt(v, 10) || 0);
  const [endH, endM] = (horario.hora_fin || '09:00').split(':').map((v) => parseInt(v, 10) || 0);

  const startDate = new Date(nextDate);
  startDate.setHours(startH, startM, 0, 0);

  const endDate = new Date(nextDate);
  endDate.setHours(endH, endM, 0, 0);

  const dayCode = DIAS_ICS_CODE[horario.dia] || 'MO';
  const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${dayCode};UNTIL=20260731T235959Z`;

  const location = isOnline
    ? 'En Línea • Google Meet / Campus Virtual UNRC'
    : `${horario.aula || 'Aula por asignar'} • ${docente.sede_nombre || 'Campus UNRC'}`;

  const descriptionLines = [
    `🎓 UNIVERSIDAD NACIONAL ROSARIO CASTELLANOS`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📌 MODALIDAD DE LA CLASE: ${modalidadTag}`,
    isOnline
      ? `💻 AVISO: Esta sesión se impartirá EN LÍNEA mediante Google Meet / Classroom. Conéctate puntualmente.`
      : `🏛️ AVISO: Esta sesión es PRESENCIAL en campus físico. Asiste a ${horario.aula || 'tu aula asignada'}.`,
    ``,
    `👨‍🏫 Docente: ${docente.nombre} ${docente.apellido_paterno} ${docente.apellido_materno || ''}`.trim(),
    `✉️ Correo Institucional: ${docente.email}`,
    `🆔 No. Empleado: ${docente.num_empleado}`,
    `📚 Asignatura: ${horario.materia}`,
    `👥 Grupo / Sección: ${horario.grupo}`,
    `📍 Sede / Plantel: ${docente.sede_nombre || 'Campus Magdalena Contreras'}`,
    `🏢 Aula o Espacio: ${horario.aula || (isOnline ? 'Aula Virtual' : 'Por definir')}`,
    `⏰ Horario: ${horario.dia} de ${horario.hora_inicio} a ${horario.hora_fin} hrs`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Ciclo Escolar Oficial 2026-2 • UNRC`,
  ];

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatToCalDate(startDate)}/${formatToCalDate(endDate)}`,
    details: descriptionLines.join('\n'),
    location: location,
    recur: rrule,
    add: docente.email || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genera y descarga un archivo .ics (iCalendar) que incluye todos los horarios del docente
 * con recordatorio de 30 minutos, soporte de recurrencia y etiquetas claras de Presencial o En línea.
 */
export function downloadDocenteICS(docente: Docente): void {
  const horarios = docente.horarios || [];
  if (horarios.length === 0) {
    alert('El docente no tiene bloques de horarios asignados todavía.');
    return;
  }

  const now = new Date();
  const dtstamp = formatToCalDate(now) + 'Z';

  const eventsIcs = horarios.map((h, idx) => {
    const isOnline = Boolean(h.es_en_linea);
    const modalidadTag = isOnline ? 'EN LINEA' : 'PRESENCIAL';
    const summary = `[UNRC - ${modalidadTag}] ${h.materia} (${h.grupo})`;

    const nextDate = getNextDateForDay(h.dia);
    const [startH, startM] = (h.hora_inicio || '07:00').split(':').map((v) => parseInt(v, 10) || 0);
    const [endH, endM] = (h.hora_fin || '09:00').split(':').map((v) => parseInt(v, 10) || 0);

    const startDate = new Date(nextDate);
    startDate.setHours(startH, startM, 0, 0);

    const endDate = new Date(nextDate);
    endDate.setHours(endH, endM, 0, 0);

    const dayCode = DIAS_ICS_CODE[h.dia] || 'MO';
    const uid = `unrc-docente-${docente.num_empleado}-${idx}-${Date.now()}@rcastellanos.cdmx.gob.mx`;
    const location = isOnline
      ? 'En Linea - Google Meet / Campus Virtual'
      : `${h.aula || 'Aula Institucional'}, ${docente.sede_nombre || 'Campus Magdalena Contreras'}`;

    const desc = [
      `UNIVERSIDAD NACIONAL ROSARIO CASTELLANOS`,
      `MODALIDAD: ${modalidadTag}`,
      isOnline ? `Recordatorio: Sesion virtual a distancia por Google Meet.` : `Recordatorio: Clase presencial en campus físico.`,
      `Docente: ${docente.nombre} ${docente.apellido_paterno}`,
      `Asignatura: ${h.materia}`,
      `Grupo: ${h.grupo}`,
      `Aula: ${h.aula || 'Por asignar'}`,
      `Ciclo Escolar 2026-2`
    ].join('\\n');

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatToCalDate(startDate)}`,
      `DTEND:${formatToCalDate(endDate)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${dayCode};UNTIL=20260731T235959Z`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${desc}`,
      `ORGANIZER;CN=UNRC Coordinacion Academica:mailto:academica@rcastellanos.cdmx.gob.mx`,
      docente.email ? `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${docente.nombre} ${docente.apellido_paterno}:mailto:${docente.email}` : '',
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Recordatorio UNRC: Clase [${modalidadTag}] de ${h.materia} en 30 minutos`,
      'END:VALARM',
      'END:VEVENT'
    ].filter(Boolean).join('\r\n');
  }).join('\r\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Universidad Nacional Rosario Castellanos//Horario Docente UNRC//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Horario UNRC - ${docente.nombre} ${docente.apellido_paterno}`,
    'X-WR-TIMEZONE:America/Mexico_City',
    eventsIcs,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Horario_${docente.num_empleado}_GoogleCalendar.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Genera el documento PDF oficial del horario del docente con diseño institucional UNRC
 */
export function generateDocenteHorarioPDF(docente: Docente): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Encabezado Institucional (Navy Blue Bar)
  doc.setFillColor(11, 19, 43); // #0B132B
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Gold accent line
  doc.setFillColor(217, 119, 6); // #D97706
  doc.rect(0, 26, pageWidth, 1.8, 'F');

  // Logo / Emblem Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('UNIVERSIDAD NACIONAL ROSARIO CASTELLANOS', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('Dirección de Asuntos Académicos y Programación Docente • Ciclo Escolar 2026-2', 14, 17);
  doc.text('Gobierno de la Ciudad de México', 14, 22);

  // Badge Ciclo
  doc.setFillColor(217, 119, 6);
  doc.roundedRect(pageWidth - 44, 7, 30, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CICLO 2026-2', pageWidth - 41, 14);

  // 2. Título del Documento
  let currentY = 35;
  doc.setTextColor(15, 23, 42); // #0F172A
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COMPROBANTE OFICIAL DE HORARIOS Y ASIGNACIÓN DOCENTE', 14, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Fecha de emisión: ${new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })} • Folio Oficial: UNRC-ACAD-${docente.num_empleado}`,
    14,
    currentY
  );

  // 3. Ficha Técnica del Docente (Card)
  currentY += 6;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, currentY, pageWidth - 28, 30, 3, 3, 'FD');

  const cardY = currentY + 6;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DOCENTE TITULAR:', 18, cardY);
  doc.text('CLAVE DE EMPLEADO:', 110, cardY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const fullName = `${docente.nombre} ${docente.apellido_paterno} ${docente.apellido_materno || ''}`.trim();
  doc.text(fullName, 18, cardY + 5);
  doc.text(docente.num_empleado || 'S/N', 110, cardY + 5);

  const row2Y = cardY + 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CORREO INSTITUCIONAL:', 18, row2Y);
  doc.text('SEDE / PLANTEL:', 110, row2Y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(docente.email || 'Sin correo registrado', 18, row2Y + 4.5);
  doc.text(docente.sede_nombre || 'Campus Magdalena Contreras', 110, row2Y + 4.5);

  const row3Y = row2Y + 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const carrerasList = (docente.carreras_asignadas && docente.carreras_asignadas.length > 0)
    ? docente.carreras_asignadas.join(', ')
    : (docente.departamento || 'Licenciatura General');
  doc.text(`CARRERAS ASIGNADAS: ${carrerasList}`, 18, row3Y);

  // 4. Tabla de Horarios
  currentY += 36;
  const horarios = (docente.horarios || []).slice().sort((a, b) => {
    const ordenA = DIAS_ORDEN[a.dia] || 99;
    const ordenB = DIAS_ORDEN[b.dia] || 99;
    if (ordenA !== ordenB) return ordenA - ordenB;
    return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
  });

  const tableData = horarios.map((h) => {
    const isOnline = Boolean(h.es_en_linea);
    return [
      h.dia,
      `${h.hora_inicio} - ${h.hora_fin} hrs`,
      h.materia,
      h.grupo,
      isOnline ? 'EN LÍNEA' : 'PRESENCIAL',
      h.aula || (isOnline ? 'Aula Virtual (Meet/Classroom)' : 'Aula en Campus'),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Día', 'Horario', 'Asignatura / Unidad', 'Grupo', 'Modalidad', 'Espacio Asignado']],
    body: tableData.length > 0 ? tableData : [['-', '-', 'Sin horarios asignados', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [11, 19, 43], // Navy Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 22 },
      1: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
      5: { cellWidth: 38 },
    },
    didParseCell: (data) => {
      // Color highlight for Modalidad column (index 4)
      if (data.section === 'body' && data.column.index === 4) {
        const val = String(data.cell.raw);
        if (val === 'EN LÍNEA') {
          data.cell.styles.textColor = [3, 105, 161]; // Sky 700
          data.cell.styles.fillColor = [224, 242, 254]; // Sky 100
        } else if (val === 'PRESENCIAL') {
          data.cell.styles.textColor = [21, 128, 61]; // Emerald 700
          data.cell.styles.fillColor = [220, 252, 231]; // Emerald 100
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Cómputo de horas y desglose
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  const onlineCount = horarios.filter((h) => Boolean(h.es_en_linea)).length;
  const presencialCount = horarios.filter((h) => !h.es_en_linea).length;

  let summaryY = finalY + 8;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, summaryY, pageWidth - 28, 16, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RESUMEN DE CARGA ACADÉMICA SEMANAL:', 18, summaryY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Total de sesiones semanales: ${horarios.length} bloques | Sesiones Presenciales: ${presencialCount} | Sesiones En Línea: ${onlineCount}`,
    18,
    summaryY + 11
  );

  // 6. Nota Oficial Institucional sobre Presencial vs En Línea
  const noteY = summaryY + 22;
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(251, 191, 36); // amber-400
  doc.roundedRect(14, noteY, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setTextColor(146, 64, 14); // amber-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('LINEAMIENTOS INSTITUCIONALES DE MODALIDAD:', 18, noteY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 53, 15);
  const noteText =
    "• Modalidad EN LÍNEA: Las sesiones se impartirán de forma síncrona mediante la plataforma Google Meet / Classroom institucional. El docente enviará el enlace oficial con antelación.\n• Modalidad PRESENCIAL: Las clases se imparten físicamente en las aulas y laboratorios de la sede indicada con registro biométrico/asistencia obligatoria.";
  doc.text(noteText, 18, noteY + 10);

  // 7. Firmas de Validación
  const signY = noteY + 36;
  doc.setDrawColor(148, 163, 184);

  // Firma Docente
  doc.line(26, signY, 86, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('FIRMA DEL DOCENTE TITULAR', 34, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(fullName, 32, signY + 8);

  // Firma Dirección Académica
  doc.line(pageWidth - 86, signY, pageWidth - 26, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SECRETARÍA ACADÉMICA UNRC', pageWidth - 80, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Sello y Validación Oficial de Carga', pageWidth - 82, signY + 8);

  // 8. Pie de página institucional
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Universidad Nacional Rosario Castellanos • Sistema Integral de Gestión Académica y Control Escolar • Documento válido oficial',
    14,
    pageHeight - 8
  );

  // Guardar archivo
  const safeName = (docente.num_empleado || 'DOCENTE').replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`Horario_Docente_${safeName}_UNRC.pdf`);
}
