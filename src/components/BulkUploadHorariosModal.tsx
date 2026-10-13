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
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Docente, Carrera, Sede, Grupo, Materia, db } from '@/lib/db';
import {
  areCarrerasCompatible,
  getCarreraDisplayName,
  getInstitutionalModalityForDay,
  generateDocenteHorarioPDF,
  downloadDocenteICS,
  createGoogleCalendarUrl
} from '@/lib/horarioDocenteUtils';

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
  isCustomDay?: boolean; // Día fuera de la regla estándar L/M/S o M/J/V
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
  const [parsedRows, setParsedRows] = useState<ParsedHorarioRow[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'presencial' | 'valid' | 'warning' | 'error'>('all');
  const [step, setStep] = useState<'upload' | 'preview' | 'completed'>('upload');
  const [savedResult, setSavedResult] = useState<{
    totalSlotsAdded: number;
    docentesUpdated: number;
    affectedDocentes: Docente[];
  } | null>(null);

  // Pregunta activa para días especiales (ej: Domingo u otros)
  const [pendingSpecialDayQuestion, setPendingSpecialDayQuestion] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const normalizeStr = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const normalizeDayName = (rawDay: string): string => {
    const d = normalizeStr(rawDay);
    if (!d) return 'Lunes';
    
    // Nombres completos o inicios en español/inglés
    if (d.includes('lun') || d.startsWith('lun') || /\bmon/i.test(d)) return 'Lunes';
    if (d.includes('mar') || d.startsWith('mar') || /\btue/i.test(d)) return 'Martes';
    if (d.includes('mie') || d.includes('mié') || d.startsWith('mie') || /\bwed/i.test(d) || /\b(x)\b/i.test(d)) return 'Miércoles';
    if (d.includes('jue') || d.startsWith('jue') || /\bthu/i.test(d)) return 'Jueves';
    if (d.includes('vie') || d.startsWith('vie') || /\bfri/i.test(d)) return 'Viernes';
    if (d.includes('sab') || d.includes('sáb') || d.startsWith('sab') || /\bsat/i.test(d)) return 'Sábado';
    if (d.includes('dom') || d.startsWith('dom') || /\bsun/i.test(d)) return 'Domingo';

    // Abreviaturas comunes de una o dos letras (L, M, MI, X, J, V, S, D)
    const upper = d.toUpperCase().trim();
    if (upper === 'L' || upper === 'LU') return 'Lunes';
    if (upper === 'M' || upper === 'MA') return 'Martes';
    if (upper === 'X' || upper === 'MI') return 'Miércoles';
    if (upper === 'J' || upper === 'JU') return 'Jueves';
    if (upper === 'V' || upper === 'VI') return 'Viernes';
    if (upper === 'S' || upper === 'SA') return 'Sábado';
    if (upper === 'D' || upper === 'DO') return 'Domingo';

    // Números 1 a 7
    if (upper === '1') return 'Lunes';
    if (upper === '2') return 'Martes';
    if (upper === '3') return 'Miércoles';
    if (upper === '4') return 'Jueves';
    if (upper === '5') return 'Viernes';
    if (upper === '6') return 'Sábado';
    if (upper === '7') return 'Domingo';

    return rawDay.trim() || 'Lunes';
  };

  const detectDayFromValue = (raw: any): string | null => {
    if (!raw) return null;
    const str = String(raw).trim();
    if (!str) return null;
    const d = normalizeStr(str);

    if (d.includes('lun') || /\bmon/i.test(d)) return 'Lunes';
    if (d.includes('mar') || /\btue/i.test(d)) return 'Martes';
    if (d.includes('mie') || d.includes('mié') || /\bwed/i.test(d) || /\b(x)\b/i.test(d)) return 'Miércoles';
    if (d.includes('jue') || /\bthu/i.test(d)) return 'Jueves';
    if (d.includes('vie') || /\bfri/i.test(d)) return 'Viernes';
    if (d.includes('sab') || d.includes('sáb') || /\bsat/i.test(d)) return 'Sábado';
    if (d.includes('dom') || /\bsun/i.test(d)) return 'Domingo';

    const upper = d.toUpperCase().trim();
    if (upper === 'L' || upper === 'LU') return 'Lunes';
    if (upper === 'M' || upper === 'MA') return 'Martes';
    if (upper === 'X' || upper === 'MI') return 'Miércoles';
    if (upper === 'J' || upper === 'JU') return 'Jueves';
    if (upper === 'V' || upper === 'VI') return 'Viernes';
    if (upper === 'S' || upper === 'SA') return 'Sábado';
    if (upper === 'D' || upper === 'DO') return 'Domingo';

    if (upper === '1') return 'Lunes';
    if (upper === '2') return 'Martes';
    if (upper === '3') return 'Miércoles';
    if (upper === '4') return 'Jueves';
    if (upper === '5') return 'Viernes';
    if (upper === '6') return 'Sábado';
    if (upper === '7') return 'Domingo';

    return null;
  };

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

  const matchDocente = (rawName: string, rawMatricula?: string): Docente | undefined => {
    if (targetDocente) return targetDocente;
    const cleanMat = normalizeStr(rawMatricula || '');
    const cleanName = normalizeStr(rawName || '').replace(/^(?:dr|dra|mtro|mtra|lic|ing|prof|profr|profra)\.?\s+/i, '');

    return existingDocentes.find((d) => {
      const dNum = normalizeStr(d.num_empleado);
      const dMat = normalizeStr((d as any).matricula || '');
      const dEmail = normalizeStr(d.email || '');
      const dPat = normalizeStr(d.apellido_paterno);
      const dMatName = normalizeStr(d.apellido_materno || '');
      const dNom = normalizeStr(d.nombre);
      const dFull = `${dNom} ${dPat} ${dMatName}`.trim();
      const dShort = `${dNom} ${dPat}`.trim();

      if (cleanMat && (dNum === cleanMat || dMat === cleanMat)) return true;
      if (cleanName && (dNum === cleanName || dMat === cleanName || dEmail === cleanName)) return true;
      if (cleanName && (dFull === cleanName || cleanName.includes(dShort) || dShort.includes(cleanName))) return true;
      if (cleanName && cleanName.includes(dPat) && cleanName.includes(dNom)) return true;
      if (cleanName && cleanName.includes(dPat) && dPat.length >= 4) return true;
      return false;
    });
  };

  const parseMatrixData = (matrix: any[][]) => {
    if (!matrix || matrix.length < 2) {
      showToast('El archivo no contiene suficientes filas de datos.', 'error');
      return;
    }

    // 1. Encontrar fila de encabezados
    let headerIdx = 0;
    let maxScore = -1;
    const scanLimit = Math.min(matrix.length, 15);

    for (let i = 0; i < scanLimit; i++) {
      const row = matrix[i] || [];
      let score = 0;
      for (const cell of row) {
        const val = normalizeStr(String(cell ?? ''));
        if (val.includes('docente') || val.includes('profesor') || val.includes('nombre') || val.includes('matricula')) score += 20;
        if (val.includes('materia') || val.includes('asignatura')) score += 20;
        if (val.includes('grupo') || val.includes('seccion')) score += 20;
        if (val.includes('dia') || val.includes('dias')) score += 20;
        if (val.includes('hora') || val.includes('inicio') || val.includes('fin')) score += 20;
      }
      if (score > maxScore && score >= 30) {
        maxScore = score;
        headerIdx = i;
      }
    }

    // Escaneo de metadatos arriba de la cabecera (por si viene "Docente: Dr. Adrian Silva", "Matrícula: DOC-102")
    let metadataDocente = '';
    let metadataMatricula = '';
    for (let r = 0; r < headerIdx; r++) {
      const row = matrix[r] || [];
      for (const cell of row) {
        const text = String(cell ?? '').trim();
        const matchDoc = text.match(/(?:docente|profesor|catedratico|maestro)\s*(?:asignado|titular)?\s*[:=-]\s*([^\n\r]+)/i);
        if (matchDoc && matchDoc[1] && matchDoc[1].trim().length > 2) {
          metadataDocente = matchDoc[1].trim();
        }
        const matchMat = text.match(/(?:matricula|num\.?\s*empleado|no\.?\s*empleado|clave|id)\s*[:=-]\s*([^\n\r]+)/i);
        if (matchMat && matchMat[1] && matchMat[1].trim().length > 1) {
          metadataMatricula = matchMat[1].trim();
        }
      }
    }

    const rawHeaders = (matrix[headerIdx] || []).map((h: any) => String(h ?? '').trim());
    const normHeaders = rawHeaders.map((h) =>
      h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_.-]+/g, '')
    );

    const findCol = (...aliases: string[]) => {
      // 1. Coincidencia exacta
      for (const alias of aliases) {
        const idx = normHeaders.findIndex((h) => h === alias);
        if (idx !== -1) return idx;
      }
      // 2. Coincidencia sin caracteres especiales (paréntesis, guiones, etc.)
      for (const alias of aliases) {
        const cleanA = alias.replace(/[^a-z0-9]/g, '');
        const idx = normHeaders.findIndex((h) => h.replace(/[^a-z0-9]/g, '') === cleanA);
        if (idx !== -1) return idx;
      }
      // 3. Coincidencia por subcadena, protegiendo palabras clave
      for (const alias of aliases) {
        const idx = normHeaders.findIndex((h) => {
          if (alias === 'dia' || alias === 'dias') {
            // Evitar colisión con 'estudiantes', 'mediador', 'modalidad', etc.
            if (h.includes('estudiant') || h.includes('mediad') || h.includes('modalid') || h.includes('cardin')) {
              return false;
            }
          }
          return h.includes(alias);
        });
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // 1. Detección de columna de Matrícula del Docente
    const colMatricula = findCol(
      'matricula', 'matriculadocente', 'matriculadeldocente', 'numempleado', 'noempleado',
      'numdeempleado', 'nodeempleado', 'numeroempleado', 'numerodeempleado',
      'clavedocente', 'claveempleado', 'idempleado', 'iddocente', 'expediente', 'rfc', 'curp'
    );

    // 2. Detección de columna de Nombre del Docente
    let colDocente = findCol(
      'docenteasignado', 'profesorasignado', 'maestroasignado', 'docente', 'profesor',
      'maestro', 'maestra', 'catedratico', 'titular', 'docenteresponsable', 'nombredocente',
      'nombredeldocente', 'nombreprofesor', 'nombredelprofesor', 'nombremaestro', 'facilitador',
      'instructor', 'asesor', 'personalacademico', 'docente/profesor', 'nombrecompleto', 'nombre'
    );

    if (colDocente !== -1 && colDocente === colMatricula) {
      colDocente = -1;
    }

    const colCarrera = findCol('carrera', 'licenciatura', 'carreras', 'area');
    const colMateria = findCol('materia', 'asignatura', 'clase', 'unidad');
    const colGrupo = findCol('grupo', 'seccion', 'clavegrupo', 'gpo');
    const colDia = findCol(
      'dia', 'dias', 'diasemana', 'diadelasemana', 'fechadia', 'fechaclase',
      'diadeclase', 'diasdeclase', 'diadeimparticion', 'diasdeimparticion', 'jornada', 'fecha',
      'diahorario', 'diahora', 'diayhorario', 'diayhora', 'day', 'days', 'weekday'
    );
    
    // Columnas de horario
    const colHorario = findCol('horario', 'horas', 'hora', 'tiempo', 'rango');
    const colInicio = findCol('horainicio', 'horadeinicio', 'inicio', 'desde', 'horaentrada');
    const colFin = findCol('horafin', 'horadefin', 'fin', 'hasta', 'horasalida', 'termino');
    const colAula = findCol('aula', 'salon', 'espacio', 'laboratorio', 'edificio');
    const colModalidad = findCol('modalidad', 'tipo', 'linea', 'presencial', 'esonline', 'formato');

    const rows: ParsedHorarioRow[] = [];
    const specialDaysDetected = new Set<string>();

    for (let i = headerIdx + 1; i < matrix.length; i++) {
      const row = matrix[i] || [];
      if (row.length === 0 || row.every((c: any) => String(c ?? '').trim() === '')) continue;

      let docRaw = colDocente >= 0 ? String(row[colDocente] ?? '').trim() : '';
      let matriculaRaw = colMatricula >= 0 ? String(row[colMatricula] ?? '').trim() : '';

      // Aplicar metadatos o targetDocente si no venían en la celda
      if (!docRaw && metadataDocente) docRaw = metadataDocente;
      if (!matriculaRaw && metadataMatricula) matriculaRaw = metadataMatricula;
      if (!docRaw && targetDocente) docRaw = `${targetDocente.nombre} ${targetDocente.apellido_paterno}`;
      if (!matriculaRaw && targetDocente) matriculaRaw = targetDocente.num_empleado;

      if (docRaw && !matriculaRaw && (/^[A-Z]{2,4}[-_]?\d+/i.test(docRaw) || /^\d{4,8}$/.test(docRaw))) {
        matriculaRaw = docRaw;
        const found = existingDocentes.find((d) => normalizeStr(d.num_empleado) === normalizeStr(docRaw));
        if (found) {
          docRaw = `${found.nombre} ${found.apellido_paterno}`;
        }
      }

      const carreraRaw = colCarrera >= 0 ? String(row[colCarrera] ?? '').trim() : '';
      const materiaRaw = colMateria >= 0 ? String(row[colMateria] ?? '').trim() : '';
      const grupoRaw = colGrupo >= 0 ? String(row[colGrupo] ?? '').trim() : '';
      const diaRaw = colDia >= 0 ? String(row[colDia] ?? '').trim() : '';
      const aulaRaw = colAula >= 0 ? String(row[colAula] ?? '').trim() : '';
      const modRaw = colModalidad >= 0 ? String(row[colModalidad] ?? '').trim() : '';

      // Parseo robusto de Horario (soporta tanto 'HORARIO' combinado como columnas Inicio / Fin)
      let horaIni = '07:00';
      let horaFin = '09:00';
      const horarioRangeRaw = colHorario >= 0 ? String(row[colHorario] ?? '').trim() : '';
      const inicioRaw = colInicio >= 0 ? String(row[colInicio] ?? '').trim() : '';
      const finRaw = colFin >= 0 ? String(row[colFin] ?? '').trim() : '';

      if (horarioRangeRaw && (horarioRangeRaw.includes('-') || horarioRangeRaw.includes('–') || /\ba\b/i.test(horarioRangeRaw))) {
        const parts = horarioRangeRaw.split(/\s*(?:-|–|—|\ba\b|al|to|hasta)\s*/i);
        if (parts[0]) horaIni = normalizeTimeStr(parts[0]);
        if (parts[1]) horaFin = normalizeTimeStr(parts[1]);
      } else if (inicioRaw && (inicioRaw.includes('-') || inicioRaw.includes('–') || /\ba\b/i.test(inicioRaw))) {
        const parts = inicioRaw.split(/\s*(?:-|–|—|\ba\b|al|to|hasta)\s*/i);
        if (parts[0]) horaIni = normalizeTimeStr(parts[0]);
        if (parts[1]) horaFin = normalizeTimeStr(parts[1]);
      } else {
        if (inicioRaw) horaIni = normalizeTimeStr(inicioRaw);
        if (finRaw) horaFin = normalizeTimeStr(finRaw);
      }

      // Validar que horaFin sea válida y posterior a horaIni
      if (!/^\d{2}:\d{2}$/.test(horaFin) || horaFin === horaIni) {
        const startH = parseInt(horaIni.split(':')[0], 10) || 7;
        const endH = Math.min(startH + 2, 22);
        horaFin = `${String(endH).padStart(2, '0')}:00`;
      }

      // Saltar filas vacías sin datos sustanciales
      if (!docRaw && !matriculaRaw && !materiaRaw && !grupoRaw) continue;

      const matchedDoc = matchDocente(docRaw, matriculaRaw);

      // DETECCIÓN MULTINIVEL DE DÍA DE LA CLASE:
      let diaCandidate: string | null = null;

      // 1. De la columna detectada colDia
      if (colDia >= 0) {
        diaCandidate = detectDayFromValue(row[colDia]);
      }

      // 2. De la columna colHorario (ej. "Martes 07:00 - 09:00")
      if (!diaCandidate && colHorario >= 0) {
        diaCandidate = detectDayFromValue(row[colHorario]);
      }

      // 3. De columnas colInicio o colFin
      if (!diaCandidate && colInicio >= 0) {
        diaCandidate = detectDayFromValue(row[colInicio]);
      }
      if (!diaCandidate && colFin >= 0) {
        diaCandidate = detectDayFromValue(row[colFin]);
      }

      // 4. Escanear todas las demás celdas de la fila (priorizando las que no son materia/docente)
      if (!diaCandidate) {
        for (let c = 0; c < row.length; c++) {
          if (c === colMateria || c === colDocente || c === colCarrera) continue;
          const matchDay = detectDayFromValue(row[c]);
          if (matchDay) {
            diaCandidate = matchDay;
            break;
          }
        }
      }

      // 5. Escaneo completo si no hubo coincidencia
      if (!diaCandidate) {
        for (let c = 0; c < row.length; c++) {
          const matchDay = detectDayFromValue(row[c]);
          if (matchDay) {
            diaCandidate = matchDay;
            break;
          }
        }
      }

      const diaClean = diaCandidate || (diaRaw ? normalizeDayName(diaRaw) : 'Lunes');

      // APLICACIÓN DE LA REGLA INSTITUCIONAL UNRC:
      // Lunes, Martes y Sábado: En Línea
      // Miércoles, Jueves y Viernes: Presencial
      const modalityInfo = getInstitutionalModalityForDay(diaClean, modRaw);
      const isCustomDay = !modalityInfo.isStandardRule;

      if (isCustomDay) {
        specialDaysDetected.add(diaClean);
      }

      const isNewDocente = !matchedDoc && Boolean(docRaw || matriculaRaw);
      let status: 'valid' | 'warning' | 'error' = 'valid';
      let errorMessage: string | undefined = undefined;

      if (!materiaRaw) {
        status = 'error';
        errorMessage = 'Falta nombre de la materia';
      } else if (!grupoRaw) {
        status = 'error';
        errorMessage = 'Falta especificar el grupo';
      } else if (!areCarrerasCompatible(materiaRaw, grupoRaw)) {
        status = 'warning';
        const matCarrera = getCarreraDisplayName(materiaRaw);
        const gpoCarrera = getCarreraDisplayName(grupoRaw);
        errorMessage = `Aviso: "${materiaRaw}" (${matCarrera}) asignada al grupo "${grupoRaw}" (${gpoCarrera})`;
      } else if (isNewDocente) {
        status = 'warning';
        errorMessage = `Docente nuevo: se registrará en la base de datos con su matrícula "${matriculaRaw || 'auto-generada'}"`;
      } else if (isCustomDay) {
        status = 'warning';
        errorMessage = `Día ${diaClean} requiere confirmar si es En Línea o Presencial`;
      }

      const defaultAula = modalityInfo.es_en_linea
        ? 'Aula Virtual UNRC (Google Meet / Classroom)'
        : (aulaRaw || 'Campus Tijuana - Aula Asignada');

      const resolvedDocenteRaw = docRaw || (matchedDoc ? `${matchedDoc.nombre} ${matchedDoc.apellido_paterno}` : (matriculaRaw ? `Docente ${matriculaRaw}` : 'Docente Titular'));
      const resolvedMatricula = matriculaRaw || matchedDoc?.num_empleado || '';

      rows.push({
        index: rows.length + 1,
        selected: true,
        docenteRaw: resolvedDocenteRaw,
        matricula: resolvedMatricula,
        docenteMatched: matchedDoc,
        carrera: carreraRaw || matchedDoc?.carreras_asignadas?.[0] || 'Licenciatura',
        materia: materiaRaw,
        grupo: grupoRaw,
        dia: diaClean,
        hora_inicio: horaIni,
        hora_fin: horaFin,
        aula: aulaRaw || defaultAula,
        es_en_linea: modalityInfo.es_en_linea,
        status,
        errorMessage,
        isCustomDay,
        isNewDocente
      });
    }

    setParsedRows(rows);
    setStep('preview');

    if (specialDaysDetected.size > 0) {
      const firstSpecial = Array.from(specialDaysDetected)[0];
      setPendingSpecialDayQuestion(firstSpecial);
      showToast(
        `Se detectaron sesiones en ${Array.from(specialDaysDetected).join(', ')}. Por favor responde la pregunta de modalidad.`,
        'info'
      );
    } else if (rows.length > 0) {
      showToast(`✅ ${rows.length} bloques de horario leídos aplicando la regla institucional de modalidad.`, 'success');
    } else {
      showToast('No se detectaron bloques de horario válidos en el archivo.', 'error');
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
          const workbook = XLSX.read(data, { type: 'array' });
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

  // Responder pregunta para días atípicos (ej. Domingo)
  const handleAnswerSpecialDayQuestion = (day: string, assignOnline: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.dia.toLowerCase() === day.toLowerCase()) {
          return {
            ...r,
            es_en_linea: assignOnline,
            aula: assignOnline
              ? 'Aula Virtual UNRC (Google Meet / Classroom)'
              : (r.aula.includes('Virtual') ? 'Campus Tijuana - Aula Asignada' : r.aula),
            isCustomDay: false,
            status: r.status === 'warning' && r.errorMessage?.includes('requiere confirmar') ? 'valid' : r.status,
            errorMessage: r.errorMessage?.includes('requiere confirmar') ? undefined : r.errorMessage,
          };
        }
        return r;
      })
    );

    // Verificar si queda algún otro día especial pendiente
    const remainingSpecial = parsedRows.find(
      (r) => r.isCustomDay && r.dia.toLowerCase() !== day.toLowerCase()
    );
    if (remainingSpecial) {
      setPendingSpecialDayQuestion(remainingSpecial.dia);
    } else {
      setPendingSpecialDayQuestion(null);
    }

    showToast(`Día ${day} clasificado como ${assignOnline ? 'En Línea 🌐' : 'Presencial 🏛️'}`, 'success');
  };

  // Cambiar el día de una fila específica directamente
  const handleSetRowDay = (index: number, newDay: string) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.index === index) {
          const modalityInfo = getInstitutionalModalityForDay(newDay);
          const nextOnline = modalityInfo.es_en_linea;
          let nextAula = r.aula;
          if (nextOnline && (!nextAula || nextAula.includes('Campus') || nextAula.includes('Aula Asignada'))) {
            nextAula = 'Aula Virtual UNRC (Google Meet / Classroom)';
          } else if (!nextOnline && (nextAula.includes('Virtual') || nextAula.includes('Meet'))) {
            nextAula = 'Campus Tijuana - Aula Asignada';
          }
          return {
            ...r,
            dia: newDay,
            es_en_linea: nextOnline,
            aula: nextAula,
            isCustomDay: !modalityInfo.isStandardRule,
          };
        }
        return r;
      })
    );
    showToast(`Día actualizado a ${newDay}`, 'info');
  };

  // Asignar modalidad explícita (En Línea vs Presencial)
  const handleSetRowModality = (index: number, nextOnline: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.index === index) {
          if (r.es_en_linea === nextOnline) return r;
          let nextAula = r.aula;
          if (nextOnline && (!nextAula || nextAula.includes('Campus') || nextAula.includes('Aula Asignada'))) {
            nextAula = 'Aula Virtual UNRC (Google Meet / Classroom)';
          } else if (!nextOnline && (nextAula.includes('Virtual') || nextAula.includes('Meet'))) {
            nextAula = 'Campus Tijuana - Aula Asignada';
          }
          return {
            ...r,
            es_en_linea: nextOnline,
            aula: nextAula,
            isCustomDay: false,
            status: r.status === 'warning' && r.errorMessage?.includes('requiere confirmar') ? 'valid' : r.status,
            errorMessage: r.errorMessage?.includes('requiere confirmar') ? undefined : r.errorMessage,
          };
        }
        return r;
      })
    );
  };

  // Alternar modalidad individual de una fila
  const handleToggleRowModality = (index: number) => {
    const row = parsedRows.find((r) => r.index === index);
    if (row) {
      handleSetRowModality(index, !row.es_en_linea);
    }
  };

  // Asignar todas a En Línea o Presencial
  const handleSetAllModality = (nextOnline: boolean) => {
    setParsedRows((prev) =>
      prev.map((r) => {
        let nextAula = r.aula;
        if (nextOnline && (!nextAula || nextAula.includes('Campus') || nextAula.includes('Aula Asignada'))) {
          nextAula = 'Aula Virtual UNRC (Google Meet / Classroom)';
        } else if (!nextOnline && (nextAula.includes('Virtual') || nextAula.includes('Meet'))) {
          nextAula = 'Campus Tijuana - Aula Asignada';
        }
        return {
          ...r,
          es_en_linea: nextOnline,
          aula: nextAula,
          isCustomDay: false,
          status: r.status === 'warning' && r.errorMessage?.includes('requiere confirmar') ? 'valid' : r.status,
          errorMessage: r.errorMessage?.includes('requiere confirmar') ? undefined : r.errorMessage,
        };
      })
    );
    showToast(
      nextOnline
        ? 'Todas las materias asignadas a En Línea 🌐'
        : 'Todas las materias asignadas a Presencial 🏛️',
      'info'
    );
  };

  // Restaurar regla institucional UNRC
  const handleApplyInstitutionalRule = () => {
    setParsedRows((prev) =>
      prev.map((r) => {
        const modalityInfo = getInstitutionalModalityForDay(r.dia);
        const nextOnline = modalityInfo.es_en_linea;
        let nextAula = r.aula;
        if (nextOnline && (!nextAula || nextAula.includes('Campus') || nextAula.includes('Aula Asignada'))) {
          nextAula = 'Aula Virtual UNRC (Google Meet / Classroom)';
        } else if (!nextOnline && (nextAula.includes('Virtual') || nextAula.includes('Meet'))) {
          nextAula = 'Campus Tijuana - Aula Asignada';
        }
        return {
          ...r,
          es_en_linea: nextOnline,
          aula: nextAula,
          isCustomDay: false,
          status: r.status === 'warning' && r.errorMessage?.includes('requiere confirmar') ? 'valid' : r.status,
          errorMessage: r.errorMessage?.includes('requiere confirmar') ? undefined : r.errorMessage,
        };
      })
    );
    showToast('Regla institucional restaurada: Lun/Mar/Sáb en Línea y Mié/Jue/Vie presencial', 'success');
  };

  // Alternar selección de una fila
  const handleToggleSelectRow = (index: number) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, selected: !(r.selected ?? true) } : r))
    );
  };

  const areAllSelected = parsedRows.length > 0 && parsedRows.every((r) => r.selected ?? true);

  const handleToggleSelectAll = () => {
    const nextVal = !areAllSelected;
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: nextVal })));
  };

  // Descargar plantilla oficial adaptada con la regla institucional y matrícula del docente
  const handleDownloadTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const headers = ['MATRICULA', 'DOCENTE ASIGNADO', 'CARRERA', 'MATERIA', 'GRUPO', 'DIA', 'HORA INICIO', 'HORA FIN', 'AULA', 'MODALIDAD'];
    const sampleRows = [
      // Lunes: En Línea
      ['DOC-UNRC-03', 'Dr. Adrian Silva', 'Licenciatura en Administración', 'Matemáticas para la Administración', 'PHLAC-203-TIJ', 'Lunes', '07:00', '09:00', 'Aula Virtual UNRC (Google Meet)', 'En línea'],
      // Lunes: Presencial
      ['DOC-UNRC-01', 'Lic. Alejandro Valdez', 'Lic. en Ciencias de Datos e IA', 'Programación para la Ciencia de Datos', 'PHLCDN-201-TIJ', 'Lunes', '07:00', '09:00', 'Campus Tijuana - Aula 101', 'Presencial'],
      // Martes: En Línea
      ['DOC-UNRC-03', 'Dr. Adrian Silva', 'Licenciatura en Turismo', 'Gestión de Servicios Turísticos y Hotelería', 'PHLTUR-201-TIJ', 'Martes', '09:00', '11:00', 'Aula Virtual UNRC (Google Meet)', 'En línea'],
      // Miércoles: Presencial
      ['DOC-UNRC-03', 'Dr. Adrian Silva', 'Licenciatura en Turismo', 'Administración de Empresas de Hospedaje', 'PHLTUR-201-TIJ', 'Miércoles', '09:00', '11:00', 'Campus Tijuana - Aula Magna 2', 'Presencial'],
      // Jueves: Presencial
      ['DOC-UNRC-01', 'Lic. Alejandro Valdez', 'Lic. en Ciencias de Datos e IA', 'Programación Web y Bases de Datos', 'PHLCDN-201-TIJ', 'Jueves', '08:00', '10:00', 'Campus Tijuana - Lab Cómputo 1', 'Presencial'],
      // Sábado: En Línea
      ['DOC-UNRC-03', 'Dr. Adrian Silva', 'Licenciatura en Turismo', 'Administración de Empresas de Hospedaje', 'PHLTUR-201-TIJ', 'Sábado', '07:00', '09:00', 'Aula Virtual UNRC (Google Meet)', 'En línea'],
    ];

    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Horarios_UNRC');
      XLSX.writeFile(wb, 'plantilla_horarios_oficial_unrc.xlsx');
      showToast('Plantilla oficial de Horarios en Excel descargada con regla institucional y matrícula', 'info');
    } else {
      const csv = '\uFEFF' + headers.join(',') + '\r\n' + sampleRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_horarios_oficial_unrc.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Plantilla oficial de Horarios en CSV descargada con matrícula', 'info');
    }
  };

  // Confirmar y guardar horarios en la base de datos
  const handleConfirmImport = async () => {
    // Si aún hay una pregunta pendiente sobre días especiales, solicitar respuesta primero
    if (pendingSpecialDayQuestion) {
      showToast(`Por favor responde la pregunta de modalidad para el día ${pendingSpecialDayQuestion} antes de continuar.`, 'info');
      return;
    }

    const toImport = parsedRows.filter((r) => (r.selected ?? true) && r.status !== 'error');
    if (toImport.length === 0) {
      showToast('No has seleccionado bloques de horario válidos para guardar.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = toImport.map((r) => ({
        docenteIdentificador: r.docenteMatched?.num_empleado || r.matricula || r.docenteMatched?.id || r.docenteRaw,
        docenteRaw: r.docenteMatched ? `${r.docenteMatched.nombre} ${r.docenteMatched.apellido_paterno}` : r.docenteRaw,
        matricula: r.matricula || r.docenteMatched?.num_empleado || '',
        carrera: r.carrera,
        materia: r.materia,
        grupo: r.grupo,
        dia: r.dia,
        hora_inicio: r.hora_inicio,
        hora_fin: r.hora_fin,
        aula: r.aula,
        es_en_linea: r.es_en_linea,
        sede: sedes[0]?.nombre || 'Campus Tijuana'
      }));

      const res = await db.addHorariosBulk(payload);

      // Obtener lista actualizada de docentes afectados para habilitar exportación a PDF y Google Calendar
      const allDocentes = await db.getDocentes();
      const updatedDocentesList: Docente[] = [];
      const updatedIds = new Set<string>();

      toImport.forEach((slot) => {
        const d = slot.docenteMatched
          ? allDocentes.find((x) => x.id === slot.docenteMatched?.id || x.num_empleado === slot.docenteMatched?.num_empleado)
          : allDocentes.find((x) =>
              (slot.matricula && (x.num_empleado === slot.matricula || (x as any).matricula === slot.matricula)) ||
              x.num_empleado === slot.docenteRaw ||
              `${x.nombre} ${x.apellido_paterno}`.toLowerCase().includes(slot.docenteRaw.toLowerCase())
            );
        if (d && !updatedIds.has(d.id)) {
          updatedIds.add(d.id);
          updatedDocentesList.push(d);
        }
      });

      // Si se cargaba para un docente específico
      if (targetDocente && !updatedIds.has(targetDocente.id)) {
        const freshTarget = allDocentes.find((x) => x.id === targetDocente.id) || targetDocente;
        updatedDocentesList.unshift(freshTarget);
      }

      setSavedResult({
        totalSlotsAdded: res.totalSlotsAdded,
        docentesUpdated: res.docentesUpdated,
        affectedDocentes: updatedDocentesList.length > 0 ? updatedDocentesList : (targetDocente ? [targetDocente] : existingDocentes.slice(0, 3)),
      });

      setStep('completed');
      showToast(`✅ ${res.totalSlotsAdded} bloques de horario grabados en la base de datos para ${res.docentesUpdated} docentes con sus matrículas.`, 'success');
      await onSuccess({
        totalSlotsAdded: res.totalSlotsAdded,
        docentesUpdated: res.docentesUpdated,
        affectedDocentes: updatedDocentesList
      });
    } catch (err: any) {
      showToast(`Error al guardar horarios en BD: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.status === 'valid').length;
  const warningCount = parsedRows.filter((r) => r.status === 'warning').length;
  const errorCount = parsedRows.filter((r) => r.status === 'error').length;
  const selectedCount = parsedRows.filter((r) => (r.selected ?? true) && r.status !== 'error').length;
  const onlineCount = parsedRows.filter((r) => (r.selected ?? true) && r.es_en_linea).length;
  const presencialCount = parsedRows.filter((r) => (r.selected ?? true) && !r.es_en_linea).length;

  const filteredRows = parsedRows.filter((r) => {
    if (filterStatus === 'online') return r.es_en_linea;
    if (filterStatus === 'presencial') return !r.es_en_linea;
    if (filterStatus === 'valid') return r.status === 'valid';
    if (filterStatus === 'warning') return r.status === 'warning';
    if (filterStatus === 'error') return r.status === 'error';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0B132B] border border-blue-500/30 rounded-3xl max-w-6xl w-full p-4 sm:p-6 space-y-4 shadow-2xl shadow-blue-950/60 relative flex flex-col max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-950/50 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-xl font-black text-white">
                  {targetDocente
                    ? `Cargar Horario Excel para: ${targetDocente.nombre} ${targetDocente.apellido_paterno}`
                    : 'Carga Masiva de Horarios Oficiales'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Excel (.xlsx) / CSV
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Regla institucional: <strong>Lunes, Martes y Sábado (En Línea)</strong> • <strong>Miércoles, Jueves y Viernes (Presencial)</strong>.
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
        {/* PASO 3: PANTALLA DE ÉXITO, VISUALIZACIÓN EN PDF Y GOOGLE CALENDAR */}
        {/* ============================================================== */}
        {step === 'completed' && savedResult ? (
          <div className="space-y-6 py-2 overflow-y-auto max-h-[75vh] animate-fadeIn pr-1">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/60 via-[#0B172B] to-[#0A261E] border border-emerald-500/40 text-center space-y-3 shadow-xl">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 mx-auto shadow-lg shadow-emerald-950/60">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-2xl font-black text-white">
                ¡Horarios Grabados Exitosamente en la Base de Datos!
              </h4>
              <p className="text-sm text-gray-300 max-w-xl mx-auto">
                Se sincronizaron con éxito <strong className="text-emerald-300">{savedResult.totalSlotsAdded} bloques de clase</strong> para{' '}
                <strong className="text-white">{savedResult.docentesUpdated} docentes</strong> con persistencia en Supabase y control escolar.
              </p>
            </div>

            {/* Acciones de PDF y Google Calendar */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-extrabold text-white flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Visualización Oficial en PDF y Google Calendar</span>
                  </h5>
                  <p className="text-xs text-gray-400">
                    Abre el documento oficial con membrete UNRC o exporta el calendario con recordatorios y enlaces síncronos:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedResult.affectedDocentes.map((doc) => {
                  const slotsCount = (doc.horarios || []).length;
                  return (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 hover:border-blue-500/40 transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="font-extrabold text-white text-sm block">
                            {doc.nombre} {doc.apellido_paterno} {doc.apellido_materno || ''}
                          </span>
                          <span className="text-[11px] text-gray-400 font-mono block">
                            Clave: {doc.num_empleado} • Sede: {doc.sede_nombre || 'Campus Tijuana'}
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {slotsCount} {slotsCount === 1 ? 'bloque asignado' : 'bloques asignados'}
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0">
                          <UserCheck className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
                        {/* Botón 1: Visualizar en .PDF */}
                        <button
                          type="button"
                          onClick={() => {
                            generateDocenteHorarioPDF(doc, 'preview');
                            showToast(`Abriendo visor de PDF para ${doc.nombre}`);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-blue-600/25 hover:bg-blue-600/40 text-blue-200 border border-blue-500/40 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                          title="Visualizar comprobante oficial en PDF en una nueva pestaña"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-300" />
                          <span>Visualizar en .PDF</span>
                        </button>

                        {/* Botón 2: Descargar PDF */}
                        <button
                          type="button"
                          onClick={() => {
                            generateDocenteHorarioPDF(doc, 'download');
                            showToast(`Descargando PDF de ${doc.nombre}`);
                          }}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-bold text-xs flex items-center justify-center space-x-1 transition-all"
                          title="Descargar archivo PDF oficial del horario"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        {/* Botón 3: Pasar a Google Calendar (.ics) */}
                        <button
                          type="button"
                          onClick={() => {
                            downloadDocenteICS(doc);
                            showToast(`Archivo Google Calendar (.ics) descargado para ${doc.nombre}`);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                          title="Exportar archivo para Google Calendar con recordatorios de modalidad presencial/en línea"
                        >
                          <Calendar className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Google Calendar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer de Finalizar */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setStep('upload');
                  setParsedRows([]);
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
            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="flex items-center space-x-2 text-xs text-gray-300">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Regla Activa: <strong>Lun, Mar y Sáb (En Línea)</strong> • <strong>Mié, Jue y Vie (Presencial)</strong>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('xlsx')}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                  title="Descargar plantilla oficial de Horarios en Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Plantilla Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('csv')}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-bold text-xs flex items-center space-x-1.5 transition-all"
                  title="Descargar plantilla oficial de Horarios en CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Plantilla CSV</span>
                </button>
              </div>
            </div>

            {/* Upload Zone */}
            {parsedRows.length === 0 ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all flex flex-col items-center justify-center space-y-4 ${
                  dragActive ? 'border-blue-400 bg-blue-500/10 scale-[0.99]' : 'border-white/15 bg-black/20 hover:border-blue-500/50'
                }`}
              >
                <div className="w-16 h-16 rounded-3xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-950/40">
                  <Upload className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <p className="text-base font-bold text-white">
                    {targetDocente
                      ? `Arrastra el archivo de horarios para ${targetDocente.nombre} aquí`
                      : 'Arrastra y suelta tu archivo de Horarios aquí'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Formatos soportados: Excel (.xlsx, .xls) o archivo delimitado (.csv)
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
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Seleccionar Archivo de Horarios</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col flex-1">
                
                {/* PREGUNTA OBLIGATORIA SI HAY DÍAS ESPECIALES (DOMINGO U OTROS) */}
                {pendingSpecialDayQuestion && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border-2 border-amber-500/60 shadow-xl space-y-3 animate-fadeIn">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                        <HelpCircle className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <span className="font-extrabold text-amber-200 text-sm block">
                          Pregunta de Modalidad: Clases en {pendingSpecialDayQuestion}
                        </span>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          Se detectaron sesiones en día <strong>{pendingSpecialDayQuestion}</strong>, el cual no está en la regla estándar (Lun/Mar/Sáb en línea, Mié/Jue/Vie presencial).
                          ¿Cómo deseas clasificar estas sesiones para grabarlas en la base de datos?
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 pl-13">
                      <button
                        type="button"
                        onClick={() => handleAnswerSpecialDayQuestion(pendingSpecialDayQuestion, true)}
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center space-x-1.5"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Asignar como En Línea (Virtual)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAnswerSpecialDayQuestion(pendingSpecialDayQuestion, false)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center space-x-1.5"
                      >
                        <Building className="w-3.5 h-3.5" />
                        <span>Asignar como Presencial (Campus)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Panel Superior: Selección Previa de Modalidad y Acciones Masivas */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900/95 via-[#0B172B] to-slate-900/95 border border-blue-500/30 space-y-3 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                        <SlidersHorizontal className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-white uppercase tracking-wider">
                            Selección Previa de Modalidad
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Revisión Antes de Guardar
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Elige cuáles materias se impartirán En Línea y cuáles Presenciales antes de guardar en la base de datos.
                        </p>
                      </div>
                    </div>

                    {/* Botones de acción masiva */}
                    <div className="flex items-center space-x-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSetAllModality(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
                        title="Asignar todas las materias como En Línea"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Todas En Línea</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetAllModality(false)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
                        title="Asignar todas las materias como Presenciales"
                      >
                        <Building className="w-3.5 h-3.5" />
                        <span>Todas Presenciales</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApplyInstitutionalRule}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
                        title="Aplicar regla UNRC: Lun/Mar/Sáb en Línea y Mié/Jue/Vie Presencial"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Regla UNRC (L-M-S / M-J-V)</span>
                      </button>
                    </div>
                  </div>

                  {/* Resumen de contadores, filtros y selección */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/10 text-xs">
                    <div className="flex items-center space-x-3 flex-wrap">
                      <div className="flex items-center space-x-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="flex items-center space-x-1.5 text-gray-300 hover:text-white transition-colors"
                          title={areAllSelected ? 'Desmarcar todas' : 'Seleccionar todas'}
                        >
                          {areAllSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-gray-500" />
                          )}
                          <span className="font-bold">
                            {selectedCount} de {parsedRows.length} seleccionadas
                          </span>
                        </button>
                      </div>

                      <span className="px-2.5 py-1 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span>{onlineCount} En Línea</span>
                      </span>

                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center space-x-1">
                        <Building className="w-3 h-3" />
                        <span>{presencialCount} Presenciales</span>
                      </span>

                      {warningCount > 0 && (
                        <span className="text-amber-400 font-bold text-[11px]">⚠ {warningCount} por revisar</span>
                      )}
                      {errorCount > 0 && (
                        <span className="text-rose-400 font-bold text-[11px]">✕ {errorCount} con error</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Filtros por modalidad y estado */}
                      <div className="flex items-center space-x-1 bg-black/40 p-0.5 rounded-xl border border-white/10">
                        <Filter className="w-3 h-3 text-gray-400 ml-1.5" />
                        {(['all', 'online', 'presencial', 'warning', 'error'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setFilterStatus(st)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                              filterStatus === st
                                ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            {st === 'all' && 'Todas'}
                            {st === 'online' && '🌐 En Línea'}
                            {st === 'presencial' && '🏛️ Presenciales'}
                            {st === 'warning' && '⚠ Avisos'}
                            {st === 'error' && '✕ Errores'}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setParsedRows([]);
                          setFile(null);
                          setPendingSpecialDayQuestion(null);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold text-xs flex items-center space-x-1 transition-colors"
                        title="Limpiar archivo cargado"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Limpiar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Table con Selección Previa */}
                <div className="h-[390px] min-h-[300px] overflow-y-auto overflow-x-auto border border-white/10 rounded-2xl bg-black/40 shadow-inner relative">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#0B132B] sticky top-0 z-10 backdrop-blur-md text-[11px] text-gray-400 uppercase tracking-wider border-b border-white/10 shadow-sm">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={handleToggleSelectAll}
                            className="text-gray-400 hover:text-white transition-colors"
                            title={areAllSelected ? 'Desmarcar todas' : 'Seleccionar todas'}
                          >
                            {areAllSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </th>
                        <th className="p-3 w-8">#</th>
                        <th className="p-3 min-w-[200px]">Docente Asignado & Matrícula</th>
                        <th className="p-3 min-w-[200px]">Materia & Carrera</th>
                        <th className="p-3">Grupo</th>
                        <th className="p-3">Día & Horario</th>
                        <th className="p-3 min-w-[210px] text-center">Modalidad (Selección Previa)</th>
                        <th className="p-3 min-w-[170px]">Aula Asignada</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300">
                      {filteredRows.map((row) => {
                        const isRowSelected = row.selected ?? true;
                        return (
                          <tr
                            key={row.index}
                            className={`transition-colors ${
                              isRowSelected ? 'hover:bg-white/[0.03]' : 'opacity-50 bg-black/20'
                            }`}
                          >
                            {/* Checkbox de selección individual */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSelectRow(row.index)}
                                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                                title={isRowSelected ? 'Desmarcar esta materia' : 'Marcar para subir a base de datos'}
                              >
                                {isRowSelected ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                            </td>

                            <td className="p-3 text-gray-500 font-mono text-[11px]">{row.index}</td>

                            {/* Docente Asignado & Matrícula */}
                            <td className="p-3 font-semibold text-white">
                              <div className="flex items-center space-x-2">
                                <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span className="font-bold text-sm">
                                  {row.docenteMatched
                                    ? `${row.docenteMatched.nombre} ${row.docenteMatched.apellido_paterno}`
                                    : row.docenteRaw || 'Docente Titular'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1.5 mt-1 pl-5.5 flex-wrap">
                                {(row.matricula || row.docenteMatched?.num_empleado) && (
                                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    Matrícula: {row.matricula || row.docenteMatched?.num_empleado}
                                  </span>
                                )}
                                {row.isNewDocente && (
                                  <span className="text-[9px] text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 font-medium">
                                    ✨ Se dará de alta en BD
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Materia & Carrera */}
                            <td className="p-3">
                              <span className="font-bold text-amber-200 block text-xs">{row.materia}</span>
                              {row.carrera && <span className="text-[10px] text-gray-400 block mt-0.5">{row.carrera}</span>}
                            </td>

                            {/* Grupo */}
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono inline-block">
                                {row.grupo}
                              </span>
                            </td>

                            {/* Día & Horario con Selector de Día Directo */}
                            <td className="p-3">
                              <div className="flex items-center space-x-1.5 mb-1">
                                <select
                                  value={row.dia}
                                  onChange={(e) => handleSetRowDay(row.index, e.target.value)}
                                  className="bg-black/70 hover:bg-black/90 border border-white/20 hover:border-blue-400 focus:border-cyan-400 rounded-lg px-2 py-0.5 text-xs font-bold text-white transition-all cursor-pointer shadow-sm focus:outline-none"
                                  title="Haz clic para seleccionar o corregir el día de la sesión"
                                >
                                  <option value="Lunes" className="bg-[#0B132B] text-white">Lunes</option>
                                  <option value="Martes" className="bg-[#0B132B] text-white">Martes</option>
                                  <option value="Miércoles" className="bg-[#0B132B] text-white">Miércoles</option>
                                  <option value="Jueves" className="bg-[#0B132B] text-white">Jueves</option>
                                  <option value="Viernes" className="bg-[#0B132B] text-white">Viernes</option>
                                  <option value="Sábado" className="bg-[#0B132B] text-white">Sábado</option>
                                  <option value="Domingo" className="bg-[#0B132B] text-white">Domingo</option>
                                </select>
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono block pl-0.5">
                                {row.hora_inicio} - {row.hora_fin} hrs
                              </span>
                            </td>

                            {/* SELECTOR PREVIO DE MODALIDAD (EN LÍNEA VS PRESENCIAL) */}
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center p-0.5 rounded-xl bg-black/60 border border-white/15 shadow-inner">
                                <button
                                  type="button"
                                  onClick={() => handleSetRowModality(row.index, true)}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-black flex items-center space-x-1.5 transition-all cursor-pointer ${
                                    row.es_en_linea
                                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400 font-extrabold'
                                      : 'text-gray-400 hover:text-cyan-300 hover:bg-white/5'
                                  }`}
                                  title="Seleccionar modalidad En Línea (Virtual)"
                                >
                                  <Globe className="w-3 h-3 text-cyan-200" />
                                  <span>En Línea</span>
                                  {row.es_en_linea && <Check className="w-2.5 h-2.5 text-cyan-200 ml-0.5" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetRowModality(row.index, false)}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-black flex items-center space-x-1.5 transition-all cursor-pointer ${
                                    !row.es_en_linea
                                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400 font-extrabold'
                                      : 'text-gray-400 hover:text-emerald-300 hover:bg-white/5'
                                  }`}
                                  title="Seleccionar modalidad Presencial (Campus)"
                                >
                                  <Building className="w-3 h-3 text-emerald-200" />
                                  <span>Presencial</span>
                                  {!row.es_en_linea && <Check className="w-2.5 h-2.5 text-emerald-200 ml-0.5" />}
                                </button>
                              </div>

                              {row.isCustomDay && (
                                <span className="text-[9px] text-amber-400 block mt-1 font-semibold">
                                  ⚠️ Día atípico
                                </span>
                              )}
                            </td>

                            {/* Aula Asignada */}
                            <td className="p-3">
                              <div className="flex items-center space-x-1.5">
                                <span
                                  className={`w-1.5 h-3.5 rounded-full shrink-0 ${
                                    row.es_en_linea ? 'bg-cyan-400' : 'bg-emerald-400'
                                  }`}
                                />
                                <span className="text-[11px] text-gray-200 truncate max-w-[210px] font-medium" title={row.aula}>
                                  {row.aula}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 block mt-0.5 pl-3">
                                {row.es_en_linea ? '🌐 Plataforma Virtual UNRC' : '🏛️ Campus Físico'}
                              </span>
                            </td>

                            {/* Estado */}
                            <td className="p-3">
                              {row.status === 'valid' && !row.isNewDocente && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold whitespace-nowrap">
                                  ✓ Listo
                                </span>
                              )}
                              {row.isNewDocente && (
                                <span
                                  className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-help whitespace-nowrap"
                                  title={row.errorMessage || 'Docente nuevo: se registrará en BD con su matrícula'}
                                >
                                  ⚠ Docente nuevo
                                </span>
                              )}
                              {row.status === 'warning' && !row.isNewDocente && (
                                <span
                                  className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold cursor-help whitespace-nowrap"
                                  title={row.errorMessage}
                                >
                                  ⚠ {row.errorMessage || 'Revisar'}
                                </span>
                              )}
                              {row.status === 'error' && (
                                <span
                                  className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold cursor-help whitespace-nowrap"
                                  title={row.errorMessage}
                                >
                                  ✕ Error
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <div className="flex items-center space-x-2 text-xs text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Se guardarán en la base de datos{' '}
                      <strong className="text-white">{selectedCount} materias seleccionadas</strong>{' '}
                      (<span className="text-cyan-300 font-bold">{onlineCount} En Línea</span>,{' '}
                      <span className="text-emerald-300 font-bold">{presencialCount} Presenciales</span>).
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
                      disabled={isSubmitting || selectedCount === 0 || Boolean(pendingSpecialDayQuestion)}
                      onClick={handleConfirmImport}
                      className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 active:scale-95"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Grabando en Base de Datos...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>
                            Subir a Base de Datos ({selectedCount} Materias)
                          </span>
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
