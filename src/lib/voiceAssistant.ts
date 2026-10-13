"use client";

import { db, Docente, HorarioDocenteItem, UserProfile } from './db';

// Normaliza cadenas para comparaciones flexibles sin acentos
export const normalizeVoiceText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Días de la semana en español
export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export interface DocenteScheduleAnalysis {
  diaActual: string;
  horaActualTexto: string;
  minutosActuales: number;
  activeItem: HorarioDocenteItem | null;
  status: 'active_now' | 'today_upcoming' | 'today_finished' | 'next_day' | 'no_classes';
  targetGrupo: string;
  targetMateria: string;
  targetAula: string;
  isOnline: boolean;
  sesionesHoy: HorarioDocenteItem[];
  todasSesiones: HorarioDocenteItem[];
  speechGreeting: string;
  speechSchedule: string;
  fullSpeechMessage: string;
}

/**
 * Convierte cadena "HH:MM" a minutos desde medianoche
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Analiza inteligentemente el horario del docente para el momento actual
 */
export function analyzeDocenteSchedule(docente: Docente, customDate?: Date): DocenteScheduleAnalysis {
  const now = customDate || new Date();
  const dayIndex = now.getDay();
  const diaActual = DIAS_SEMANA[dayIndex];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const horaActualTexto = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const horarios = docente.horarios || [];
  
  // Normalizar día actual
  const normDia = normalizeVoiceText(diaActual);
  const sesionesHoy = horarios.filter((h) => {
    const hDia = normalizeVoiceText(h.dia);
    return hDia === normDia || (normDia === 'miercoles' && hDia.includes('miercol')) || (normDia === 'sabado' && hDia.includes('sabad'));
  });

  // Ordenar las sesiones de hoy por hora de inicio
  sesionesHoy.sort((a, b) => timeStringToMinutes(a.hora_inicio) - timeStringToMinutes(b.hora_inicio));

  let activeItem: HorarioDocenteItem | null = null;
  let status: 'active_now' | 'today_upcoming' | 'today_finished' | 'next_day' | 'no_classes' = 'no_classes';

  // 1. Verificar si hay alguna clase activa en este momento o por comenzar en los próximos 30 minutos
  for (const s of sesionesHoy) {
    const startMin = timeStringToMinutes(s.hora_inicio);
    const endMin = timeStringToMinutes(s.hora_fin);

    // Activa si está en curso, o si faltan hasta 30 mins para empezar
    if (currentMinutes >= startMin - 30 && currentMinutes < endMin) {
      activeItem = s;
      status = 'active_now';
      break;
    }
  }

  // 2. Si no hay clase en curso en este instante, verificar si hay clases más tarde hoy
  if (!activeItem && sesionesHoy.length > 0) {
    const upcoming = sesionesHoy.find((s) => timeStringToMinutes(s.hora_inicio) > currentMinutes);
    if (upcoming) {
      activeItem = upcoming;
      status = 'today_upcoming';
    } else {
      // Ya pasaron todas las clases de hoy, tomamos la última de hoy o la primera de la semana
      activeItem = sesionesHoy[0];
      status = 'today_finished';
    }
  }

  // 3. Si no hay clases hoy, buscar la próxima clase en los días siguientes de la semana
  if (!activeItem && horarios.length > 0) {
    const dayWeights: Record<string, number> = {
      lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 7
    };
    const currentWeight = dayWeights[normDia] || 1;

    // Buscar el día siguiente más cercano
    const sortedFuture = [...horarios].sort((a, b) => {
      const wa = dayWeights[normalizeVoiceText(a.dia)] || 1;
      const wb = dayWeights[normalizeVoiceText(b.dia)] || 1;
      const diffA = (wa - currentWeight + 7) % 7 || 7;
      const diffB = (wb - currentWeight + 7) % 7 || 7;
      return diffA - diffB;
    });

    activeItem = sortedFuture[0];
    status = 'next_day';
  }

  // Si aún no hay nada (docente sin horario registrado)
  if (!activeItem) {
    const defaultMateria = docente.materias?.[0] || 'Matemáticas para la Administración';
    const speechGreeting = `Bienvenido, profesor ${docente.nombre}.`;
    const speechSchedule = `No tiene asignaturas programadas en este momento. Puede consultar su catálogo de cursos.`;
    return {
      diaActual,
      horaActualTexto,
      minutosActuales: currentMinutes,
      activeItem: null,
      status: 'no_classes',
      targetGrupo: 'PHLAC-203-TIJ',
      targetMateria: defaultMateria,
      targetAula: 'Campus Tijuana',
      isOnline: false,
      sesionesHoy: [],
      todasSesiones: horarios,
      speechGreeting,
      speechSchedule,
      fullSpeechMessage: `${speechGreeting} ${speechSchedule}`
    };
  }

  const targetGrupo = activeItem.grupo || 'PHLAC-203-TIJ';
  const targetMateria = activeItem.materia || 'Asignatura Asignada';
  const targetAula = activeItem.aula || (activeItem.es_en_linea ? 'Aula Virtual (Google Meet)' : 'Campus Tijuana - Aula 203');
  const isOnline = Boolean(activeItem.es_en_linea);

  const speechGreeting = `¡Bienvenido, profesor ${docente.nombre} ${docente.apellido_paterno}!`;
  let speechSchedule = '';

  if (status === 'active_now') {
    speechSchedule = `Hoy es ${diaActual}, son las ${horaActualTexto}. En este momento le corresponde impartir ${targetMateria} al grupo ${targetGrupo}, de ${activeItem.hora_inicio} a ${activeItem.hora_fin} horas en ${targetAula}. Accediendo automáticamente al grupo para su toma de asistencia.`;
  } else if (status === 'today_upcoming') {
    speechSchedule = `Hoy es ${diaActual}. Su próxima clase está programada a las ${activeItem.hora_inicio} horas con la materia ${targetMateria}, grupo ${targetGrupo} en ${targetAula}. Accediendo automáticamente al grupo.`;
  } else if (status === 'today_finished') {
    speechSchedule = `Hoy es ${diaActual}. Sus sesiones del día han concluido exitosamente. He cargado el grupo ${targetGrupo} de ${targetMateria} para su revisión y seguimiento.`;
  } else {
    // next_day
    speechSchedule = `Hoy es ${diaActual}. Su próxima sesión es el día ${activeItem.dia} de ${activeItem.hora_inicio} a ${activeItem.hora_fin} horas con la materia ${targetMateria}, grupo ${targetGrupo} en ${targetAula}. Accediendo automáticamente para su preparación.`;
  }

  return {
    diaActual,
    horaActualTexto,
    minutosActuales: currentMinutes,
    activeItem,
    status,
    targetGrupo,
    targetMateria,
    targetAula,
    isOnline,
    sesionesHoy,
    todasSesiones: horarios,
    speechGreeting,
    speechSchedule,
    fullSpeechMessage: `${speechGreeting} ${speechSchedule}`
  };
}

/**
 * Reproduce sintetizador de voz natural en español
 */
export function speakText(text: string, onEnd?: () => void, onError?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Detener cualquier locución previa

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX'; // Español de México
    utterance.rate = 1.02; // Velocidad fluida y natural
    utterance.pitch = 1.0;

    // Buscar una voz natural en español
    const voices = window.speechSynthesis.getVoices();
    const esVoice =
      voices.find((v) => v.lang === 'es-MX' && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Sabina') || v.name.includes('Raul'))) ||
      voices.find((v) => v.lang === 'es-MX') ||
      voices.find((v) => v.lang.startsWith('es-')) ||
      voices.find((v) => v.lang.startsWith('es'));

    if (esVoice) {
      utterance.voice = esVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      if (onError) onError();
    };

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Error initiating speech synthesis:', err);
    if (onError) onError();
  }
}

/**
 * Detiene la reproducción de voz
 */
export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Reproduce tonos de confirmación futuristas con Web Audio API
 */
export function playChime(type: 'listen' | 'success' | 'nav' | 'error' = 'listen'): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'listen') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'nav') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(200, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Silencioso si audioContext no está permitido por permisos
  }
}

/**
 * Autentica automáticamente a un docente vía voz y prepara la sesión
 */
export async function authenticateDocenteByVoice(
  docenteTarget?: Docente | null,
  options?: { autoSpeakSchedule?: boolean; autoTargetGroup?: string }
): Promise<{ success: boolean; docente: Docente; error?: string }> {
  try {
    let docente = docenteTarget;

    // Si no se especificó, obtener la lista oficial y tomar al Dr. Adrian Silva o el primero
    if (!docente) {
      const allDocentes = await db.getDocentes();
      docente =
        allDocentes.find((d) => d.num_empleado === 'DOC-UNRC-03' || d.nombre.toLowerCase().includes('adrian')) ||
        allDocentes.find((d) => d.num_empleado === 'DOC-UNRC-01') ||
        allDocentes[0];
    }

    if (!docente) {
      throw new Error('No se encontró el registro docente en la base de datos institucional.');
    }

    // Configurar sesión segura
    const profile: UserProfile = {
      id: docente.id,
      email: docente.email,
      nombre: `${docente.nombre} ${docente.apellido_paterno} ${docente.apellido_materno || ''}`.trim(),
      role: 'docente',
      avatar_url: docente.foto_url,
      num_empleado: docente.num_empleado,
      carrera_o_depto: docente.departamento
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('unrc_auth_role', 'docente');
      sessionStorage.setItem('unrc_auth_user', JSON.stringify(profile));

      // Marcadores para que la página de Teacher Dashboard hable y active el grupo automáticamente
      if (options?.autoSpeakSchedule !== false) {
        sessionStorage.setItem('unrc_voice_auto_speak', '1');
      }
      if (options?.autoTargetGroup) {
        sessionStorage.setItem('unrc_voice_target_group', options.autoTargetGroup);
      } else {
        const analysis = analyzeDocenteSchedule(docente);
        sessionStorage.setItem('unrc_voice_target_group', analysis.targetGrupo);
      }

      // Cookies de sesión
      document.cookie = `unrc_role=teacher; path=/; SameSite=Lax`;
      document.cookie = `unrc_demo_session=teacher; path=/; SameSite=Lax`;
      document.cookie = `unrc_user_id=${docente.id}; path=/; SameSite=Lax`;
    }

    await db.addAuditoria(
      'ACCESO_DOCENTE_VOZ_AUTORIZADO',
      'Inteligencia Artificial / Asistente de Voz',
      `Ingreso institucional inteligente mediante comando de voz: ${profile.nombre} (${docente.num_empleado})`,
      'Asistente de Voz UNRC'
    );

    return { success: true, docente };
  } catch (err: any) {
    console.error('Error en authenticateDocenteByVoice:', err);
    return { success: false, docente: null as any, error: err.message };
  }
}
