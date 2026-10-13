"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  Clock,
  BookOpen,
  ArrowRight,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  analyzeDocenteSchedule,
  authenticateDocenteByVoice,
  speakText,
  stopSpeech,
  playChime,
  normalizeVoiceText,
  DocenteScheduleAnalysis
} from '@/lib/voiceAssistant';
import { db, Docente } from '@/lib/db';
import { useAuth } from '@/lib/AuthContext';

export const VoiceAssistantWidget: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('Di "Ingresar como docente" o toca un botón rápido');
  const [scheduleAnalysis, setScheduleAnalysis] = useState<DocenteScheduleAnalysis | null>(null);
  const [docenteProfile, setDocenteProfile] = useState<Docente | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [activeSpeechText, setActiveSpeechText] = useState('');

  const recognitionRef = useRef<any>(null);

  // Cargar perfil del docente para contexto de horarios
  useEffect(() => {
    async function loadDoc() {
      try {
        const docentes = await db.getDocentes();
        const found =
          docentes.find(
            (d) =>
              d.num_empleado === 'DOC-UNRC-03' ||
              d.id === user?.id ||
              d.num_empleado === user?.id ||
              d.nombre.toLowerCase().includes('adrian')
          ) || docentes[0];

        if (found) {
          setDocenteProfile(found);
          const analysis = analyzeDocenteSchedule(found);
          setScheduleAnalysis(analysis);
        }
      } catch (e) {
        console.error('Error loading docente for voice widget:', e);
      }
    }
    loadDoc();
  }, [user]);

  // Inicializar Web Speech Recognition si está soportado en el navegador
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'es-MX';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('🎙️ Escuchando tu voz atentamente...');
        playChime('listen');
      };

      recognition.onresult = (event: any) => {
        const currentTranscript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        setTranscript(currentTranscript);

        if (event.results[0].isFinal) {
          handleVoiceCommand(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setStatusMessage('⚠️ Permiso de micrófono denegado. Puedes usar los comandos rápidos.');
        } else {
          setStatusMessage('No te escuché con claridad. Por favor, intenta de nuevo.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Failed to initialize SpeechRecognition:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      stopSpeech();
    };
  }, [docenteProfile, scheduleAnalysis, pathname]);

  // Procesamiento del comando de voz
  const handleVoiceCommand = async (rawCommand: string) => {
    const norm = normalizeVoiceText(rawCommand);
    setStatusMessage(`Comando recibido: "${rawCommand}"`);

    // 1. COMANDO: Ingreso Automático como Docente
    if (
      norm.includes('docente') ||
      norm.includes('profesor') ||
      norm.includes('maestro') ||
      norm.includes('adrian') ||
      norm.includes('ingresar') ||
      norm.includes('iniciar sesion') ||
      norm.includes('entrar') ||
      norm.includes('acceder')
    ) {
      await executeDocenteVoiceLogin();
      return;
    }

    // 2. COMANDO: Consultar Horario
    if (
      norm.includes('horario') ||
      norm.includes('clase') ||
      norm.includes('hora') ||
      norm.includes('dia') ||
      norm.includes('que me toca')
    ) {
      executeTellSchedule();
      return;
    }

    // 3. COMANDO: Acceso al Grupo
    if (
      norm.includes('grupo') ||
      norm.includes('materia') ||
      norm.includes('asistencia') ||
      norm.includes('203') ||
      norm.includes('201') ||
      norm.includes('301') ||
      norm.includes('matematica') ||
      norm.includes('turismo')
    ) {
      executeGoToGroup(norm);
      return;
    }

    // Comando no reconocido específicamente
    setStatusMessage(`"${rawCommand}" recibido. ¿Deseas ingresar como docente o escuchar tu horario?`);
    playChime('error');
  };

  // Iniciar / Detener escucha por micrófono
  const toggleListening = () => {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setStatusMessage('Escucha pausada.');
    } else {
      setTranscript('');
      setStatusMessage('Iniciando micrófono...');
      setIsOpen(true);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
        } else {
          // Si no está soportado el micrófono nativo, avisar amablemente
          setStatusMessage('El micrófono no está habilitado en este navegador. Usa los accesos rápidos.');
        }
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  // ACCIÓN 1: Ingreso automático como Docente
  const executeDocenteVoiceLogin = async () => {
    setStatusMessage('⚡ Validando credenciales por voz e iniciando sesión como Docente...');
    playChime('success');

    const authResult = await authenticateDocenteByVoice(docenteProfile, {
      autoSpeakSchedule: true
    });

    if (authResult.success) {
      const analysis = analyzeDocenteSchedule(authResult.docente);
      setStatusMessage(`¡Autenticado como ${authResult.docente.nombre} ${authResult.docente.apellido_paterno}! Redirigiendo a tu consola...`);
      
      setTimeout(() => {
        window.location.href = '/teacher';
      }, 700);
    } else {
      setStatusMessage(`Error de acceso: ${authResult.error}`);
      playChime('error');
    }
  };

  // ACCIÓN 2: Decir el horario con voz sintética
  const executeTellSchedule = () => {
    if (!docenteProfile) return;
    const analysis = analyzeDocenteSchedule(docenteProfile);
    setScheduleAnalysis(analysis);

    setStatusMessage('🔊 Hablando: Explicando horario oficial...');
    setIsSpeaking(true);
    setActiveSpeechText(analysis.fullSpeechMessage);
    playChime('success');

    speakText(
      analysis.fullSpeechMessage,
      () => {
        setIsSpeaking(false);
        setStatusMessage('Horario transmitido con éxito.');
      },
      () => {
        setIsSpeaking(false);
      }
    );
  };

  // ACCIÓN 3: Acceder al grupo que le toca
  const executeGoToGroup = (filter?: string) => {
    if (!docenteProfile) return;
    const analysis = analyzeDocenteSchedule(docenteProfile);
    
    let targetGroup = analysis.targetGrupo;
    if (filter) {
      if (filter.includes('201') || filter.includes('turism')) targetGroup = 'PHLTUR-201-TIJ';
      else if (filter.includes('301') || filter.includes('dato')) targetGroup = 'PHLCDN-301-TIJ';
      else if (filter.includes('203') || filter.includes('admin') || filter.includes('matemat')) targetGroup = 'PHLAC-203-TIJ';
    }

    sessionStorage.setItem('unrc_voice_target_group', targetGroup);
    sessionStorage.setItem('unrc_voice_auto_speak', '1');

    setStatusMessage(`Accediendo automáticamente al grupo ${targetGroup}...`);
    playChime('nav');

    if (pathname.includes('/teacher') || pathname.includes('/docente')) {
      // Disparar evento personalizado para que la página de Teacher actualice el grupo sin recargar
      window.dispatchEvent(new CustomEvent('unrc-voice-select-group', { detail: { targetGroup } }));
    } else {
      // Si no estamos en teacher, autenticar y navegar
      executeDocenteVoiceLogin();
    }
  };

  const handleStopSpeaking = () => {
    stopSpeech();
    setIsSpeaking(false);
    setStatusMessage('Audio silenciado.');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Ventana Desplegable del Asistente de Voz */}
      {isOpen && (
        <div className="mb-3 w-[92vw] sm:w-[420px] rounded-3xl bg-[#090D1A]/95 border border-[#5B142F]/60 text-white shadow-[0_10px_50px_rgba(91,20,47,0.4)] backdrop-blur-xl p-5 space-y-4 animate-fadeIn transition-all">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#5B142F] via-[#7E1A42] to-amber-500 flex items-center justify-center shadow-lg border border-[#E8A938]/50">
                <Bot className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span>Asistente de Voz UNRC</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold">
                    IA Activa
                  </span>
                </h3>
                <p className="text-[11px] text-amber-300 font-medium">
                  {docenteProfile ? `Docente: ${docenteProfile.nombre} ${docenteProfile.apellido_paterno}` : 'Reconocimiento de Voz Institucional'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              title="Minimizar Asistente"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Estado de Escucha y Ondas de Audio */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : isSpeaking ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-500'}`} />
                {isListening ? 'Escuchando tu micrófono...' : isSpeaking ? 'Asistente hablando...' : 'Listo para tu orden'}
              </span>

              {isSpeaking && (
                <button
                  onClick={handleStopSpeaking}
                  className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                >
                  <VolumeX className="w-3 h-3" />
                  <span>Silenciar</span>
                </button>
              )}
            </div>

            {/* Animación de ondas sonoras */}
            {(isListening || isSpeaking) && (
              <div className="flex items-center justify-center space-x-1 py-1">
                <div className="w-1 h-5 bg-rose-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-1 h-8 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1 h-6 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                <div className="w-1 h-10 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                <div className="w-1 h-7 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1 h-4 bg-rose-500 rounded-full animate-bounce [animation-delay:0.1s]" />
              </div>
            )}

            <p className="text-xs text-amber-200/90 font-mono italic leading-relaxed min-h-[1.5rem]">
              {transcript ? `"${transcript}"` : statusMessage}
            </p>
          </div>

          {/* Tarjeta de Información de Horario Inteligente */}
          {scheduleAnalysis && (
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-black border border-cyan-500/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-cyan-300 font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Horario de Hoy ({scheduleAnalysis.diaActual}):</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 font-mono font-semibold">
                  {scheduleAnalysis.status === 'active_now' ? '🟢 EN CLASE' : scheduleAnalysis.status === 'today_upcoming' ? '🟡 PRÓXIMA' : '🔵 PROGRAMADA'}
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="font-extrabold text-white text-xs">
                  {scheduleAnalysis.targetMateria}
                </div>
                <div className="text-gray-300 text-[11px] flex items-center space-x-2">
                  <span>Grupo: <strong className="text-amber-300">{scheduleAnalysis.targetGrupo}</strong></span>
                  <span>•</span>
                  <span>{scheduleAnalysis.targetAula}</span>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Acción Rápida (Smart Voice Shortcuts) */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Comandos Rápidos por Voz o Clic:
            </div>

            <div className="grid grid-cols-1 gap-2">
              
              {/* Botón 1: Ingreso automático como Docente */}
              <button
                type="button"
                onClick={executeDocenteVoiceLogin}
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#5B142F] to-[#801B42] hover:from-[#72193C] hover:to-[#96214F] text-amber-200 hover:text-white font-bold text-xs border border-[#E8A938]/60 shadow-lg flex items-center justify-between group transition-all"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm">👨‍🏫</span>
                  <span>Ingresar como Docente (Adrián Silva)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber-300 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Botón 2: Decir mi horario por voz */}
              <button
                type="button"
                onClick={executeTellSchedule}
                className="w-full py-2 px-3.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 font-semibold text-xs border border-blue-500/40 flex items-center justify-between transition-all"
              >
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Dime mi horario de hoy en voz alta</span>
                </div>
                <span className="text-[10px] text-blue-400 font-mono">🔊 Hablar</span>
              </button>

              {/* Botón 3: Acceder al grupo que le toca */}
              <button
                type="button"
                onClick={() => executeGoToGroup()}
                className="w-full py-2 px-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 font-semibold text-xs border border-emerald-500/40 flex items-center justify-between transition-all"
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Acceder al grupo que me toca impartir</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">👥 Abrir</span>
              </button>

            </div>
          </div>

          {/* Footer de Ayuda */}
          <div className="text-[11px] text-gray-400 text-center border-t border-white/5 pt-2">
            💡 <em>Puedes decir en voz alta: "Ingresar como docente", "¿Cuál es mi horario?", o "Abrir grupo 203".</em>
          </div>

        </div>
      )}

      {/* Botón Flotante Principal del Micrófono / Asistente */}
      <button
        onClick={toggleListening}
        className={`relative group flex items-center space-x-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 border ${
          isListening
            ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white border-rose-400 shadow-rose-600/50 scale-105'
            : isSpeaking
            ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white border-cyan-400 shadow-cyan-600/50'
            : 'bg-gradient-to-r from-[#5B142F] via-[#751A3E] to-[#0B1528] text-amber-200 hover:text-white border-[#E8A938] shadow-[#5B142F]/50 hover:scale-105'
        }`}
        title="Asistente de Voz Inteligente UNRC"
        aria-label="Asistente de Voz"
      >
        {/* Anillo de pulso cuando escucha */}
        {isListening && (
          <span className="absolute -inset-1 rounded-full bg-rose-500/40 animate-ping pointer-events-none" />
        )}
        {isSpeaking && (
          <span className="absolute -inset-1 rounded-full bg-cyan-400/40 animate-pulse pointer-events-none" />
        )}

        <div className={`p-1.5 rounded-full ${isListening ? 'bg-white/20' : 'bg-black/30'}`}>
          {isListening ? (
            <Mic className="w-5 h-5 text-white animate-pulse" />
          ) : isSpeaking ? (
            <Volume2 className="w-5 h-5 text-cyan-200 animate-bounce" />
          ) : (
            <Mic className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
          )}
        </div>

        <div className="flex flex-col text-left pr-1">
          <span className="text-xs font-black tracking-tight leading-none text-white">
            {isListening ? 'Escuchando Voz...' : isSpeaking ? 'Hablando...' : 'Asistente de Voz'}
          </span>
          <span className="text-[10px] text-amber-300 font-medium leading-tight">
            {isListening ? 'Habla ahora...' : 'Acceso Docente & Horario'}
          </span>
        </div>

        <div className="pl-1 border-l border-white/20">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        </div>
      </button>

    </div>
  );
};
