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
  GraduationCap,
  Sparkles,
  Info,
  Calendar,
  Building,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Docente, Carrera, Sede, Grupo, Materia, db } from '@/lib/db';

interface ParsedHorarioRow {
  index: number;
  docenteRaw: string;
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
}

interface BulkUploadHorariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (summary: { totalSlotsAdded: number; docentesUpdated: number }) => Promise<void> | void;
  existingDocentes: Docente[];
  carreras: Carrera[];
  grupos: Grupo[];
  materias: Materia[];
  sedes: Sede[];
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
  showToast = () => {}
}: BulkUploadHorariosModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedHorarioRow[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'warning' | 'error'>('all');
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
    if (d.includes('lun')) return 'Lunes';
    if (d.includes('mar')) return 'Martes';
    if (d.includes('mie') || d.includes('mié')) return 'Miércoles';
    if (d.includes('jue')) return 'Jueves';
    if (d.includes('vie')) return 'Viernes';
    if (d.includes('sab') || d.includes('sáb')) return 'Sábado';
    if (d.includes('dom')) return 'Domingo';
    return rawDay.trim() || 'Lunes';
  };

  const normalizeTimeStr = (t: any): string => {
    if (!t) return '07:00';
    let s = String(t).trim();
    // Excel decimal time conversion (e.g. 0.291666666666667 -> 07:00)
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
    return s.slice(0, 5) || '07:00';
  };

  const matchDocente = (raw: string): Docente | undefined => {
    if (!raw) return undefined;
    const clean = normalizeStr(raw).replace(/^(?:dr|dra|mtro|mtra|lic|ing|prof|profr|profra)\.?\s+/i, '');

    return existingDocentes.find((d) => {
      const dNum = normalizeStr(d.num_empleado);
      const dEmail = normalizeStr(d.email || '');
      const dPat = normalizeStr(d.apellido_paterno);
      const dMat = normalizeStr(d.apellido_materno || '');
      const dNom = normalizeStr(d.nombre);
      const dFull = `${dNom} ${dPat} ${dMat}`.trim();

      if (dNum === clean || dEmail === clean) return true;
      if (dFull === clean || clean.includes(dFull) || dFull.includes(clean)) return true;
      if (clean.includes(dPat) && clean.includes(dNom)) return true;
      if (clean.includes(dPat) && dPat.length >= 4) return true;
      return false;
    });
  };

  const parseMatrixData = (matrix: any[][]) => {
    if (!matrix || matrix.length < 2) {
      showToast('El archivo no contiene suficientes filas de datos.', 'error');
      return;
    }

    // 1. Find header row
    let headerIdx = 0;
    let maxScore = -1;
    const scanLimit = Math.min(matrix.length, 15);

    for (let i = 0; i < scanLimit; i++) {
      const row = matrix[i] || [];
      let score = 0;
      for (const cell of row) {
        const val = normalizeStr(String(cell ?? ''));
        if (val.includes('docente') || val.includes('profesor') || val.includes('nombre')) score += 20;
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

    const rawHeaders = (matrix[headerIdx] || []).map((h: any) => String(h ?? '').trim());
    const normHeaders = rawHeaders.map((h) =>
      h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_.-]+/g, '')
    );

    const findCol = (...aliases: string[]) => {
      for (const alias of aliases) {
        const idx = normHeaders.findIndex((h) => h === alias);
        if (idx !== -1) return idx;
      }
      for (const alias of aliases) {
        const idx = normHeaders.findIndex((h) => h.includes(alias));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const colDocente = findCol('docente', 'profesor', 'nombredocente', 'nombredeldocente', 'nombrecompleto', 'numempleado', 'clave');
    const colCarrera = findCol('carrera', 'licenciatura', 'carreras', 'area');
    const colMateria = findCol('materia', 'asignatura', 'clase', 'unidad');
    const colGrupo = findCol('grupo', 'seccion', 'clavegrupo', 'gpo');
    const colDia = findCol('dia', 'dias', 'diasemana', 'fechadia');
    const colInicio = findCol('horainicio', 'inicio', 'desde', 'horaentrada', 'de');
    const colFin = findCol('horafin', 'fin', 'hasta', 'horasalida', 'a');
    const colAula = findCol('aula', 'salon', 'espacio', 'laboratorio', 'edificio');
    const colModalidad = findCol('modalidad', 'tipo', 'linea', 'presencial', 'esonline', 'formato');

    const rows: ParsedHorarioRow[] = [];

    for (let i = headerIdx + 1; i < matrix.length; i++) {
      const row = matrix[i] || [];
      if (row.length === 0 || row.every((c: any) => String(c ?? '').trim() === '')) continue;

      const docRaw = colDocente >= 0 ? String(row[colDocente] ?? '').trim() : '';
      const carreraRaw = colCarrera >= 0 ? String(row[colCarrera] ?? '').trim() : '';
      const materiaRaw = colMateria >= 0 ? String(row[colMateria] ?? '').trim() : '';
      const grupoRaw = colGrupo >= 0 ? String(row[colGrupo] ?? '').trim() : '';
      const diaRaw = colDia >= 0 ? String(row[colDia] ?? '').trim() : '';
      const inicioRaw = colInicio >= 0 ? row[colInicio] : '';
      const finRaw = colFin >= 0 ? row[colFin] : '';
      const aulaRaw = colAula >= 0 ? String(row[colAula] ?? '').trim() : '';
      const modRaw = colModalidad >= 0 ? String(row[colModalidad] ?? '').trim() : '';

      // Skip empty meaningful rows
      if (!docRaw && !materiaRaw && !grupoRaw) continue;

      const matchedDoc = matchDocente(docRaw);
      const diaClean = normalizeDayName(diaRaw || 'Lunes');
      const horaIni = normalizeTimeStr(inicioRaw || '07:00');
      const horaFin = normalizeTimeStr(finRaw || '09:00');
      const isOnline = normalizeStr(modRaw).includes('linea') || normalizeStr(modRaw).includes('virtual') || normalizeStr(aulaRaw).includes('virtual') || normalizeStr(aulaRaw).includes('meet');

      let status: 'valid' | 'warning' | 'error' = 'valid';
      let errorMessage: string | undefined = undefined;

      if (!materiaRaw) {
        status = 'error';
        errorMessage = 'Falta nombre de la materia';
      } else if (!grupoRaw) {
        status = 'error';
        errorMessage = 'Falta especificar el grupo';
      } else if (!matchedDoc) {
        status = 'warning';
        errorMessage = `Docente "${docRaw}" no encontrado en catálogo (se registrará con su nombre)`;
      }

      rows.push({
        index: rows.length + 1,
        docenteRaw: docRaw,
        docenteMatched: matchedDoc,
        carrera: carreraRaw || matchedDoc?.carreras_asignadas?.[0] || 'Licenciatura',
        materia: materiaRaw,
        grupo: grupoRaw,
        dia: diaClean,
        hora_inicio: horaIni,
        hora_fin: horaFin,
        aula: aulaRaw || (isOnline ? 'Aula Virtual UNRC (Google Meet)' : 'Campus Tijuana - Aula Asignada'),
        es_en_linea: isOnline,
        status,
        errorMessage
      });
    }

    setParsedRows(rows);
    if (rows.length > 0) {
      showToast(`✅ ${rows.length} bloques de horario leídos correctamente.`, 'success');
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

  // Descargar plantilla oficial de horarios en Excel o CSV
  const handleDownloadTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const headers = ['DOCENTE', 'CARRERA', 'MATERIA', 'GRUPO', 'DIA', 'HORA INICIO', 'HORA FIN', 'AULA', 'MODALIDAD'];
    const sampleRows = [
      ['Dr. Adrian Silva', 'Lic. en Turismo', 'Administración de Empresas de Hospedaje', '201-TUR', 'Miércoles', '09:00', '11:00', 'Campus Tijuana - Aula Magna 2', 'Presencial'],
      ['Dr. Adrian Silva', 'Lic. en Turismo', 'Administración de Empresas de Hospedaje', '201-TUR', 'Sábado', '07:00', '09:00', 'Aula Virtual UNRC (Google Meet)', 'En línea'],
      ['Dr. Adrian Silva', 'Lic. en Administración', 'Matemáticas para la Administración', 'PHLAC-203-TIJ', 'Lunes', '07:00', '09:00', 'Campus Tijuana - Aula 203', 'Presencial'],
      ['Lic. Alejandro Valdez', 'Lic. en Ciencias de Datos e IA', 'Programación Web y Bases de Datos', '101', 'Lunes', '07:00', '10:00', 'Campus Tijuana - Lab Cómputo 1', 'Presencial'],
      ['Lic. Alejandro Valdez', 'Licenciatura en Ciencia de Datos para los Negocios', 'Minería de Datos y Modelado Predictivo', '401-LCDN', 'Viernes', '08:00', '11:00', 'Aula Virtual UNRC (Google Meet)', 'En línea'],
      ['Dr. Adrian Silva', 'Lic. en Tecnologías de la Información y Comunicación', 'Estructura de Datos y Algoritmos', '201', 'Martes', '14:00', '17:00', 'Campus Tijuana - Lab Redes 2', 'Presencial']
    ];

    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Horarios_UNRC');
      XLSX.writeFile(wb, 'plantilla_horarios_oficial_unrc.xlsx');
      showToast('Plantilla oficial de Horarios en Excel descargada', 'info');
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
      showToast('Plantilla oficial de Horarios en CSV descargada', 'info');
    }
  };

  // Confirmar y guardar horarios en la base de datos
  const handleConfirmImport = async () => {
    const toImport = parsedRows.filter((r) => r.status !== 'error');
    if (toImport.length === 0) {
      showToast('No hay bloques de horario válidos para guardar.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = toImport.map((r) => ({
        docenteIdentificador: r.docenteMatched?.num_empleado || r.docenteMatched?.id || r.docenteRaw,
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
      showToast(`✅ ${res.totalSlotsAdded} bloques de horario guardados en la base de datos para ${res.docentesUpdated} docentes.`, 'success');
      await onSuccess(res);
      onClose();
    } catch (err: any) {
      showToast(`Error al guardar horarios en BD: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.status === 'valid').length;
  const warningCount = parsedRows.filter((r) => r.status === 'warning').length;
  const errorCount = parsedRows.filter((r) => r.status === 'error').length;

  const filteredRows = parsedRows.filter((r) => {
    if (filterStatus === 'valid') return r.status === 'valid';
    if (filterStatus === 'warning') return r.status === 'warning';
    if (filterStatus === 'error') return r.status === 'error';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0B132B] border border-blue-500/30 rounded-3xl max-w-5xl w-full p-5 sm:p-7 space-y-6 shadow-2xl shadow-blue-950/60 relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-950/50 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-black text-white">Carga Masiva de Horarios Oficiales</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Excel (.xlsx) / CSV
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Importa y asigna clases a docentes, grupos y aulas con persistencia directa en Supabase sin sobrescribir registros previos.
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

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
          <div className="flex items-center space-x-2 text-xs text-gray-300">
            <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Campos del archivo: <strong>DOCENTE, CARRERA, MATERIA, GRUPO, DÍA, HORA INICIO, HORA FIN, AULA, MODALIDAD</strong>
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
              <p className="text-base font-bold text-white">Arrastra y suelta tu archivo de Horarios aquí</p>
              <p className="text-xs text-gray-400 mt-1">Formatos soportados: Excel (.xlsx, .xls) o archivo delimitado (.csv)</p>
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
              <span>Seleccionar Archivo de mi Equipo</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Stats bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 p-3 rounded-2xl border border-white/10 text-xs">
              <div className="flex items-center space-x-4">
                <span className="text-gray-400">
                  Archivo: <strong className="text-white">{file?.name}</strong> ({parsedRows.length} registros)
                </span>
                <span className="text-emerald-400 font-bold">✓ {validCount} válidos</span>
                {warningCount > 0 && <span className="text-amber-400 font-bold">⚠ {warningCount} con docente aproximado</span>}
                {errorCount > 0 && <span className="text-rose-400 font-bold">✕ {errorCount} con error</span>}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setParsedRows([]);
                    setFile(null);
                  }}
                  className="px-3 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold text-xs flex items-center space-x-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto border border-white/10 rounded-2xl bg-black/30">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white/5 sticky top-0 backdrop-blur-md text-[11px] text-gray-400 uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Docente Asignado</th>
                    <th className="p-3">Materia</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3">Día & Horario</th>
                    <th className="p-3">Aula / Modalidad</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {filteredRows.map((row) => (
                    <tr key={row.index} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-gray-500">{row.index}</td>
                      <td className="p-3 font-semibold text-white">
                        <div className="flex items-center space-x-2">
                          <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>
                            {row.docenteMatched
                              ? `${row.docenteMatched.nombre} ${row.docenteMatched.apellido_paterno}`
                              : row.docenteRaw || 'Docente no asignado'}
                          </span>
                        </div>
                        {row.docenteMatched && (
                          <span className="text-[10px] text-blue-400 block font-mono">
                            {row.docenteMatched.num_empleado}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-amber-200">{row.materia}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                          {row.grupo}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{row.dia}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {row.hora_inicio} - {row.hora_fin} hrs
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              row.es_en_linea ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'
                            }`}
                          />
                          <span className="text-[11px] text-gray-300">{row.aula}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 block">
                          {row.es_en_linea ? '🌐 En línea' : '🏛️ Presencial'}
                        </span>
                      </td>
                      <td className="p-3">
                        {row.status === 'valid' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            ✓ Listo
                          </span>
                        )}
                        {row.status === 'warning' && (
                          <span
                            className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold cursor-help"
                            title={row.errorMessage}
                          >
                            ⚠ Docente nuevo
                          </span>
                        )}
                        {row.status === 'error' && (
                          <span
                            className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold cursor-help"
                            title={row.errorMessage}
                          >
                            ✕ Incompleto
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <p className="text-xs text-gray-400 flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Los horarios se vinculan y guardan en Supabase sin borrar asignaciones ya registradas.
                </span>
              </p>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || validCount + warningCount === 0}
                  onClick={handleConfirmImport}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Guardando en BD...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Guardar {validCount + warningCount} Horarios en Base de Datos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
