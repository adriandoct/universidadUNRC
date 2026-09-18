"use client";

import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  GraduationCap,
  Sparkles,
  Info,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Docente, Carrera, Sede, db, getDefaultUserPassword } from '@/lib/db';

interface BulkUploadDocentesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { added: number; updated: number }) => void;
  existingDocentes: Docente[];
  carreras: Carrera[];
  sedes: Sede[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface ParsedDocenteRow {
  index: number;
  num_empleado: string;
  nombre_completo: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono: string;
  carreras_abreviadas: string[];
  carreras_completas: string[];
  sede_nombre: string;
  status: 'valid' | 'exists' | 'error';
  errorMessage?: string;
}

interface DocenteColumnMapping {
  colNombreCompleto: number;
  colNombre: number;
  colPaterno: number;
  colMaterno: number;
  colEmail: number;
  colTelefono: number;
  colCarreras: number;
  colNumEmpleado: number;
}

// Convertir carrera o texto a abreviatura oficial
export function resolveCarreraAbreviatura(text: string): { abrev: string; fullName: string } {
  const clean = (text || '').toUpperCase().trim();
  if (clean.includes('CDIA') || (clean.includes('DATOS') && clean.includes('INTELIGENCIA'))) {
    return { abrev: 'CDIA', fullName: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial' };
  }
  if (clean.includes('LCDN') || (clean.includes('DATOS') && clean.includes('NEGOCIOS'))) {
    return { abrev: 'LCDN', fullName: 'Licenciatura en Ciencia de Datos para los Negocios' };
  }
  if (clean.includes('DATOS')) {
    return { abrev: 'CDIA', fullName: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial' };
  }
  if (clean.includes('TIC') || clean.includes('TECNOLOG') || clean.includes('INFORMACION')) {
    return { abrev: 'TIC', fullName: 'Licenciatura en Tecnologías de la Información y Comunicación' };
  }
  if (clean.includes('CIB') || clean.includes('CIBER')) {
    return { abrev: 'CIB', fullName: 'Licenciatura en Ciberseguridad' };
  }
  if (clean.includes('TUR') || clean.includes('TURISMO')) {
    return { abrev: 'TUR', fullName: 'Licenciatura en Turismo' };
  }
  if (clean.includes('ADM') || clean.includes('ADMINISTRA') || clean.includes('PHLAC') || clean.includes('LAC') || clean.includes('COMERCIO')) {
    return { abrev: 'ADM', fullName: 'Licenciatura en Administración' };
  }

  const fallbackAbrev = clean.replace(/[^A-Z0-9]/g, '').substring(0, 4) || 'UNRC';
  return { abrev: fallbackAbrev, fullName: text.trim() || 'Licenciatura UNRC' };
}

// Separar nombre completo en nombre, paterno y materno
function splitDocenteName(fullName: string) {
  let clean = (fullName || '').trim().replace(/\s+/g, ' ');
  // Quitar títulos como Dr., Dra., Mtro., Mtra., Lic., Ing., Prof.
  clean = clean.replace(/^(?:Dr|Dra|Mtro|Mtra|Lic|Ing|Prof|Profr|Profra)\.?\s+/i, '').trim();

  if (!clean) return { nombre: '', apellido_paterno: '', apellido_materno: '' };

  if (clean.includes(',')) {
    const parts = clean.split(',');
    const apellidos = (parts[0] || '').trim().split(' ');
    const nombres = (parts[1] || '').trim();
    return {
      nombre: nombres || apellidos[0] || '',
      apellido_paterno: apellidos[0] || '',
      apellido_materno: apellidos.slice(1).join(' ') || ''
    };
  }

  const words = clean.split(' ');
  if (words.length === 1) {
    return { nombre: words[0], apellido_paterno: words[0], apellido_materno: '' };
  }
  if (words.length === 2) {
    return { nombre: words[0], apellido_paterno: words[1], apellido_materno: '' };
  }
  if (words.length === 3) {
    return {
      nombre: words[0],
      apellido_paterno: words[1],
      apellido_materno: words[2]
    };
  }
  // 4 o más palabras: primeros 2 nombres, luego paterno y materno
  return {
    nombre: words.slice(0, words.length - 2).join(' '),
    apellido_paterno: words[words.length - 2] || '',
    apellido_materno: words[words.length - 1] || ''
  };
}

export default function BulkUploadDocentesModal({
  isOpen,
  onClose,
  onSuccess,
  existingDocentes,
  carreras,
  sedes,
  showToast
}: BulkUploadDocentesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedDocenteRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'exists' | 'error'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processDocentesMatrix = (matrix: any[][]) => {
    if (!matrix || matrix.length === 0) {
      setParsedRows([]);
      return;
    }

    // 1. Encontrar la fila de encabezados
    let headerIdx = 0;
    let maxScore = -1;
    const scanLimit = Math.min(matrix.length, 15);

    for (let i = 0; i < scanLimit; i++) {
      const row = matrix[i] || [];
      let score = 0;
      for (const cell of row) {
        const val = String(cell ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (val.includes('nombre') || val.includes('docente') || val.includes('profesor')) score += 25;
        if (val.includes('correo') || val.includes('email') || val.includes('mail')) score += 25;
        if (val.includes('telefono') || val.includes('celular') || val.includes('tel')) score += 20;
        if (val.includes('carrera') || val.includes('abreviatura') || val.includes('imparte') || val.includes('materia')) score += 20;
      }
      if (score > maxScore && score >= 20) {
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

    const mapping: DocenteColumnMapping = {
      colNombreCompleto: findCol('nombrecompleto', 'docente', 'profesor', 'nombredeldocente', 'nombredocente', 'catedratico'),
      colNombre: findCol('nombre(s)', 'nombres', 'nombre', 'firstname'),
      colPaterno: findCol('apellidopaterno', 'paterno', 'primerapellido', 'apellidos'),
      colMaterno: findCol('apellidomaterno', 'materno', 'segundoapellido'),
      colEmail: findCol('correo', 'correoelectronico', 'email', 'correoinstitucional', 'mail'),
      colTelefono: findCol('telefono', 'celular', 'tel', 'phone', 'movil'),
      colCarreras: findCol('carrerasqueimparte', 'carreras', 'carrera', 'carrerasimparte', 'abreviatura', 'abreviaturas', 'carrerasabreviatura', 'licenciaturas', 'area'),
      colNumEmpleado: findCol('numempleado', 'numeroempleado', 'clave', 'clavedocente', 'id', 'noempleado')
    };

    // Fallbacks si no se encontró columna exacta
    if (mapping.colNombreCompleto === -1 && mapping.colNombre === -1) {
      mapping.colNombreCompleto = 0; // Primera columna comúnmente
    }
    if (mapping.colEmail === -1) {
      mapping.colEmail = 1; // Segunda columna habitual
    }
    if (mapping.colTelefono === -1) {
      mapping.colTelefono = 2; // Tercera columna habitual
    }
    if (mapping.colCarreras === -1) {
      mapping.colCarreras = 3; // Cuarta columna habitual
    }

    // Procesar filas de datos
    const rows: ParsedDocenteRow[] = [];
    const seenEmails = new Set<string>();

    for (let i = headerIdx + 1; i < matrix.length; i++) {
      const row = matrix[i] || [];
      if (row.length === 0 || row.every((c: any) => String(c ?? '').trim() === '')) continue;

      // 1. Extraer nombre
      let fullName = mapping.colNombreCompleto >= 0 ? String(row[mapping.colNombreCompleto] ?? '').trim() : '';
      let nom = mapping.colNombre >= 0 ? String(row[mapping.colNombre] ?? '').trim() : '';
      let pat = mapping.colPaterno >= 0 ? String(row[mapping.colPaterno] ?? '').trim() : '';
      let mat = mapping.colMaterno >= 0 ? String(row[mapping.colMaterno] ?? '').trim() : '';

      if (fullName && (!nom || !pat)) {
        const parts = splitDocenteName(fullName);
        nom = parts.nombre;
        pat = parts.apellido_paterno;
        mat = parts.apellido_materno;
      } else if (!fullName && (nom || pat)) {
        fullName = `${nom} ${pat} ${mat}`.trim();
      }

      // Si la fila no tiene nombre ni apellido, omitir
      if (!fullName && !nom && !pat) continue;

      // 2. Extraer correo
      let email = mapping.colEmail >= 0 ? String(row[mapping.colEmail] ?? '').trim() : '';
      if (!email || !email.includes('@')) {
        // Generar institucional sugerido si no viene correo
        const safeNom = (nom || 'docente').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
        const safePat = (pat || 'unrc').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
        email = `${safeNom}.${safePat}@rcastellanos.cdmx.gob.mx`;
      }

      // 3. Extraer teléfono
      let telefono = mapping.colTelefono >= 0 ? String(row[mapping.colTelefono] ?? '').trim() : '';
      if (telefono) {
        telefono = telefono.replace(/\.0+$/, '').replace(/^["']|["']$/g, '').trim();
      } else {
        telefono = '+525500000000';
      }

      // 4. Extraer Carreras que imparte (Abreviatura)
      const rawCarreras = mapping.colCarreras >= 0 ? String(row[mapping.colCarreras] ?? '').trim() : '';
      const splitCar = rawCarreras
        ? rawCarreras.split(/[,;\/|]+/).map((s) => s.trim()).filter(Boolean)
        : ['ADM'];

      const resolvedAbrevs: string[] = [];
      const resolvedFullNames: string[] = [];

      splitCar.forEach((item) => {
        const res = resolveCarreraAbreviatura(item);
        if (!resolvedAbrevs.includes(res.abrev)) {
          resolvedAbrevs.push(res.abrev);
        }
        if (!resolvedFullNames.includes(res.fullName)) {
          resolvedFullNames.push(res.fullName);
        }
      });

      if (resolvedAbrevs.length === 0) {
        resolvedAbrevs.push('ADM');
        resolvedFullNames.push('Licenciatura en Administración');
      }

      // 5. Clave de empleado
      let numEmp = mapping.colNumEmpleado >= 0 ? String(row[mapping.colNumEmpleado] ?? '').trim() : '';
      if (!numEmp) {
        numEmp = `DOC-UNRC-${String(existingDocentes.length + rows.length + 1).padStart(2, '0')}`;
      }

      // Validaciones
      let status: 'valid' | 'exists' | 'error' = 'valid';
      let errorMessage: string | undefined = undefined;

      const emailLower = email.toLowerCase();
      if (!fullName) {
        status = 'error';
        errorMessage = 'Nombre del docente vacío';
      } else if (seenEmails.has(emailLower)) {
        status = 'error';
        errorMessage = `Correo duplicado en el archivo: ${email}`;
      } else if (existingDocentes.some((d) => (d.email || '').toLowerCase() === emailLower || (d.num_empleado || '').toLowerCase() === numEmp.toLowerCase())) {
        status = 'exists';
        errorMessage = 'Docente ya registrado (se actualizarán sus carreras y teléfono)';
      }

      seenEmails.add(emailLower);

      rows.push({
        index: rows.length + 1,
        num_empleado: numEmp,
        nombre_completo: fullName,
        nombre: nom || fullName,
        apellido_paterno: pat || 'UNRC',
        apellido_materno: mat || '',
        email,
        telefono,
        carreras_abreviadas: resolvedAbrevs,
        carreras_completas: resolvedFullNames,
        sede_nombre: sedes[0]?.nombre || 'Campus Tijuana',
        status,
        errorMessage
      });
    }

    setParsedRows(rows);
    if (rows.length > 0) {
      showToast(`✅ ${rows.length} docentes leídos del archivo exitosamente`, 'success');
    } else {
      showToast('No se encontraron registros de docentes válidos en el archivo.', 'error');
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
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
        const sheetName = wb.SheetNames[0] || '';
        const ws = wb.Sheets[sheetName];
        if (!ws) {
          showToast('El archivo no contiene hojas válidas', 'error');
          return;
        }
        const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
        processDocentesMatrix(matrix);
      } catch (err: any) {
        showToast(`Error al procesar archivo: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFile(droppedFile);
  };

  // Descargar plantilla oficial con los 4 campos solicitados
  const handleDownloadTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const headers = ['NOMBRE COMPLETO', 'CORREO', 'TELEFONO', 'CARRERAS QUE IMPARTE (ABREVIATURA)'];
    const sampleRows = [
      ['Dr. Adrian Silva', 'adrian.silva@rcastellanos.cdmx.gob.mx', '+525512345678', 'ADM, TUR, LCDN'],
      ['Lic. Alejandro Valdez Mendoza', 'alejandro.valdez@rcastellanos.cdmx.gob.mx', '+525599887766', 'CDIA, LCDN'],
      ['Mtra. Sofia Morales Ríos', 'sofia.morales@rcastellanos.cdmx.gob.mx', '+525588776655', 'TIC'],
      ['Ing. Roberto Gómez Castillo', 'roberto.gomez@rcastellanos.cdmx.gob.mx', '+525544332211', 'CIB']
    ];

    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Docentes_UNRC');
      XLSX.writeFile(wb, 'plantilla_docentes_unrc.xlsx');
      showToast('Plantilla oficial de Docentes en Excel descargada', 'info');
    } else {
      const csv = '\uFEFF' + headers.join(',') + '\r\n' + sampleRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_docentes_unrc.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Plantilla oficial de Docentes en CSV descargada', 'info');
    }
  };

  // Confirmar e importar docentes a la BD
  const handleConfirmImport = async () => {
    const toImport = parsedRows.filter((r) => r.status !== 'error');
    if (toImport.length === 0) {
      showToast('No hay docentes válidos para importar.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = toImport.map((r) => {
        const existing = existingDocentes.find(
          (d) =>
            (d.email && d.email.toLowerCase() === r.email.toLowerCase()) ||
            (d.num_empleado && d.num_empleado.toLowerCase() === r.num_empleado.toLowerCase())
        );

        return {
          num_empleado: r.num_empleado,
          nombre: r.nombre,
          apellido_paterno: r.apellido_paterno,
          apellido_materno: r.apellido_materno,
          email: r.email,
          departamento: r.carreras_completas.join(' / '),
          carreras_asignadas: r.carreras_completas,
          puesto: 'docente' as const,
          telefono: r.telefono,
          sede_nombre: r.sede_nombre,
          materias: existing?.materias && existing.materias.length > 0 ? existing.materias : [],
          horario_resumen:
            existing?.horarios && existing.horarios.length > 0
              ? existing.horario_resumen || 'Horario Asignado'
              : 'Por programar',
          horarios: existing?.horarios && existing.horarios.length > 0 ? existing.horarios : [],
          password: getDefaultUserPassword(r.num_empleado, '2026-2'),
        };
      });

      await db.addDocentesBulk(payload);
      showToast(`✅ ${toImport.length} docentes registrados e incorporados exitosamente.`, 'success');
      onSuccess({ added: toImport.length, updated: 0 });
      onClose();
    } catch (err: any) {
      showToast(`Error al guardar docentes: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.status === 'valid').length;
  const existsCount = parsedRows.filter((r) => r.status === 'exists').length;
  const errorCount = parsedRows.filter((r) => r.status === 'error').length;

  const filteredRows = parsedRows.filter((r) => {
    if (filterView === 'valid') return r.status === 'valid';
    if (filterView === 'exists') return r.status === 'exists';
    if (filterView === 'error') return r.status === 'error';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c1220] border border-amber-500/30 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/40 via-transparent to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                <span>Carga Masiva de Docentes (.XLSX / .XLS / .CSV)</span>
                <span className="text-[10px] uppercase tracking-wider font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Plantilla UNRC
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Importa docentes respetando los campos: <strong className="text-gray-200">NOMBRE COMPLETO</strong>, <strong className="text-gray-200">CORREO</strong>, <strong className="text-gray-200">TELÉFONO</strong> y <strong className="text-gray-200">CARRERAS QUE IMPARTE (ABREVIATURA)</strong>.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Zona de Arrastrar Archivo o Botones de Plantilla */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-white font-bold text-xs">Plantilla Oficial de Docentes</p>
                <p className="text-gray-400 text-[11px]">Campos: NOMBRE COMPLETO • CORREO • TELÉFONO • CARRERAS QUE IMPARTE</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('xlsx')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center space-x-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center space-x-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar CSV</span>
              </button>
            </div>
          </div>

          {/* Área de carga */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive ? 'border-amber-400 bg-amber-500/10' : 'border-white/15 hover:border-amber-400/50 bg-black/30 hover:bg-black/40'
            }`}
          >
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
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 shadow-lg shadow-amber-500/20">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-white font-bold text-sm">
              {file ? file.name : 'Haz clic o arrastra aquí tu archivo de Docentes'}
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Soporta archivos Excel (.xlsx, .xls) o valores separados por comas (.csv)
            </p>
          </div>

          {/* Vista previa de registros si ya se cargó */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2">
              {/* Filtros de resumen */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-black/40 p-3 rounded-2xl border border-white/10">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-white">Registros encontrados: {parsedRows.length}</span>
                  <div className="flex items-center space-x-1 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                      ✓ {validCount} válidos
                    </span>
                    {existsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30">
                        ℹ️ {existsCount} ya registrados
                      </span>
                    )}
                    {errorCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30">
                        ⚠️ {errorCount} con errores
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setFilterView('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${filterView === 'all' ? 'bg-amber-600 text-white' : 'bg-white/5 text-gray-400'}`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('valid')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${filterView === 'valid' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400'}`}
                  >
                    Válidos
                  </button>
                  {errorCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterView('error')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${filterView === 'error' ? 'bg-rose-600 text-white' : 'bg-white/5 text-gray-400'}`}
                    >
                      Errores ({errorCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de previsualización */}
              <div className="overflow-x-auto rounded-2xl border border-white/10 max-h-60">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-black/70 text-gray-400 uppercase text-[10px] font-bold sticky top-0">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">NOMBRE COMPLETO</th>
                      <th className="p-3">CORREO</th>
                      <th className="p-3">TELÉFONO</th>
                      <th className="p-3">CARRERAS (ABREVIATURA)</th>
                      <th className="p-3">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/20">
                    {filteredRows.map((r) => (
                      <tr key={r.index} className="hover:bg-white/5">
                        <td className="p-3 text-gray-500 font-mono text-[11px]">{r.index}</td>
                        <td className="p-3 font-bold text-white whitespace-nowrap">{r.nombre_completo}</td>
                        <td className="p-3 text-gray-300 font-mono text-[11px] whitespace-nowrap">{r.email}</td>
                        <td className="p-3 text-gray-400 font-mono text-[11px] whitespace-nowrap">{r.telefono}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {r.carreras_abreviadas.map((abr, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 text-[10px]"
                                title={r.carreras_completas[idx] || abr}
                              >
                                {abr}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {r.status === 'valid' && (
                            <span className="text-emerald-400 font-bold flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Listo para importar</span>
                            </span>
                          )}
                          {r.status === 'exists' && (
                            <span className="text-blue-400 font-semibold flex items-center space-x-1">
                              <Info className="w-3.5 h-3.5" />
                              <span>Actualizará datos</span>
                            </span>
                          )}
                          {r.status === 'error' && (
                            <span className="text-rose-400 font-bold flex items-center space-x-1" title={r.errorMessage}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{r.errorMessage}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 border-t border-white/10 flex items-center justify-between bg-black/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs"
          >
            Cancelar
          </button>
          <div className="flex items-center space-x-3">
            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setParsedRows([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-3 py-2 rounded-xl text-gray-400 hover:text-rose-400 text-xs font-semibold flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isSubmitting || parsedRows.filter((r) => r.status !== 'error').length === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5 ${
                isSubmitting || parsedRows.filter((r) => r.status !== 'error').length === 0
                  ? 'bg-amber-600/30 text-amber-300/40 cursor-not-allowed'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Importando Docentes...'
                  : `Confirmar e Importar (${parsedRows.filter((r) => r.status !== 'error').length} Docentes)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
