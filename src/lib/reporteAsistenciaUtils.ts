import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTijuanaDisplayDate, getTijuanaDateString, getTijuanaTimeString } from './tijuanaTime';

export interface ReporteItemAlumno {
  alumnoId: string;
  matricula: string;
  nombreCompleto: string;
  grupo: string;
  carrera: string;
  fotoUrl?: string;
  estadoAsistencia?: 'A' | 'R' | 'F' | 'J' | 'SIN_REGISTRO';
  asistenciaLabel: string;
  horaRegistro?: string;
  tipoParticipacion?: 'AP' | 'REGULAR' | 'RP' | 'NINGUNA';
  participacionLabel: string;
  puntosFecha: number;
  participacionesDetalleFecha: Array<{
    tipo: 'AP' | 'REGULAR' | 'RP';
    puntos: number;
    observaciones?: string;
  }>;
  asistenciasMateriaTotal: number;
  faltasMateriaTotal: number;
  retardosMateriaTotal: number;
  justificadosMateriaTotal: number;
  porcentajeAsistenciaMateria: number;
  participacionesMateriaTotal: number;
  puntosMateriaTotal: number;
  observaciones?: string;
}

export interface ReporteMateriaResumen {
  materia: string;
  grupo?: string;
  carrera?: string;
  docenteNombre?: string;
  docenteNumEmpleado?: string;
  sedeNombre?: string;
  ciclo: string;
  fecha: string; // YYYY-MM-DD o rango
  esRango?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  totalAlumnos: number;
  presentes: number;
  retardos: number;
  faltas: number;
  justificados: number;
  sinRegistro: number;
  porcentajeAsistencia: number;
  totalParticipacionesFecha: number;
  totalPuntosFecha: number;
  participacionesAP: number;
  participacionesRegular: number;
  participacionesRP: number;
  items: ReporteItemAlumno[];
}

/**
 * Exporta el reporte estructurado de asistencia y participación a Excel (.xlsx)
 */
export function exportReporteToExcel(reporte: ReporteMateriaResumen): void {
  const wb = XLSX.utils.book_new();

  const fechaStr = reporte.esRango
    ? `${reporte.fechaInicio || ''} al ${reporte.fechaFin || ''}`
    : reporte.fecha;

  // 1. Matriz de Contenido
  const rows: any[][] = [
    ['UNIVERSIDAD NACIONAL ROSARIO CASTELLANOS (UNRC)'],
    ['REPORTE OFICIAL DE ASISTENCIA Y PARTICIPACIÓN ACADÉMICA'],
    ['CONTROL DE EVALUACIÓN CONTINUA Y SEGUIMIENTO POR ASIGNATURA'],
    [],
    ['DATOS DE LA ASIGNATURA Y DOCENTE', ''],
    ['Asignatura / Materia:', reporte.materia],
    ['Grupo / Semestre:', reporte.grupo || 'General'],
    ['Carrera / Licenciatura:', reporte.carrera || 'Licenciatura Oficial UNRC'],
    ['Docente Titular:', reporte.docenteNombre || 'Docente Asignado UNRC'],
    ['Sede / Plantel:', reporte.sedeNombre || 'Campus Tijuana'],
    ['Ciclo Escolar:', reporte.ciclo || '2026-2'],
    ['Fecha Evaluada:', fechaStr],
    ['Fecha y Hora de Emisión:', `${getTijuanaDateString()} ${getTijuanaTimeString()}`],
    [],
    ['RESUMEN EJECUTIVO DE LA SESIÓN', ''],
    ['Total de Alumnos Evaluados:', reporte.totalAlumnos],
    ['Tasa de Asistencia Global:', `${reporte.porcentajeAsistencia.toFixed(1)}%`],
    ['Presentes (A):', reporte.presentes],
    ['Retardos (R):', reporte.retardos],
    ['Inasistencias / Faltas (F):', reporte.faltas],
    ['Justificados (J):', reporte.justificados],
    ['Sin Registro de Asistencia:', reporte.sinRegistro],
    ['Total Participaciones del Día:', reporte.totalParticipacionesFecha],
    ['Puntos de Participación del Día:', reporte.totalPuntosFecha],
    ['Participaciones Excelentes (AP +10 pts):', reporte.participacionesAP],
    ['Participaciones Regulares (+7.5 pts):', reporte.participacionesRegular],
    ['Participaciones Por Mejorar (RP +5 pts):', reporte.participacionesRP],
    [],
    // Encabezados de la Tabla Detallada
    [
      'No.',
      'Matrícula',
      'Nombre del Alumno',
      'Grupo',
      'Carrera',
      'Asistencia en Fecha',
      'Hora Acceso',
      'Participación en Fecha',
      'Pts Fecha',
      'Histórico Asistencias',
      'Histórico Faltas',
      'Histórico Retardos',
      'Histórico Justificados',
      '% Asistencia Materia',
      'Total Part. Materia',
      'Total Pts Materia',
      'Observaciones / Notas'
    ]
  ];

  // Filas por cada alumno
  reporte.items.forEach((item, index) => {
    rows.push([
      index + 1,
      item.matricula,
      item.nombreCompleto,
      item.grupo,
      item.carrera,
      item.asistenciaLabel,
      item.horaRegistro || '-',
      item.participacionLabel,
      item.puntosFecha,
      item.asistenciasMateriaTotal,
      item.faltasMateriaTotal,
      item.retardosMateriaTotal,
      item.justificadosMateriaTotal,
      `${item.porcentajeAsistenciaMateria.toFixed(1)}%`,
      item.participacionesMateriaTotal,
      item.puntosMateriaTotal,
      item.observaciones || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Ajuste de ancho de columnas
  ws['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // Matrícula
    { wch: 32 }, // Nombre
    { wch: 12 }, // Grupo
    { wch: 25 }, // Carrera
    { wch: 22 }, // Asistencia
    { wch: 12 }, // Hora
    { wch: 26 }, // Participación
    { wch: 10 }, // Pts Fecha
    { wch: 18 }, // Hist Asist
    { wch: 16 }, // Hist Faltas
    { wch: 16 }, // Hist Retardos
    { wch: 18 }, // Hist Justif
    { wch: 18 }, // % Asist Materia
    { wch: 18 }, // Total Part
    { wch: 16 }, // Total Pts
    { wch: 30 }, // Observaciones
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Reporte Asistencia');

  const cleanMateria = reporte.materia.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  const cleanFecha = reporte.fecha.replace(/[^a-zA-Z0-9-]/g, '_');
  const filename = `Reporte_UNRC_${cleanMateria}_${cleanFecha}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Exporta el reporte estructurado de asistencia y participación a CSV
 */
export function exportReporteToCSV(reporte: ReporteMateriaResumen): void {
  const headers = [
    'No',
    'Matricula',
    'Nombre Completo',
    'Grupo',
    'Carrera',
    'Asistencia',
    'Hora',
    'Participacion',
    'Puntos Fecha',
    'Total Part Materia',
    'Total Pts Materia',
    'Porcentaje Asistencia Materia',
    'Observaciones'
  ];

  const escapeCSV = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = reporte.items.map((it, idx) => [
    idx + 1,
    escapeCSV(it.matricula),
    escapeCSV(it.nombreCompleto),
    escapeCSV(it.grupo),
    escapeCSV(it.carrera),
    escapeCSV(it.asistenciaLabel),
    escapeCSV(it.horaRegistro || ''),
    escapeCSV(it.participacionLabel),
    it.puntosFecha,
    it.participacionesMateriaTotal,
    it.puntosMateriaTotal,
    `${it.porcentajeAsistenciaMateria.toFixed(1)}%`,
    escapeCSV(it.observaciones || '')
  ].join(','));

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanMateria = reporte.materia.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  link.setAttribute('download', `Reporte_UNRC_${cleanMateria}_${reporte.fecha}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Genera y descarga el PDF Oficial Institucional UNRC con membrete, KPIs, tabla formateada y firmas
 */
export function exportReporteToPDF(reporte: ReporteMateriaResumen): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Franja institucional superior (Vino y Oro UNRC)
  doc.setFillColor(91, 20, 47); // #5B142F Vino UNRC
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setFillColor(232, 169, 56); // #E8A938 Oro UNRC
  doc.rect(0, 24, pageWidth, 2.5, 'F');

  // Textos del Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('UNIVERSIDAD NACIONAL ROSARIO CASTELLANOS', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(253, 230, 138); // Amber 200
  doc.text('CONTROL ACADÉMICO DE ASISTENCIA Y PARTICIPACIÓN POR ASIGNATURA', 14, 18);

  // Fecha de emisión esquina derecha
  doc.setFontSize(7.5);
  doc.setTextColor(240, 240, 240);
  doc.text(`Emisión: ${getTijuanaDateString()} ${getTijuanaTimeString()}`, pageWidth - 14, 18, { align: 'right' });

  // 2. Tarjeta con Metadatos del Curso
  let currentY = 32;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(14, currentY, pageWidth - 28, 26, 3, 3, 'FD');

  // Columna Izquierda
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('ASIGNATURA / MATERIA:', 18, currentY + 6);
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(reporte.materia, 18, currentY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DOCENTE TITULAR:', 18, currentY + 18);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(reporte.docenteNombre || 'Docente Titular Asignado', 18, currentY + 23);

  // Columna Centro
  const colMid = 100;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('GRUPO Y CARRERA:', colMid, currentY + 6);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const grpCarrera = `${reporte.grupo || 'Grupo UNRC'} • ${reporte.carrera || 'Licenciatura'}`;
  doc.text(grpCarrera.length > 32 ? grpCarrera.slice(0, 32) + '...' : grpCarrera, colMid, currentY + 11);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('CICLO / SEDE:', colMid, currentY + 18);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`${reporte.ciclo} • ${reporte.sedeNombre || 'Campus Tijuana'}`, colMid, currentY + 23);

  // Columna Derecha: Fecha Evaluada destacada
  const colRight = pageWidth - 18;
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('FECHA EVALUADA:', colRight, currentY + 6, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(91, 20, 47); // Vino UNRC
  doc.text(reporte.fecha, colRight, currentY + 12, { align: 'right' });

  // 3. Tarjetas KPI de Resumen de la Sesión
  currentY += 30;
  const kpiWidth = (pageWidth - 28 - 12) / 4; // 4 cajitas

  // KPI 1: Tasa de Asistencia
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(187, 247, 208); // Emerald 200
  doc.roundedRect(14, currentY, kpiWidth, 16, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(21, 128, 61); // Emerald 700
  doc.text('TASA ASISTENCIA', 14 + kpiWidth / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${reporte.porcentajeAsistencia.toFixed(0)}%`, 14 + kpiWidth / 2, currentY + 12, { align: 'center' });

  // KPI 2: Presentes vs Faltas
  const kpi2X = 14 + kpiWidth + 4;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(kpi2X, currentY, kpiWidth, 16, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('ASISTENCIA (A / R / F)', kpi2X + kpiWidth / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${reporte.presentes}A • ${reporte.retardos}R • ${reporte.faltas}F`, kpi2X + kpiWidth / 2, currentY + 12, { align: 'center' });

  // KPI 3: Participaciones del Día
  const kpi3X = kpi2X + kpiWidth + 4;
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.setDrawColor(253, 230, 138); // Amber 200
  doc.roundedRect(kpi3X, currentY, kpiWidth, 16, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text('PARTICIPACIONES DÍA', kpi3X + kpiWidth / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${reporte.totalParticipacionesFecha} (${reporte.totalPuntosFecha} pts)`, kpi3X + kpiWidth / 2, currentY + 12, { align: 'center' });

  // KPI 4: Total Alumnos
  const kpi4X = kpi3X + kpiWidth + 4;
  doc.setFillColor(238, 242, 255); // Indigo 50
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(kpi4X, currentY, kpiWidth, 16, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(67, 56, 202); // Indigo 700
  doc.text('TOTAL EN LISTA', kpi4X + kpiWidth / 2, currentY + 5, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${reporte.totalAlumnos} alumnos`, kpi4X + kpiWidth / 2, currentY + 12, { align: 'center' });

  // 4. Tabla Detallada de Alumnos con autoTable
  currentY += 20;

  const tableRows = reporte.items.map((it, idx) => [
    idx + 1,
    it.matricula,
    it.nombreCompleto,
    it.asistenciaLabel,
    it.participacionLabel,
    it.puntosFecha > 0 ? `+${it.puntosFecha} pts` : '-',
    `${it.asistenciasMateriaTotal}A / ${it.faltasMateriaTotal}F (${it.porcentajeAsistenciaMateria.toFixed(0)}%)`,
    `${it.participacionesMateriaTotal} (${it.puntosMateriaTotal} pts)`,
    it.observaciones || '-'
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [[
      '#',
      'Matrícula',
      'Alumno',
      'Asistencia',
      'Participación',
      'Pts Día',
      'Histórico Asistencia',
      'Part. Acum.',
      'Observaciones'
    ]],
    body: tableRows.length > 0 ? tableRows : [['-', '-', 'No se encontraron alumnos registrados', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [91, 20, 47], // Vino UNRC
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 7 },
      1: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      2: { cellWidth: 42 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 24 },
      7: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      8: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      // Colorear celda de Asistencia (columna 3)
      if (data.section === 'body' && data.column.index === 3) {
        const text = String(data.cell.raw || '');
        if (text.includes('Presente')) {
          data.cell.styles.textColor = [21, 128, 61];
          data.cell.styles.fillColor = [240, 253, 244];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('Retardo')) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('Falta')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 242, 242];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('Justificado')) {
          data.cell.styles.textColor = [3, 105, 161];
          data.cell.styles.fillColor = [240, 249, 255];
        }
      }
      // Colorear celda de Participación (columna 4)
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw || '');
        if (text.includes('Excelente') || text.includes('AP')) {
          data.cell.styles.textColor = [161, 98, 7];
          data.cell.styles.fillColor = [254, 252, 232];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('Buena') || text.includes('Regular')) {
          data.cell.styles.textColor = [2, 132, 199];
          data.cell.styles.fillColor = [240, 249, 255];
        } else if (text.includes('Por mejorar') || text.includes('RP')) {
          data.cell.styles.textColor = [194, 65, 12];
          data.cell.styles.fillColor = [255, 247, 237];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  // 5. Firmas oficiales al pie
  const finalTableY = (doc as any).lastAutoTable?.finalY || currentY + 60;
  let signY = finalTableY + 18;

  // Si no cabe en la misma página, agregar una nueva página
  if (signY + 30 > pageHeight) {
    doc.addPage();
    signY = 30;
  }

  const signWidth = 65;
  const colSign1X = 25;
  const colSign2X = pageWidth - 25 - signWidth;

  // Línea Firma 1 (Docente)
  doc.setDrawColor(148, 163, 184);
  doc.line(colSign1X, signY, colSign1X + signWidth, signY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(reporte.docenteNombre || 'Docente Titular Asignado', colSign1X + signWidth / 2, signY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Docente Titular de la Asignatura', colSign1X + signWidth / 2, signY + 9, { align: 'center' });

  // Línea Firma 2 (Coordinación)
  doc.line(colSign2X, signY, colSign2X + signWidth, signY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Coordinación Académica UNRC', colSign2X + signWidth / 2, signY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Sello y Visto Bueno Institucional', colSign2X + signWidth / 2, signY + 9, { align: 'center' });

  // Pie de página institucional en todas las páginas
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Universidad Nacional Rosario Castellanos • Sistema Integral de Control Escolar • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const cleanMateria = reporte.materia.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  const cleanFecha = reporte.fecha.replace(/[^a-zA-Z0-9-]/g, '_');
  doc.save(`Reporte_UNRC_${cleanMateria}_${cleanFecha}.pdf`);
}
