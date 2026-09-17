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
  ChevronUp,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
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

interface DetectedMetadata {
  carrera?: string;
  grupo?: string;
  sede?: string;
  ciclo?: string;
  asignatura?: string;
  grado?: string;
  matriculaColName?: string;
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
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [currentMatrix, setCurrentMatrix] = useState<any[][]>([]);
  const [detectedMetadata, setDetectedMetadata] = useState<DetectedMetadata | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedAlumnoRow[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);

  // Target Destination Settings
  const [targetCarreraId, setTargetCarreraId] = useState<string>('');
  const [targetGrupo, setTargetGrupo] = useState<string>('301');
  const [targetGrado, setTargetGrado] = useState<string>('3° Semestre');
  const [targetSedeId, setTargetSedeId] = useState<string>('');
  // Respetar las entidades que vienen en el archivo (.xls/.xlsx/csv)
  const [respectFileEntities, setRespectFileEntities] = useState<boolean>(true);

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
  const workbookRef = useRef<XLSX.WorkBook | null>(null);

  // Initialize Destination Career & Sede based on props or context
  useEffect(() => {
    if (!isOpen) return;

    let targetCar = targetCarreraId;
    if (initialCarreraId && carreras.some((c) => c.id === initialCarreraId)) {
      targetCar = initialCarreraId;
      setTargetCarreraId(initialCarreraId);
    } else if (!targetCarreraId && carreras.length > 0) {
      const datosCar = carreras.find(
        (c) =>
          c.clave?.includes('CDIA') ||
          c.nombre.toLowerCase().includes('datos') ||
          c.nombre.toLowerCase().includes('negocios')
      );
      targetCar = datosCar ? datosCar.id : carreras[0].id;
      setTargetCarreraId(targetCar);
    }

    const sel = carreras.find((c) => c.id === targetCar);
    if (sel?.nombre.toLowerCase().includes('turismo') || sel?.clave?.includes('TUR')) {
      setTargetGrupo('201-TUR');
      setTargetGrado('2° Semestre');
    } else if (sel?.nombre.toLowerCase().includes('administración') || sel?.clave?.includes('ADM')) {
      setTargetGrupo('203-ADM');
      setTargetGrado('2° Semestre');
    } else if (sel?.nombre.toLowerCase().includes('datos') || sel?.nombre.toLowerCase().includes('negocios') || sel?.clave?.includes('CDIA')) {
      setTargetGrupo('301');
      setTargetGrado('3° Semestre');
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
      const tijuanaSede = sedes.find((s) => s.nombre.toLowerCase().includes('tijuana'));
      setTargetSedeId(tijuanaSede ? tijuanaSede.id : sedes[0].id);
    }
  }, [isOpen, initialCarreraId, initialSedeId, carreras, sedes]);

  if (!isOpen) return null;

  // Selected Career Object
  const selectedCarreraObj =
    carreras.find((c) => c.id === targetCarreraId) ||
    carreras.find(
      (c) =>
        c.clave?.includes('CDIA') ||
        c.nombre.toLowerCase().includes('datos') ||
        c.nombre.toLowerCase().includes('negocios')
    ) ||
    carreras[0] || {
      id: 'c1111111-1111-1111-1111-111111111111',
      nombre: 'Licenciatura en Ciencias de Datos e Inteligencia Artificial',
      clave: 'LIC-CDIA'
    };

  const selectedSedeObj =
    sedes.find((s) => s.id === targetSedeId) ||
    sedes.find((s) => s.nombre.toLowerCase().includes('tijuana')) ||
    sedes[0] || {
      id: 'sede-tij',
      nombre: 'Campus Tijuana'
    };

  // Name splitting helper
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

  // Match text to system Carrera
  const matchCarreraFromText = (rawCarrera: string): Carrera | null => {
    const clean = (rawCarrera || '').toLowerCase().trim();
    if (!clean) return null;

    // 1. Licenciatura en Administración (PRIORIDAD y precisión para evitar colisiones)
    // Códigos UNRC: PHLAC (Plan Híbrido Lic. en Administración y Comercio), LAC, ADM, 203
    if (
      clean.includes('administra') ||
      clean.includes('admon') ||
      clean.includes('comercio') ||
      clean.includes('phlac') ||
      clean.includes('lac-') ||
      clean.startsWith('lac') ||
      clean.includes('203') ||
      /\b(adm|lic-adm|la|lac|phlac|203|203-adm|203-tij)\b/i.test(clean) ||
      clean === 'adm' ||
      clean === 'lac' ||
      clean === 'phlac'
    ) {
      const adm = carreras.find(
        (c) => c.clave?.includes('ADM') || c.nombre.toLowerCase().includes('administra')
      );
      if (adm) return adm;
    }

    // 2. Licenciatura en Ciencias de Datos / Negocios / Inteligencia Artificial
    if (
      clean.includes('ciencia de datos') ||
      clean.includes('ciencias de datos') ||
      clean.includes('inteligencia artificial') ||
      clean.includes('datos') ||
      clean.includes('negocios') ||
      /\b(cdia|lcdn|lic-cdia|data)\b/i.test(clean)
    ) {
      const dat = carreras.find(
        (c) =>
          c.clave?.includes('CDIA') ||
          c.nombre.toLowerCase().includes('datos') ||
          c.nombre.toLowerCase().includes('negocios')
      );
      if (dat) return dat;
    }

    // 3. Licenciatura en Ciberseguridad
    if (clean.includes('ciber') || /\b(cib|lic-cib)\b/i.test(clean)) {
      const cib = carreras.find((c) => c.clave?.includes('CIB') || c.nombre.toLowerCase().includes('ciberseguridad'));
      if (cib) return cib;
    }

    // 4. Licenciatura en Tecnologías de la Información y Comunicación (TIC)
    if (clean.includes('tecnolog') || /\b(tic|tics|lic-tic)\b/i.test(clean) || clean.includes('informacion y comunicacion')) {
      const tic = carreras.find((c) => c.clave?.includes('TIC') || c.nombre.toLowerCase().includes('tecnologías'));
      if (tic) return tic;
    }

    // 5. Licenciatura en Turismo (NUNCA usar includes('tur') porque palabras como 'licenciaTURa', 'esTRUCTURa', 'TURno' contienen 'tur')
    if (
      clean.includes('turismo') ||
      clean.includes('turístic') ||
      clean.includes('turistic') ||
      clean.includes('hospedaje') ||
      /\b(tur|lic-tur)\b/i.test(clean) ||
      clean === 'tur'
    ) {
      const tur = carreras.find((c) => c.clave?.includes('TUR') || c.nombre.toLowerCase().includes('turismo'));
      if (tur) return tur;
    }

    const exact = carreras.find(
      (c) =>
        c.id.toLowerCase() === clean ||
        c.clave?.toLowerCase() === clean ||
        c.nombre.toLowerCase() === clean
    );
    return exact || null;
  };

  // Match text to system Sede
  const matchSedeFromText = (rawSede: string): Sede | null => {
    const clean = (rawSede || '').toLowerCase().trim();
    if (!clean) return null;

    if (clean.includes('tijuana') || clean.includes('tij')) {
      const tij = sedes.find((s) => s.nombre.toLowerCase().includes('tijuana') || s.clave?.includes('TIJ'));
      if (tij) return tij;
    }
    if (clean.includes('magdalena') || clean.includes('contreras') || clean.includes('mc')) {
      const mc = sedes.find((s) => s.nombre.toLowerCase().includes('magdalena') || s.clave?.includes('MC'));
      if (mc) return mc;
    }
    if (clean.includes('coyoac') || clean.includes('coy')) {
      const coy = sedes.find((s) => s.nombre.toLowerCase().includes('coyoac') || s.clave?.includes('COY'));
      if (coy) return coy;
    }
    if (clean.includes('justo') || clean.includes('sierra') || clean.includes('js')) {
      const js = sedes.find((s) => s.nombre.toLowerCase().includes('justo') || s.clave?.includes('JS'));
      if (js) return js;
    }
    if (clean.includes('azcapotzalco') || clean.includes('azc')) {
      const azc = sedes.find((s) => s.nombre.toLowerCase().includes('azc'));
      if (azc) return azc;
    }

    const exact = sedes.find(
      (s) => s.id.toLowerCase() === clean || s.clave?.toLowerCase() === clean || s.nombre.toLowerCase().includes(clean)
    );
    return exact || null;
  };

  // Infer Grado/Semestre from Grupo name
  const inferGradoFromGrupo = (grp: string): string => {
    const clean = (grp || '').toUpperCase();
    if (clean.includes('101') || clean.includes('102') || clean.includes('103') || clean.includes('1AP') || clean.includes('1RO')) return '1° Semestre';
    if (clean.includes('201') || clean.includes('202') || clean.includes('203') || clean.includes('2AP') || clean.includes('2BP') || clean.includes('2°')) return '2° Semestre';
    if (clean.includes('301') || clean.includes('302') || clean.includes('303') || clean.includes('3RO') || clean.includes('3°')) return '3° Semestre';
    if (clean.includes('401') || clean.includes('402') || clean.includes('4AP') || clean.includes('4BP') || clean.includes('4°')) return '4° Semestre';
    if (clean.includes('501') || clean.includes('502') || clean.includes('5TO') || clean.includes('5°')) return '5° Semestre';
    if (clean.includes('601') || clean.includes('602') || clean.includes('6AP') || clean.includes('6BP') || clean.includes('6CP') || clean.includes('6°')) return '6° Semestre';
    return targetGrado || '3° Semestre';
  };

  // Core parser: Process Sheet Matrix
  const processMatrix = (
    matrix: any[][],
    customMapping?: ColumnMapping,
    customHeaderIdx?: number,
    forceRespectFileEntities: boolean = respectFileEntities,
    fileContextHint?: { fileName?: string; sheetName?: string },
    explicitTargetCarreraId?: string
  ) => {
    if (!matrix || matrix.length === 0) {
      setParsedRows([]);
      setDetectedHeaders([]);
      return;
    }

    // 1. Extract metadata from the upper block (e.g. rows 0 to 20)
    const meta: DetectedMetadata = {};
    const maxMetaScan = Math.min(matrix.length, 20);
    for (let r = 0; r < maxMetaScan; r++) {
      const row = matrix[r] || [];
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] ?? '').trim();
        if (!val) continue;

        // Check if cell directly contains a Carrera (e.g. "LICENCIATURA EN ADMINISTRACIÓN")
        if (!meta.carrera) {
          if (!/(?:turno|horario|docente|profesor|asistencia|lista|promedio|firma|calificaci)/i.test(val)) {
            const direct = matchCarreraFromText(val);
            if (direct) {
              meta.carrera = direct.nombre;
            }
          }
        }

        const nextVal = String(row[c + 1] ?? '').trim();
        const nextVal2 = String(row[c + 2] ?? '').trim();
        const targetVal = nextVal || nextVal2;

        if (/(?:licenciatura|carrera|programa(?:\s+acad[eé]mico)?)\s*[:=]?/i.test(val)) {
          const afterColon = val.replace(/.*(?:licenciatura|carrera|programa(?:\s+acad[eé]mico)?)\s*[:=]?\s*/i, '').trim();
          const matchAfter = afterColon ? matchCarreraFromText(afterColon) : null;
          if (matchAfter) {
            meta.carrera = matchAfter.nombre;
          } else if (targetVal) {
            const matchTarget = matchCarreraFromText(targetVal);
            if (matchTarget) {
              meta.carrera = matchTarget.nombre;
            } else if (!meta.carrera) {
              meta.carrera = targetVal;
            }
          }
        }

        if (/(?:unidad\s+acad[eé]mica|sede|plantel|campus)\s*[:=]?/i.test(val)) {
          const afterSede = val.replace(/.*(?:unidad\s+acad[eé]mica|sede|plantel|campus)\s*[:=]?\s*/i, '').trim();
          const matchSedeAfter = afterSede ? matchSedeFromText(afterSede) : null;
          if (matchSedeAfter) {
            meta.sede = matchSedeAfter.nombre;
          } else if (targetVal) {
            const matchTargetSede = matchSedeFromText(targetVal);
            meta.sede = matchTargetSede ? matchTargetSede.nombre : targetVal;
          }
        }

        if (/(?:grupo|secci[oó]n)\s*[:=]?/i.test(val)) {
          const grpMatch = val.match(/(?:grupo|secci[oó]n)\s*[:=]?\s*([A-Za-z0-9\-_]+)/i);
          if (grpMatch && grpMatch[1] && !/(?:grupo|secci[oó]n)/i.test(grpMatch[1])) {
            meta.grupo = grpMatch[1].trim();
          } else if (targetVal && !/(?:grupo|secci[oó]n)/i.test(targetVal)) {
            meta.grupo = targetVal;
          }
        }

        if (/(?:asignatura|uca|materia)\s*[:=]?/i.test(val)) {
          meta.asignatura = val.replace(/.*(?:asignatura|uca|materia)\s*[:=]?\s*/i, '').trim() || targetVal;
        }

        if (/(?:ciclo(?:\s+escolar)?)/i.test(val)) {
          meta.ciclo = val.replace(/.*ciclo\s*escolar\s*:?\s*/i, '').trim() || val;
        }
      }
    }

    // Context candidates from file name & sheet name
    const sheetNameToCheck = fileContextHint?.sheetName || selectedSheet;
    const fileNameToCheck = fileContextHint?.fileName || file?.name;
    const nameCandidates = [fileNameToCheck, sheetNameToCheck].filter(Boolean) as string[];

    // 1. Group extraction from candidates (e.g. PHLAC-203-TIJ -> PHLAC-203-TIJ or 203-TIJ)
    if (!meta.grupo) {
      for (const cand of nameCandidates) {
        const unrcFullMatch = cand.match(/\b((?:PHLAC|PHLCDN|PHLTUR|PHLTIC|PHLCIB|LIC|ADM|TUR|TIC|CIB)-[0-9]{3}(?:-[A-Za-z0-9]+)?)\b/i);
        if (unrcFullMatch && unrcFullMatch[1]) {
          meta.grupo = unrcFullMatch[1].toUpperCase();
          break;
        }
        const grpMatch = cand.match(/\b([0-9]{3}(?:-[A-Za-z0-9]+)?)\b/);
        if (grpMatch && grpMatch[1]) {
          meta.grupo = grpMatch[1].toUpperCase();
          break;
        }
      }
    }

    // 2. Sede from candidates (e.g. TIJ -> Campus Tijuana)
    if (!meta.sede) {
      for (const cand of nameCandidates) {
        const matchedSede = matchSedeFromText(cand);
        if (matchedSede) {
          meta.sede = matchedSede.nombre;
          break;
        }
      }
    }

    // 3. Career from candidates
    if (!meta.carrera) {
      for (const cand of nameCandidates) {
        const matchedCar = matchCarreraFromText(cand);
        if (matchedCar) {
          meta.carrera = matchedCar.nombre;
          break;
        }
      }
    }

    // 4. Fallback inference from Group code
    if (!meta.carrera && meta.grupo) {
      const gUpper = meta.grupo.toUpperCase();
      if (gUpper.includes('ADM') || gUpper.includes('LAC') || gUpper.includes('PHLAC') || gUpper.includes('203')) {
        const adm = carreras.find((c) => c.clave?.includes('ADM') || c.nombre.toLowerCase().includes('administra'));
        if (adm) meta.carrera = adm.nombre;
      } else if (gUpper.includes('TUR') || gUpper.includes('201')) {
        const tur = carreras.find((c) => c.clave?.includes('TUR') || c.nombre.toLowerCase().includes('turismo'));
        if (tur) meta.carrera = tur.nombre;
      } else if (gUpper.includes('CDIA') || gUpper.includes('LCDN') || gUpper.includes('301') || gUpper.includes('401')) {
        const dat = carreras.find((c) => c.clave?.includes('CDIA') || c.nombre.toLowerCase().includes('datos') || c.nombre.toLowerCase().includes('negocios'));
        if (dat) meta.carrera = dat.nombre;
      } else if (gUpper.includes('CIB') || gUpper.includes('501')) {
        const cib = carreras.find((c) => c.clave?.includes('CIB') || c.nombre.toLowerCase().includes('ciberseguridad'));
        if (cib) meta.carrera = cib.nombre;
      } else if (gUpper.includes('TIC')) {
        const tic = carreras.find((c) => c.clave?.includes('TIC') || c.nombre.toLowerCase().includes('tecnologías'));
        if (tic) meta.carrera = tic.nombre;
      }
    }

    if (meta.grupo) {
      meta.grado = inferGradoFromGrupo(meta.grupo);
    }
    setDetectedMetadata(Object.keys(meta).length > 0 ? meta : null);

    // Sync destination selectors with detected metadata if available
    let activeCarreraObj = explicitTargetCarreraId
      ? carreras.find((c) => c.id === explicitTargetCarreraId) || selectedCarreraObj
      : selectedCarreraObj;

    if (explicitTargetCarreraId) {
      setTargetCarreraId(explicitTargetCarreraId);
    } else if (meta.carrera) {
      const matched = matchCarreraFromText(meta.carrera);
      if (matched) {
        activeCarreraObj = matched;
        setTargetCarreraId(matched.id);
        if (matched.nombre.toLowerCase().includes('administra')) {
          setTargetGrupo(meta.grupo || 'PHLAC-203-TIJ');
          setTargetGrado(meta.grado || '2° Semestre');
        } else if (matched.nombre.toLowerCase().includes('turis')) {
          setTargetGrupo(meta.grupo || '201-TUR');
          setTargetGrado(meta.grado || '2° Semestre');
        } else if (matched.clave?.includes('CDIA') || matched.nombre.toLowerCase().includes('datos')) {
          setTargetGrupo(meta.grupo || '301');
          setTargetGrado(meta.grado || '3° Semestre');
        }
      }
    }
    if (meta.grupo) {
      setTargetGrupo(meta.grupo);
    }
    if (meta.grado) {
      setTargetGrado(meta.grado);
    }
    if (meta.sede) {
      const matchedSede = matchSedeFromText(meta.sede);
      if (matchedSede) {
        setTargetSedeId(matchedSede.id);
      }
    }

    // 2. Locate the table header row
    let headerIdx = customHeaderIdx !== undefined ? customHeaderIdx : 0;
    if (customHeaderIdx === undefined) {
      let maxScore = -1;
      const maxHeaderScan = Math.min(matrix.length, 25);
      for (let i = 0; i < maxHeaderScan; i++) {
        const row = matrix[i] || [];
        let score = 0;
        for (const cell of row) {
          const s = String(cell ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
          if (
            s.includes('matricula') ||
            s.includes('control') ||
            s.includes('cuenta') ||
            s.includes('expediente') ||
            s.includes('boleta') ||
            s.includes('clave') ||
            s.includes('codigo') ||
            s.includes('curp') ||
            s.includes('folio') ||
            s.includes('student') ||
            s === 'id' ||
            s === 'cve' ||
            s === 'cod' ||
            s.includes('identificador') ||
            s.includes('registro')
          ) {
            score += 40;
          }
          if (s.includes('nombre')) score += 15;
          if (s.includes('apellido') || s.includes('paterno') || s.includes('materno')) score += 15;
          if (s.includes('alumno') || s.includes('estudiante')) score += 20;
          if (s.includes('carrera') || s.includes('licenciatura') || s.includes('grupo') || s.includes('grado')) score += 10;
          if (s.includes('calificacion')) score += 5;
          if (s === 'no' || s === 'num' || s === '#' || s === 'n°') score += 5;
        }
        if (score > maxScore && score >= 20) {
          maxScore = score;
          headerIdx = i;
        }
      }
    }

    setHeaderRowIdx(headerIdx);
    const rawHeaders = (matrix[headerIdx] || []).map((h: any) => String(h ?? '').trim());
    setDetectedHeaders(rawHeaders);

    const normHeaders = rawHeaders.map((h) =>
      h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s_.-]+/g, '')
    );

    // Smart Column Matcher
    const findExactOrIncludes = (...aliases: string[]) => {
      // First pass: exact match
      for (const alias of aliases) {
        const idx = normHeaders.findIndex((h) => h === alias);
        if (idx !== -1) return idx;
      }
      // Second pass: contains
      for (const alias of aliases) {
        const idx = normHeaders.findIndex((h) => h.includes(alias));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    // Specific mapping for Matrícula: Priority for explicit identifiers
    let colMat = findExactOrIncludes(
      'matricula',
      'matriculaescolar',
      'matriculaoficial',
      'matriculaestudiante',
      'matriculaalumno',
      'matriculas',
      'matriculafolio',
      'mat',
      'nocontrol',
      'nodecontrol',
      'numcontrol',
      'numerocontrol',
      'numerodecontrol',
      'control',
      'nocuenta',
      'nodecuenta',
      'numcuenta',
      'cuenta',
      'noexpediente',
      'numexpediente',
      'expediente',
      'noboleta',
      'numboleta',
      'boleta',
      'clavealumno',
      'clavedealumno',
      'cvealumno',
      'cve.alumno',
      'cve_alumno',
      'codigoalumno',
      'codalumno',
      'codigo',
      'cod',
      'idalumno',
      'idestudiante',
      'id_alumno',
      'id_estudiante',
      'studentcode',
      'studentid',
      'curp',
      'folio',
      'nofolio',
      'numfolio',
      'registro',
      'numregistro',
      'noregistro'
    );

    if (colMat === -1) {
      // Fallback only if no explicit column
      colMat = findExactOrIncludes('clave', 'cve', 'id');
    }

    // Data-driven Matrícula Column Fallback:
    // If headers didn't have "matricula", inspect actual row values for student codes
    if (colMat === -1 && matrix.length > headerIdx + 1) {
      const sampleLimit = Math.min(matrix.length, headerIdx + 25);
      const totalSampleRows = sampleLimit - (headerIdx + 1);
      let bestCandidateCol = -1;
      let highestCandidateScore = 0;

      const numCols = Math.max(...matrix.slice(headerIdx + 1, sampleLimit).map((r) => (r ? r.length : 0)));
      for (let c = 0; c < numCols; c++) {
        let matchCount = 0;
        const uniqueValues = new Set<string>();

        for (let r = headerIdx + 1; r < sampleLimit; r++) {
          const rawVal = String(matrix[r]?.[c] ?? '').trim().replace(/\.0+$/, '').replace(/^["']|["']$/g, '');
          if (!rawVal) continue;

          // Matrícula pattern: alphanumeric, length 4-25, not row sequence 1..N, not space-separated name
          const isRowCounter = /^\d{1,3}$/.test(rawVal) && Number(rawVal) <= totalSampleRows + 5;
          const isMatriculaFormat =
            rawVal.length >= 4 &&
            rawVal.length <= 25 &&
            /^[A-Za-z0-9\-_]+$/.test(rawVal) &&
            !isRowCounter &&
            !/\s/.test(rawVal) &&
            !/^(?:101|102|201|202|203|301|302|401|402|501|502|601|602)$/.test(rawVal);

          if (isMatriculaFormat) {
            matchCount++;
            uniqueValues.add(rawVal.toLowerCase());
          }
        }

        if (matchCount >= Math.max(2, Math.floor(totalSampleRows * 0.35)) && uniqueValues.size >= Math.floor(matchCount * 0.7)) {
          const score = matchCount * 10 + uniqueValues.size;
          if (score > highestCandidateScore) {
            highestCandidateScore = score;
            bestCandidateCol = c;
          }
        }
      }

      if (bestCandidateCol !== -1) {
        colMat = bestCandidateCol;
      }
    }

    if (colMat >= 0 && rawHeaders[colMat]) {
      meta.matriculaColName = rawHeaders[colMat];
    } else if (colMat >= 0) {
      meta.matriculaColName = `Columna ${colMat + 1}`;
    }

    const mapping: ColumnMapping = customMapping || {
      colMatricula: colMat,
      colAlumnoCompleto: findExactOrIncludes('alumno', 'estudiante', 'nombrecompleto', 'nombredelalumno', 'nombrealumno', 'alumnos'),
      colNombre: findExactOrIncludes('nombre(s)', 'nombres', 'nombre', 'firstname', 'name'),
      colPaterno: findExactOrIncludes('apellidopaterno', 'paterno', 'primerapellido', 'apellidos'),
      colMaterno: findExactOrIncludes('apellidomaterno', 'materno', 'segundoapellido'),
      colGrado: findExactOrIncludes('grado', 'semestre', 'gradelevel'),
      colGrupo: findExactOrIncludes('grupo', 'seccion', 'section'),
      colCarrera: findExactOrIncludes('carrera', 'licenciatura', 'programa'),
      colSede: findExactOrIncludes('sede', 'campus', 'plantel', 'unidadacademica'),
      colEstado: findExactOrIncludes('estadomatricula', 'estado', 'status'),
      colTutor: findExactOrIncludes('tutor', 'docentetitular', 'profesor'),
      colTelefono: findExactOrIncludes('telefono', 'celular', 'tel', 'phone'),
      colPassword: findExactOrIncludes('password', 'contrasena', 'contrasenia')
    };

    // Fallback for names if none found
    if (mapping.colNombre === -1 && mapping.colAlumnoCompleto === -1) {
      const candidate = normHeaders.findIndex((h) => h.includes('alum') || h.includes('estud') || h.includes('nom'));
      if (candidate !== -1) mapping.colAlumnoCompleto = candidate;
      else if (rawHeaders.length >= 2) mapping.colAlumnoCompleto = 1;
    }

    setColumnMapping(mapping);

    // 3. Process each student row preserving strict file order
    const rows: ParsedAlumnoRow[] = [];
    const seenMatriculas = new Set<string>();
    const startLine = headerIdx + 1;

    for (let i = startLine; i < matrix.length; i++) {
      const row = matrix[i] || [];
      if (row.length === 0 || row.every((c: any) => String(c ?? '').trim() === '')) {
        continue;
      }

      // Check for footer / signature rows (e.g. single cell with teacher name or "Firma", "Docente", etc.)
      const nonBlankCells = row.map((c: any) => String(c ?? '').trim()).filter((s: string) => s.length > 0);
      const rowFullText = nonBlankCells.join(' ').toLowerCase();
      if (
        rowFullText.includes('firma de conformidad') ||
        rowFullText.includes('firma del docente') ||
        rowFullText.includes('total de alumnos') ||
        rowFullText.includes('promedio del grupo') ||
        rowFullText.includes('docente titular')
      ) {
        continue;
      }

      // 1. Exact Matrícula from file: NEVER OVERWRITE IF PRESENT IN FILE
      let rawMat = mapping.colMatricula >= 0 ? String(row[mapping.colMatricula] ?? '').trim() : '';
      let isMatriculaGenerated = false;

      // Clean rawMat (remove Excel float decimals e.g. "20260012.0", quotes, extra spaces)
      if (rawMat) {
        rawMat = rawMat.replace(/\.0+$/, '').replace(/^["']|["']$/g, '').trim();
      }

      // 2. If empty in this specific row, search all other cells for any student code
      if (!rawMat) {
        for (let c = 0; c < row.length; c++) {
          if (c === mapping.colAlumnoCompleto || c === mapping.colNombre || c === mapping.colPaterno || c === mapping.colMaterno) continue;
          const candidateVal = String(row[c] ?? '').trim().replace(/\.0+$/, '').replace(/^["']|["']$/g, '');
          if (
            candidateVal &&
            candidateVal.length >= 4 &&
            candidateVal.length <= 25 &&
            /^[A-Za-z0-9\-_]+$/.test(candidateVal) &&
            /\d/.test(candidateVal) &&
            !/^\d{1,3}$/.test(candidateVal) &&
            !/^(?:101|102|201|202|203|301|302|401|402|501|502|601|602)$/.test(candidateVal)
          ) {
            rawMat = candidateVal;
            break;
          }
        }
      }

      // 3. Names extraction
      let nom = mapping.colNombre >= 0 ? String(row[mapping.colNombre] ?? '').trim() : '';
      let pat = mapping.colPaterno >= 0 ? String(row[mapping.colPaterno] ?? '').trim() : '';
      let mat = mapping.colMaterno >= 0 ? String(row[mapping.colMaterno] ?? '').trim() : '';

      // If Apellidos column has multiple words (e.g. "CRUZ PONCE"), split cleanly
      if (pat && !mat && pat.includes(' ')) {
        const parts = pat.split(/\s+/);
        pat = parts[0] || '';
        mat = parts.slice(1).join(' ') || '';
      }

      // Full Name column fallback
      if (mapping.colAlumnoCompleto >= 0 && (!nom || !pat)) {
        const full = String(row[mapping.colAlumnoCompleto] ?? '').trim();
        if (full) {
          const s = splitFullName(full);
          nom = s.nombre;
          pat = s.apellido_paterno;
          mat = s.apellido_materno;
        }
      }

      // 4. Check if matrícula is embedded in the student name cell (e.g. "UNRC-2026-001 - Juan Pérez")
      if (!rawMat) {
        const full = String(row[mapping.colAlumnoCompleto] ?? row[mapping.colNombre] ?? '').trim();
        const embeddedMatch = full.match(/\b((?:UNRC|DOC|ALU)?[A-Za-z0-9\-_]{5,20})\b/);
        if (embeddedMatch && embeddedMatch[1] && /\d/.test(embeddedMatch[1]) && !/^(?:101|102|201|202|203|301|302|401|402|501|502|601|602)$/.test(embeddedMatch[1])) {
          rawMat = embeddedMatch[1];
        }
      }

      // If both name and surname are missing, and it's a 1-2 cell row, it's a signature footer -> skip
      if (!nom && !pat && nonBlankCells.length <= 2) {
        continue;
      }

      // 5. Only if matrícula is completely absent from the file, generate one
      if (!rawMat) {
        rawMat = `UNRC-2026-${String(existingAlumnos.length + rows.length + 10).padStart(3, '0')}`;
        isMatriculaGenerated = true;
      }

      // Entity values from file row or metadata
      const rowGrado = mapping.colGrado >= 0 ? String(row[mapping.colGrado] ?? '').trim() : '';
      const rowGrupo = mapping.colGrupo >= 0 ? String(row[mapping.colGrupo] ?? '').trim() : '';
      const rowCarrera = mapping.colCarrera >= 0 ? String(row[mapping.colCarrera] ?? '').trim() : '';
      const rowSede = mapping.colSede >= 0 ? String(row[mapping.colSede] ?? '').trim() : '';
      const rowEstado = mapping.colEstado >= 0 ? String(row[mapping.colEstado] ?? '').trim().toLowerCase() : '';
      const rowTutor = mapping.colTutor >= 0 ? String(row[mapping.colTutor] ?? '').trim() : '';
      const rowTel = mapping.colTelefono >= 0 ? String(row[mapping.colTelefono] ?? '').trim() : '';
      const rowPwd = mapping.colPassword >= 0 ? String(row[mapping.colPassword] ?? '').trim() : '';

      // Resolve Carrera
      let resolvedCarrera = activeCarreraObj;
      if (forceRespectFileEntities) {
        if (rowCarrera) {
          const matched = matchCarreraFromText(rowCarrera);
          if (matched) resolvedCarrera = matched;
        } else if (meta.carrera) {
          const matched = matchCarreraFromText(meta.carrera);
          if (matched) resolvedCarrera = matched;
        }
      }

      // Resolve Grupo & Grado
      let resolvedGrupo = targetGrupo || '301';
      let resolvedGrado = targetGrado || '3° Semestre';
      if (forceRespectFileEntities) {
        if (rowGrupo) {
          resolvedGrupo = rowGrupo;
          resolvedGrado = inferGradoFromGrupo(rowGrupo);
        } else if (meta.grupo) {
          resolvedGrupo = meta.grupo;
          resolvedGrado = meta.grado || inferGradoFromGrupo(meta.grupo);
        }
        if (rowGrado) resolvedGrado = rowGrado;
      }

      // Resolve Sede
      let resolvedSede = selectedSedeObj;
      if (forceRespectFileEntities) {
        if (rowSede) {
          const matchedSede = matchSedeFromText(rowSede);
          if (matchedSede) resolvedSede = matchedSede;
        } else if (meta.sede) {
          const matchedSede = matchSedeFromText(meta.sede);
          if (matchedSede) resolvedSede = matchedSede;
        }
      }

      // Resolve Estado
      let resolvedEstado: 'activo' | 'baja_temporal' | 'egresado' | 'aspirante' = 'activo';
      if (rowEstado.includes('baja')) resolvedEstado = 'baja_temporal';
      else if (rowEstado.includes('egres')) resolvedEstado = 'egresado';
      else if (rowEstado.includes('aspir')) resolvedEstado = 'aspirante';

      // Auto tutor based on Carrera
      const isTurismo = resolvedCarrera.nombre.toLowerCase().includes('turismo');
      const isAdm = resolvedCarrera.nombre.toLowerCase().includes('administra');
      const defaultTutorName = isTurismo || isAdm ? 'Dr. Adrian Silva' : 'Tutor Registrado UNRC';

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
        errorMessage = 'Matrícula ya registrada en la base de datos (se actualizará)';
      }

      if (rawMat) seenMatriculas.add(rawMat.toLowerCase());

      rows.push({
        index: rows.length + 1,
        matricula: rawMat,
        isMatriculaGenerated,
        nombre: nom || pat || 'Estudiante',
        apellido_paterno: pat || nom || 'UNRC',
        apellido_materno: mat || '',
        grado: resolvedGrado,
        grupo: resolvedGrupo,
        carrera_id: resolvedCarrera.id,
        carrera: resolvedCarrera.nombre,
        sede_id: resolvedSede.id,
        sede_nombre: resolvedSede.nombre,
        estado_matricula: resolvedEstado,
        tutor: rowTutor || defaultTutorName,
        telefono: rowTel || '+525500000000',
        password: rowPwd,
        qr_code: rawMat,
        status,
        errorMessage
      });
    }

    setParsedRows(rows);
    if (rows.length > 0) {
      showToast(
        `✅ ${rows.length} registros procesados respetando matrícula y orden original.`,
        'success'
      );
    }
  };

  // Switch Sheet
  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (!workbookRef.current) return;
    const sheet = workbookRef.current.Sheets[sheetName];
    if (sheet) {
      const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
      setCurrentMatrix(matrix);
      processMatrix(matrix, undefined, undefined, respectFileEntities, { fileName: file?.name, sheetName });
    }
  };

  // File Upload Handler (Handles .xls, .xlsx, .csv)
  const handleFileSelected = (selected: File) => {
    const ext = selected.name.toLowerCase().split('.').pop();
    if (ext !== 'csv' && ext !== 'xls' && ext !== 'xlsx') {
      showToast('Por favor selecciona un archivo con formato .xls, .xlsx o .csv', 'error');
      return;
    }

    setFile(selected);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false });
        workbookRef.current = workbook;

        const sheets = workbook.SheetNames || [];
        setSheetNames(sheets);

        // Find the best sheet (e.g. containing 'calif', 'alumn', 'estud', or first sheet)
        let bestSheet = sheets[0] || '';
        const preferred = sheets.find((s) => {
          const lower = s.toLowerCase();
          return (
            lower.includes('adm') ||
            lower.includes('alumn') ||
            lower.includes('calif') ||
            lower.includes('estud') ||
            lower.includes('lista')
          );
        });
        if (preferred) bestSheet = preferred;

        setSelectedSheet(bestSheet);

        const targetSheetObj = workbook.Sheets[bestSheet];
        if (!targetSheetObj) {
          showToast('El archivo no contiene hojas válidas.', 'error');
          return;
        }

        const matrix = XLSX.utils.sheet_to_json<any[]>(targetSheetObj, { header: 1, defval: '' });
        setCurrentMatrix(matrix);
        processMatrix(matrix, undefined, undefined, respectFileEntities, { fileName: selected.name, sheetName: bestSheet });
      } catch (err: any) {
        console.error('Error al leer el archivo con XLSX:', err);
        showToast(`Error al procesar archivo: ${err.message}`, 'error');
      }
    };

    reader.readAsArrayBuffer(selected);
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
    workbookRef.current = null;
    setSheetNames([]);
    setSelectedSheet('');
    setCurrentMatrix([]);
    setDetectedMetadata(null);
    setParsedRows([]);
    setDetectedHeaders([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download official templates (CSV & XLSX)
  const handleDownloadTemplate = (format: 'csv' | 'xlsx' = 'xlsx') => {
    const currentCarreraName = selectedCarreraObj?.nombre || 'Licenciatura en Ciencias de Datos e Inteligencia Artificial';
    const currentSedeName = selectedSedeObj?.nombre || 'Campus Tijuana';

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
        currentCarreraName,
        currentSedeName,
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
        currentCarreraName,
        currentSedeName,
        'activo',
        'Dr. Adrian Silva',
        '+525522334455',
        ''
      ]
    ];

    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Alumnos_UNRC');
      XLSX.writeFile(wb, `plantilla_alumnos_${selectedCarreraObj.clave || 'unrc'}.xlsx`);
      showToast(`Plantilla Excel (.xlsx) descargada`, 'info');
    } else {
      const csvContent =
        '\uFEFF' +
        headers.join(',') +
        '\r\n' +
        sampleRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `plantilla_${selectedCarreraObj.clave || 'alumnos'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Plantilla CSV descargada`, 'info');
    }
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
      const alumnosPayload = rowsToImport.map((r) => {
        const finalCarreraId = respectFileEntities
          ? r.carrera_id || selectedCarreraObj.id
          : selectedCarreraObj.id;
        const finalCarreraNom = respectFileEntities
          ? r.carrera || selectedCarreraObj.nombre
          : selectedCarreraObj.nombre;
        const isTurismo = finalCarreraNom.toLowerCase().includes('turismo');
        const isAdm = finalCarreraNom.toLowerCase().includes('administra');
        const finalTutor = isTurismo || isAdm ? 'Dr. Adrian Silva' : 'Tutor Registrado UNRC';

        return {
          matricula: r.matricula,
          nombre: r.nombre,
          apellido_paterno: r.apellido_paterno,
          apellido_materno: r.apellido_materno,
          grado: r.grado,
          grupo: r.grupo,
          carrera: finalCarreraNom,
          carrera_id: finalCarreraId,
          sede_id: r.sede_id || selectedSedeObj.id,
          sede_nombre: r.sede_nombre || selectedSedeObj.nombre,
          ciclo_id: activeCiclo?.id || 'ciclo-2026-2',
          estado_matricula: r.estado_matricula,
          tutor: r.tutor || finalTutor,
          telefono: r.telefono,
          password: r.password?.trim() || getDefaultUserPassword(r.matricula, '2026-2'),
          qr_code: r.matricula
        };
      });

      const res = await db.addAlumnosBulk(alumnosPayload, { updateExisting });
      showToast(
        `✅ ${res.added} nuevos alumnos agregados y ${res.updated} actualizados exitosamente.`,
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
                <span>Carga Masiva de Alumnos (.XLS / .XLSX / .CSV)</span>
                <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Base de Datos UNRC
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Sube listas oficiales de estudiantes en Excel o CSV respetando Matrícula, entidades y orden original.
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
          {/* Prominent Respect Entities & Target Destination Settings */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-blue-950/30 to-purple-950/20 border-2 border-emerald-500/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-emerald-400 font-bold text-xs flex items-center space-x-2 uppercase tracking-wider">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Carrera y Entidades de Destino</span>
                </span>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Los datos del archivo serán respetados automáticamente si vienen especificados en el documento .xls.
                </p>
              </div>

              <select
                value={targetCarreraId}
                onChange={(e) => {
                  const newCarId = e.target.value;
                  setTargetCarreraId(newCarId);
                  if (currentMatrix.length > 0) {
                    processMatrix(
                      currentMatrix,
                      columnMapping,
                      headerRowIdx,
                      respectFileEntities,
                      { fileName: file?.name, sheetName: selectedSheet },
                      newCarId
                    );
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-[#090E1A] border-2 border-emerald-500/80 text-white font-bold text-xs focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                {carreras.map((c) => (
                  <option key={c.id} value={c.id}>
                    🎓 {c.nombre} ({c.clave})
                  </option>
                ))}
              </select>
            </div>

            {/* Respect File Entities Toggle */}
            <div className="pt-2 flex items-start space-x-2.5 bg-black/40 p-3 rounded-xl border border-emerald-500/30">
              <input
                type="checkbox"
                id="respectEntitiesCheckbox"
                checked={respectFileEntities}
                onChange={(e) => {
                  const val = e.target.checked;
                  setRespectFileEntities(val);
                  if (currentMatrix.length > 0) {
                    processMatrix(currentMatrix, columnMapping, headerRowIdx, val);
                  }
                }}
                className="w-4 h-4 mt-0.5 rounded text-emerald-500 bg-black/50 border-emerald-500/50 focus:ring-emerald-400 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="respectEntitiesCheckbox" className="text-[11px] text-emerald-300 cursor-pointer">
                <strong className="text-white block font-semibold mb-0.5">
                  Respetar Matrícula y Entidades del Archivo (Recomendado)
                </strong>
                Conserva la matrícula original, carrera, grupo y sede que vienen definidos en el archivo .XLS. Si se desmarca, se forzarán los valores manuales seleccionados aquí abajo.
              </label>
            </div>

            {/* Grupo, Semestre and Sede overrides */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
              <div>
                <label className="text-gray-300 block mb-1 text-[11px] font-semibold">Grupo por Defecto</label>
                <input
                  type="text"
                  value={targetGrupo}
                  onChange={(e) => {
                    setTargetGrupo(e.target.value);
                    if (currentMatrix.length > 0) {
                      processMatrix(currentMatrix, columnMapping, headerRowIdx, respectFileEntities);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-emerald-500/30 text-white font-mono text-xs focus:outline-none focus:border-emerald-400"
                  placeholder="301 o PHLCDN-301-TIJ"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1 text-[11px] font-semibold">Semestre / Grado</label>
                <input
                  type="text"
                  value={targetGrado}
                  onChange={(e) => {
                    setTargetGrado(e.target.value);
                    if (currentMatrix.length > 0) {
                      processMatrix(currentMatrix, columnMapping, headerRowIdx, respectFileEntities);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400"
                  placeholder="3° Semestre"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1 text-[11px] font-semibold">Sede / Campus</label>
                <select
                  value={targetSedeId}
                  onChange={(e) => {
                    setTargetSedeId(e.target.value);
                    if (currentMatrix.length > 0) {
                      processMatrix(currentMatrix, columnMapping, headerRowIdx, respectFileEntities);
                    }
                  }}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/50 border border-emerald-500/30 text-white text-xs focus:outline-none focus:border-emerald-400 cursor-pointer"
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

          {/* Quick template download buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 gap-2">
            <div className="text-[11px] text-gray-400">
              ¿Requieres un formato de ejemplo? Descarga la plantilla oficial configurada:
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('xlsx')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center space-x-1.5 transition-all whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Plantilla Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                className="px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold text-xs flex items-center space-x-1.5 transition-all whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Plantilla CSV</span>
              </button>
            </div>
          </div>

          {/* File Upload Zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
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
                accept=".csv,text/csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Upload className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Arrastra y suelta tu archivo <span className="text-emerald-400 font-bold">.XLS, .XLSX</span> o <span className="text-blue-400 font-bold">.CSV</span> aquí
                </p>
                <p className="text-xs text-gray-400">
                  o haz clic para examinar tus archivos en la computadora
                </p>
              </div>
              <div className="text-[11px] text-emerald-400/90 font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                ✨ Reconocimiento automático de Matrícula, Carrera, Grupo, Sede y orden de filas
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
                      {(file.size / 1024).toFixed(1)} KB • {totalCount} alumnos detectados en orden original
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  {/* Sheet Selector if file has multiple sheets */}
                  {sheetNames.length > 1 && (
                    <div className="flex items-center space-x-1.5 bg-black/40 px-2 py-1 rounded-xl border border-white/10">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] text-gray-400">Hoja:</span>
                      <select
                        value={selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        {sheetNames.map((s) => (
                          <option key={s} value={s} className="bg-[#0c1220] text-white">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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

              {/* Detected Metadata Badge Banner */}
              {detectedMetadata && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-emerald-950/30 border border-blue-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-300 text-xs flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Entidades Detectadas en el Encabezado del Archivo:</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                      Fila encabezado tabla: #{headerRowIdx + 1}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {detectedMetadata.matriculaColName && (
                      <span className="bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-white">
                        🆔 Matrícula del archivo: <strong className="text-emerald-300 font-bold">{detectedMetadata.matriculaColName}</strong>
                      </span>
                    )}
                    {detectedMetadata.carrera && (
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl text-gray-200">
                        🎓 Carrera: <strong className="text-emerald-300">{detectedMetadata.carrera}</strong>
                      </span>
                    )}
                    {detectedMetadata.grupo && (
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl text-gray-200">
                        👥 Grupo: <strong className="text-amber-300">{detectedMetadata.grupo}</strong>
                      </span>
                    )}
                    {detectedMetadata.sede && (
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl text-gray-200">
                        📍 Sede: <strong className="text-cyan-300">{detectedMetadata.sede}</strong>
                      </span>
                    )}
                    {detectedMetadata.asignatura && (
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl text-gray-200">
                        📚 Asignatura: <strong className="text-purple-300">{detectedMetadata.asignatura}</strong>
                      </span>
                    )}
                    {detectedMetadata.ciclo && (
                      <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl text-gray-200">
                        🗓️ Ciclo: <strong className="text-blue-300">{detectedMetadata.ciclo}</strong>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Collapsible Column Mapping */}
              {showMappingSettings && (
                <div className="p-4 rounded-2xl bg-[#080d1a] border border-blue-500/20 space-y-3 animate-in fade-in duration-150">
                  <h5 className="font-bold text-blue-300 text-xs flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Ajuste Manual de Columnas del Archivo</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-emerald-400 block mb-1 text-[11px] font-bold">
                        Columna Matrícula (del archivo)
                      </label>
                      <select
                        value={columnMapping.colMatricula}
                        onChange={(e) => {
                          const updated = { ...columnMapping, colMatricula: Number(e.target.value) };
                          setColumnMapping(updated);
                          if (currentMatrix.length > 0) {
                            processMatrix(currentMatrix, updated, headerRowIdx, respectFileEntities);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-emerald-500/50 text-emerald-300 text-xs cursor-pointer font-bold focus:ring-1 focus:ring-emerald-400"
                      >
                        <option value={-1}>Auto-generar (solo si viene vacía en el archivo)</option>
                        {detectedHeaders.map((h, i) => (
                          <option key={i} value={i}>
                            Columna {i + 1}: {h || `(sin encabezado)`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1 text-[11px]">Columna Nombre / Alumno</label>
                      <select
                        value={columnMapping.colNombre >= 0 ? columnMapping.colNombre : columnMapping.colAlumnoCompleto}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = { ...columnMapping, colNombre: val, colAlumnoCompleto: val };
                          setColumnMapping(updated);
                          if (currentMatrix.length > 0) {
                            processMatrix(currentMatrix, updated, headerRowIdx, respectFileEntities);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs cursor-pointer"
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
                      <label className="text-gray-400 block mb-1 text-[11px]">Columna Apellidos / Paterno</label>
                      <select
                        value={columnMapping.colPaterno}
                        onChange={(e) => {
                          const updated = { ...columnMapping, colPaterno: Number(e.target.value) };
                          setColumnMapping(updated);
                          if (currentMatrix.length > 0) {
                            processMatrix(currentMatrix, updated, headerRowIdx, respectFileEntities);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs cursor-pointer"
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
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-black/40 border-amber-500/40 cursor-pointer"
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
                  <span className="font-semibold text-white flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {respectFileEntities
                        ? 'Respetando Matrícula y Entidades del archivo original (.xls)'
                        : `Asignando a: ${selectedCarreraObj.nombre}`}
                    </span>
                  </span>
                  <span className="text-[11px]">
                    Mostrando: <strong className="text-blue-400 uppercase">{filterView}</strong> ({filteredRows.length})
                  </span>
                </div>

                <div className="border border-white/10 rounded-2xl overflow-hidden max-h-72 overflow-y-auto bg-black/40 shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#111827] sticky top-0 border-b border-white/10 text-gray-400 text-[11px]">
                      <tr>
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5">Matrícula</th>
                        <th className="p-2.5">Nombre Completo</th>
                        <th className="p-2.5">Licenciatura</th>
                        <th className="p-2.5">Grupo / Semestre</th>
                        <th className="p-2.5">Sede</th>
                        <th className="p-2.5">Tutor Titular</th>
                        <th className="p-2.5">Contraseña Asignada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[11px]">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-gray-500">
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
                            <td className="p-2.5 text-center font-mono text-gray-400 text-[10px]">
                              {r.index}
                            </td>
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
                              <span className="font-bold text-emerald-300">{r.matricula}</span>
                              {r.isMatriculaGenerated ? (
                                <span className="ml-1.5 text-[9px] text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 font-semibold" title="No venía en el archivo; generada automáticamente">
                                  ⚠️ auto
                                </span>
                              ) : (
                                <span className="ml-1.5 text-[9px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40 font-bold" title="Matrícula leída directamente de tu archivo .xls/.csv">
                                  ✓ del archivo
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
                Total a procesar:{' '}
                <strong className="text-white">
                  {updateExisting ? validCount + existsCount : validCount}
                </strong>{' '}
                alumnos en orden original.
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
                    Confirmar e Importar {updateExisting ? validCount + existsCount : validCount} Alumnos
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
