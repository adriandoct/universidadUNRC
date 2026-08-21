"use client";

import React, { useState, useEffect } from 'react';
import { db, Alumno, Asistencia } from '../../lib/db';
import { useAuth } from '../../lib/AuthContext';

export default function AlumnoPage() {
  const { user, role, openAuthModal } = useAuth();
  const [currentAlumno, setCurrentAlumno] = useState<Alumno | null>(null);
  const [misAsistencias, setMisAsistencias] = useState<Asistencia[]>([]);
  const [activeTab, setActiveTab] = useState<'credencial' | 'asistencias' | 'materias'>('credencial');

  useEffect(() => {
    const fetchAlumnoData = async () => {
      try {
        const list = await db.getAlumnos();
        // Match logged in user matricula or fallback to first student
        const matched = list.find(a => a.matricula === user?.matricula) || list[0];
        setCurrentAlumno(matched);

        if (matched) {
          const logs = await db.getAsistencias();
          const studentLogs = logs.filter(l => l.alumno_id === matched.id || l.alumno_id === matched.matricula || l.alumno?.id === matched.id);
          setMisAsistencias(studentLogs);
        }
      } catch (e) {
        console.error('Error loading student data:', e);
      }
    };
    fetchAlumnoData();
  }, [user]);

  if (role !== 'alumno' && role !== 'administrador') {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-4xl mx-auto">
          🎓
        </div>
        <h1 className="text-3xl font-bold text-white">Portal del Estudiante UNRC</h1>
        <p className="text-gray-400 max-w-md mx-auto">
          Ingresa con tu cuenta de Gmail institucional o Matrícula para acceder a tu Credencial Digital y tu Historial de Asistencias.
        </p>
        <button
          onClick={() => openAuthModal('alumno')}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all"
        >
          🔑 Iniciar Sesión como Alumno
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#052219] via-[#090D16] to-[#0A382B] p-8 border border-emerald-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span>🎓 Portal Académico y Credencial UNRC</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Hola, <span className="text-emerald-400">{user?.nombre || currentAlumno?.nombre || 'Alumno'}</span>
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Tu credencial digital oficial de la Universidad Nacional Rosario Castellanos con QR dinámico para acceso al campus y pase de lista.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-left shrink-0">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Matrícula Institucional</div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              {currentAlumno?.matricula || user?.matricula || 'UNRC-2026-001'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('credencial')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'credencial'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          🪪 Credencial Digital UNRC
        </button>

        <button
          onClick={() => setActiveTab('asistencias')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'asistencias'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          📋 Mi Historial de Asistencias ({misAsistencias.length})
        </button>

        <button
          onClick={() => setActiveTab('materias')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'materias'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          📚 Mis Materias del Semestre
        </button>
      </div>

      {/* TAB 1: OFFICIAL DIGITAL CREDENTIAL CARD */}
      {activeTab === 'credencial' && currentAlumno && (
        <div className="flex justify-center py-4">
          
          {/* Senior High-Fidelity UNRC Credential Card */}
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-[#0F382C] via-[#090D16] to-[#040810] border-2 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.2)] text-white p-6 space-y-6">
            
            {/* Top Accent Gold Bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-600"></div>

            {/* UNRC Official Header Logo */}
            <div className="text-center space-y-1 border-b border-white/10 pb-4 pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/unrc_official_logo.png"
                alt="Universidad Nacional Rosario Castellanos"
                className="h-16 w-auto mx-auto object-contain rounded-xl shadow-md border border-amber-400/30"
              />
              <div className="text-[10px] text-amber-300 font-extrabold uppercase tracking-widest pt-2">
                CREDENCIAL DIGITAL ESTUDIANTIL OFICIAL
              </div>
            </div>

            {/* Student Photo & Details */}
            <div className="flex items-center space-x-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentAlumno.foto_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200&h=200'}
                alt={currentAlumno.nombre}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-400 shadow-lg shrink-0"
              />

              <div className="space-y-1">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Alumno</div>
                <div className="text-lg font-extrabold text-white leading-tight">
                  {currentAlumno.nombre} <br />
                  <span className="text-emerald-400">{currentAlumno.apellido_paterno} {currentAlumno.apellido_materno}</span>
                </div>
                <div className="text-xs text-gray-300 font-medium">
                  {currentAlumno.carrera || 'Lic. en Ciencias de la Computación'}
                </div>
                <div className="text-[11px] text-emerald-300 font-bold">
                  {currentAlumno.grado} • Grupo {currentAlumno.grupo}
                </div>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center space-y-2">
              <div className="p-3 bg-white rounded-xl shadow-md">
                {/* Simulated QR Code Visual */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentAlumno.qr_code)}`}
                  alt="Código QR Alumno"
                  className="w-36 h-36 object-contain"
                />
              </div>
              <div className="font-mono text-xs font-bold text-emerald-400 tracking-wider">
                {currentAlumno.qr_code}
              </div>
              <div className="text-[10px] text-gray-400">Escanea este código en los torniquetes o aula</div>
            </div>

            {/* Footer Badge */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-[10px] text-gray-400 font-semibold">
              <span>VÁLIDO: CICLO ESCOLAR 2026</span>
              <span className="text-amber-400">CDMX</span>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: ATTENDANCE HISTORY TIMELINE */}
      {activeTab === 'asistencias' && (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <h3 className="text-base font-bold text-white">Historial Personal de Entradas y Salidas</h3>

          {misAsistencias.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Aún no tienes registros de asistencia escaneados.
            </div>
          ) : (
            <div className="space-y-3">
              {misAsistencias.map((log) => (
                <div key={log.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${log.tipo === 'entrada' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {log.tipo === 'entrada' ? '📥' : '📤'}
                    </div>
                    <div>
                      <div className="font-bold text-white capitalize">{log.tipo} Registrada</div>
                      <div className="text-xs text-gray-400">{log.ubicacion || 'Acceso Principal Campus'} • {log.dispositivo}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400 text-sm">{log.hora}</div>
                    <div className="text-[11px] text-gray-500">{log.fecha}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUBJECTS */}
      {activeTab === 'materias' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-3">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Materia 1</div>
            <h4 className="text-lg font-bold text-white">Inteligencia Artificial y Aprendizaje Automático</h4>
            <p className="text-xs text-gray-400">Docente: Dr. Alejandro Valdez Mendoza</p>
            <div className="text-[11px] text-gray-500">Horario: Lunes y Miércoles 08:00 - 10:00 AM • Aula 102</div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-3">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Materia 2</div>
            <h4 className="text-lg font-bold text-white">Bases de Datos Avanzadas en Supabase & PostgreSQL</h4>
            <p className="text-xs text-gray-400">Docente: Dra. Beatriz Sánchez Pineda</p>
            <div className="text-[11px] text-gray-500">Horario: Martes y Jueves 10:00 - 12:00 PM • Laboratorio de IA</div>
          </div>
        </div>
      )}

    </div>
  );
}
