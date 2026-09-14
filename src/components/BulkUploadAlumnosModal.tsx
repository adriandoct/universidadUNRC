"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  GraduationCap,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info
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
  isMatriculaGenerated?: boolean;
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
  showToast
}: BulkUploadAlumnosModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileRawContent, setFileRawContent] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedAlumnoRow[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);
  const [delimiterChar, setDelimiterChar] = useState<string>(',');
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

  // Default fallbacks from filename or selectors
  const [defaultCarreraId, setDefaultCarreraId] = useState<string>('');
  const [defaultGrupo, setDefaultGrupo] = useState<string>('201');
  const [defaultGrado, setDefaultGrado] = useState<string>('2° Semestre');
  const [defaultSedeId, setDefaultSedeId] = useState<string>('');

  const [showMappingSettings, setShowMappingSettings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'exists' | 'error'>('all');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize default selectors from props
  useEffect(() => {
    if (carreras.length > 0 && !defaultCarreraId) {
      setDefaultCarreraId(carreras[0].id);
    }
    if (sedes.length > 0 && !defaultSedeId) {
      setDefaultSedeId(sedes[0].id);
    }
  }, [carreras, sedes]);

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

  // 2. CSV Line Parser supporting quotes and delimiters (, or ; or \t)
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

  // Split single full name into nombre, apellido_paterno, apellido_materno
  const splitFullName = (full: string) => {
    const clean = full.trim().replace(/\s+/g, ' ');
    if (!clean) return { nombre: '', apellido_paterno: '', apellido_materno: '' };

    // Format: "APELLIDOS, NOMBRES" (very common in school exports)
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
      // E.g. "Morales Flores Stephanie" (Mexican lists typically start with paternal & maternal surname)
      return {
        apellido_paterno: words[0],
        apellido_materno: words[1],
        nombre: words[2]
      };
    }
    // 4 or more: First two are surnames, rest are names
    return {
      apellido_paterno: words[0],
      apellido_materno: words[1],
      nombre: words.slice(2).join(' ')
    };
  };

  // 3. Main parser engine with header search and content tolerance
  const analyzeAndParseContent = (
    content: string,
    filename = '',
    customMapping?: Partial<ColumnMapping>,
    overrideHeaderIdx?: number
  ) => {
    try {
      const cleanContent = content.replace(/^\uFEFF/, '');
      const rawLines = cleanContent.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);

      if (rawLines.length === 0) {
        setParsedRows([]);
        return;
      }

      // Infer Carrera and Grupo from Filename if available
      // Example: "LCDN 201 PROGRAMACION PARA LA CIENCIA DE DATOS - Hoja 1.csv"
      let inferredCarreraId = defaultCarreraId;
      let inferredGrupo = defaultGrupo;
      let inferredGrado = defaultGrado;

      const upperFilename = filename.toUpperCase();
      if (upperFilename.includes('LCDN') || upperFilename.includes('CIENCIA DE DATOS') || upperFilename.includes('DATOS')) {
        const found = carreras.find(c => c.clave?.includes('CDIA') || c.nombre.toLowerCase().includes('datos'));
        if (found) inferredCarreraId = found.id;
      } else if (upperFilename.includes('TURISMO') || upperFilename.includes('TUR')) {
        const found = carreras.find(c => c.clave?.includes('TUR') || c.nombre.toLowerCase().includes('turismo'));
        if (found) inferredCarreraId = found.id;
      } else if (upperFilename.includes('ADMINISTRACION') || upperFilename.includes('ADM')) {
        const found = carreras.find(c => c.clave?.includes('ADM') || c.nombre.toLowerCase().includes('administración'));
        if (found) inferredCarreraId = found.id;
      } else if (upperFilename.includes('TIC') || upperFilename.includes('TECNOLOGIAS')) {
        const found = carreras.find(c => c.clave?.includes('TIC') || c.nombre.toLowerCase().includes('tecnologías'));
        if (found) inferredCarreraId = found.id;
      } else if (upperFilename.includes('CIBER') || upperFilename.includes('CIB')) {
        const found = carreras.find(c => c.clave?.includes('CIB') || c.nombre.toLowerCase().includes('ciberseguridad'));
        if (found) inferredCarreraId = found.id;
      }

      // Infer group
      const groupMatch = upperFilename.match(/\b([1-8]0[1-9](?:-[A-Z]+)?)\b/);
      if (groupMatch) {
        inferredGrupo = groupMatch[1];
        const semDigit = inferredGrupo.charAt(0);
        inferredGrado = `${semDigit}° Semestre`;
      }

      if (inferredCarreraId && inferredCarreraId !== defaultCarreraId) {
        setDefaultCarreraId(inferredCarreraId);
      }
      if (inferredGrupo && inferredGrupo !== defaultGrupo) {
        setDefaultGrupo(inferredGrupo);
      }
      if (inferredGrado && inferredGrado !== defaultGrado) {
        setDefaultGrado(inferredGrado);
      }

      // Auto-detect delimiter
      const sampleChunk = rawLines.slice(0, 5).join('\n');
      const commaMatches = (sampleChunk.match(/,/g) || []).length;
      const semicolonMatches = (sampleChunk.match(/;/g) || []).length;
      const tabMatches = (sampleChunk.match(/\t/g) || []).length;

      let detectedDelim = ',';
      if (semicolonMatches > commaMatches && semicolonMatches > tabMatches) detectedDelim = ';';
      else if (tabMatches > commaMatches && tabMatches > semicolonMatches) detectedDelim = '\t';
      setDelimiterChar(detectedDelim);

      // Score first 15 lines to identify the table header row
      const keywordWeight = (str: string): number => {
        const s = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let score = 0;
        if (s.includes('matricula') || s.includes('student') || s.includes('cuenta') || s.includes('control') || s.includes('boleta')) score += 5;
        if (s.includes('alumno') || s.includes('estudiante') || s.includes('nombre') || s.includes('paterno')) score += 5;
        if (s.includes('grupo') || s.includes('seccion') || s.includes('grado') || s.includes('semestre')) score += 3;
        if (s.includes('carrera') || s.includes('sede') || s.includes('campus') || s.includes('tutor') || s.includes('telefono')) score += 2;
        if (s === 'no' || s === 'num' || s === '#' || s === 'n°') score += 2;
        return score;
      };

      let bestHeaderIdx = overrideHeaderIdx !== undefined ? overrideHeaderIdx : 0;
      let maxScore = -1;

      if (overrideHeaderIdx === undefined) {
        const maxSearchLines = Math.min(rawLines.length, 12);
        for (let idx = 0; idx < maxSearchLines; idx++) {
          const tokens = parseCSVLine(rawLines[idx], detectedDelim);
          const lineScore = tokens.reduce((acc, t) => acc + keywordWeight(t), 0);
          if (lineScore > maxScore) {
            maxScore = lineScore;
            bestHeaderIdx = idx;
          }
        }
      }

      setHeaderRowIdx(bestHeaderIdx);
      const rawHeaders = parseCSVLine(rawLines[bestHeaderIdx], detectedDelim);
      setDetectedHeaders(rawHeaders);

      const normalizedHeaders = rawHeaders.map((h) =>
        h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_.-]+/g, '')
      );

      const findIdx = (...aliases: string[]) => {
        return normalizedHeaders.findIndex((h) =>
          aliases.some((a) => h === a || h.includes(a))
        );
      };

      // Compute Mapping (or merge with custom override)
      const mapping: ColumnMapping = {
        colMatricula: customMapping?.colMatricula !== undefined ? customMapping.colMatricula : findIdx('matricula', 'studentcode', 'codigo', 'clave', 'nocontrol', 'control', 'nocuenta', 'cuenta', 'expediente', 'boleta', 'folio', 'id'),
        colAlumnoCompleto: customMapping?.colAlumnoCompleto !== undefined ? customMapping.colAlumnoCompleto : findIdx('alumno', 'estudiante', 'nombrecompleto', 'nombredelalumno', 'nombrealumno', 'nombreestudiante', 'nombresyapellidos', 'apellidosynombres', 'alumnos'),
        colNombre: customMapping?.colNombre !== undefined ? customMapping.colNombre : findIdx('nombre', 'nombres', 'firstname', 'name'),
        colPaterno: customMapping?.colPaterno !== undefined ? customMapping.colPaterno : findIdx('apellidopaterno', 'paterno', 'primerapellido', 'apellidos', 'lastname'),
        colMaterno: customMapping?.colMaterno !== undefined ? customMapping.colMaterno : findIdx('apellidomaterno', 'materno', 'segundoapellido'),
        colGrado: customMapping?.colGrado !== undefined ? customMapping.colGrado : findIdx('grado', 'semestre', 'gradelevel', 'nivel'),
        colGrupo: customMapping?.colGrupo !== undefined ? customMapping.colGrupo : findIdx('grupo', 'seccion', 'section'),
        colCarrera: customMapping?.colCarrera !== undefined ? customMapping.colCarrera : findIdx('carrera', 'licenciatura', 'programa'),
        colSede: customMapping?.colSede !== undefined ? customMapping.colSede : findIdx('sede', 'campus', 'plantel'),
        colEstado: customMapping?.colEstado !== undefined ? customMapping.colEstado : findIdx('estadomatricula', 'estado', 'status'),
        colTutor: customMapping?.colTutor !== undefined ? customMapping.colTutor : findIdx('tutor', 'docentetitular', 'tutorlegal', 'profesor'),
        colTelefono: customMapping?.colTelefono !== undefined ? customMapping.colTelefono : findIdx('telefono', 'celular', 'tel', 'phone'),
        colPassword: customMapping?.colPassword !== undefined ? customMapping.colPassword : findIdx('password', 'contrasena', 'contrasenia', 'clave')
      };

      // Fallback heuristics: If colNombre is -1 and colAlumnoCompleto is -1, inspect columns
      if (mapping.colNombre === -1 && mapping.colAlumnoCompleto === -1) {
        // Look for any header that has 'alum' or 'estud' or 'nom'
        const candidate = normalizedHeaders.findIndex(h => h.includes('alum') || h.includes('estud') || h.includes('nom'));
        if (candidate !== -1) {
          mapping.colAlumnoCompleto = candidate;
        } else if (rawHeaders.length >= 2) {
          // Default column 1 to name if column 0 looks like number/id
          mapping.colAlumnoCompleto = 1;
        } else if (rawHeaders.length === 1) {
          mapping.colAlumnoCompleto = 0;
        }
      }

      setColumnMapping(mapping);

      // Now parse data rows
      const startLine = bestHeaderIdx + 1;
      const rows: ParsedAlumnoRow[] = [];
      const seenMatriculasInFile = new Set<string>();

      const activeCarreraObj = carreras.find(c => c.id === inferredCarreraId) || carreras[0];
      const activeSedeObj = sedes.find(s => s.id === defaultSedeId) || sedes[0];

      for (let i = startLine; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line, detectedDelim);
        if (values.length === 0 || values.every((v) => !v)) continue;

        // Matricula
        let rawMatricula = (mapping.colMatricula >= 0 ? values[mapping.colMatricula] : '').trim();
        let isMatriculaGenerated = false;

        // If matricula is missing, empty, or just sequential row numbers like '1', '2'
        if (!rawMatricula || /^[0-9]{1,3}$/.test(rawMatricula)) {
          rawMatricula = `UNRC-2026-${String(existingAlumnos.length + rows.length + 10).padStart(3, '0')}`;
          isMatriculaGenerated = true;
        }

        // Names
        let nombreVal = (mapping.colNombre >= 0 ? values[mapping.colNombre] : '').trim();
        let paternoVal = (mapping.colPaterno >= 0 ? values[mapping.colPaterno] : '').trim();
        let maternoVal = (mapping.colMaterno >= 0 ? values[mapping.colMaterno] : '').trim();

        // If single full name column
        if (mapping.colAlumnoCompleto >= 0 && (!nombreVal || !paternoVal)) {
          const full = (values[mapping.colAlumnoCompleto] || '').trim();
          if (full) {
            const split = splitFullName(full);
            nombreVal = split.nombre;
            paternoVal = split.apellido_paterno;
            maternoVal = split.apellido_materno;
          }
        }

        // Degree, Group, Carrera, Sede
        const rawGrado = (mapping.colGrado >= 0 ? values[mapping.colGrado] : '').trim() || inferredGrado || '2° Semestre';
        const rawGrupo = (mapping.colGrupo >= 0 ? values[mapping.colGrupo] : '').trim() || inferredGrupo || '201';
        const rawCarrera = (mapping.colCarrera >= 0 ? values[mapping.colCarrera] : '').trim();
        const rawSede = (mapping.colSede >= 0 ? values[mapping.colSede] : '').trim();
        const rawEstado = (mapping.colEstado >= 0 ? values[mapping.colEstado] : '').trim().toLowerCase();
        const rawTutor = (mapping.colTutor >= 0 ? values[mapping.colTutor] : '').trim();
        const rawTelefono = (mapping.colTelefono >= 0 ? values[mapping.colTelefono] : '').trim();
        const rawPassword = (mapping.colPassword >= 0 ? values[mapping.colPassword] : '').trim();

        // Match Carrera
        let resolvedCarrera = carreras.find((c) =>
          c.id === rawCarrera ||
          c.clave?.toLowerCase() === rawCarrera.toLowerCase() ||
          c.nombre?.toLowerCase().includes(rawCarrera.toLowerCase()) ||
          rawCarrera.toLowerCase().includes(c.nombre?.toLowerCase())
        ) || activeCarreraObj;

        // Match Sede
        let resolvedSede = sedes.find((s) =>
          s.id === rawSede ||
          s.clave?.toLowerCase() === rawSede.toLowerCase() ||
          s.nombre?.toLowerCase().includes(rawSede.toLowerCase()) ||
          rawSede.toLowerCase().includes(s.nombre?.toLowerCase())
        ) || activeSedeObj;

        // Match Estado
        let resolvedEstado: 'activo' | 'baja_temporal' | 'egresado' | 'aspirante' = 'activo';
        if (rawEstado.includes('baja')) resolvedEstado = 'baja_temporal';
        else if (rawEstado.includes('egres')) resolvedEstado = 'egresado';
        else if (rawEstado.includes('aspir')) resolvedEstado = 'aspirante';

        // Check validation status
        let status: 'valid' | 'exists' | 'error' = 'valid';
        let errorMessage: string | undefined = undefined;

        if (!nombreVal && !paternoVal) {
          status = 'error';
          errorMessage = 'Falta nombre del alumno';
        } else if (!isMatriculaGenerated && seenMatriculasInFile.has(rawMatricula.toLowerCase())) {
          status = 'error';
          errorMessage = `Matrícula duplicada en el archivo: ${rawMatricula}`;
        } else if (existingAlumnos.some(a => (a.matricula || '').trim().toLowerCase() === rawMatricula.toLowerCase())) {
          status = 'exists';
          errorMessage = 'Matrícula ya registrada en el sistema';
        }

        if (rawMatricula) {
          seenMatriculasInFile.add(rawMatricula.toLowerCase());
        }

        rows.push({
          index: i + 1,
          matricula: rawMatricula,
          isMatriculaGenerated,
          nombre: nombreVal || paternoVal || 'Estudiante',
          apellido_paterno: paternoVal || nombreVal || 'UNRC',
          apellido_materno: maternoVal || '',
          grado: rawGrado,
          grupo: rawGrupo,
          carrera_id: resolvedCarrera?.id,
          carrera: resolvedCarrera?.nombre || 'Licenciatura en Ciencias de Datos e Inteligencia Artificial',
          sede_id: resolvedSede?.id,
          sede_nombre: resolvedSede?.nombre || 'Campus Magdalena Contreras',
          estado_matricula: resolvedEstado,
          tutor: rawTutor || 'Dr. Adrian Silva',
          telefono: rawTelefono || '+525500000000',
          password: rawPassword,
          qr_code: rawMatricula,
          status,
          errorMessage
        });
      }

      setParsedRows(rows);
      if (rows.length > 0) {
        showToast(`✅ ${rows.length} alumnos procesados y listos para previsualización.`, 'success');
      } else {
        showToast('No se encontraron filas de estudiantes en el archivo.', 'error');
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
      analyzeAndParseContent(text, selected.name);
    };
    reader.readAsText(selected, 'UTF-8');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelected(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  // Re-run parsing if user changes a custom column mapping
  const handleMappingChange = (field: keyof ColumnMapping, value: number) => {
    const updated = { ...columnMapping, [field]: value };
    setColumnMapping(updated);
    if (fileRawContent && file) {
      analyzeAndParseContent(fileRawContent, file.name, updated, headerRowIdx);
    }
  };

  // Re-run parsing if user changes default carrera or grupo
  const handleDefaultSettingChange = (carreraId: string, grupo: string, grado: string, sedeId: string) => {
    setDefaultCarreraId(carreraId);
    setDefaultGrupo(grupo);
    setDefaultGrado(grado);
    setDefaultSedeId(sedeId);
    if (fileRawContent && file) {
      analyzeAndParseContent(fileRawContent, file.name, columnMapping, headerRowIdx);
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
                <span>Formato Inteligente y Flexible</span>
              </h4>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Admite listas de asistencia, actas o expedientes. Detecta nombres completos (ej. <code className="text-blue-300 font-mono">Morales Flores Stephanie</code>), columnas individuales o matrículas automáticas.
                Si no se especifica contraseña, se asignará el estándar institucional (<code className="text-emerald-300 font-mono">Matricula-2026-2</code>).
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
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
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
                  o haz clic para seleccionar tu lista de alumnos de Excel o Google Sheets
                </p>
              </div>
              <div className="text-[11px] text-gray-500 font-mono">
                Soporta separadores por coma (,), punto y coma (;) y tabulaciones
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
                      {(file.size / 1024).toFixed(1)} KB • {totalCount} alumnos detectados • Delimitador: &quot;{delimiterChar}&quot;
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
                    <span>Ajustar Columnas</span>
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

              {/* Collapsible Column & Defaults Mapping Bar */}
              {showMappingSettings && (
                <div className="p-4 rounded-2xl bg-[#080d1a] border border-blue-500/20 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-blue-300 text-xs flex items-center space-x-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Configuración de Columnas y Valores por Defecto</span>
                    </h5>
                    <span className="text-[11px] text-gray-400">
                      Encabezados encontrados en fila #{headerRowIdx + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-gray-400 block mb-1 text-[11px]">Columna Matrícula</label>
                      <select
                        value={columnMapping.colMatricula}
                        onChange={(e) => handleMappingChange('colMatricula', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                      >
                        <option value={-1}>Auto-generar UNRC-2026-xxx</option>
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
                        onChange={(e) => handleMappingChange('colAlumnoCompleto', Number(e.target.value))}
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
                      <label className="text-gray-400 block mb-1 text-[11px]">Carrera Asignada</label>
                      <select
                        value={defaultCarreraId}
                        onChange={(e) => handleDefaultSettingChange(e.target.value, defaultGrupo, defaultGrado, defaultSedeId)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                      >
                        {carreras.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1 text-[11px]">Grupo / Sección</label>
                      <input
                        type="text"
                        value={defaultGrupo}
                        onChange={(e) => handleDefaultSettingChange(defaultCarreraId, e.target.value, defaultGrado, defaultSedeId)}
                        placeholder="201-TUR"
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono"
                      />
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
                    desmarca, estas filas serán ignoradas para evitar sobrescrituras).
                  </label>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-semibold text-white">
                    Previsualización de Alumnos ({filteredRows.length} de {totalCount}):
                  </span>
                  <span className="text-[11px]">
                    Mostrando filtro: <strong className="text-blue-400 uppercase">{filterView}</strong>
                  </span>
                </div>

                <div className="border border-white/10 rounded-2xl overflow-hidden max-h-72 overflow-y-auto bg-black/40 shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#111827] sticky top-0 border-b border-white/10 text-gray-400 text-[11px]">
                      <tr>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5">Matrícula</th>
                        <th className="p-2.5">Alumno (Nombre Completo)</th>
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
                            <td className="p-2.5 text-gray-300 whitespace-nowrap">
                              {r.grado} • <span className="font-mono text-blue-300 font-semibold">{r.grupo}</span>
                            </td>
                            <td className="p-2.5 text-gray-300 truncate max-w-[170px]" title={r.carrera}>
                              {r.carrera}
                            </td>
                            <td className="p-2.5 text-gray-300 truncate max-w-[140px]" title={r.sede_nombre}>
                              {r.sede_nombre}
                            </td>
                            <td className="p-2.5 text-gray-400 whitespace-nowrap">{r.tutor}</td>
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
          <div className="text-[11px] text-gray-400">
            {file && (
              <span>
                Se importarán / guardarán:{' '}
                <strong className="text-white">
                  {updateExisting ? validCount + existsCount : validCount}
                </strong>{' '}
                alumnos de {totalCount} filas detectadas.
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
