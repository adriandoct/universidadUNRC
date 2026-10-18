"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Search,
  Send,
  Sparkles,
  RefreshCw,
  Calendar,
  Star,
  Award,
  Plus,
  Trash2,
  Download,
  Filter,
  BarChart3,
  TrendingUp,
  UserCheck,
  Zap,
  Info,
  Barcode,
  Camera,
  CameraOff,
  Check,
  BookOpen,
  Volume2,
  Usb,
  Sparkle,
  Table,
  ExternalLink,
  Copy,
  UploadCloud,
  FileSpreadsheet,
  Code2,
  Settings
} from 'lucide-react';
import { db, Participacion, Asistencia, Alumno } from '@/lib/db';
import { getTijuanaDateString } from '@/lib/tijuanaTime';
import { playChime } from '@/lib/voiceAssistant';
import {
  findGoogleSheetConfig,
  formatDateColumnLabel,
  encodeRecordToSheetCode,
  sendAttendanceUpdateToGoogleSheet,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  CourseGoogleSheetConfig,
  OFFICIAL_GOOGLE_SHEETS_REGISTRY,
  syncLacMatematicasSheet,
  seedHospedajeDataSync,
  seedLcdnStudentsSync,
  LAC_GOOGLE_SHEET_URL,
  LAC_CLASS_DATES,
  exportGroupSecondaryBackupExcel,
  formatDatePill
} from '@/lib/googleSheetsSync';
import AttendanceCalendarHistory from './AttendanceCalendarHistory';
import GroupBackupSpreadsheet from './GroupBackupSpreadsheet';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';

export type AttendanceStatusType = 'present' | 'absent' | 'late' | 'excused';
export type ParticipationType = 'AP' | 'RP' | 'REGULAR' | 'NINGUNA';

export interface StudentItem {
  id: string;
  name: string;
  student_code: string;
  notes?: string;
}

interface AttendanceSheetProps {
  courseId: string;
  courseName: string;
  courseMateria?: string;
  courseGrupo?: string;
  scheduleDescription?: string;
  students: StudentItem[];
  allCoursesList?: Array<{ id: string; materia: string; grupo: string; carrera?: string }>;
  onAttendanceSubmitted?: () => void;
}

export default function AttendanceSheet({
  courseId,
  courseName,
  courseMateria,
  courseGrupo,
  scheduleDescription = 'Lunes a Sábado',
  students,
  allCoursesList = [],
  onAttendanceSubmitted,
}: AttendanceSheetProps) {
  // Current active view tab
  const [activeTab, setActiveTab] = useState<'sheet' | 'board' | 'calendar' | 'spreadsheet'>('sheet');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTijuanaDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [allCourseAsistencias, setAllCourseAsistencias] = useState<Asistencia[]>([]);

  // Materia activa para atribución estricta de participaciones por materia
  const [activeMateria, setActiveMateria] = useState<string>(() => courseMateria || courseName);

  useEffect(() => {
    if (courseMateria) setActiveMateria(courseMateria);
    else if (courseName) setActiveMateria(courseName);
  }, [courseMateria, courseName]);

  // Daily student states for attendance & participation
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { status: AttendanceStatusType; participation: ParticipationType; notes: string }>
  >(() => {
    const initial: Record<string, { status: AttendanceStatusType; participation: ParticipationType; notes: string }> = {};
    students.forEach((s) => {
      initial[s.id] = { status: 'present', participation: 'NINGUNA', notes: '' };
    });
    return initial;
  });

  // Global historical participations for this course & materia
  const [allParticipaciones, setAllParticipaciones] = useState<Participacion[]>([]);
  const [filterBoardDate, setFilterBoardDate] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [barcodeFeedback, setBarcodeFeedback] = useState<string | null>(null);

  // Estados avanzados del Lector de Código de Barras
  const [barcodeMode, setBarcodeMode] = useState<'participacion' | 'asistencia'>('participacion');
  const [barcodePoints, setBarcodePoints] = useState<'AP' | 'REGULAR' | 'RP'>('AP');
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  const [allAlumnosList, setAllAlumnosList] = useState<Alumno[]>([]);
  const [recentScans, setRecentScans] = useState<
    Array<{ id: string; student: StudentItem; points: number; tipo: string; materia: string; time: string }>
  >([]);

  const cameraScannerRef = useRef<any>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Cargar catálogo de alumnos UNRC para búsqueda exhaustiva por código de barras
  useEffect(() => {
    db.getAlumnos().then((list) => setAllAlumnosList(list || [])).catch(() => {});
  }, []);

  // =========================================================================
  // CONFIGURACIÓN Y ESTADOS PARA GOOGLE SHEETS MULTI-MATERIA
  // =========================================================================
  const currentSheetConfig = useMemo(() => {
    return findGoogleSheetConfig(activeMateria || courseMateria, courseGrupo, courseName);
  }, [activeMateria, courseMateria, courseGrupo, courseName]);

  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [isUpdatingSheet, setIsUpdatingSheet] = useState(false);
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [copiedColumn, setCopiedColumn] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [modalTab, setModalTab] = useState<'preview' | 'script' | 'webhook'>('preview');
  const [webhookUrlInput, setWebhookUrlInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('unrc_sheets_webhook_url') || '';
    }
    return '';
  });
  const [lastUpdateStats, setLastUpdateStats] = useState<{
    fechaColumna: string;
    copyableColumn: string;
    totalAlumnos: number;
    records: Array<{ num?: number; nombre: string; matricula: string; codigo: string; estadoAsistencia: string; participacion: string; puntos?: number }>;
    webhookCalled: boolean;
    sheetUrl: string;
  } | null>(null);

  const handleSaveWebhook = (url: string) => {
    setWebhookUrlInput(url);
    if (typeof window !== 'undefined') {
      localStorage.setItem('unrc_sheets_webhook_url', url.trim());
    }
    setFeedback({
      type: 'success',
      message: '⚙️ URL de Webhook de Google Sheets guardada exitosamente.',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdateGoogleSheet = async (auto = false) => {
    if (!currentSheetConfig) return;
    setIsUpdatingSheet(true);
    try {
      const records = students.map((st, idx) => {
        const state = attendanceState[st.id] || { status: 'present', participation: 'NINGUNA', notes: '' };
        const stParts = allParticipaciones.filter(
          (p) => (p.alumno_id === st.id || p.alumno_id === st.student_code) && p.fecha === selectedDate
        );
        const isDouble = stParts.length >= 2 || (state.participation === 'AP' && stParts.length >= 2);
        const code = encodeRecordToSheetCode(state.status, state.participation, isDouble);

        return {
          num: idx + 1,
          nombre: st.name,
          matricula: st.student_code,
          codigo: code,
          estadoAsistencia: state.status,
          participacion: state.participation,
          puntos: isDouble ? 20 : state.participation === 'AP' ? 10 : state.participation === 'RP' ? 5 : state.participation === 'REGULAR' ? 7.5 : 0,
          observaciones: state.notes,
        };
      });

      const res = await sendAttendanceUpdateToGoogleSheet({
        config: currentSheetConfig,
        fecha: selectedDate,
        records,
        webhookUrl: webhookUrlInput || undefined,
      });

      setLastUpdateStats({
        fechaColumna: res.fechaColumna,
        copyableColumn: res.copyableColumn,
        totalAlumnos: records.length,
        records,
        webhookCalled: res.webhookCalled,
        sheetUrl: res.sheetUrl,
      });

      if (!auto) {
        setIsGoogleSheetModalOpen(true);
      }

      playChime('success');
      setFeedback({
        type: 'success',
        message: `📊 Google Sheets actualizado: ${records.length} alumnos registrados para ${res.fechaColumna} en "${currentSheetConfig.materia}".`,
      });
      setTimeout(() => setFeedback(null), 8000);
    } catch (err: any) {
      console.error('Error al actualizar Google Sheet:', err);
      setFeedback({
        type: 'error',
        message: `❌ Error al actualizar Google Sheets: ${err?.message || err}`,
      });
    } finally {
      setIsUpdatingSheet(false);
    }
  };

  const isLacMatematicas = useMemo(() => {
    return currentSheetConfig?.id === 'lac_matematicas';
  }, [currentSheetConfig]);

  const handleSyncGoogleSheet = async () => {
    setIsSyncingSheet(true);
    try {
      let res;
      if (currentSheetConfig?.id === 'hospedaje') {
        res = seedHospedajeDataSync(true);
      } else if (currentSheetConfig?.id === 'lac_matematicas') {
        res = await syncLacMatematicasSheet(true);
      } else {
        seedLcdnStudentsSync();
        res = {
          success: true,
          message: `Sincronizados exitosamente los alumnos y registros oficiales de "${currentSheetConfig?.materia || activeMateria}".`
        };
      }
      playChime('success');
      try {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (_) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('unrc-sync-complete'));
      }

      await reloadData();
      const updatedList = await db.getAlumnos();
      setAllAlumnosList(updatedList || []);

      setFeedback({
        type: 'success',
        message: `📊 ${res.message}`
      });
      setTimeout(() => setFeedback(null), 8000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `❌ Error sincronizando con Google Sheets: ${err?.message || err}`
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Handlers for sheet row updates
  const handleStatusChange = (studentId: string, status: AttendanceStatusType) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleParticipationChange = (studentId: string, participation: ParticipationType) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], participation },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
  };

  // Load existing attendances and participations whenever courseId or selectedDate changes
  const reloadData = async () => {
    try {
      const [asistenciasList, participacionesList] = await Promise.all([
        db.getAsistencias(),
        db.getParticipaciones(),
      ]);

      // Filter participations relevant to this course and materia
      const courseParticipaciones = participacionesList.filter((p) => {
        if (p.curso_id === courseId || p.grupo_id === courseId) return true;
        if (activeMateria && p.materia && p.materia.trim().toLowerCase() === activeMateria.trim().toLowerCase()) return true;
        if (courseMateria && p.materia && p.materia.trim().toLowerCase() === courseMateria.trim().toLowerCase()) return true;
        return !p.curso_id && !p.materia;
      });
      setAllParticipaciones(courseParticipaciones);

      // Guardar asistencias completas del curso para el calendario y la hoja de cálculo
      const courseAsistencias = asistenciasList.filter((a) => {
        if (a.grupo_id === courseId || (a as any).curso_id === courseId) return true;
        if (courseGrupo && a.grupo_id === courseGrupo) return true;
        if (activeMateria && (a as any).materia && (a as any).materia.trim().toLowerCase() === activeMateria.trim().toLowerCase()) return true;
        if (courseMateria && (a as any).materia && (a as any).materia.trim().toLowerCase() === courseMateria.trim().toLowerCase()) return true;
        return false;
      });
      setAllCourseAsistencias(courseAsistencias);

      // Pre-populate sheet if records already exist for selectedDate
      const dateAsistencias = asistenciasList.filter(
        (a) =>
          a.fecha === selectedDate &&
          (a.grupo_id === courseId ||
            (a as any).curso_id === courseId ||
            (courseGrupo && a.grupo_id === courseGrupo) ||
            (activeMateria && (a as any).materia === activeMateria) ||
            (courseMateria && (a as any).materia === courseMateria))
      );
      const dateParticipaciones = courseParticipaciones.filter(
        (p) => p.fecha === selectedDate
      );

      const statusReverseMap: Record<string, AttendanceStatusType> = {
        A: 'present',
        R: 'late',
        F: 'absent',
        J: 'excused',
      };

      const nextState: Record<string, { status: AttendanceStatusType; participation: ParticipationType; notes: string }> = {};

      students.forEach((st) => {
        const existingAtt = dateAsistencias.find(
          (a) => a.alumno_id === st.id || a.alumno?.matricula === st.student_code || a.alumno_id === st.student_code
        );
        const existingPart = dateParticipaciones.find(
          (p) => p.alumno_id === st.id || p.alumno?.matricula === st.student_code || p.alumno_id === st.student_code
        );

        nextState[st.id] = {
          status: existingAtt && existingAtt.estado ? statusReverseMap[existingAtt.estado] || 'present' : 'present',
          participation: existingPart ? existingPart.tipo : 'NINGUNA',
          notes: existingAtt?.observaciones || existingPart?.observaciones || '',
        };
      });

      setAttendanceState(nextState);
    } catch (err) {
      console.warn('Notice loading attendances/participaciones:', err);
    }
  };

  useEffect(() => {
    reloadData();
  }, [courseId, selectedDate, students, activeMateria]);

  // Función universal para registrar participación vía código de barras
  const handleRegisterBarcodeParticipation = async (
    student: StudentItem,
    pointsType: 'AP' | 'REGULAR' | 'RP',
    targetMateria: string,
    isExternal: boolean = false
  ) => {
    const puntos = pointsType === 'AP' ? 10 : pointsType === 'RP' ? 5 : 7.5;
    const tipoLabel = pointsType === 'AP' ? 'Excelente (+10 pts)' : pointsType === 'RP' ? 'Mínima (+5 pts)' : 'Buena (+7.5 pts)';
    const nota = `Participación en clase (${targetMateria})`;

    // 1. Actualizar estado diario de asistencia y participación
    setAttendanceState((prev) => ({
      ...prev,
      [student.id]: {
        ...(prev[student.id] || { status: 'present', notes: '' }),
        status: 'present',
        participation: pointsType,
        notes: prev[student.id]?.notes || nota,
      },
    }));

    // 2. Persistir en base de datos con acumulación y materia específica
    try {
      await db.registrarParticipacion(
        student.id,
        pointsType,
        nota,
        selectedDate,
        courseId,
        targetMateria,
        true // acumular
      );
    } catch (err) {
      console.warn('Error guardando en db:', err);
    }

    // 3. Efectos auditivos y visuales
    playChime('success');
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (_) {}

    // 4. Resaltar renglón y scroll suave
    setHighlightedStudentId(student.id);
    setTimeout(() => setHighlightedStudentId(null), 5000);
    const el = document.getElementById(`student-row-${student.id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 5. Toast feedback
    const extText = isExternal ? ' (Registrado en UNRC)' : '';
    setBarcodeFeedback(`⭐ ¡Participación registrada! ${student.name} (${student.student_code})${extText} • ${tipoLabel} en ${targetMateria}`);
    setTimeout(() => setBarcodeFeedback(null), 6000);

    // 6. Agregar al historial reciente de escaneos
    setRecentScans((prev) => [
      {
        id: `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        student,
        points: puntos,
        tipo: pointsType,
        materia: targetMateria,
        time: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
      ...prev,
    ].slice(0, 15));

    // 7. Recargar datos del curso
    await reloadData();
  };

  // Función procesadora de cualquier escaneo (USB, Cámara o Manual)
  const handleBarcodeScanned = async (code: string, origin: string = 'Lector de Código de Barras USB') => {
    const raw = code.trim();
    if (!raw) return;

    const clean = raw.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');

    // Buscar en la lista de alumnos del curso activo
    let matched = students.find((s) => {
      const sCode = s.student_code.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      const sId = s.id.toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
      return sCode === clean || sId === clean || s.student_code.toUpperCase() === raw.toUpperCase();
    });

    let isExternalStudent = false;

    // Si no está en el grupo activo, buscar en toda la base de datos de alumnos UNRC
    if (!matched && allAlumnosList.length > 0) {
      const dbMatch = allAlumnosList.find((al) => {
        const m = (al.matricula || '').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
        const id = (al.id || '').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
        const qr = (al.qr_code || '').toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
        return m === clean || id === clean || qr === clean || al.matricula?.toUpperCase() === raw.toUpperCase();
      });

      if (dbMatch) {
        matched = {
          id: dbMatch.id,
          name: `${dbMatch.nombre} ${dbMatch.apellido_paterno} ${dbMatch.apellido_materno || ''}`.trim(),
          student_code: dbMatch.matricula,
          notes: `${dbMatch.grado || ''} • ${dbMatch.carrera || ''}`.trim(),
        };
        isExternalStudent = true;
      }
    }

    if (!matched) {
      playChime('error');
      setBarcodeFeedback(`⚠️ Código no reconocido: "${raw}". Verifica que la matrícula esté registrada en UNRC.`);
      setTimeout(() => setBarcodeFeedback(null), 5000);
      return;
    }

    // Alumno encontrado
    if (barcodeMode === 'participacion') {
      await handleRegisterBarcodeParticipation(matched, barcodePoints, activeMateria, isExternalStudent);
    } else {
      // Modo Asistencia tradicional
      handleStatusChange(matched.id, 'present');
      setHighlightedStudentId(matched.id);
      setTimeout(() => setHighlightedStudentId(null), 4000);
      playChime('success');
      setBarcodeFeedback(`✅ Lector (${origin}): Asistencia confirmada para ${matched.name} (${matched.student_code})`);
      setTimeout(() => setBarcodeFeedback(null), 4500);

      const el = document.getElementById(`student-row-${matched.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Escucha activa de Lector de Código de Barras USB / Inalámbrico en clase
  useEffect(() => {
    let buffer = '';
    let lastTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isManualInput = target && target.id === 'barcode-scanner-manual-input';
      const isOtherInput = target && !isManualInput && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      const now = Date.now();
      const diff = now - lastTime;
      lastTime = now;

      if (e.key === 'Enter') {
        const raw = isManualInput ? manualBarcodeInput.trim() : buffer.trim();
        buffer = '';

        if (raw.length >= 2) {
          e.preventDefault();
          if (isManualInput) setManualBarcodeInput('');
          handleBarcodeScanned(raw, 'Lector de Código de Barras Físico');
        }
        return;
      }

      if (e.key === 'Escape') {
        buffer = '';
        return;
      }

      // Si el usuario está tecleando en otro input a velocidad humana (> 130ms), no interferir
      if (isOtherInput && diff > 130) {
        buffer = '';
        return;
      }

      if (e.key.length === 1) {
        if (diff > 120) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [students, allAlumnosList, barcodeMode, barcodePoints, activeMateria, manualBarcodeInput]);

  // Manejo de Cámara para escaneo de códigos de barra y QR
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      if (cameraScannerRef.current) {
        try {
          await cameraScannerRef.current.stop();
        } catch (_) {}
      }

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ];

      const scanner = new Html5Qrcode('attendance-camera-reader', {
        formatsToSupport,
        verbose: false,
      });
      cameraScannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 260, height: 160 } },
        async (decodedText) => {
          handleBarcodeScanned(decodedText, 'Cámara en Vivo');
        },
        () => {}
      );
    } catch (err) {
      console.warn('Error iniciando cámara:', err);
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (cameraScannerRef.current) {
      try {
        if (cameraScannerRef.current.isScanning) {
          await cameraScannerRef.current.stop();
        }
      } catch (_) {}
      cameraScannerRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (cameraScannerRef.current) {
        try {
          if (cameraScannerRef.current.isScanning) {
            cameraScannerRef.current.stop();
          }
        } catch (_) {}
      }
    };
  }, []);

  // Quick Live Participation Modal State (antiguo)
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [quickStudentId, setQuickStudentId] = useState<string>('');
  const [quickType, setQuickType] = useState<'AP' | 'RP' | 'REGULAR'>('AP');
  const [quickNote, setQuickNote] = useState('');



  const handleMarkAllStatus = (status: AttendanceStatusType) => {
    setAttendanceState((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], status };
      });
      return updated;
    });
  };

  const handleMarkAllParticipation = (participation: ParticipationType) => {
    setAttendanceState((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { ...updated[id], participation };
      });
      return updated;
    });
  };

  // Submit Daily Attendance + Daily Participations safely to db
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const statusMap: Record<AttendanceStatusType, 'A' | 'R' | 'F' | 'J'> = {
        present: 'A',
        late: 'R',
        absent: 'F',
        excused: 'J',
      };

      const attendanceRecords = Object.entries(attendanceState).map(([student_id, data]) => ({
        alumno_id: student_id,
        estado: statusMap[data.status] || 'A',
        fecha: selectedDate,
        curso_id: courseId,
        materia: courseName,
        observaciones: data.notes || undefined,
      }));

      const participationRecords = Object.entries(attendanceState).map(([student_id, data]) => ({
        alumno_id: student_id,
        tipo: data.participation,
        fecha: selectedDate,
        curso_id: courseId,
        materia: courseName,
        observaciones: data.notes || undefined,
      }));

      // 1. Save Attendance in batch
      await db.registrarAsistenciasLote(attendanceRecords);

      // 2. Save Participations in batch
      const partsCount = await db.registrarParticipacionesLote(participationRecords);

      // 3. Reload historical data
      await reloadData();

      // 4. Auto-actualizar Google Sheets si el curso cuenta con hoja oficial configurada
      if (currentSheetConfig) {
        handleUpdateGoogleSheet(true);
      }

      // Feedback message
      const partsMessage = partsCount > 0 ? ` y ${partsCount} participaciones evaluadas` : '';
      const sheetNotice = currentSheetConfig ? ` • Actualización enviada a Google Sheets (${currentSheetConfig.materia})` : '';
      setFeedback({
        type: 'success',
        message: `✅ Asistencia de ${students.length} alumnos${partsMessage} guardada exitosamente para el día ${selectedDate}.${sheetNotice}`,
      });

      if (onAttendanceSubmitted) onAttendanceSubmitted();
    } catch (err: any) {
      console.error('Error saving attendance/participaciones:', err);
      setFeedback({
        type: 'error',
        message: `❌ Error al guardar registros: ${err?.message || 'Error desconocido'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit single live participation from modal
  const handleQuickParticipationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStudentId) return;

    try {
      await db.registrarParticipacion(
        quickStudentId,
        quickType,
        quickNote.trim() || undefined,
        selectedDate,
        courseId,
        courseName
      );

      // Sync local sheet state as well
      setAttendanceState((prev) => ({
        ...prev,
        [quickStudentId]: {
          ...(prev[quickStudentId] || { status: 'present', notes: '' }),
          participation: quickType,
          notes: quickNote || prev[quickStudentId]?.notes || '',
        },
      }));

      await reloadData();
      setIsQuickModalOpen(false);
      setQuickNote('');
      setFeedback({
        type: 'success',
        message: `⭐ Participación registrada exitosamente para el día ${selectedDate}.`,
      });
    } catch (err: any) {
      alert(`Error al registrar participación: ${err?.message || err}`);
    }
  };

  // Delete participation record
  const handleDeleteParticipation = async (id: string) => {
    if (!confirm('¿Deseas eliminar este registro de participación?')) return;
    try {
      await db.eliminarParticipacion(id);
      await reloadData();
      setFeedback({
        type: 'info',
        message: '🗑️ Registro de participación eliminado.',
      });
    } catch (err: any) {
      alert(`Error: ${err?.message || err}`);
    }
  };

  // Export Daily Participations to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredBoardParticipaciones.map((p) => ({
        Fecha: p.fecha,
        Alumno: p.alumno ? `${p.alumno.nombre} ${p.alumno.apellido_paterno}` : p.alumno_id,
        Matrícula: p.alumno?.matricula || p.alumno_id,
        Curso: courseName,
        'Tipo de Participación':
          p.tipo === 'AP' ? 'Aprobada / Excelente (10 pts)' : p.tipo === 'RP' ? 'Por Mejorar (5 pts)' : 'Regular (7.5 pts)',
        Puntos: p.puntos,
        Observaciones: p.observaciones || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Participaciones');
      XLSX.writeFile(wb, `Participaciones_${courseName.slice(0, 20)}_${selectedDate}.xlsx`);
    } catch (err) {
      console.error('Error exportando a Excel:', err);
    }
  };

  // Filtered lists
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBoardParticipaciones = useMemo(() => {
    if (filterBoardDate === 'all') return allParticipaciones;
    return allParticipaciones.filter((p) => p.fecha === filterBoardDate);
  }, [allParticipaciones, filterBoardDate]);

  // Ranking of top students with participations in this course
  const studentRankings = useMemo(() => {
    const stats: Record<string, { student: StudentItem; totalPoints: number; count: number }> = {};

    students.forEach((st) => {
      stats[st.id] = { student: st, totalPoints: 0, count: 0 };
    });

    allParticipaciones.forEach((p) => {
      const targetId = Object.keys(stats).find(
        (id) => id === p.alumno_id || stats[id].student.student_code === p.alumno_id
      );
      if (targetId && stats[targetId]) {
        stats[targetId].totalPoints += p.puntos;
        stats[targetId].count += 1;
      }
    });

    return Object.values(stats).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [students, allParticipaciones]);

  // Available unique dates for filter dropdown
  const uniqueDates = useMemo(() => {
    const dates = new Set(allParticipaciones.map((p) => p.fecha));
    dates.add(selectedDate);
    return Array.from(dates).sort().reverse();
  }, [allParticipaciones, selectedDate]);

  // Counts for current day
  const dailyPresentCount = Object.values(attendanceState).filter((s) => s.status === 'present').length;
  const dailyAbsentCount = Object.values(attendanceState).filter((s) => s.status === 'absent').length;
  const dailyParticipatingCount = Object.values(attendanceState).filter((s) => s.participation !== 'NINGUNA').length;

  return (
    <div className="bg-[#0B132B]/90 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      
      {/* Top Header & Course Details */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Módulo Docente Oficial • Control de Asistencia & Participaciones UNRC</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{courseName}</h2>
          <p className="text-xs text-gray-400 flex items-center space-x-2">
            <span>📍 <strong>Horario:</strong> {scheduleDescription}</span>
          </p>
        </div>

        {/* Date Selector con Zona Horaria Tijuana */}
        <div className="flex items-center space-x-3 bg-black/60 px-4 py-2 rounded-2xl border border-blue-500/30 shadow-inner">
          <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] font-extrabold text-blue-300 uppercase tracking-wider">
              Fecha de Sesión (Tijuana)
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BANNER: SINCRONIZACIÓN OFICIAL GOOGLE SHEETS (LAC MATEMÁTICAS)           */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* BANNER: SINCRONIZACIÓN Y ACTUALIZACIÓN OFICIAL GOOGLE SHEETS              */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* BANNER: SINCRONIZACIÓN OFICIAL GOOGLE SHEETS (IDÉNTICO EN TODAS LAS CLASES) */}
      {/* ========================================================================= */}
      {Boolean(currentSheetConfig) && currentSheetConfig && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#072418] via-[#0B3524] to-[#0A2640] border border-emerald-500/40 shadow-2xl space-y-3.5 transition-all">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* Lado Izquierdo: Icono Verde, Título, Badge y Subtítulo */}
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-inner">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                    HOJA OFICIAL DE ASISTENCIAS & PARTICIPACIONES EN GOOGLE SHEETS
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{currentSheetConfig.badgeLabel}</span>
                  </span>
                </div>
                <p className="text-[11px] text-gray-200/90 pt-0.5">
                  Grupo {currentSheetConfig.grupo} • {currentSheetConfig.materia} • {currentSheetConfig.docenteNombre}
                </p>
              </div>
            </div>

            {/* Lado Derecho: Los 2 Botones EXACTOS a la Captura */}
            <div className="flex items-center space-x-2.5 self-stretch sm:self-auto">
              
              {/* BOTÓN 1: Sincronizar Google Sheet (Verde brillante con resplandor) */}
              <button
                type="button"
                onClick={handleSyncGoogleSheet}
                disabled={isSyncingSheet}
                className="px-4 py-2.5 rounded-2xl bg-[#00E599] hover:bg-[#00c985] text-black font-black text-xs shadow-lg shadow-emerald-500/30 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                title="Sincronizar y actualizar registros oficiales con Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-black ${isSyncingSheet ? 'animate-spin' : ''}`} />
                <span>{isSyncingSheet ? 'Sincronizando...' : 'Sincronizar Google Sheet'}</span>
              </button>

              {/* BOTÓN 2: Ver Hoja Google (Botón oscuro con borde esmeralda) */}
              <a
                href={currentSheetConfig.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-2xl bg-black/60 hover:bg-black/80 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer"
                title="Abrir la hoja de cálculo de Google Sheets en una nueva pestaña"
              >
                <span>Ver Hoja Google</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              </a>

            </div>

          </div>

          {/* Fila Inferior: FECHAS DE CLASE (N) con los Chips Idénticos */}
          {currentSheetConfig.classDates && currentSheetConfig.classDates.length > 0 && (
            <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-emerald-400 mr-1 flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> FECHAS DE CLASE ({currentSheetConfig.classDates.length}):
              </span>
              {currentSheetConfig.classDates.map((fStr) => {
                const isSelected = selectedDate === fStr;
                const label = formatDatePill(fStr);
                return (
                  <button
                    key={fStr}
                    type="button"
                    onClick={() => setSelectedDate(fStr)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00E599] text-black font-black shadow-md shadow-emerald-500/40 ring-2 ring-white scale-105'
                        : 'bg-black/60 hover:bg-emerald-950/60 text-emerald-200 border border-emerald-500/20 font-bold'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BARRA: LECTOR DE CÓDIGO DE BARRAS & PARTICIPACIONES POR MATERIA          */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#0D182E] via-[#092238] to-[#0A2E22] border border-amber-500/30 shadow-2xl space-y-3.5">
        
        {/* Fila 1: Indicador de Hardware, Modo del Lector y Acciones */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-inner">
              <Barcode className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-white tracking-wide uppercase">
                  Lector de Código de Barras
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-0.5"></span>
                  <span>USB / Pistola Activa</span>
                </span>
              </div>
              <p className="text-[11px] text-gray-300">
                Pasa la credencial o código de barras para calificar la participación por materia.
              </p>
            </div>
          </div>

          {/* Toggle de Modo: Participación vs Asistencia */}
          <div className="flex items-center space-x-2 self-stretch sm:self-auto">
            <div className="inline-flex p-1 rounded-2xl bg-black/60 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBarcodeMode('participacion')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                  barcodeMode === 'participacion'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black shadow-lg shadow-amber-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>⭐ Modo Participación</span>
              </button>

              <button
                type="button"
                onClick={() => setBarcodeMode('asistencia')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                  barcodeMode === 'asistencia'
                    ? 'bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>📋 Modo Asistencia</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsBarcodeModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-cyan-600/20 cursor-pointer shrink-0"
              title="Abrir consola de escáner con cámara y visor"
            >
              <Camera className="w-4 h-4" />
              <span>Consola & Cámara</span>
            </button>
          </div>

        </div>

        {/* Fila 2: Selector de Materia, Puntos a Asignar e Input Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1 border-t border-white/5">
          
          {/* Materia para Atribución */}
          <div className="md:col-span-5 flex items-center space-x-2">
            <label className="text-[11px] font-bold text-gray-300 flex items-center space-x-1 shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Materia:</span>
            </label>

            {allCoursesList && allCoursesList.length > 0 ? (
              <select
                value={activeMateria}
                onChange={(e) => setActiveMateria(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black/70 border border-amber-500/30 text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-400"
              >
                <option value={courseMateria || courseName}>
                  {courseMateria || courseName} (Curso Actual)
                </option>
                {allCoursesList
                  .filter((c) => c.materia !== (courseMateria || courseName))
                  .map((c) => (
                    <option key={c.id} value={c.materia}>
                      {c.materia} (Grupo {c.grupo})
                    </option>
                  ))}
              </select>
            ) : (
              <div className="px-3 py-1 rounded-xl bg-black/60 border border-amber-500/30 text-amber-300 text-xs font-bold truncate">
                {activeMateria}
              </div>
            )}
          </div>

          {/* Selector de Puntos (solo en modo participación) */}
          {barcodeMode === 'participacion' ? (
            <div className="md:col-span-4 flex items-center space-x-1.5">
              <span className="text-[11px] text-gray-300 font-bold shrink-0">Puntos:</span>
              <button
                type="button"
                onClick={() => setBarcodePoints('AP')}
                className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  barcodePoints === 'AP'
                    ? 'bg-amber-500 text-black border-amber-400 font-black shadow-md'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                +10 (Excelente)
              </button>
              <button
                type="button"
                onClick={() => setBarcodePoints('REGULAR')}
                className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  barcodePoints === 'REGULAR'
                    ? 'bg-blue-500 text-white border-blue-400 font-black shadow-md'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                +7.5 (Buena)
              </button>
              <button
                type="button"
                onClick={() => setBarcodePoints('RP')}
                className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  barcodePoints === 'RP'
                    ? 'bg-orange-500 text-white border-orange-400 font-black shadow-md'
                    : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                +5 (Mínima)
              </button>
            </div>
          ) : (
            <div className="md:col-span-4 text-[11px] text-emerald-300 font-semibold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Escaneo registrará asistencia (Presente)</span>
            </div>
          )}

          {/* Input Manual / Pistola USB enfocado */}
          <div className="md:col-span-3 flex items-center space-x-1.5">
            <div className="relative w-full">
              <Barcode className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
              <input
                id="barcode-scanner-manual-input"
                ref={barcodeInputRef}
                type="text"
                value={manualBarcodeInput}
                onChange={(e) => setManualBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (manualBarcodeInput.trim().length >= 2) {
                      handleBarcodeScanned(manualBarcodeInput.trim(), 'Entrada Rápida');
                      setManualBarcodeInput('');
                    }
                  }
                }}
                placeholder="Escanear o teclear matrícula..."
                className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder-gray-500 text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (manualBarcodeInput.trim().length >= 2) {
                  handleBarcodeScanned(manualBarcodeInput.trim(), 'Entrada Rápida');
                  setManualBarcodeInput('');
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold cursor-pointer"
            >
              OK
            </button>
          </div>

        </div>

      </div>

      {/* Navigation Tabs (Asistencia vs Tablero vs Calendario vs Hoja de Cálculo) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/5 pb-2">
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'sheet'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>📋 Toma Diaria</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'calendar'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30 font-black'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-4 h-4 text-cyan-300" />
            <span>📅 Historial en Calendario</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('spreadsheet')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'spreadsheet'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black shadow-lg shadow-emerald-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>📑 Hoja de Cálculo (Respaldo)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'board'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>⭐ Participaciones</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] font-mono text-amber-200">
              {allParticipaciones.length}
            </span>
          </button>
        </div>

        {/* Live Counters */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{dailyPresentCount} Presentes</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>{dailyAbsentCount} Ausentes</span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{dailyParticipatingCount} Participando Hoy</span>
          </div>
        </div>
      </div>

      {/* Barcode scanner live feedback toast */}
      {barcodeFeedback && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-fade-in">
          <div className="flex items-center space-x-2.5">
            <Barcode className="w-4 h-4 text-emerald-400" />
            <span>{barcodeFeedback}</span>
          </div>
          <button onClick={() => setBarcodeFeedback(null)} className="text-gray-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold border flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : feedback.type === 'error'
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-white text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TOMA DIARIA (ASISTENCIA + PARTICIPACIÓN POR ALUMNO)                 */}
      {/* ========================================================================= */}
      {activeTab === 'sheet' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Controls Bar: Search & Bulk Presets */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por estudiante o matrícula en este curso..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Bulk Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkAllStatus('present')}
                className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
                title="Marcar a todos como presentes en la fecha actual"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Todos Presentes</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAllStatus('absent')}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center space-x-1.5"
                title="Marcar a todos como ausentes en la fecha actual"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Todos Ausentes</span>
              </button>

              <button
                type="button"
                onClick={() => handleMarkAllParticipation('NINGUNA')}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-semibold transition-all flex items-center space-x-1.5"
                title="Limpiar participaciones de la fecha actual"
              >
                <span>Limpiar Participaciones</span>
              </button>
            </div>
          </div>

          {/* Form with Attendance + Daily Participation Table */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/80 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Estudiante / Matrícula</th>
                    <th className="p-3.5 text-center">Asistencia del Día</th>
                    <th className="p-3.5 text-center">
                      <span className="flex items-center justify-center space-x-1 text-amber-300">
                        <Star className="w-3 h-3 fill-amber-300" />
                        <span>Participación ({selectedDate})</span>
                      </span>
                    </th>
                    <th className="p-3.5">Observación / Nota</th>
                    <th className="p-3.5 text-center">Ptos. Acumulados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/30">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                        No se encontraron estudiantes para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const currentStatus = attendanceState[st.id]?.status || 'present';
                      const currentPart = attendanceState[st.id]?.participation || 'NINGUNA';
                      const currentNotes = attendanceState[st.id]?.notes || '';

                      // Total participations for this student in this course
                      const studentParts = allParticipaciones.filter(
                        (p) => p.alumno_id === st.id || p.alumno?.matricula === st.student_code
                      );
                      const totalPuntos = studentParts.reduce((acc, curr) => acc + curr.puntos, 0);

                      return (
                        <tr
                          key={st.id}
                          id={`student-row-${st.id}`}
                          className={`transition-all duration-300 ${
                            highlightedStudentId === st.id
                              ? 'bg-amber-500/25 ring-2 ring-amber-400 shadow-xl shadow-amber-500/20'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          
                          {/* Student Info */}
                          <td className="p-3.5">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="font-bold text-white leading-snug">{st.name}</div>
                                <div className="font-mono text-[11px] text-emerald-400 font-semibold mt-0.5 flex items-center space-x-2">
                                  <span>{st.student_code}</span>
                                  {st.notes && <span className="text-gray-500">• {st.notes}</span>}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRegisterBarcodeParticipation(st, barcodePoints, activeMateria)}
                                className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-all text-[10px] font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                                title={`Asignar participación a ${st.name} en ${activeMateria}`}
                              >
                                <Barcode className="w-3.5 h-3.5 text-amber-400" />
                                <span className="hidden sm:inline">+Part.</span>
                              </button>
                            </div>
                          </td>

                          {/* Attendance Status Buttons */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center p-1 rounded-xl bg-black/50 border border-white/10 space-x-1">
                              {/* Presente */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'present')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentStatus === 'present'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                                title="Presente (A)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Presente</span>
                              </button>

                              {/* Tardanza */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'late')}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentStatus === 'late'
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                                title="Tardanza (R)"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Tardanza</span>
                              </button>

                              {/* Ausente */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'absent')}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentStatus === 'absent'
                                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                                title="Ausente (F)"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Ausente</span>
                              </button>

                              {/* Justificado */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(st.id, 'excused')}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentStatus === 'excused'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                                title="Justificado (J)"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Justif.</span>
                              </button>
                            </div>
                          </td>

                          {/* Daily Participation Selector Buttons */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center p-1 rounded-xl bg-black/50 border border-white/10 space-x-1">
                              {/* AP: Aprobada/Excelente (+10) */}
                              <button
                                type="button"
                                onClick={() => handleParticipationChange(st.id, currentPart === 'AP' ? 'NINGUNA' : 'AP')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition-all flex items-center space-x-1 ${
                                  currentPart === 'AP'
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/30 font-black'
                                    : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                                }`}
                                title="Participación Excelente: Aporte destacado (10 pts)"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>Excelente (+10)</span>
                              </button>

                              {/* REGULAR: Buena/Estándar (+7.5) */}
                              <button
                                type="button"
                                onClick={() => handleParticipationChange(st.id, currentPart === 'REGULAR' ? 'NINGUNA' : 'REGULAR')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentPart === 'REGULAR'
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-blue-400/80 hover:text-blue-300 hover:bg-blue-500/10'
                                }`}
                                title="Participación Regular: Buena intervención (7.5 pts)"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Buena (+7.5)</span>
                              </button>

                              {/* RP: Requerido/Por Mejorar (+5) */}
                              <button
                                type="button"
                                onClick={() => handleParticipationChange(st.id, currentPart === 'RP' ? 'NINGUNA' : 'RP')}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                                  currentPart === 'RP'
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'text-orange-400/80 hover:text-orange-300 hover:bg-orange-500/10'
                                }`}
                                title="Participación Mínima: Intervención por mejorar (5 pts)"
                              >
                                <span>Mínima (+5)</span>
                              </button>

                              {/* Ninguna */}
                              {currentPart !== 'NINGUNA' && (
                                <button
                                  type="button"
                                  onClick={() => handleParticipationChange(st.id, 'NINGUNA')}
                                  className="px-1.5 py-1.5 rounded-lg text-[10px] text-gray-400 hover:text-white"
                                  title="Quitar participación de hoy"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Notes */}
                          <td className="p-3.5">
                            <input
                              type="text"
                              value={currentNotes}
                              onChange={(e) => handleNotesChange(st.id, e.target.value)}
                              placeholder="Observación de asistencia o aportación..."
                              className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500"
                            />
                          </td>

                          {/* Historical Total Points */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-xs font-mono font-bold text-amber-300">
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span>{totalPuntos} pts</span>
                              <span className="text-gray-500 font-normal text-[10px]">({studentParts.length})</span>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Submit Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-gray-400">
                Total estudiantes: <strong className="text-white">{students.length}</strong> • 
                Presentes: <strong className="text-emerald-400">{dailyPresentCount}</strong> • 
                Participando hoy: <strong className="text-amber-400">{dailyParticipatingCount}</strong>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || students.length === 0}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 disabled:opacity-50 text-white font-bold text-xs shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando Asistencia & Participaciones...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Guardar Asistencia y Participaciones del Día</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TABLERO & BITÁCORA DE PARTICIPACIONES DIARIAS                      */}
      {/* ========================================================================= */}
      {activeTab === 'board' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Top Board Metrics & Live Add Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 space-y-1">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Aportaciones</span>
                <Star className="w-4 h-4 fill-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {allParticipaciones.length}
              </div>
              <p className="text-[11px] text-gray-400">Registradas en el curso</p>
            </div>

            {/* Metric 2 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 space-y-1">
              <div className="flex items-center justify-between text-blue-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Puntos Promedio</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {allParticipaciones.length > 0
                  ? (allParticipaciones.reduce((a, c) => a + c.puntos, 0) / allParticipaciones.length).toFixed(1)
                  : '10.0'}{' '}
                <span className="text-sm font-normal text-gray-400">/ 10</span>
              </div>
              <p className="text-[11px] text-gray-400">Ponderación oficial: 20%</p>
            </div>

            {/* Metric 3 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 space-y-1">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Alumnos con Aportes</span>
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {new Set(allParticipaciones.map((p) => p.alumno_id)).size}{' '}
                <span className="text-sm font-normal text-gray-400">de {students.length}</span>
              </div>
              <p className="text-[11px] text-gray-400">
                {students.length > 0
                  ? `${Math.round((new Set(allParticipaciones.map((p) => p.alumno_id)).size / students.length) * 100)}% de participación`
                  : '0%'}
              </p>
            </div>

            {/* Quick Live Add Button */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 flex flex-col justify-between space-y-2">
              <div>
                <span className="text-xs font-bold text-amber-300 block">⭐ Registro Rápido en Vivo</span>
                <span className="text-[11px] text-gray-300 block">Premiar intervención en plena clase</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuickStudentId(students[0]?.id || '');
                  setIsQuickModalOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Participación</span>
              </button>
            </div>

          </div>

          {/* Ranking / Podio de Participaciones */}
          <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Ranking de Participación del Grupo</h3>
              </div>
              <span className="text-[11px] text-gray-400">Evaluación continua para el 20% de calificación</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {studentRankings.slice(0, 3).map((rk, idx) => (
                <div
                  key={rk.student.id}
                  className={`p-3.5 rounded-xl border flex items-center space-x-3 ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : idx === 1
                      ? 'bg-slate-400/10 border-slate-400/30 text-slate-200'
                      : 'bg-amber-800/10 border-amber-800/30 text-amber-300'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                      idx === 0
                        ? 'bg-amber-500 text-black'
                        : idx === 1
                        ? 'bg-slate-300 text-black'
                        : 'bg-amber-700 text-white'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="truncate flex-1">
                    <span className="font-bold text-xs text-white block truncate">{rk.student.name}</span>
                    <span className="text-[10px] text-gray-400 block font-mono">{rk.student.student_code}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-sm text-amber-300 block">{rk.totalPoints} pts</span>
                    <span className="text-[10px] text-gray-400 block">{rk.count} interv.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Board Daily Filter & Export Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-blue-400" />
              <label className="text-xs font-bold text-gray-300">Filtrar por Día:</label>
              <select
                value={filterBoardDate}
                onChange={(e) => setFilterBoardDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/60 border border-blue-500/30 text-white text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">📅 Todo el Historial del Curso ({allParticipaciones.length})</option>
                {uniqueDates.map((d) => (
                  <option key={d} value={d}>
                    Día: {d} {d === selectedDate ? '(Seleccionado)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredBoardParticipaciones.length === 0}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar a Excel (.xlsx)</span>
              </button>
            </div>

          </div>

          {/* Participations Historical Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-black/80 text-gray-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Estudiante</th>
                  <th className="p-3.5">Matrícula</th>
                  <th className="p-3.5 text-center">Nivel / Puntos</th>
                  <th className="p-3.5">Observaciones de la Intervención</th>
                  <th className="p-3.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-black/30">
                {filteredBoardParticipaciones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                      No hay participaciones registradas para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredBoardParticipaciones.map((p) => {
                    const studentMatch = students.find(
                      (s) => s.id === p.alumno_id || s.student_code === p.alumno_id
                    );
                    const studentName = p.alumno
                      ? `${p.alumno.nombre} ${p.alumno.apellido_paterno}`
                      : studentMatch?.name || p.alumno_id;
                    const studentCode = p.alumno?.matricula || studentMatch?.student_code || '-';

                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        
                        {/* Fecha */}
                        <td className="p-3.5 font-mono text-blue-300 font-bold">
                          {p.fecha}
                        </td>

                        {/* Estudiante */}
                        <td className="p-3.5 font-bold text-white">
                          {studentName}
                        </td>

                        {/* Matrícula */}
                        <td className="p-3.5 font-mono text-emerald-400 font-semibold">
                          {studentCode}
                        </td>

                        {/* Nivel / Puntos */}
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                              p.tipo === 'AP'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : p.tipo === 'REGULAR'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                            }`}
                          >
                            <Star className="w-3 h-3 fill-current" />
                            <span>
                              {p.tipo === 'AP'
                                ? 'Excelente (+10)'
                                : p.tipo === 'REGULAR'
                                ? 'Buena (+7.5)'
                                : 'Mínima (+5)'}
                            </span>
                          </span>
                        </td>

                        {/* Observaciones */}
                        <td className="p-3.5 text-gray-300 text-xs italic">
                          {p.observaciones || 'Participación en clase'}
                        </td>

                        {/* Acciones */}
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteParticipation(p.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Eliminar esta participación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORIAL EN CALENDARIO INTERACTIVO                                */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <AttendanceCalendarHistory
          courseId={courseId}
          courseName={courseName}
          courseMateria={activeMateria || courseMateria}
          courseGrupo={courseGrupo || currentSheetConfig?.grupo}
          students={students}
          allAsistencias={allCourseAsistencias}
          allParticipaciones={allParticipaciones}
          classDates={currentSheetConfig?.classDates || []}
          currentDate={selectedDate}
          onSelectDateForEditing={(dStr) => {
            setSelectedDate(dStr);
            setActiveTab('sheet');
          }}
          onUpdateGoogleSheetForDate={(dStr) => {
            setSelectedDate(dStr);
            handleUpdateGoogleSheet(false);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HOJA DE CÁLCULO & RESPALDO SECUNDARIO DEL GRUPO                    */}
      {/* ========================================================================= */}
      {activeTab === 'spreadsheet' && (
        <GroupBackupSpreadsheet
          courseId={courseId}
          courseName={courseName}
          courseMateria={activeMateria || courseMateria}
          courseGrupo={courseGrupo || currentSheetConfig?.grupo}
          carrera={currentSheetConfig?.carrera}
          docenteNombre={currentSheetConfig?.docenteNombre}
          ciclo={currentSheetConfig?.ciclo}
          students={students}
          allAsistencias={allCourseAsistencias}
          allParticipaciones={allParticipaciones}
          sheetConfig={currentSheetConfig}
          classDates={currentSheetConfig?.classDates || []}
          onSyncGoogleSheet={handleSyncGoogleSheet}
          onUpdateGoogleSheet={() => handleUpdateGoogleSheet(false)}
          onNavigateToDate={(dStr) => {
            setSelectedDate(dStr);
            setActiveTab('sheet');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* QUICK MODAL: REGISTRAR PARTICIPACIÓN EN VIVO                              */}
      {/* ========================================================================= */}
      {isQuickModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0D1527] border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-white">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Star className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Registrar Participación en Vivo</h3>
                  <p className="text-xs text-gray-400">Fecha de asignación: {selectedDate}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickParticipationSubmit} className="space-y-4">
              {/* Select Student */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Seleccionar Alumno:</label>
                <select
                  value={quickStudentId}
                  onChange={(e) => setQuickStudentId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-amber-400"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.student_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Nivel de Aportación:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickType('AP')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      quickType === 'AP'
                        ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-md font-bold'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Star className="w-4 h-4 mx-auto mb-1 fill-current" />
                    <span className="text-xs block">Excelente</span>
                    <span className="text-[10px] text-amber-400 font-mono">+10 pts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickType('REGULAR')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      quickType === 'REGULAR'
                        ? 'bg-blue-500/25 border-blue-400 text-blue-300 shadow-md font-bold'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs block">Buena</span>
                    <span className="text-[10px] text-blue-400 font-mono">+7.5 pts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickType('RP')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      quickType === 'RP'
                        ? 'bg-orange-500/25 border-orange-400 text-orange-300 shadow-md font-bold'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4 mx-auto mb-1" />
                    <span className="text-xs block">Por Mejorar</span>
                    <span className="text-[10px] text-orange-400 font-mono">+5 pts</span>
                  </button>
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Observación / Detalle:</label>
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Ej: Resolvió ejercicio en pizarrón, aportó al debate..."
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsQuickModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/30 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-black" />
                  <span>Guardar Participación</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONSOLA DE ESCÁNER DE CÓDIGO DE BARRAS & CÁMARA (PARTICIPACIONES)   */}
      {/* ========================================================================= */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0C1527] border border-amber-500/40 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 text-white max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/25 to-yellow-500/15 border border-amber-500/40 text-amber-300 shadow-md">
                  <Barcode className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
                    <span>Consola de Código de Barras</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-mono">
                      UNRC Live
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Escanea con tu lector USB o cámara para calificar participaciones por materia.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsBarcodeModalOpen(false);
                }}
                className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* Configuración Rápida de Atribución */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/50 border border-white/10">
              {/* Materia Activa */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-300 flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Materia a Calificar:</span>
                </label>
                {allCoursesList && allCoursesList.length > 0 ? (
                  <select
                    value={activeMateria}
                    onChange={(e) => setActiveMateria(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/80 border border-amber-500/40 text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value={courseMateria || courseName}>
                      {courseMateria || courseName}
                    </option>
                    {allCoursesList
                      .filter((c) => c.materia !== (courseMateria || courseName))
                      .map((c) => (
                        <option key={c.id} value={c.materia}>
                          {c.materia} (Grupo {c.grupo})
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="px-3 py-2 rounded-xl bg-black/80 border border-amber-500/40 text-amber-300 font-bold text-xs truncate">
                    {activeMateria}
                  </div>
                )}
              </div>

              {/* Modo de Operación */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-300">Modo de Operación:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBarcodeMode('participacion')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                      barcodeMode === 'participacion'
                        ? 'bg-amber-500 text-black font-black shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Participación</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBarcodeMode('asistencia')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                      barcodeMode === 'asistencia'
                        ? 'bg-emerald-500 text-white font-black shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Asistencia</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Nivel de Participación / Puntos */}
            {barcodeMode === 'participacion' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Puntos a otorgar en cada escaneo:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBarcodePoints('AP')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      barcodePoints === 'AP'
                        ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-black shadow-md shadow-amber-500/20'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Star className="w-4 h-4 mx-auto mb-0.5 fill-current" />
                    <span className="text-xs block">Excelente</span>
                    <span className="text-[10px] text-amber-400 font-mono">+10 pts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBarcodePoints('REGULAR')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      barcodePoints === 'REGULAR'
                        ? 'bg-blue-500/25 border-blue-400 text-blue-300 font-black shadow-md shadow-blue-500/20'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4 mx-auto mb-0.5" />
                    <span className="text-xs block">Buena</span>
                    <span className="text-[10px] text-blue-400 font-mono">+7.5 pts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBarcodePoints('RP')}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      barcodePoints === 'RP'
                        ? 'bg-orange-500/25 border-orange-400 text-orange-300 font-black shadow-md shadow-orange-500/20'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4 mx-auto mb-0.5" />
                    <span className="text-xs block">Mínima</span>
                    <span className="text-[10px] text-orange-400 font-mono">+5 pts</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input para Pistola USB / Lectura Manual */}
            <div className="space-y-2 p-4 rounded-2xl bg-black/60 border border-amber-500/30">
              <label className="text-xs font-bold text-amber-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Usb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Lector de Código de Barras USB / Entrada de Teclado:</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Presiona Enter tras escanear</span>
              </label>

              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3.5 top-3 w-5 h-5 text-amber-400" />
                  <input
                    id="barcode-scanner-console-input"
                    type="text"
                    autoFocus
                    value={manualBarcodeInput}
                    onChange={(e) => setManualBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (manualBarcodeInput.trim().length >= 2) {
                          handleBarcodeScanned(manualBarcodeInput.trim(), 'Consola USB');
                          setManualBarcodeInput('');
                        }
                      }
                    }}
                    placeholder="Pasa el lector por la credencial o ingresa matrícula..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-black/80 border border-amber-500/40 text-white placeholder-gray-500 text-sm font-mono font-bold focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (manualBarcodeInput.trim().length >= 2) {
                      handleBarcodeScanned(manualBarcodeInput.trim(), 'Consola USB');
                      setManualBarcodeInput('');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
                >
                  Registrar
                </button>
              </div>
            </div>

            {/* Alternar Cámara Web / Móvil */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Escáner por Cámara de Dispositivo (QR & Barras):</span>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    if (isCameraActive) stopCamera();
                    else startCamera();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isCameraActive
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25'
                  }`}
                >
                  {isCameraActive ? (
                    <>
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Apagar Cámara</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>Activar Cámara</span>
                    </>
                  )}
                </button>
              </div>

              {isCameraActive && (
                <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-black p-2 animate-fadeIn">
                  <div id="attendance-camera-reader" className="w-full max-w-sm mx-auto min-h-[220px]" />
                  <p className="text-[11px] text-center text-cyan-300 mt-2 font-medium">
                    Apunta la cámara hacia el código de barras o código QR de la credencial
                  </p>
                </div>
              )}
            </div>

            {/* Historial de Escaneos de esta Sesión */}
            {recentScans.length > 0 && (
              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Últimos Alumnos Escaneados en esta Sesión ({recentScans.length}):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setRecentScans([])}
                    className="text-[10px] text-gray-400 hover:text-white"
                  >
                    Limpiar lista
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        <div>
                          <span className="font-bold text-white">{scan.student.name}</span>
                          <span className="font-mono text-[10px] text-gray-400 ml-2">({scan.student.student_code})</span>
                          <div className="text-[10px] text-amber-300">{scan.materia}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px]">
                          +{scan.points} pts
                        </span>
                        <div className="text-[9px] text-gray-500">{scan.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsBarcodeModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar Consola
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GESTIÓN Y SINCRONIZACIÓN CON GOOGLE SHEETS                         */}
      {/* ========================================================================= */}
      {isGoogleSheetModalOpen && currentSheetConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0B1528] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span>Sincronización con Google Sheets</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                      {currentSheetConfig.grupo}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {currentSheetConfig.materia} • Sesión del <strong className="text-emerald-300">{selectedDate} ({formatDateColumnLabel(selectedDate)})</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleSheetModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setModalTab('preview')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  modalTab === 'preview'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black'
                    : 'bg-black/40 text-gray-400 hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Registros del Día ({students.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('webhook')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  modalTab === 'webhook'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black'
                    : 'bg-black/40 text-gray-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Webhook en Vivo</span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('script')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  modalTab === 'script'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 font-black'
                    : 'bg-black/40 text-gray-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Apps Script</span>
              </button>
            </div>

            {/* TAB 1: PREVIEW & DIRECT ACTIONS */}
            {modalTab === 'preview' && (
              <div className="space-y-4">
                
                {/* Action Bar */}
                <div className="p-3.5 rounded-2xl bg-black/60 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateGoogleSheet(false)}
                      disabled={isUpdatingSheet}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/30 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <UploadCloud className={`w-4 h-4 text-black ${isUpdatingSheet ? 'animate-bounce' : ''}`} />
                      <span>{isUpdatingSheet ? 'Enviando...' : 'Enviar Actualización'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const copyText = (lastUpdateStats?.copyableColumn) || students.map((st) => {
                          const state = attendanceState[st.id] || { status: 'present', participation: 'NINGUNA', notes: '' };
                          const stParts = allParticipaciones.filter((p) => (p.alumno_id === st.id || p.alumno_id === st.student_code) && p.fecha === selectedDate);
                          const isDouble = stParts.length >= 2 || (state.participation === 'AP' && stParts.length >= 2);
                          return encodeRecordToSheetCode(state.status, state.participation, isDouble);
                        }).join('\n');

                        navigator.clipboard.writeText(copyText);
                        setCopiedColumn(true);
                        playChime('success');
                        setTimeout(() => setCopiedColumn(false), 3000);
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-600/30"
                      title="Copia todos los valores en vertical listos para pegar con Ctrl+V en la columna de la fecha en Google Sheets"
                    >
                      {copiedColumn ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-white" />}
                      <span>{copiedColumn ? '¡Copiado al Portapapeles!' : 'Copiar Columna (Ctrl+V)'}</span>
                    </button>
                  </div>

                  <a
                    href={currentSheetConfig.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-black/80 hover:bg-black border border-white/20 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Abrir en Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  </a>
                </div>

                {/* Stat Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-center">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Total Alumnos</div>
                    <div className="text-xl font-extrabold text-white mt-0.5">{students.length}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <div className="text-[10px] uppercase font-bold text-emerald-400">Presentes (A)</div>
                    <div className="text-xl font-extrabold text-emerald-300 mt-0.5">{dailyPresentCount}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <div className="text-[10px] uppercase font-bold text-amber-400">Participando</div>
                    <div className="text-xl font-extrabold text-amber-300 mt-0.5">{dailyParticipatingCount}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <div className="text-[10px] uppercase font-bold text-rose-400">Faltas (F)</div>
                    <div className="text-xl font-extrabold text-rose-300 mt-0.5">{dailyAbsentCount}</div>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/50 max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/80 text-gray-400 text-[10px] uppercase font-extrabold border-b border-white/10 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Alumno</th>
                        <th className="py-2.5 px-3">Matrícula</th>
                        <th className="py-2.5 px-3">Asistencia</th>
                        <th className="py-2.5 px-3">Participación</th>
                        <th className="py-2.5 px-3 text-right">Código Hoja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {students.map((st, idx) => {
                        const state = attendanceState[st.id] || { status: 'present', participation: 'NINGUNA', notes: '' };
                        const stParts = allParticipaciones.filter((p) => (p.alumno_id === st.id || p.alumno_id === st.student_code) && p.fecha === selectedDate);
                        const isDouble = stParts.length >= 2 || (state.participation === 'AP' && stParts.length >= 2);
                        const code = encodeRecordToSheetCode(state.status, state.participation, isDouble);

                        return (
                          <tr key={st.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-2 px-3 font-mono text-gray-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-white">{st.name}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-gray-400">{st.student_code}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                state.status === 'present' ? 'bg-emerald-500/20 text-emerald-300' :
                                state.status === 'late' ? 'bg-amber-500/20 text-amber-300' :
                                state.status === 'excused' ? 'bg-blue-500/20 text-blue-300' :
                                'bg-rose-500/20 text-rose-300'
                              }`}>
                                {state.status === 'present' ? 'Presente' : state.status === 'late' ? 'Retardo' : state.status === 'excused' ? 'Justificado' : 'Falta'}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isDouble ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                                state.participation === 'AP' ? 'bg-emerald-500/20 text-emerald-300' :
                                state.participation === 'RP' ? 'bg-orange-500/20 text-orange-300' :
                                state.participation === 'REGULAR' ? 'bg-blue-500/20 text-blue-300' :
                                'text-gray-500'
                              }`}>
                                {isDouble ? '⭐ Doble (20 pts)' : state.participation === 'AP' ? '⭐ Aprobada (10 pts)' : state.participation === 'RP' ? '🔸 Mínima (5 pts)' : state.participation === 'REGULAR' ? 'Regular (7.5 pts)' : 'Sin part.'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className={`inline-block min-w-8 text-center font-mono font-black text-xs px-2.5 py-0.5 rounded-lg shadow-sm ${
                                code === 'App' ? 'bg-amber-400 text-black ring-1 ring-white' :
                                code === 'Ap' ? 'bg-emerald-400 text-black' :
                                code === 'A' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                                code === 'Rp' || code === 'Rpp' ? 'bg-amber-500 text-black' :
                                code === 'R' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                                code === 'J' ? 'bg-blue-900 text-blue-300' :
                                'bg-rose-950 text-rose-400 border border-rose-500/30'
                              }`}>
                                {code}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
                  <span>💡 <strong>Consejo rápido:</strong> Al presionar <em>"Copiar Columna"</em>, solo abre la hoja de cálculo en la fecha deseada y pulsa <strong>Ctrl + V</strong> en la celda del primer alumno.</span>
                </div>
              </div>
            )}

            {/* TAB 2: WEBHOOK AUTOMÁTICO */}
            {modalTab === 'webhook' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/20 space-y-3">
                  <h4 className="text-sm font-black text-white flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Conexión Webhook de Google Apps Script</span>
                  </h4>
                  <p className="text-xs text-gray-300">
                    Si implementaste el script en Google Sheets como Aplicación Web, ingresa aquí la URL del Webhook para que cada vez que guardes asistencia o pulses el botón, la hoja de cálculo se actualice automáticamente en tiempo real.
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      URL del Webhook (Google Apps Script):
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="url"
                        value={webhookUrlInput}
                        onChange={(e) => setWebhookUrlInput(e.target.value)}
                        placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/80 border border-white/20 text-white text-xs font-mono focus:outline-none focus:border-emerald-400 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveWebhook(webhookUrlInput)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/30 transition-all cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>

                  {webhookUrlInput && (
                    <div className="pt-2 flex items-center justify-between text-xs text-emerald-300">
                      <span className="flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Webhook activo y listo para sincronizar automáticamente.</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateGoogleSheet(false)}
                        className="text-xs text-emerald-400 underline font-bold hover:text-emerald-300"
                      >
                        Probar envío ahora
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CÓDIGO APPS SCRIPT */}
            {modalTab === 'script' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/60 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white">Instrucciones para Google Apps Script</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Pega este script en tu Google Sheet para habilitar sincronización 100% automatizada.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
                        setCopiedScript(true);
                        playChime('success');
                        setTimeout(() => setCopiedScript(false), 3000);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? '¡Código Copiado!' : 'Copiar Código'}</span>
                    </button>
                  </div>

                  <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside bg-black/40 p-3 rounded-xl border border-white/5">
                    <li>Abre tu hoja de cálculo en Google Sheets.</li>
                    <li>Ve al menú superior: <strong>Extensiones &gt; Apps Script</strong>.</li>
                    <li>Borra el contenido existente y pega el código de abajo.</li>
                    <li>Haz clic en <strong>Implementar &gt; Nueva implementación</strong>.</li>
                    <li>Selecciona tipo: <strong>Aplicación Web</strong>, y en <em>"Quién tiene acceso"</em> selecciona <strong>Cualquier usuario</strong>.</li>
                    <li>Copia la URL del Webhook generada y pégala en la pestaña <em>"Webhook en Vivo"</em> de esta ventana.</li>
                  </ol>

                  <pre className="p-3 rounded-xl bg-black/90 border border-white/10 text-[11px] font-mono text-emerald-300 max-h-48 overflow-y-auto overflow-x-auto">
                    {GOOGLE_APPS_SCRIPT_TEMPLATE}
                  </pre>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-[11px] text-gray-400">
                Sincronizador Oficial de Asistencia UNRC
              </span>
              <button
                type="button"
                onClick={() => setIsGoogleSheetModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
