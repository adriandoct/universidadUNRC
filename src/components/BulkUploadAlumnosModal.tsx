"use client";

import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Trash2,
  Check,
  Building,
  GraduationCap
} from 'lucide-react';
import { Alumno, Carrera, Sede, CicloEscolar, db, getDefaultUserPassword } from '@/lib/db';

interface BulkUploadAlumnosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { added: number; updated: number }) => void;
  existingAlumnos: Alumno[];
  carreras: Carrera[];
  sedes: Sede[];
  activeCiclo?: CicloEscolar;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface ParsedAlumnoRow {
  index: number;
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  grado: string;
  grupo: string;
  carrera_id?: string;
  carrera?: string;
  sede_id?: string;
  sede_nombre?: string;
  estado_matricula: 'activo' | 'baja_temporal' | 'egresado' | 'aspirante';
  tutor: string;
  telefono: string;
  password?: string;
  qr_code?: string;
  status: 'valid' | 'exists' | 'error';
  errorMessage?: string;
}

export default function BulkUploadAlumnosModal({
  isOpen,
  onClose,
  onSuccess,
  existingAlumnos,
  carreras,
  sedes,
  activeCiclo,
  showToast
}: BulkUploadAlumnosModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedAlumnoRow[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'exists' | 'error'>('all');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Download official CSV template with UTF-8 BOM
  const handleDownloadTemplate = () => {
    const defaultSedeName = sedes[0]?.nombre || 'Campus Magdalena Contreras';
    const defaultCarreraName = carreras[0]?.nombre || 'Licenciatura en Ciencias de Datos e Inteligencia Artificial';
    const secondCarrera = carreras[1]?.nombre || 'Licenciatura en Turismo';
    const thirdCarrera = carreras[2]?.nombre || 'Licenciatura en Administración';

    const headers = [
      'matricula',
      'nombre',
      'apellido_paterno',
      'apellido_materno',
      'grado',
      'grupo',
      'carrera',
      'sede',
      'estado_matricula',
      'tutor',
      'telefono',
      'password'
    ];

    const sampleRows = [
      [
        'UNRC-2026-051',
        'Dayanna Gissel',
        'Buitimea',
        'Garma',
        '1° Semestre',
        '101',
        `"${defaultCarreraName}"`,
        `"${defaultSedeName}"`,
        'activo',
        'Dra. María Elena Sandoval',
        '+525511223344',
        ''
      ],
      [
        'UNRC-2026-052',
        'Carlos Eduardo',
        'Hernandez',
        'Mendoza',
        '2° Semestre',
        '201-TUR',
        `"${secondCarrera}"`,
        `"${defaultSedeName}"`,
        'activo',
        'Dr. Adrian Silva',
        '+525522334455',
        ''
      ],
      [
        'UNRC-2026-053',
        'Valeria Sofia',
        'Ramirez',
        'Cruz',
        '2° Semestre',
        '203-ADM',
        `"${thirdCarrera}"`,
        `"${defaultSedeName}"`,
        'activo',
        'Dr. Adrian Silva',
        '+525533445566',
        ''
      ]
    ];

    const csvContent =
      '\uFEFF' +
      headers.join(',') +
      '\r\n' +
      sampleRows.map((r) => r.join(',')).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_alumnos_unrc.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Plantilla oficial descargada correctamente', 'info');
  };

  // 2. CSV Line Parser supporting quotes and delimiters (, or ;)
  const parseCSVLine = (text: string, delimiter: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cur += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  // 3. Process CSV file content
  const processCSV = (content: string) => {
    setIsProcessingFile(true);
    try {
      // Remove UTF-8 BOM if present
      const cleanContent = content.replace(/^\uFEFF/, '');
      const rawLines = cleanContent.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);

      if (rawLines.length < 2) {
        showToast('El archivo CSV debe contener una fila de encabezados y al menos un registro.', 'error');
        setParsedRows([]);
        return;
      }

      // Detect delimiter (, or ;)
      const firstLine = rawLines[0];
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const delimiter = semicolonCount > commaCount ? ';' : ',';

      const headerTokens = parseCSVLine(firstLine, delimiter).map((h) =>
        h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_-]+/g, '')
      );

      // Find column indices with broad alias support
      const findCol = (...aliases: string[]) => {
        return headerTokens.findIndex((h) =>
          aliases.some((a) => h === a || h.includes(a))
        );
      };

      const colMatricula = findCol('matricula', 'studentcode', 'codigo', 'clave', 'id');
      const colNombre = findCol('nombre', 'nombres', 'firstname', 'name');
      const colPaterno = findCol('apellidopaterno', 'paterno', 'primerapellido', 'lastname');
      const colMaterno = findCol('apellidomaterno', 'materno', 'segundoapellido');
      const colGrado = findCol('grado', 'semestre', 'gradelevel', 'semestregrado');
      const colGrupo = findCol('grupo', 'seccion', 'secciongrupo', 'section');
      const colCarrera = findCol('carrera', 'licenciatura', 'carreraid', 'carreranombre');
      const colSede = findCol('sede', 'campus', 'sedeid', 'sedenombre');
      const colEstado = findCol('estadomatricula', 'estado', 'status');
      const colTutor = findCol('tutor', 'docentetitular', 'tutorlegal', 'guardian');
      const colTelefono = findCol('telefono', 'celular', 'tel', 'phone');
      const colPassword = findCol('password', 'contrasena', 'contrasenia', 'claveacceso');

      if (colMatricula === -1 || colNombre === -1 || colPaterno === -1) {
        showToast(
          'Encabezados requeridos no encontrados. El CSV debe incluir: matricula, nombre, apellido_paterno.',
          'error'
        );
        setParsedRows([]);
        return;
      }

      const rows: ParsedAlumnoRow[] = [];
      const seenMatriculasInFile = new Set<string>();

      for (let i = 1; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (!line.trim()) continue;

        const values = parseCSVLine(line, delimiter);
        const matricula = (colMatricula >= 0 ? values[colMatricula] : '').trim();
        const nombre = (colNombre >= 0 ? values[colNombre] : '').trim();
        const apellido_paterno = (colPaterno >= 0 ? values[colPaterno] : '').trim();
        const apellido_materno = (colMaterno >= 0 ? values[colMaterno] : '').trim();
        const rawGrado = (colGrado >= 0 ? values[colGrado] : '').trim();
        const rawGrupo = (colGrupo >= 0 ? values[colGrupo] : '').trim();
        const rawCarrera = (colCarrera >= 0 ? values[colCarrera] : '').trim();
        const rawSede = (colSede >= 0 ? values[colSede] : '').trim();
        const rawEstado = (colEstado >= 0 ? values[colEstado] : '').trim().toLowerCase();
        const rawTutor = (colTutor >= 0 ? values[colTutor] : '').trim();
        const rawTelefono = (colTelefono >= 0 ? values[colTelefono] : '').trim();
        const rawPassword = (colPassword >= 0 ? values[colPassword] : '').trim();

        // Check required fields
        const missingFields: string[] = [];
        if (!matricula) missingFields.push('matrícula');
        if (!nombre) missingFields.push('nombre');
        if (!apellido_paterno) missingFields.push('apellido paterno');

        // Resolve carrera matching
        let resolvedCarrera = carreras.find((c) =>
          c.id === rawCarrera ||
          c.clave?.toLowerCase() === rawCarrera.toLowerCase() ||
          c.nombre?.toLowerCase().includes(rawCarrera.toLowerCase()) ||
          rawCarrera.toLowerCase().includes(c.nombre?.toLowerCase())
        );
        if (!resolvedCarrera && carreras.length > 0) {
          resolvedCarrera = carreras[0];
        }

        // Resolve sede matching
        let resolvedSede = sedes.find((s) =>
          s.id === rawSede ||
          s.clave?.toLowerCase() === rawSede.toLowerCase() ||
          s.nombre?.toLowerCase().includes(rawSede.toLowerCase()) ||
          rawSede.toLowerCase().includes(s.nombre?.toLowerCase())
        );
        if (!resolvedSede && sedes.length > 0) {
          resolvedSede = sedes[0];
        }

        // Resolve estado
        let resolvedEstado: 'activo' | 'baja_temporal' | 'egresado' | 'aspirante' = 'activo';
        if (rawEstado.includes('baja')) resolvedEstado = 'baja_temporal';
        else if (rawEstado.includes('egres')) resolvedEstado = 'egresado';
        else if (rawEstado.includes('aspir')) resolvedEstado = 'aspirante';

        // Check existence
        const existsInDb = existingAlumnos.some(
          (a) => (a.matricula || '').trim().toLowerCase() === matricula.toLowerCase()
        );

        let status: 'valid' | 'exists' | 'error' = 'valid';
        let errorMessage: string | undefined = undefined;

        if (missingFields.length > 0) {
          status = 'error';
          errorMessage = `Campos faltantes: ${missingFields.join(', ')}`;
        } else if (seenMatriculasInFile.has(matricula.toLowerCase())) {
          status = 'error';
          errorMessage = `Matrícula duplicada dentro del mismo archivo CSV: ${matricula}`;
        } else if (existsInDb) {
          status = 'exists';
          errorMessage = 'Matrícula ya registrada en el sistema escolar';
        }

        if (matricula) {
          seenMatriculasInFile.add(matricula.toLowerCase());
        }

        rows.push({
          index: i,
          matricula,
          nombre,
          apellido_paterno,
          apellido_materno,
          grado: rawGrado || '1° Semestre',
          grupo: rawGrupo || '101',
          carrera_id: resolvedCarrera?.id,
          carrera: resolvedCarrera?.nombre || rawCarrera || 'Licenciatura UNRC',
          sede_id: resolvedSede?.id,
          sede_nombre: resolvedSede?.nombre || rawSede || 'Campus Magdalena Contreras',
          estado_matricula: resolvedEstado,
          tutor: rawTutor || 'Dr. Adrian Silva',
          telefono: rawTelefono || '+525500000000',
          password: rawPassword,
          qr_code: matricula,
          status,
          errorMessage
        });
      }

      setParsedRows(rows);
      showToast(`${rows.length} filas analizadas del archivo CSV.`, 'info');
    } catch (err: any) {
      console.error('Error procesando archivo CSV:', err);
      showToast(`Error al procesar el archivo CSV: ${err.message}`, 'error');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith('.csv') && selected.type !== 'text/csv') {
      showToast('Por favor selecciona un archivo con extensión .csv', 'error');
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!droppedFile.name.toLowerCase().endsWith('.csv')) {
      showToast('El archivo debe tener formato .csv', 'error');
      return;
    }

    setFile(droppedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(droppedFile, 'UTF-8');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleResetFile = () => {
    setFile(null);
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 4. Submit Bulk Insert
  const handleConfirmImport = async () => {
    const rowsToImport = parsedRows.filter((r) => {
      if (r.status === 'error') return false;
      if (r.status === 'exists' && !updateExisting) return false;
      return true;
    });

    if (rowsToImport.length === 0) {
      showToast('No hay filas válidas para importar con la configuración actual.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const alumnosPayload = rowsToImport.map((r) => ({
        matricula: r.matricula,
        nombre: r.nombre,
        apellido_paterno: r.apellido_paterno,
        apellido_materno: r.apellido_materno,
        grado: r.grado,
        grupo: r.grupo,
        carrera: r.carrera,
        carrera_id: r.carrera_id,
        sede_id: r.sede_id,
        sede_nombre: r.sede_nombre,
        ciclo_id: activeCiclo?.id || 'ciclo-2026-2',
        estado_matricula: r.estado_matricula,
        tutor: r.tutor,
        telefono: r.telefono,
        password: r.password?.trim() || getDefaultUserPassword(r.matricula, '2026-2'),
        qr_code: r.matricula
      }));

      const res = await db.addAlumnosBulk(alumnosPayload, { updateExisting });
      showToast(
        `Importación completada: ${res.added} nuevos expedientes matriculados, ${res.updated} actualizados.`,
        'success'
      );
      onSuccess(res);
      handleResetFile();
      onClose();
    } catch (err: any) {
      console.error('Error en importación masiva:', err);
      showToast(`Error al guardar alumnos: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Counters
  const validCount = parsedRows.filter((r) => r.status === 'valid').length;
  const existsCount = parsedRows.filter((r) => r.status === 'exists').length;
  const errorCount = parsedRows.filter((r) => r.status === 'error').length;
  const totalCount = parsedRows.length;

  const filteredRows = parsedRows.filter((r) => {
    if (filterView === 'valid') return r.status === 'valid';
    if (filterView === 'exists') return r.status === 'exists';
    if (filterView === 'error') return r.status === 'error';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c1220] border border-blue-500/30 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-blue-500/10 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-950/40 via-transparent to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                <span>Carga Masiva de Alumnos (.CSV)</span>
                <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Base de Datos UNRC
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Sube expedientes de estudiantes en lote compatibles con el esquema de tablas del sistema.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Top Action Bar: Template download & quick instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <div className="md:col-span-2 space-y-1">
              <h4 className="font-semibold text-white flex items-center space-x-1.5 text-xs">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span>Formato Requerido por la Base de Datos</span>
              </h4>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                El archivo debe incluir encabezados: <code className="text-blue-300 font-mono">matricula</code>,{' '}
                <code className="text-blue-300 font-mono">nombre</code>,{' '}
                <code className="text-blue-300 font-mono">apellido_paterno</code>,{' '}
                <code className="text-blue-300 font-mono">grado</code>,{' '}
                <code className="text-blue-300 font-mono">grupo</code>,{' '}
                <code className="text-blue-300 font-mono">carrera</code>,{' '}
                <code className="text-blue-300 font-mono">sede</code>.
                Si no se especifica contraseña, se asignará automáticamente el formato oficial UNRC (<code className="text-emerald-300 font-mono">Matricula-2026-2</code>).
              </p>
            </div>
            <div className="flex items-center justify-start md:justify-end">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold text-xs flex items-center justify-center space-x-2 transition-all group"
              >
                <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                <span>Descargar Plantilla CSV</span>
              </button>
            </div>
          </div>

          {/* File Upload Zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                dragActive
                  ? 'border-blue-400 bg-blue-500/10 scale-[0.99]'
                  : 'border-white/10 hover:border-blue-500/40 hover:bg-white/[0.02]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <Upload className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Arrastra y suelta tu archivo <span className="text-blue-400">.CSV</span> aquí
                </p>
                <p className="text-xs text-gray-400">
                  o haz clic para explorar tus documentos desde tu equipo
                </p>
              </div>
              <div className="text-[11px] text-gray-500 font-mono">
                Soporta separadores por coma (,) y punto y coma (;), codificación UTF-8
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File details card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-xs">{file.name}</p>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {(file.size / 1024).toFixed(1)} KB • {totalCount} filas procesadas
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleResetFile}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs flex items-center space-x-1 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Cambiar Archivo</span>
                  </button>
                </div>
              </div>

              {/* Statistics & Options bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  onClick={() => setFilterView('all')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    filterView === 'all'
                      ? 'bg-blue-500/10 border-blue-500/40 text-blue-300'
                      : 'bg-black/30 border-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider font-semibold">Total Filas</p>
                  <p className="text-lg font-bold text-white mt-0.5">{totalCount}</p>
                </div>

                <div
                  onClick={() => setFilterView('valid')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    filterView === 'valid'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-black/30 border-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Nuevos Válidos</span>
                  </p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">{validCount}</p>
                </div>

                <div
                  onClick={() => setFilterView('exists')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    filterView === 'exists'
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-black/30 border-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-400 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Ya Registrados</span>
                  </p>
                  <p className="text-lg font-bold text-amber-400 mt-0.5">{existsCount}</p>
                </div>

                <div
                  onClick={() => setFilterView('error')}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    filterView === 'error'
                      ? 'bg-red-500/10 border-red-500/40 text-red-300'
                      : 'bg-black/30 border-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Con Errores</span>
                  </p>
                  <p className="text-lg font-bold text-red-400 mt-0.5">{errorCount}</p>
                </div>
              </div>

              {/* Duplicate Handling Option */}
              {existsCount > 0 && (
                <div className="flex items-center space-x-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
                  <input
                    type="checkbox"
                    id="updateExistingCheckbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-black/40 border-amber-500/40"
                  />
                  <label htmlFor="updateExistingCheckbox" className="text-xs cursor-pointer select-none">
                    <strong>Actualizar datos de las {existsCount} matrículas ya registradas</strong> (si se
                    desmarca, estas filas serán ignoradas para evitar sobrescrituras).
                  </label>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-semibold text-white">Previsualización de Alumnos ({filteredRows.length}):</span>
                  <span className="text-[11px]">
                    Mostrando filtro: <strong className="text-blue-400 uppercase">{filterView}</strong>
                  </span>
                </div>

                <div className="border border-white/10 rounded-2xl overflow-hidden max-h-64 overflow-y-auto bg-black/40">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#111827] sticky top-0 border-b border-white/10 text-gray-400 text-[11px]">
                      <tr>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5">Matrícula</th>
                        <th className="p-2.5">Alumno</th>
                        <th className="p-2.5">Grado / Grupo</th>
                        <th className="p-2.5">Carrera</th>
                        <th className="p-2.5">Sede</th>
                        <th className="p-2.5">Tutor</th>
                        <th className="p-2.5">Contraseña Asignada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[11px]">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-gray-500">
                            No hay registros para este filtro.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((r) => (
                          <tr
                            key={r.index}
                            className={`hover:bg-white/[0.02] transition-colors ${
                              r.status === 'error'
                                ? 'bg-red-500/5'
                                : r.status === 'exists'
                                ? 'bg-amber-500/5'
                                : ''
                            }`}
                          >
                            <td className="p-2.5 whitespace-nowrap">
                              {r.status === 'valid' && (
                                <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 text-[10px]">
                                  <Check className="w-3 h-3" />
                                  <span>Nuevo</span>
                                </span>
                              )}
                              {r.status === 'exists' && (
                                <span className="inline-flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 text-[10px]" title={r.errorMessage}>
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{updateExisting ? 'Actualizará' : 'Omitirá'}</span>
                                </span>
                              )}
                              {r.status === 'error' && (
                                <span className="inline-flex items-center space-x-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30 text-[10px]" title={r.errorMessage}>
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Error</span>
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-white font-medium">{r.matricula || '-'}</td>
                            <td className="p-2.5 font-medium text-white">
                              {r.nombre} {r.apellido_paterno} {r.apellido_materno}
                              {r.errorMessage && (
                                <p className="text-[10px] text-red-400 font-normal">{r.errorMessage}</p>
                              )}
                            </td>
                            <td className="p-2.5 text-gray-300">
                              {r.grado} • <span className="font-mono text-blue-300">{r.grupo}</span>
                            </td>
                            <td className="p-2.5 text-gray-300 truncate max-w-[160px]" title={r.carrera}>
                              {r.carrera}
                            </td>
                            <td className="p-2.5 text-gray-300 truncate max-w-[140px]" title={r.sede_nombre}>
                              {r.sede_nombre}
                            </td>
                            <td className="p-2.5 text-gray-400">{r.tutor}</td>
                            <td className="p-2.5 font-mono text-gray-300 text-[10px]">
                              {r.password?.trim()
                                ? r.password
                                : getDefaultUserPassword(r.matricula, '2026-2')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/20">
          <div className="text-[11px] text-gray-400">
            {file && (
              <span>
                Se importarán/actualizarán:{' '}
                <strong className="text-white">
                  {updateExisting ? validCount + existsCount : validCount}
                </strong>{' '}
                expedientes de {totalCount} filas totales.
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-all"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={
                !file ||
                isSubmitting ||
                isProcessingFile ||
                (validCount === 0 && (!updateExisting || existsCount === 0))
              }
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-transparent text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando en Base de Datos...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Confirmar e Importar (
                    {updateExisting ? validCount + existsCount : validCount})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
