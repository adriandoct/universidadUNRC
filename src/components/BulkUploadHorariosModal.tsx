"use client";

import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  Building,
  UserCheck,
  FileText,
  ExternalLink,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Globe,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Check,
  Filter,
  Layers,
  Edit3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Docente, Carrera, Sede, Grupo, Materia, db } from '@/lib/db';
import {
  areCarrerasCompatible,
  getCarreraDisplayName,
  getInstitutionalModalityForDay,
  generateDocenteHorarioPDF,
  downloadDocenteICS
} from '@/lib/horarioDocenteUtils';

export interface MatrixDaySlot {
  dia: string; // 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo'
  dayKey: 'LUN' | 'MAR' | 'MIER' | 'JUE' | 'VIE' | 'SAB' | 'DOM';
  rawTime: string; // e.g. "07:00-09:00"
  hora_inicio: string; // "07:00"
  hora_fin: string; // "09:00"
  es_en_linea: boolean; // true = Virtual (Fondo Azul Claro), false = Presencial (Fondo Verde Claro)
  aula?: string;
}

export interface ParsedMatrixRow {
  index: number;
  selected: boolean;
  grupo: string;
  asignatura: string;
  bloque: string;
  slots: {
    LUN?: MatrixDaySlot;
    MAR?: MatrixDaySlot;
    MIER?: MatrixDaySlot;
    JUE?: MatrixDaySlot;
    VIE?: MatrixDaySlot;
    SAB?: MatrixDaySlot;
    DOM?: MatrixDaySlot;
  };
  aula: string;
  indicador: string;
  carrera?: string;
  status: 'valid' | 'warning' | 'error';
  errorMessage?: string;
}

export interface ScheduleMetadata {
  direccion: string;
  periodo: string;
  docenteNombre: string;
  matricula: string;
  fechaEmision: string;
  modalidad: string;
}

export interface ParsedHorarioRow {
  index: number;
  selected?: boolean;
  docenteRaw: string;
  matricula?: string;
  docenteMatched?: Docente;
  carrera: string;
  materia: string;
  grupo: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  aula: string;
  es_en_linea: boolean;
  status: 'valid' | 'warning' | 'error';
  errorMessage?: string;
  isCustomDay?: boolean;
  isNewDocente?: boolean;
}

interface BulkUploadHorariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (summary: { totalSlotsAdded: number; docentesUpdated: number; affectedDocentes?: Docente[] }) => Promise<void> | void;
  existingDocentes: Docente[];
  carreras: Carrera[];
  grupos: Grupo[];
  materias: Materia[];
  sedes: Sede[];
  targetDocente?: Docente | null;
  showToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export default function BulkUploadHorariosModal({
  isOpen,
  onClose,
  onSuccess,
  existingDocentes,
  carreras,
  grupos,
  materias,
  sedes,
  targetDocente,
  showToast = () => {}
}: BulkUploadHorariosModalProps) {
  const [file, setFile] = useState<File | null>(null);
  
  // Modo Malla (Matriz semanal como en la imagen)
  const [isMatrixMode, setIsMatrixMode] = useState(true);
  const [metadata, setMetadata] = useState<ScheduleMetadata>({
    direccion: 'DIRECCIÓN DE CAMPOS DE CONOCIMIENTO Y DESARROLLO DOCENTE',
    periodo: 'ASIGNACIÓN ACADÉMICA 2026-2',
    docenteNombre: '',
    matricula: '',
    fechaEmision: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    modalidad: 'Híbrida (Presencial / Virtual)'
  });
  const [matrixRows, setMatrixRows] = useState<ParsedMatrixRow[]>([]);

  // Fallback para archivos con formato de lista vertical
  const [parsedRows, setParsedRows] = useState<ParsedHorarioRow[]>([]);
  
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'completed'>('upload');
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  
  const [savedResult, setSavedResult] = useState<{
    totalSlotsAdded: number;
    docentesUpdated: number;
    affectedDocentes: Docente[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const normalizeStr = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const normalizeTimeStr = (t: any): string => {
    if (!t) return '07:00';
    let s = String(t).trim();
    if (!isNaN(Number(s)) && Number(s) > 0 && Number(s) < 1) {
      const totalMinutes = Math.round(Number(s) * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    const match = s.match(/(\d{1,2})[:.](\d{2})/);
    if (match) {
      return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
    }
    const numOnly = s.match(/^(\d{1,2})$/);
    if (numOnly) {
      return `${String(numOnly[1]).padStart(2, '0')}:00`;
    }
    return '07:00';
  };

  const parseTimeRange = (raw: string): { hora_inicio: string; hora_fin: string } => {
    let horaIni = '07:00';
    let horaFin = '09:00';
    const clean = raw.trim();

    if (clean.includes('-') || clean.includes('–') || clean.includes('—') || /\ba\b/i.test(clean)) {
      const parts = clean.split(/\s*(?:-|–|—|\ba\b|al|to|hasta)\s*/i);
      if (parts[0]) horaIni = normalizeTimeStr(parts[0]);
      if (parts[1]) horaFin = normalizeTimeStr(parts[1]);
    } else {
      horaIni = normalizeTimeStr(clean);
      const startH = parseInt(horaIni.split(':')[0], 10) || 7;
      horaFin = `${String(Math.min(startH + 2, 22)).padStart(2, '0')}:00`;
    }

    if (horaFin === horaIni || !/^\d{2}:\d{2}$/.test(horaFin)) {
      const startH = parseInt(horaIni.split(':')[0], 10) || 7;
      horaFin = `${String(Math.min(startH + 2, 22)).padStart(2, '0')}:00`;
    }

    return { hora_inicio: horaIni, hora_fin: horaFin };
  };

  const parseMatrixData = (matrix: any[][]) => {
    if (!matrix || matrix.length < 2) {
      showToast('El archivo no contiene suficientes filas de datos.', 'error');
      return;
    }

    // 1. Escanear metadatos en la cabecera (Filas 0 a 10)
    let metaDir = 'DIRECCIÓN DE CAMPOS DE CONOCIMIENTO Y DESARROLLO DOCENTE';
    let metaPeriodo = 'ASIGNACIÓN ACADÉMICA 2026-2';
    let metaDocente = targetDocente ? `${targetDocente.nombre} ${targetDocente.apellido_paterno}` : '';
    let metaMatricula = targetDocente ? targetDocente.num_empleado : '';
    let metaFecha = '18/08/2026';
    let metaModalidad = 'Híbrida (Presencial / Virtual)';

    // Encontrar fila de encabezados de la tabla
    let headerIdx = -1;
    let maxHeaderScore = -1;
    const scanLimit = Math.min(matrix.length, 20);

    for (let r = 0; r < scanLimit; r++) {
      const row = matrix[r] || [];
      let score = 0;
      for (let c = 0; c < row.length; c++) {
        const cellText = String(row[c] ?? '').trim();
        const norm = normalizeStr(cellText);

        // Checar textos de título
        if (norm.includes('direccion de campos') || norm.includes('desarrollo docente')) {
          metaDir = cellText;
        }
        if (norm.includes('asignacion academica') || norm.includes('2026-2') || norm.includes('periodo')) {
          metaPeriodo = cellText;
        }

        // Checar Docente
        if (/^docente\s*[:=-]/i.test(cellText)) {
          const parts = cellText.split(/[:=-]\s*/);
          if (parts[1]?.trim()) metaDocente = parts[1].trim();
        } else if (norm === 'docente' || norm === 'docente:') {
          const nextVal = String(row[c + 1] ?? row[c + 2] ?? row[c + 3] ?? row[c + 4] ?? '').trim();
          if (nextVal) metaDocente = nextVal;
        }

        // Checar Matrícula
        if (/^(?:id\s*\/?\s*matricula|matricula|clave|id)\s*[:=-]/i.test(cellText)) {
          const parts = cellText.split(/[:=-]\s*/);
          if (parts[1]?.trim()) metaMatricula = parts[1].trim();
        } else if (norm.includes('matricula') || norm.includes('id / matricula') || norm === 'id') {
          const nextVal = String(row[c + 1] ?? row[c + 2] ?? row[c + 3] ?? row[c + 4] ?? '').trim();
          if (nextVal && !nextVal.toLowerCase().includes('modalidad') && !nextVal.toLowerCase().includes('docente')) {
            metaMatricula = nextVal;
          }
        }

        // Checar Fecha de Emisión
        if (/^fecha\s*(?:de)?\s*emisi[oó]n\s*[:=-]/i.test(cellText)) {
          const parts = cellText.split(/[:=-]\s*/);
          if (parts[1]?.trim()) metaFecha = parts[1].trim();
        } else if (norm.includes('fecha de emision') || norm.includes('emision')) {
          const nextVal = String(row[c + 1] ?? row[c + 2] ?? row[c + 3] ?? '').trim();
          if (nextVal) metaFecha = nextVal;
        }

        // Checar Modalidad
        if (/^modalidad\s*[:=-]/i.test(cellText)) {
          const parts = cellText.split(/[:=-]\s*/);
          if (parts[1]?.trim()) metaModalidad = parts[1].trim();
        } else if (norm === 'modalidad' || norm === 'modalidad:') {
          const nextVal = String(row[c + 1] ?? row[c + 2] ?? row[c + 3] ?? '').trim();
          if (nextVal && !nextVal.includes('fondo') && !nextVal.includes('codigo')) metaModalidad = nextVal;
        }

        // Evaluar si esta fila es el encabezado de la tabla
        if (norm.includes('grupo') || norm.includes('seccion')) score += 30;
        if (norm.includes('asignatura') || norm.includes('materia')) score += 30;
        if (norm === 'lun' || norm.includes('lunes')) score += 20;
        if (norm === 'mar' || norm.includes('martes')) score += 20;
        if (norm === 'mier' || norm.includes('miercoles') || norm === 'mie') score += 20;
        if (norm === 'jue' || norm.includes('jueves')) score += 20;
        if (norm === 'vie' || norm.includes('viernes')) score += 20;
        if (norm === 'sab' || norm.includes('sabado')) score += 20;
        if (norm.includes('bloque')) score += 15;
        if (norm.includes('aula') || norm.includes('indicador')) score += 15;
      }

      if (score > maxHeaderScore && score >= 40) {
        maxHeaderScore = score;
        headerIdx = r;
      }
    }

    if (headerIdx === -1) {
      headerIdx = 0;
    }

    const rawHeaders = (matrix[headerIdx] || []).map((h: any) => String(h ?? '').trim());
    const normHeaders = rawHeaders.map((h) =>
      h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_.-]+/g, '')
    );

    const findCol = (...aliases: string[]) => {
      for (const alias of aliases) {
        const cleanA = alias.replace(/[^a-z0-9]/g, '');
        const idx = normHeaders.findIndex((h) => h.replace(/[^a-z0-9]/g, '') === cleanA);
        if (idx !== -1) return idx;
      }
      for (const alias of aliases) {
        const idx = normHeaders.findIndex((h) => h.includes(alias));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // Columnas de la Malla Oficial
    const colGrupo = findCol('grupo', 'seccion', 'clavegrupo', 'gpo');
    const colAsignatura = findCol('asignatura', 'materia', 'clase', 'unidad');
    const colBloque = findCol('bloque', 'blq', 'b');
    const colLun = findCol('lun', 'lunes', 'l');
    const colMar = findCol('mar', 'martes', 'm');
    const colMier = findCol('mier', 'miercoles', 'mie', 'mi', 'x');
    const colJue = findCol('jue', 'jueves', 'j');
    const colVie = findCol('vie', 'viernes', 'v');
    const colSab = findCol('sab', 'sabado', 's');
    const colDom = findCol('dom', 'domingo', 'd');
    const colAula = findCol('aula', 'salon', 'espacio', 'laboratorio');
    const colIndicador = findCol('indicador', 'ind', 'codigo');

    // Verificar si es Formato Matriz (tiene columnas de días de la semana)
    const hasDayCols = [colLun, colMar, colMier, colJue, colVie, colSab].filter((c) => c >= 0).length >= 2;

    if (hasDayCols) {
      setIsMatrixMode(true);
      const parsedMatrix: ParsedMatrixRow[] = [];

      for (let r = headerIdx + 1; r < matrix.length; r++) {
        const row = matrix[r] || [];
        if (row.length === 0 || row.every((c: any) => String(c ?? '').trim() === '')) continue;

        const grupoRaw = colGrupo >= 0 ? String(row[colGrupo] ?? '').trim() : '';
        const asignaturaRaw = colAsignatura >= 0 ? String(row[colAsignatura] ?? '').trim() : '';
        const bloqueRaw = colBloque >= 0 ? String(row[colBloque] ?? '').trim() : 'B0';
        const aulaRaw = colAula >= 0 ? String(row[colAula] ?? '').trim() : '';
        const indicadorRaw = colIndicador >= 0 ? String(row[colIndicador] ?? '').trim() : '';

        // Si la fila no contiene materia ni grupo, omitirla
        if (!grupoRaw && !asignaturaRaw) continue;

        const slots: ParsedMatrixRow['slots'] = {};

        const checkDaySlot = (
          colIdx: number,
          dayKey: MatrixDaySlot['dayKey'],
          dayName: string,
          defaultOnline: boolean
        ) => {
          if (colIdx < 0) return;
          const val = String(row[colIdx] ?? '').trim();
          if (!val || val === '-' || val === '--') return;

          // Si contiene horas (ej: "07:00-09:00")
          if (/\d{1,2}[:.]\d{2}/.test(val) || /^\d{1,2}\s*-\s*\d{1,2}/.test(val)) {
            const { hora_inicio, hora_fin } = parseTimeRange(val);

            // Determinar modalidad:
            // Regla Institucional UNRC:
            // Lunes, Martes y Sábado: En Línea (Azul Claro)
            // Miércoles, Jueves y Viernes: Presencial (Verde Claro)
            let isOnline = defaultOnline;

            // Si el texto incluye explícitamente virtual/presencial
            if (val.toLowerCase().includes('vir') || val.toLowerCase().includes('lin') || val.toLowerCase().includes('meet')) {
              isOnline = true;
            } else if (val.toLowerCase().includes('pre') || val.toLowerCase().includes('cam') || val.toLowerCase().includes('aul')) {
              isOnline = false;
            }

            slots[dayKey] = {
              dia: dayName,
              dayKey,
              rawTime: `${hora_inicio}-${hora_fin}`,
              hora_inicio,
              hora_fin,
              es_en_linea: isOnline,
              aula: aulaRaw || (isOnline ? 'Aula Virtual UNRC' : 'Campus Tijuana')
            };
          }
        };

        // LUN: En Línea por defecto (Azul Claro)
        checkDaySlot(colLun, 'LUN', 'Lunes', true);
        // MAR: En Línea por defecto (Azul Claro)
        checkDaySlot(colMar, 'MAR', 'Martes', true);
        // MIER: Presencial por defecto (Verde Claro)
        checkDaySlot(colMier, 'MIER', 'Miércoles', false);
        // JUE: Presencial por defecto (Verde Claro)
        checkDaySlot(colJue, 'JUE', 'Jueves', false);
        // VIE: Presencial por defecto (Verde Claro)
        checkDaySlot(colVie, 'VIE', 'Viernes', false);
        // SAB: En Línea por defecto (Azul Claro)
        checkDaySlot(colSab, 'SAB', 'Sábado', true);
        // DOM: En Línea si existe
        checkDaySlot(colDom, 'DOM', 'Domingo', true);

        parsedMatrix.push({
          index: parsedMatrix.length + 1,
          selected: true,
          grupo: grupoRaw || 'PHL-TIJ',
          asignatura: asignaturaRaw || 'Asignatura UNRC',
          bloque: bloqueRaw || 'B0',
          slots,
          aula: aulaRaw,
          indicador: indicadorRaw,
          carrera: getCarreraDisplayName(asignaturaRaw || grupoRaw),
          status: 'valid'
        });
      }

      setMetadata({
        direccion: metaDir,
        periodo: metaPeriodo,
        docenteNombre: metaDocente || (targetDocente ? `${targetDocente.nombre} ${targetDocente.apellido_paterno}` : 'SILVA RAMIREZ ADRIAN'),
        matricula: metaMatricula || (targetDocente ? targetDocente.num_empleado : 'UNRC002876'),
        fechaEmision: metaFecha,
        modalidad: metaModalidad
      });

      setMatrixRows(parsedMatrix);
      setStep('preview');
      showToast(
        `✅ Formato de Asignación Académica detectado: ${parsedMatrix.length} asignaturas con distribución semanal.`,
        'success'
      );
    } else {
      // Fallback a lista vertical estándar
      setIsMatrixMode(false);
      showToast('Formato de lista vertical detectado.', 'info');
      setStep('preview');
    }
  };

  const handleFile = (selectedFile: File) => {
    const ext = selectedFile.name.toLowerCase().split('.').pop();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      showToast('Formato no válido. Sube un archivo .xlsx, .xls o .csv', 'error');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();

    if (ext === 'csv') {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        const matrix = lines.map((line) => {
          const row: string[] = [];
          let insideQuotes = false;
          let currentCell = '';
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if ((char === ',' || char === ';') && !insideQuotes) {
              row.push(currentCell.trim());
              currentCell = '';
            } else {
              currentCell += char;
            }
          }
          row.push(currentCell.trim());
          return row;
        });
        parseMatrixData(matrix);
      };
      reader.readAsText(selectedFile, 'UTF-8');
    } else {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
          parseMatrixData(matrix);
        } catch (err: any) {
          showToast(`Error al leer archivo Excel: ${err.message}`, 'error');
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFile(droppedFile);
  };

  // Alternar modalidad de una celda específica en la malla (clic directo sobre el bloque)
  const handleToggleMatrixSlotModality = (rowIndex: number, dayKey: MatrixDaySlot['dayKey']) => {
    setMatrixRows((prev) =>
      prev.map((r) => {
        if (r.index === rowIndex && r.slots[dayKey]) {
          const slot = r.slots[dayKey]!;
          const nextOnline = !slot.es_en_linea;
          return {
            ...r,
            slots: {
              ...r.slots,
              [dayKey]: {
                ...slot,
                es_en_linea: nextOnline,
                aula: nextOnline ? 'Aula Virtual UNRC' : (r.aula || 'Campus Tijuana')
              }
            }
          };
        }
        return r;
      })
    );
  };

  // Alternar selección de fila en la malla
  const handleToggleSelectMatrixRow = (index: number) => {
    setMatrixRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const areAllMatrixSelected = matrixRows.length > 0 && matrixRows.every((r) => r.selected);

  const handleToggleSelectAllMatrix = () => {
    const nextVal = !areAllMatrixSelected;
    setMatrixRows((prev) => prev.map((r) => ({ ...r, selected: nextVal })));
  };

  // Descargar plantilla oficial idéntica al archivo mostrado por el usuario
  const handleDownloadTemplate = () => {
    const title1 = ['DIRECCIÓN DE CAMPOS DE CONOCIMIENTO Y DESARROLLO DOCENTE'];
    const title2 = ['ASIGNACIÓN ACADÉMICA 2026-2'];
    const emptyRow: string[] = [];
    const infoRow1 = ['Docente:', 'SILVA RAMIREZ ADRIAN', '', '', 'Fecha de Emisión:', '18/08/2026'];
    const infoRow2 = ['ID / Matrícula:', 'UNRC002876', '', '', 'Modalidad:', 'Híbrida (Presencial / Virtual)'];
    const legendRow = ['Código de Modalidad: [Presencial: Fondo Verde Claro] | [Virtual: Fondo Azul Claro]'];
    const tableHeaders = ['GRUPO', 'ASIGNATURA', 'BLOQUE', 'LUN', 'MAR', 'MIER', 'JUE', 'VIE', 'SAB', 'AULA', 'INDICADOR'];
    
    const sampleData = [
      ['PHLAC-203-TIJ', 'MATEMÁTICAS PARA LA ADMINISTRACIÓN', 'BO', '', '', '07:00-09:00', '', '', '09:00-11:00', '', 'P-LM/C-JS'],
      ['PHLCDN-201-TIJ', 'PROGRAMACIÓN PARA LA CIENCIA DE DATOS', 'BO', '07:00-09:00', '', '', '', '07:00-09:00', '', '', 'P-JS/C-LM'],
      ['PHLCDN-301-TIJ', 'ESTRUCTURAS DE DATOS', 'BO', '', '07:00-09:00', '', '07:00-09:00', '', '', '', 'P-JS/C-LM'],
      ['PHLCDN-401-TIJ', 'BASE DE DATOS NOSQL', 'BO', '', '09:00-11:00', '', '09:00-11:00', '', '', '', 'P-JS/C-LM'],
      ['PHLTUR-201-TIJ', 'ADMINISTRACIÓN DE EMPRESAS DE HOSPEDAJE', 'BO', '', '', '09:00-11:00', '', '', '07:00-09:00', '', 'P-LM/C-JS']
    ];

    const aoa = [
      title1,
      title2,
      emptyRow,
      infoRow1,
      infoRow2,
      emptyRow,
      legendRow,
      emptyRow,
      tableHeaders,
      ...sampleData
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asignacion_2026-2');
    XLSX.writeFile(wb, 'Asignacion_Academica_Oficial_UNRC.xlsx');
    showToast('Plantilla oficial descargada con la malla semanal institucional.', 'info');
  };

  // Subir horarios confirmados a la base de datos
  const handleConfirmImport = async () => {
    setIsSubmitting(true);
    try {
      const payload: any[] = [];

      if (isMatrixMode) {
        const selectedRows = matrixRows.filter((r) => r.selected);
        if (selectedRows.length === 0) {
          showToast('Selecciona al menos una fila para subir a la base de datos.', 'error');
          setIsSubmitting(false);
          return;
        }

        const docName = metadata.docenteNombre.trim() || 'Docente Titular';
        const docMatricula = metadata.matricula.trim() || 'UNRC002876';

        selectedRows.forEach((r) => {
          Object.values(r.slots).forEach((slot) => {
            if (!slot) return;
            payload.push({
              docenteIdentificador: docMatricula || docName,
              docenteRaw: docName,
              matricula: docMatricula,
              carrera: r.carrera || 'Licenciatura',
              materia: r.asignatura,
              grupo: r.grupo,
              dia: slot.dia,
              hora_inicio: slot.hora_inicio,
              hora_fin: slot.hora_fin,
              aula: slot.aula || (slot.es_en_linea ? 'Aula Virtual UNRC (Google Meet / Classroom)' : 'Campus Tijuana - Aula Asignada'),
              es_en_linea: slot.es_en_linea,
              sede: sedes[0]?.nombre || 'Campus Tijuana'
            });
          });
        });
      } else {
        const toImport = parsedRows.filter((r) => r.selected ?? true);
        toImport.forEach((r) => {
          payload.push({
            docenteIdentificador: r.docenteMatched?.num_empleado || r.matricula || r.docenteRaw,
            docenteRaw: r.docenteMatched ? `${r.docenteMatched.nombre} ${r.docenteMatched.apellido_paterno}` : r.docenteRaw,
            matricula: r.matricula || '',
            carrera: r.carrera,
            materia: r.materia,
            grupo: r.grupo,
            dia: r.dia,
            hora_inicio: r.hora_inicio,
            hora_fin: r.hora_fin,
            aula: r.aula,
            es_en_linea: r.es_en_linea,
            sede: sedes[0]?.nombre || 'Campus Tijuana'
          });
        });
      }

      if (payload.length === 0) {
        showToast('No se encontraron sesiones de horario para registrar.', 'error');
        setIsSubmitting(false);
        return;
      }

      const res = await db.addHorariosBulk(payload);
      const allDocentes = await db.getDocentes();

      // Encontrar docente registrado / actualizado
      const docTargetMat = metadata.matricula.toLowerCase().trim();
      const docTargetNom = metadata.docenteNombre.toLowerCase().trim();
      const updatedDoc = allDocentes.find(
        (d) =>
          (docTargetMat && (d.num_empleado.toLowerCase() === docTargetMat || (d as any).matricula?.toLowerCase() === docTargetMat)) ||
          `${d.nombre} ${d.apellido_paterno}`.toLowerCase().includes(docTargetNom) ||
          docTargetNom.includes(`${d.nombre} ${d.apellido_paterno}`.toLowerCase())
      ) || (targetDocente ? targetDocente : allDocentes[0]);

      setSavedResult({
        totalSlotsAdded: res.totalSlotsAdded,
        docentesUpdated: res.docentesUpdated,
        affectedDocentes: updatedDoc ? [updatedDoc] : []
      });

      setStep('completed');
      showToast(
        `✅ Horario verificado y registrado: ${res.totalSlotsAdded} bloques de clase guardados en la base de datos para ${metadata.docenteNombre || 'el docente'}.`,
        'success'
      );

      await onSuccess({
        totalSlotsAdded: res.totalSlotsAdded,
        docentesUpdated: res.docentesUpdated,
        affectedDocentes: updatedDoc ? [updatedDoc] : []
      });
    } catch (err: any) {
      showToast(`Error al subir a base de datos: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMatrixSlots = matrixRows.reduce((acc, r) => acc + (r.selected ? Object.keys(r.slots).length : 0), 0);
  const matrixOnlineSlots = matrixRows.reduce(
    (acc, r) => acc + (r.selected ? Object.values(r.slots).filter((s) => s?.es_en_linea).length : 0),
    0
  );
  const matrixPresencialSlots = matrixRows.reduce(
    (acc, r) => acc + (r.selected ? Object.values(r.slots).filter((s) => s && !s.es_en_linea).length : 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0B132B] border border-blue-500/30 rounded-3xl max-w-6xl w-full p-3 sm:p-6 space-y-4 shadow-2xl shadow-blue-950/60 relative flex flex-col max-h-[96vh] overflow-y-auto">
        
        {/* Encabezado del Modal */}
        <div className="flex items-start justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-950/50 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Horarios Docentes: Asignación Académica Oficial
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Formato Malla Semanal Excel
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Visualización idéntica al archivo oficial • Verificación previa • Registro automático en Base de Datos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* PASO 3: CONFIRMACIÓN Y DESCARGA / EXPORTACIÓN                   */}
        {/* ============================================================== */}
        {step === 'completed' && savedResult ? (
          <div className="space-y-6 py-2 overflow-y-auto max-h-[75vh] animate-fadeIn pr-1">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-[#0B172B] to-[#0A261E] border border-emerald-500/40 text-center space-y-3 shadow-xl">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 mx-auto shadow-lg shadow-emerald-950/60">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-2xl font-black text-white">
                ¡Horario Verificado y Grabado en la Base de Datos!
              </h4>
              <p className="text-sm text-gray-300 max-w-xl mx-auto">
                Se sincronizaron con éxito <strong className="text-emerald-300">{savedResult.totalSlotsAdded} sesiones académicas</strong> para{' '}
                <strong className="text-white">{metadata.docenteNombre}</strong> (Matrícula: <span className="font-mono text-emerald-400">{metadata.matricula}</span>).
              </p>
            </div>

            {/* Acciones de PDF y Google Calendar */}
            {savedResult.affectedDocentes.length > 0 && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-white text-sm block">
                      {metadata.docenteNombre}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      ID / Matrícula: {metadata.matricula} • Periodo: {metadata.periodo}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => generateDocenteHorarioPDF(savedResult.affectedDocentes[0], 'preview')}
                      className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-300" />
                      <span>Visualizar en PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadDocenteICS(savedResult.affectedDocentes[0])}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Exportar a Google Calendar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setStep('upload');
                  setMatrixRows([]);
                  setFile(null);
                  setSavedResult(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-colors flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cargar otro archivo</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/60 transition-all flex items-center space-x-2"
              >
                <span>Listo y Finalizar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* PASO 1: ZONA DE CARGA DE ARCHIVO                                */}
            {/* ============================================================== */}
            {matrixRows.length === 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>
                      Soporta el formato de <strong>Asignación Académica UNRC</strong> con matriz semanal de días (LUN - SAB).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Plantilla Oficial (Excel)</span>
                  </button>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-14 text-center transition-all flex flex-col items-center justify-center space-y-4 ${
                    dragActive ? 'border-blue-400 bg-blue-500/10 scale-[0.99]' : 'border-white/15 bg-black/20 hover:border-blue-500/50'
                  }`}
                >
                  <div className="w-16 h-16 rounded-3xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-950/40">
                    <Upload className="w-8 h-8 animate-bounce" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">
                      Arrastra y suelta aquí el archivo de Horario del Docente (.xlsx / .csv)
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      El sistema detecta automáticamente los datos del docente, matrícula y distribución semanal de materias.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Seleccionar Archivo de Horarios</span>
                  </button>
                </div>
              </div>
            ) : (
              /* ============================================================== */
              /* PASO 2: VISTA EXACTA AL FORMATO OFICIAL SOLICITADO POR EL USER  */
              /* ============================================================== */
              <div className="space-y-4 flex flex-col flex-1">
                
                {/* 1. DOCUMENT HEADER (IDÉNTICO A LA CAPTURA DEL USUARIO) */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 text-gray-900 border border-gray-200 shadow-lg space-y-4">
                  
                  {/* Títulos Oficiales Centrados */}
                  <div className="text-center space-y-0.5 border-b border-gray-200 pb-3">
                    <h2 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-gray-900">
                      {metadata.direccion}
                    </h2>
                    <h3 className="text-xs sm:text-sm font-black text-rose-700 uppercase tracking-wide">
                      {metadata.periodo}
                    </h3>
                  </div>

                  {/* Fila de Datos del Docente & Matrícula */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Columna Izquierda */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-700 min-w-[90px]">Docente:</span>
                        {isEditingMetadata ? (
                          <input
                            type="text"
                            value={metadata.docenteNombre}
                            onChange={(e) => setMetadata({ ...metadata, docenteNombre: e.target.value })}
                            className="flex-1 px-2 py-1 border border-blue-400 rounded text-xs font-bold bg-blue-50/50"
                          />
                        ) : (
                          <span className="font-extrabold uppercase text-gray-900 text-xs sm:text-sm">
                            {metadata.docenteNombre || 'SILVA RAMIREZ ADRIAN'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-700 min-w-[90px]">ID / Matrícula:</span>
                        {isEditingMetadata ? (
                          <input
                            type="text"
                            value={metadata.matricula}
                            onChange={(e) => setMetadata({ ...metadata, matricula: e.target.value })}
                            className="flex-1 px-2 py-1 border border-blue-400 rounded text-xs font-mono font-bold bg-blue-50/50"
                          />
                        ) : (
                          <span className="font-extrabold font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                            {metadata.matricula || 'UNRC002876'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Columna Derecha */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-700 min-w-[110px]">Fecha de Emisión:</span>
                        {isEditingMetadata ? (
                          <input
                            type="text"
                            value={metadata.fechaEmision}
                            onChange={(e) => setMetadata({ ...metadata, fechaEmision: e.target.value })}
                            className="flex-1 px-2 py-1 border border-blue-400 rounded text-xs font-mono"
                          />
                        ) : (
                          <span className="text-gray-900 font-mono">{metadata.fechaEmision || '18/08/2026'}</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-gray-700 min-w-[110px]">Modalidad:</span>
                        {isEditingMetadata ? (
                          <input
                            type="text"
                            value={metadata.modalidad}
                            onChange={(e) => setMetadata({ ...metadata, modalidad: e.target.value })}
                            className="flex-1 px-2 py-1 border border-blue-400 rounded text-xs"
                          />
                        ) : (
                          <span className="text-gray-900 font-semibold">{metadata.modalidad || 'Híbrida (Presencial / Virtual)'}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Banner Amarillo Institucional de Código de Modalidad */}
                  <div className="bg-[#FFF8E7] border border-[#FDE68A] rounded-xl p-2.5 text-center text-[11px] sm:text-xs text-amber-900 italic font-medium flex items-center justify-between flex-wrap gap-2 shadow-sm">
                    <span className="w-full text-center font-serif">
                      Código de Modalidad: [Presencial: Fondo Verde Claro] | [Virtual: Fondo Azul Claro]
                    </span>
                  </div>
                </div>

                {/* Barra de Herramientas de Verificación */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
                  <div className="flex items-center space-x-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllMatrix}
                      className="flex items-center space-x-1.5 text-gray-300 hover:text-white transition-colors"
                    >
                      {areAllMatrixSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="font-bold">
                        {matrixRows.filter((r) => r.selected).length} de {matrixRows.length} materias seleccionadas
                      </span>
                    </button>

                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center space-x-1">
                      <Building className="w-3 h-3" />
                      <span>{matrixPresencialSlots} Presenciales (Fondo Verde)</span>
                    </span>

                    <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold flex items-center space-x-1">
                      <Globe className="w-3 h-3" />
                      <span>{matrixOnlineSlots} Virtuales (Fondo Azul)</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                      className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-bold flex items-center space-x-1 transition-colors"
                    >
                      <Edit3 className="w-3 h-3 text-blue-400" />
                      <span>{isEditingMetadata ? 'Guardar Datos' : 'Editar Datos Docente'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMatrixRows([]);
                        setFile(null);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center space-x-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Limpiar</span>
                    </button>
                  </div>
                </div>

                {/* 2. TABLA DE MALLA EXACTA AL FORMATO DEL ARCHIVO */}
                <div className="overflow-x-auto border border-gray-300 rounded-2xl bg-white shadow-xl max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    {/* Encabezado Azul Marino Oficial */}
                    <thead className="bg-[#102A43] sticky top-0 z-20 text-white font-black tracking-wide border-b-2 border-gray-300 text-[11px] uppercase">
                      <tr>
                        <th className="p-2.5 w-8 text-center border-r border-[#243B53]">
                          <button
                            type="button"
                            onClick={handleToggleSelectAllMatrix}
                            className="text-white hover:text-blue-200 transition-colors"
                          >
                            {areAllMatrixSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-300" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>
                        </th>
                        <th className="p-2.5 min-w-[120px] border-r border-[#243B53]">GRUPO</th>
                        <th className="p-2.5 min-w-[240px] border-r border-[#243B53]">ASIGNATURA</th>
                        <th className="p-2.5 text-center w-14 border-r border-[#243B53]">BLOQUE</th>
                        <th className="p-2.5 text-center min-w-[105px] border-r border-[#243B53]">LUN</th>
                        <th className="p-2.5 text-center min-w-[105px] border-r border-[#243B53]">MAR</th>
                        <th className="p-2.5 text-center min-w-[105px] border-r border-[#243B53]">MIER</th>
                        <th className="p-2.5 text-center min-w-[105px] border-r border-[#243B53]">JUE</th>
                        <th className="p-2.5 text-center min-w-[105px] border-r border-[#243B53]">VIE</th>
                        <th className="p-2.5 text-center min-w-[105px] border-r border-[#243B53]">SAB</th>
                        <th className="p-2.5 min-w-[70px] border-r border-[#243B53]">AULA</th>
                        <th className="p-2.5 min-w-[90px] text-center">INDICADOR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-800 bg-white">
                      {matrixRows.map((row) => {
                        const isSelected = row.selected;
                        return (
                          <tr
                            key={row.index}
                            className={`transition-colors ${
                              isSelected ? 'hover:bg-blue-50/40' : 'opacity-40 bg-gray-50'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-2 text-center border-r border-gray-200">
                              <button
                                type="button"
                                onClick={() => handleToggleSelectMatrixRow(row.index)}
                                className="p-1 rounded hover:bg-gray-100"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-gray-400" />
                                )}
                              </button>
                            </td>

                            {/* Grupo */}
                            <td className="p-2.5 font-bold font-mono text-[11px] text-gray-900 border-r border-gray-200 whitespace-nowrap">
                              {row.grupo}
                            </td>

                            {/* Asignatura */}
                            <td className="p-2.5 font-bold text-gray-900 text-xs border-r border-gray-200">
                              {row.asignatura}
                            </td>

                            {/* Bloque */}
                            <td className="p-2 text-center font-mono font-bold text-gray-700 border-r border-gray-200">
                              {row.bloque}
                            </td>

                            {/* CELDAS DE DÍAS (LUN, MAR, MIER, JUE, VIE, SAB) */}
                            {(['LUN', 'MAR', 'MIER', 'JUE', 'VIE', 'SAB'] as const).map((dayKey) => {
                              const slot = row.slots[dayKey];
                              return (
                                <td
                                  key={dayKey}
                                  className="p-1 text-center border-r border-gray-200 align-middle"
                                >
                                  {slot ? (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleMatrixSlotModality(row.index, dayKey)}
                                      className={`w-full py-1.5 px-1 rounded-md text-[11px] font-bold font-mono tracking-tight transition-all shadow-sm active:scale-95 border ${
                                        slot.es_en_linea
                                          ? 'bg-[#D9EAFD] text-[#0B4F8A] border-[#B6D6F9] hover:bg-[#C8E1FC]'
                                          : 'bg-[#D4EDDA] text-[#155724] border-[#C3E6CB] hover:bg-[#C3E6CB]'
                                      }`}
                                      title={`Modalidad: ${slot.es_en_linea ? 'Virtual (Azul Claro)' : 'Presencial (Verde Claro)'} • Clic para alternar`}
                                    >
                                      {slot.rawTime}
                                    </button>
                                  ) : (
                                    <span className="text-gray-300 select-none">-</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Aula */}
                            <td className="p-2 text-xs text-gray-700 font-mono border-r border-gray-200 whitespace-nowrap">
                              {row.aula || ''}
                            </td>

                            {/* Indicador */}
                            <td className="p-2 text-center text-xs font-mono font-semibold text-gray-800 whitespace-nowrap">
                              {row.indicador || ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer del Modal con botón de Subir a BD una vez verificado */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Verificado: Se guardarán{' '}
                      <strong className="text-white">{totalMatrixSlots} bloques de clase</strong> para el docente{' '}
                      <strong className="text-emerald-300">{metadata.docenteNombre}</strong> (Matrícula:{' '}
                      <span className="font-mono text-white">{metadata.matricula}</span>).
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || totalMatrixSlots === 0}
                      onClick={handleConfirmImport}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-xl shadow-emerald-900/40 transition-all flex items-center justify-center space-x-2 active:scale-95"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Guardando en Base de Datos...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Subir a Base de Datos (Verificado)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
