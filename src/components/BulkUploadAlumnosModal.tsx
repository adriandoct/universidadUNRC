"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  GraduationCap,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
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
  initialCarreraId?: string;
  initialSedeId?: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface ParsedAlumnoRow {
  index: number;
  matricula: string;
  isMatriculaGenerated?: boolean;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  grado: string;
  grupo: string;
  carrera_id?: string;
  carrera: string;
  sede_id?: string;
  sede_nombre: string;
  estado_matricula: 'activo' | 'baja_temporal' | 'egresado' | 'aspirante';
  tutor: string;
  telefono: string;
  password?: string;
  qr_code?: string;
  status: 'valid' | 'exists' | 'error';
  errorMessage?: string;
}

interface ColumnMapping {
  colMatricula: number;
  colAlumnoCompleto: number;
  colNombre: number;
  colPaterno: number;
  colMaterno: number;
  colGrado: number;
  colGrupo: number;
  colCarrera: number;
  colSede: number;
  colEstado: number;
  colTutor: number;
  colTelefono: number;
  colPassword: number;
}

export default function BulkUploadAlumnosModal({
  isOpen,
  onClose,
  onSuccess,
  existingAlumnos,
  carreras,
  sedes,
  activeCiclo,
  initialCarreraId,
  initialSedeId,
  showToast
}: BulkUploadAlumnosModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileRawContent, setFileRawContent] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedAlumnoRow[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);
  const [delimiterChar, setDelimiterChar] = useState<string>(',');

  // Prominent Target Destination Settings
  const [targetCarreraId, setTargetCarreraId] = useState<string>('');
  const [targetGrupo, setTargetGrupo] = useState<string>('201-TUR');
  const [targetGrado, setTargetGrado] = useState<string>('2° Semestre');
  const [targetSedeId, setTargetSedeId] = useState<string>('');

  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    colMatricula: -1,
    colAlumnoCompleto: -1,
    colNombre: -1,
    colPaterno: -1,
    colMaterno: -1,
    colGrado: -1,
    colGrupo: -1,
    colCarrera: -1,
    colSede: -1,
    colEstado: -1,
    colTutor: -1,
    colTelefono: -1,
    colPassword: -1
  });

  const [showMappingSettings, setShowMappingSettings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'exists' | 'error'>('all');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Destination Career & Sede based on props or context
  useEffect(() => {
    if (!isOpen) return;

    let targetCar = targetCarreraId;
    if (initialCarreraId && carreras.some((c) => c.id === initialCarreraId)) {
      targetCar = initialCarreraId;
      setTargetCarreraId(initialCarreraId);
    } else if (!targetCarreraId && carreras.length > 0) {
      targetCar = carreras[0].id;
      setTargetCarreraId(targetCar);
    }

    // Auto-update group and grade to match the target career
    const sel = carreras.find((c) => c.id === targetCar);
    if (sel?.nombre.toLowerCase().includes('turismo') || sel?.clave?.includes('TUR')) {
      setTargetGrupo('201-TUR');
      setTargetGrado('2° Semestre');
    } else if (sel?.nombre.toLowerCase().includes('administración') || sel?.clave?.includes('ADM')) {
      setTargetGrupo('203-ADM');
      setTargetGrado('2° Semestre');
    } else if (sel?.nombre.toLowerCase().includes('datos') || sel?.clave?.includes('CDIA')) {
      setTargetGrupo('101');
      setTargetGrado('1° Semestre');
    } else if (sel?.nombre.toLowerCase().includes('ciberseguridad') || sel?.clave?.includes('CIB')) {
      setTargetGrupo('501');
      setTargetGrado('5° Semestre');
    } else if (sel?.nombre.toLowerCase().includes('tecnologías') || sel?.clave?.includes('TIC')) {
      setTargetGrupo('201');
      setTargetGrado('3° Semestre');
    }

    // Sync Sede with active filter if provided
    if (initialSedeId && sedes.some((s) => s.id === initialSedeId)) {
      setTargetSedeId(initialSedeId);
    } else if (!targetSedeId && sedes.length > 0) {
      setTargetSedeId(sedes[0].id);
    }
  }, [isOpen, initialCarreraId, initialSedeId, carreras, sedes]);

  if (!isOpen) return null;

  // Selected Career Object
  const selectedCarreraObj =
    carreras.find((c) => c.id === targetCarreraId) || carreras[0] || {
      id: 'c4444444-4444-4444-4444-444444444444',
      nombre: 'Licenciatura en Turismo',
      clave: 'LIC-TUR'
    };

  const selectedSedeObj =
    sedes.find((s) => s.id === targetSedeId) || sedes[0] || {
      id: 'sede-mc',
      nombre: 'Campus Magdalena Contreras'
    };

  // Handle Career Change by user
  const handleTargetCarreraChange = (newCarreraId: string) => {
    setTargetCarreraId(newCarreraId);
    const sel = carreras.find((c) => c.id === newCarreraId);
    let autoGroup = targetGrupo;
    let autoGrado = targetGrado;

    if (sel?.nombre.toLowerCase().includes('turismo') || sel?.clave?.includes('TUR')) {
      autoGroup = '201-TUR';
      autoGrado = '2° Semestre';
    } else if (sel?.nombre.toLowerCase().includes('administración') || sel?.clave?.includes('ADM')) {
      autoGroup = '203-ADM';
      autoGrado = '2° Semestre';
    } else if (sel?.nombre.toLowerCase().includes('datos') || sel?.clave?.includes('CDIA')) {
      autoGroup = '101';
      autoGrado = '1° Semestre';
    } else if (sel?.nombre.toLowerCase().includes('ciberseguridad') || sel?.clave?.includes('CIB')) {
      autoGroup = '501';
      autoGrado = '5° Semestre';
    } else if (sel?.nombre.toLowerCase().includes('tecnologías') || sel?.clave?.includes('TIC')) {
      autoGroup = '201';
      autoGrado = '3° Semestre';
    }

    setTargetGrupo(autoGroup);
    setTargetGrado(autoGrado);

    if (fileRawContent && file) {
      reparseRows(fileRawContent, file.name, newCarreraId, autoGroup, autoGrado, targetSedeId, columnMapping, headerRowIdx);
    }
  };

  // 1. Download official CSV template with UTF-8 BOM
  const handleDownloadTemplate = () => {
    const currentCarreraName = selectedCarreraObj?.nombre || 'Licenciatura en Turismo';
    const currentSedeName = selectedSedeObj?.nombre || 'Campus Magdalena Contreras';

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
        '2° Semestre',
        targetGrupo || '201-TUR',
        `"${currentCarreraName}"`,
        `"${currentSedeName}"`,
        'activo',
        'Dr. Adrian Silva',
        '+525511223344',
        ''
      ],
      [
        'UNRC-2026-052',
        'Carlos Eduardo',
        'Hernandez',
        'Mendoza',
        '2° Semestre',
        targetGrupo || '201-TUR',
        `"${currentCarreraName}"`,
        `"${currentSedeName}"`,
        'activo',
        'Dr. Adrian Silva',
        '+525522334455',
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
    link.setAttribute('download', `plantilla_${selectedCarreraObj.clave || 'alumnos'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Plantilla oficial para ${selectedCarreraObj.nombre} descargada`, 'info');
  };

  // 2. CSV Line Parser
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
          i++;
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

  // Split single full name
  const splitFullName = (full: string) => {
    const clean = full.trim().replace(/\s+/g, ' ');
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
        apellido_paterno: words[0],
        apellido_materno: words[1],
        nombre: words[2]
      };
    }
    return {
      apellido_paterno: words[0],
      apellido_materno: words[1],
      nombre: words.slice(2).join(' ')
    };
  };

  // Resolve Carrera with Strict Logic (User Selection is King)
  const resolveCarreraStrict = (
    rawCarrera: string,
    rawGrupo: string,
    activeCarrera: Carrera
  ): Carrera => {
    const cleanCarrera = (rawCarrera || '').trim().toLowerCase();

    // Priority 1: Explicit Non-Empty Text in Carrera column that matches a known career
    if (cleanCarrera.length > 2) {
      if (cleanCarrera.includes('turism') || cleanCarrera.includes('tur')) {
        const tur = carreras.find(
          (c) => c.clave?.includes('TUR') || c.nombre.toLowerCase().includes('turismo')
        );
        if (tur) return tur;
      }
      if (cleanCarrera.includes('admin')) {
        const adm = carreras.find(
          (c) => c.clave?.includes('ADM') || c.nombre.toLowerCase().includes('administración')
        );
        if (adm) return adm;
      }
      if (cleanCarrera.includes('ciber')) {
        const cib = carreras.find(
          (c) => c.clave?.includes('CIB') || c.nombre.toLowerCase().includes('ciberseguridad')
        );
        if (cib) return cib;
      }
      if (cleanCarrera.includes('tic') || cleanCarrera.includes('tecnolog')) {
        const tic = carreras.find(
          (c) => c.clave?.includes('TIC') || c.nombre.toLowerCase().includes('tecnologías')
        );
        if (tic) return tic;
      }
      if (
        cleanCarrera.includes('ciencia de datos') ||
        cleanCarrera.includes('inteligencia artificial') ||
        cleanCarrera.includes('cdia')
      ) {
        const dat = carreras.find(
          (c) => c.clave?.includes('CDIA') || c.nombre.toLowerCase().includes('datos')
        );
        if (dat) return dat;
      }

      // Check direct exact match by ID or name
      const exactMatch = carreras.find(
        (c) =>
          c.id.toLowerCase() === cleanCarrera ||
          c.clave?.toLowerCase() === cleanCarrera ||
          c.nombre.toLowerCase() === cleanCarrera
      );
      if (exactMatch) return exactMatch;
    }

    // Priority 2: Strictly the User's Chosen Target Career in the Modal
    if (activeCarrera) {
      return activeCarrera;
    }

    return carreras[0];
  };

  // 3. Reparse Rows
  const reparseRows = (
    content: string,
    filename: string,
    currentCarreraId: string,
    currentGrupo: string,
    currentGrado: string,
    currentSedeId: string,
    customMapping?: ColumnMapping,
    customHeaderIdx?: number
  ) => {
    try {
      const cleanContent = content.replace(/^\uFEFF/, '');
      const rawLines = cleanContent.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);

      if (rawLines.length === 0) {
        setParsedRows([]);
        return;
      }

      // Delimiter detection
      const sampleChunk = rawLines.slice(0, 5).join('\n');
      const commaCount = (sampleChunk.match(/,/g) || []).length;
      const semicolonCount = (sampleChunk.match(/;/g) || []).length;
      const tabCount = (sampleChunk.match(/\t/g) || []).length;

      let delim = ',';
      if (semicolonCount > commaCount && semicolonCount > tabCount) delim = ';';
      else if (tabCount > commaCount && tabCount > semicolonCount) delim = '\t';
      setDelimiterChar(delim);

      // Header row scoring
      let headerIdx = customHeaderIdx !== undefined ? customHeaderIdx : 0;
      if (customHeaderIdx === undefined) {
        let maxScore = -1;
        const maxLines = Math.min(rawLines.length, 12);
        for (let i = 0; i < maxLines; i++) {
          const tokens = parseCSVLine(rawLines[i], delim);
          let score = 0;
          for (const t of tokens) {
            const s = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (s.includes('matricula') || s.includes('cuenta') || s.includes('control') || s.includes('expediente')) score += 5;
            if (s.includes('alumno') || s.includes('estudiante') || s.includes('nombre') || s.includes('paterno')) score += 5;
            if (s.includes('carrera') || s.includes('grupo') || s.includes('grado')) score += 3;
            if (s === 'no' || s === 'num' || s === '#') score += 2;
          }
          if (score > maxScore) {
            maxScore = score;
            headerIdx = i;
          }
        }
      }

      setHeaderRowIdx(headerIdx);
      const rawHeaders = parseCSVLine(rawLines[headerIdx], delim);
      setDetectedHeaders(rawHeaders);

      const normHeaders = rawHeaders.map((h) =>
        h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_.-]+/g, '')
      );

      const findCol = (...aliases: string[]) => {
        return normHeaders.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));
      };

      const mapping: ColumnMapping = customMapping || {
        colMatricula: findCol('matricula', 'studentcode', 'codigo', 'clave', 'nocontrol', 'control', 'cuenta', 'expediente', 'boleta', 'id'),
        colAlumnoCompleto: findCol('alumno', 'estudiante', 'nombrecompleto', 'nombredelalumno', 'nombrealumno', 'alumnos'),
        colNombre: findCol('nombre', 'nombres', 'firstname', 'name'),
        colPaterno: findCol('apellidopaterno', 'paterno', 'primerapellido', 'apellidos'),
        colMaterno: findCol('apellidomaterno', 'materno', 'segundoapellido'),
        colGrado: findCol('grado', 'semestre', 'gradelevel'),
        colGrupo: findCol('grupo', 'seccion', 'section'),
        colCarrera: findCol('carrera', 'licenciatura', 'programa'),
        colSede: findCol('sede', 'campus', 'plantel'),
        colEstado: findCol('estadomatricula', 'estado', 'status'),
        colTutor: findCol('tutor', 'docentetitular', 'profesor'),
        colTelefono: findCol('telefono', 'celular', 'tel', 'phone'),
        colPassword: findCol('password', 'contrasena', 'contrasenia')
      };

      // Fallback: If no column for name found, scan for candidate
      if (mapping.colNombre === -1 && mapping.colAlumnoCompleto === -1) {
        const candidate = normHeaders.findIndex((h) => h.includes('alum') || h.includes('estud') || h.includes('nom'));
        if (candidate !== -1) mapping.colAlumnoCompleto = candidate;
        else if (rawHeaders.length >= 2) mapping.colAlumnoCompleto = 1;
        else if (rawHeaders.length === 1) mapping.colAlumnoCompleto = 0;
      }

      setColumnMapping(mapping);

      // Active target objects
      const activeCarrera =
        carreras.find((c) => c.id === currentCarreraId) ||
        carreras.find((c) => c.clave?.includes('TUR')) ||
        carreras[0];

      const activeSede =
        sedes.find((s) => s.id === currentSedeId) || sedes[0];

      const rows: ParsedAlumnoRow[] = [];
      const seenMatriculas = new Set<string>();
      const startLine = headerIdx + 1;

      for (let i = startLine; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line, delim);
        if (values.length === 0 || values.every((v) => !v)) continue;

        // Matricula
        let rawMat = (mapping.colMatricula >= 0 ? values[mapping.colMatricula] : '').trim();
        let isMatriculaGenerated = false;
        if (!rawMat || /^[0-9]{1,3}$/.test(rawMat)) {
          rawMat = `UNRC-2026-${String(existingAlumnos.length + rows.length + 10).padStart(3, '0')}`;
          isMatriculaGenerated = true;
        }

        // Names
        let nom = (mapping.colNombre >= 0 ? values[mapping.colNombre] : '').trim();
        let pat = (mapping.colPaterno >= 0 ? values[mapping.colPaterno] : '').trim();
        let mat = (mapping.colMaterno >= 0 ? values[mapping.colMaterno] : '').trim();

        if (mapping.colAlumnoCompleto >= 0 && (!nom || !pat)) {
          const full = (values[mapping.colAlumnoCompleto] || '').trim();
          if (full) {
            const s = splitFullName(full);
            nom = s.nombre;
            pat = s.apellido_paterno;
            mat = s.apellido_materno;
          }
        }

        const rawGrado = (mapping.colGrado >= 0 ? values[mapping.colGrado] : '').trim() || currentGrado || '2° Semestre';
        const rawGrupo = (mapping.colGrupo >= 0 ? values[mapping.colGrupo] : '').trim() || currentGrupo || '201-TUR';
        const rawCarrera = (mapping.colCarrera >= 0 ? values[mapping.colCarrera] : '').trim();
        const rawSede = (mapping.colSede >= 0 ? values[mapping.colSede] : '').trim();
        const rawEstado = (mapping.colEstado >= 0 ? values[mapping.colEstado] : '').trim().toLowerCase();
        const rawTutor = (mapping.colTutor >= 0 ? values[mapping.colTutor] : '').trim();
        const rawTel = (mapping.colTelefono >= 0 ? values[mapping.colTelefono] : '').trim();
        const rawPwd = (mapping.colPassword >= 0 ? values[mapping.colPassword] : '').trim();

        // STRICT CARRERA RESOLUTION
        const resolvedCarrera = resolveCarreraStrict(rawCarrera, rawGrupo, activeCarrera);

        // Resolve Sede
        const resolvedSede =
          sedes.find(
            (s) =>
              rawSede &&
              (s.id === rawSede ||
                s.clave?.toLowerCase() === rawSede.toLowerCase() ||
                s.nombre.toLowerCase().includes(rawSede.toLowerCase()))
          ) || activeSede;

        // Resolve Estado
        let resolvedEstado: 'activo' | 'baja_temporal' | 'egresado' | 'aspirante' = 'activo';
        if (rawEstado.includes('baja')) resolvedEstado = 'baja_temporal';
        else if (rawEstado.includes('egres')) resolvedEstado = 'egresado';
        else if (rawEstado.includes('aspir')) resolvedEstado = 'aspirante';

        // Auto tutor based on Carrera
        const isTurismo = resolvedCarrera.nombre.toLowerCase().includes('turismo');
        const defaultTutorName = isTurismo ? 'Dr. Adrian Silva' : 'Tutor Registrado UNRC';

        let status: 'valid' | 'exists' | 'error' = 'valid';
        let errorMessage: string | undefined = undefined;

        if (!nom && !pat) {
          status = 'error';
          errorMessage = 'Falta nombre o apellido del alumno';
        } else if (!isMatriculaGenerated && seenMatriculas.has(rawMat.toLowerCase())) {
          status = 'error';
          errorMessage = `Matrícula duplicada en el archivo: ${rawMat}`;
        } else if (existingAlumnos.some((a) => (a.matricula || '').trim().toLowerCase() === rawMat.toLowerCase())) {
          status = 'exists';
          errorMessage = 'Matrícula ya registrada en la base de datos';
        }

        if (rawMat) seenMatriculas.add(rawMat.toLowerCase());

        rows.push({
          index: i + 1,
          matricula: rawMat,
          isMatriculaGenerated,
          nombre: nom || pat || 'Estudiante',
          apellido_paterno: pat || nom || 'UNRC',
          apellido_materno: mat || '',
          grado: rawGrado,
          grupo: rawGrupo,
          carrera_id: resolvedCarrera.id,
          carrera: resolvedCarrera.nombre,
          sede_id: resolvedSede.id,
          sede_nombre: resolvedSede.nombre,
          estado_matricula: resolvedEstado,
          tutor: rawTutor || defaultTutorName,
          telefono: rawTel || '+525500000000',
          password: rawPwd,
          qr_code: rawMat,
          status,
          errorMessage
        });
      }

      setParsedRows(rows);
      if (rows.length > 0) {
        showToast(
          `✅ ${rows.length} alumnos asignados a ${activeCarrera.nombre} (${activeCarrera.clave}).`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Error procesando CSV:', err);
      showToast(`Error al procesar archivo CSV: ${err.message}`, 'error');
    }
  };

  const handleFileSelected = (selected: File) => {
    if (!selected.name.toLowerCase().endsWith('.csv') && selected.type !== 'text/csv') {
      showToast('Por favor selecciona un archivo con extensión .csv', 'error');
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileRawContent(text);

      // Check if filename indicates a specific carrera (e.g. Turismo vs LCDN)
      let initialCarId = targetCarreraId;
      const upperName = selected.name.toUpperCase();
      if (upperName.includes('TURISMO') || upperName.includes('TUR')) {
        const tur = carreras.find((c) => c.clave?.includes('TUR') || c.nombre.toLowerCase().includes('turismo'));
        if (tur) initialCarId = tur.id;
      } else if (upperName.includes('ADMINISTRACION') || upperName.includes('ADM')) {
        const adm = carreras.find((c) => c.clave?.includes('ADM') || c.nombre.toLowerCase().includes('administración'));
        if (adm) initialCarId = adm.id;
      }

      setTargetCarreraId(initialCarId);
      reparseRows(text, selected.name, initialCarId, targetGrupo, targetGrado, targetSedeId);
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelected(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelected(droppedFile);
  };

  const handleResetFile = () => {
    setFile(null);
    setFileRawContent('');
    setParsedRows([]);
    setDetectedHeaders([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit Bulk Insert
  const handleConfirmImport = async () => {
    const rowsToImport = parsedRows.filter((r) => {
      if (r.status === 'error') return false;
      if (r.status === 'exists' && !updateExisting) return false;
      return true;
    });

    if (rowsToImport.length === 0) {
      showToast('No hay alumnos válidos para importar con la configuración actual.', 'error');
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
        `✅ ${res.added} nuevos alumnos y ${res.updated} actualizados exitosamente en ${selectedCarreraObj.nombre}.`,
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
                Sube expedientes de estudiantes en lote asegurando la carrera y grupo correspondientes.
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
          {/* PRIMARY TARGET CARRERA SELECTOR (Permanently Visible and Bold) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-blue-950/30 to-purple-950/20 border-2 border-emerald-500/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-emerald-400 font-bold text-xs flex items-center space-x-2 uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Carrera Universitaria de Destino:</span>
                </span>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Verifica que la carrera seleccionada coincida exactamente con los alumnos que vas a subir.
                </p>
              </div>

              <select
                value={targetCarreraId}
                onChange={(e) => handleTargetCarreraChange(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[#090E1A] border-2 border-emerald-500/80 text-white font-bold text-xs focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                {carreras.map((c) => (
                  <option key={c.id} value={c.id}>
                    🎓 {c.nombre} ({c.clave})
                  </option>
                ))}
              </select>
            </div>

            {/* Grupo, Semestre and Sede overrides */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
              <div>
                <label className="text-gray-300 block mb-1 text-[11px] font-semibold">Grupo Asignado</label>
                <input
                  type="text"
                  value={targetGrupo}
                  onChange={(e) => {
                    setTargetGrupo(e.target.value);
                    if (fileRawContent && file) {
                      reparseRows(fileRawContent, file.name, targetCarreraId, e.target.value, targetGrado, targetSedeId);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-emerald-500/30 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                  placeholder="201-TUR"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1 text-[11px] font-semibold">Semestre / Grado</label>
                <input
                  type="text"
                  value={targetGrado}
                  onChange={(e) => {
                    setTargetGrado(e.target.value);
                    if (fileRawContent && file) {
                      reparseRows(fileRawContent, file.name, targetCarreraId, targetGrupo, e.target.value, targetSedeId);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                  placeholder="2° Semestre"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1 text-[11px] font-semibold">Sede / Campus</label>
                <select
                  value={targetSedeId}
                  onChange={(e) => {
                    setTargetSedeId(e.target.value);
                    if (fileRawContent && file) {
                      reparseRows(fileRawContent, file.name, targetCarreraId, targetGrupo, targetGrado, e.target.value);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                >
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick template download button */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="text-[11px] text-gray-400">
              ¿No tienes el archivo listo? Descarga la plantilla oficial configurada para{' '}
              <strong className="text-emerald-400">{selectedCarreraObj.nombre}</strong>.
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold text-xs flex items-center space-x-1.5 transition-all whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla CSV</span>
            </button>
          </div>

          {/* File Upload Zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                dragActive
                  ? 'border-emerald-400 bg-emerald-500/10 scale-[0.99]'
                  : 'border-white/10 hover:border-emerald-500/40 hover:bg-white/[0.02]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Upload className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Arrastra y suelta tu archivo <span className="text-emerald-400">.CSV</span> aquí
                </p>
                <p className="text-xs text-gray-400">
                  o haz clic para seleccionar la lista de alumnos
                </p>
              </div>
              <div className="text-[11px] text-gray-500 font-mono">
                Se importará directamente a: <span className="text-emerald-300 font-bold">{selectedCarreraObj.nombre}</span> ({targetGrupo})
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
                      {(file.size / 1024).toFixed(1)} KB • {totalCount} alumnos detectados • Destino:{' '}
                      <strong className="text-emerald-400">{selectedCarreraObj.nombre}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowMappingSettings(!showMappingSettings)}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs flex items-center space-x-1.5 transition-all"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Mapeo de Columnas</span>
                    {showMappingSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

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

              {/* Collapsible Column Mapping */}
              {showMappingSettings && (
                <div className="p-4 rounded-2xl bg-[#080d1a] border border-blue-500/20 space-y-3 animate-in fade-in duration-150">
                  <h5 className="font-bold text-blue-300 text-xs flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Ajuste Manual de Columnas del Archivo CSV</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-gray-400 block mb-1 text-[11px]">Columna Matrícula</label>
                      <select
                        value={columnMapping.colMatricula}
                        onChange={(e) => {
                          const updated = { ...columnMapping, colMatricula: Number(e.target.value) };
                          setColumnMapping(updated);
                          if (fileRawContent && file) {
                            reparseRows(fileRawContent, file.name, targetCarreraId, targetGrupo, targetGrado, targetSedeId, updated, headerRowIdx);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                      >
                        <option value={-1}>Auto-generar (UNRC-2026-xxx)</option>
                        {detectedHeaders.map((h, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {h || `(vacía)`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1 text-[11px]">Columna Nombre / Alumno</label>
                      <select
                        value={columnMapping.colAlumnoCompleto >= 0 ? columnMapping.colAlumnoCompleto : columnMapping.colNombre}
                        onChange={(e) => {
                          const updated = { ...columnMapping, colAlumnoCompleto: Number(e.target.value) };
                          setColumnMapping(updated);
                          if (fileRawContent && file) {
                            reparseRows(fileRawContent, file.name, targetCarreraId, targetGrupo, targetGrado, targetSedeId, updated, headerRowIdx);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                      >
                        <option value={-1}>Seleccionar columna...</option>
                        {detectedHeaders.map((h, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {h || `(vacía)`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1 text-[11px]">Columna Apellido Paterno</label>
                      <select
                        value={columnMapping.colPaterno}
                        onChange={(e) => {
                          const updated = { ...columnMapping, colPaterno: Number(e.target.value) };
                          setColumnMapping(updated);
                          if (fileRawContent && file) {
                            reparseRows(fileRawContent, file.name, targetCarreraId, targetGrupo, targetGrado, targetSedeId, updated, headerRowIdx);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                      >
                        <option value={-1}>Separar desde Nombre</option>
                        {detectedHeaders.map((h, i) => (
                          <option key={i} value={i}>
                            Col {i + 1}: {h || `(vacía)`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

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
                  <p className="text-[10px] uppercase tracking-wider font-semibold">Total Alumnos</p>
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
                    <span>Con Alertas</span>
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
                    desmarca, estas filas serán ignoradas para evitar sobrescribir).
                  </label>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-semibold text-white">
                    Previsualización: Todos se asignarán a{' '}
                    <strong className="text-emerald-400 underline">{selectedCarreraObj.nombre}</strong>
                  </span>
                  <span className="text-[11px]">
                    Mostrando: <strong className="text-blue-400 uppercase">{filterView}</strong> ({filteredRows.length})
                  </span>
                </div>

                <div className="border border-white/10 rounded-2xl overflow-hidden max-h-72 overflow-y-auto bg-black/40 shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#111827] sticky top-0 border-b border-white/10 text-gray-400 text-[11px]">
                      <tr>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5">Matrícula</th>
                        <th className="p-2.5">Nombre Completo</th>
                        <th className="p-2.5">Licenciatura de Destino</th>
                        <th className="p-2.5">Grupo / Semestre</th>
                        <th className="p-2.5">Sede</th>
                        <th className="p-2.5">Tutor Titular</th>
                        <th className="p-2.5">Contraseña Asignada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[11px]">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-500">
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
                                <span
                                  className="inline-flex items-center space-x-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 text-[10px]"
                                  title={r.errorMessage}
                                >
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{updateExisting ? 'Actualizará' : 'Omitirá'}</span>
                                </span>
                              )}
                              {r.status === 'error' && (
                                <span
                                  className="inline-flex items-center space-x-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30 text-[10px]"
                                  title={r.errorMessage}
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Alerta</span>
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-white font-medium whitespace-nowrap">
                              <span>{r.matricula}</span>
                              {r.isMatriculaGenerated && (
                                <span className="ml-1 text-[9px] text-blue-400 bg-blue-500/10 px-1 py-0.2 rounded border border-blue-500/20">
                                  auto
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-medium text-white">
                              <span>
                                {r.nombre} {r.apellido_paterno} {r.apellido_materno}
                              </span>
                              {r.errorMessage && (
                                <p className="text-[10px] text-amber-400/90 font-normal">{r.errorMessage}</p>
                              )}
                            </td>
                            <td className="p-2.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                {r.carrera}
                              </span>
                            </td>
                            <td className="p-2.5 text-gray-300 whitespace-nowrap">
                              <span className="font-mono text-amber-300 font-bold">{r.grupo}</span> • {r.grado}
                            </td>
                            <td className="p-2.5 text-gray-300 truncate max-w-[140px]" title={r.sede_nombre}>
                              {r.sede_nombre}
                            </td>
                            <td className="p-2.5 text-gray-300 whitespace-nowrap">{r.tutor}</td>
                            <td className="p-2.5 font-mono text-gray-300 text-[10px] whitespace-nowrap">
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
          <div className="text-[11px] text-gray-300">
            {file && (
              <span>
                Se registrarán en <strong className="text-emerald-400">{selectedCarreraObj.nombre}</strong>:{' '}
                <strong className="text-white">
                  {updateExisting ? validCount + existsCount : validCount}
                </strong>{' '}
                alumnos.
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
                (validCount === 0 && (!updateExisting || existsCount === 0))
              }
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-transparent text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-2"
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
                    Confirmar e Importar {updateExisting ? validCount + existsCount : validCount} Alumnos en{' '}
                    {selectedCarreraObj.clave || 'Carrera'}
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
