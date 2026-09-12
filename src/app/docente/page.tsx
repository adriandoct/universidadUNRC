"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  db, 
  Alumno, 
  Asistencia, 
  Participacion, 
  ResumenAcademico, 
  Grupo, 
  Materia, 
  Carrera 
} from '../../lib/db';
import { useAuth } from '../../lib/AuthContext';

export default function DocentePage() {
  const { user, role, openAuthModal } = useAuth();
  
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [participaciones, setParticipaciones] = useState<Participacion[]>([]);
  const [resumen, setResumen] = useState<ResumenAcademico[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  
  const [selectedGrupo, setSelectedGrupo] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'asistencias' | 'participaciones' | 'tareas' | 'proyectos' | 'autoevaluacion' | 'resumen'>('asistencias');
  const [searchQuery, setSearchQuery] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [manualScanInput, setManualScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      const aList = await db.getAlumnos();
      const logs = await db.getAsistencias();
      const parts = await db.getParticipaciones();
      const res = await db.getResumenAcademico(selectedGrupo);
      const gList = await db.getGrupos();
      const mList = await db.getMaterias();
      const cList = await db.getCarreras();

      setAlumnos(aList);
      setAsistencias(logs);
      setParticipaciones(parts);
      setResumen(res);
      setGrupos(gList);
      setMaterias(mList);
      setCarreras(cList);
    } catch (e) {
      console.error('Error fetching docente data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedGrupo]);

  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualScanInput.trim()) return;

    try {
      const res = await db.registrarAsistencia(
        manualScanInput.trim(),
        undefined,
        'Consola Docente UNRC',
        'Aula Principal',
        user?.nombre || 'Docente'
      );
      setScanMessage({
        text: `✅ ${res.asistencia.tipo.toUpperCase()} registrada para ${res.alumno.nombre} ${res.alumno.apellido_paterno} (${res.alumno.matricula})`,
        type: 'success'
      });
      setManualScanInput('');
      loadData();
    } catch (err: any) {
      setScanMessage({
        text: `❌ Error: ${err.message}`,
        type: 'error'
      });
    }
  };

  const handleAddParticipacion = async (alumnoId: string, tipo: 'AP' | 'RP') => {
    try {
      await db.registrarParticipacion(alumnoId, tipo);
      setScanMessage({
        text: `✅ Participación (${tipo}) registrada para el alumno.`,
        type: 'success'
      });
      loadData();
    } catch (e: any) {
      setScanMessage({ text: `❌ Error al registrar participación: ${e.message}`, type: 'error' });
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAlumnos = alumnos.filter(al => {
    const matchesGroup = selectedGrupo === 'todos' || al.grupo === selectedGrupo;
    const matchesSearch = searchQuery === '' || 
      `${al.nombre} ${al.apellido_paterno} ${al.matricula}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const filteredResumen = resumen.filter(r => {
    const matchesGroup = selectedGrupo === 'todos' || r.grupo === selectedGrupo;
    const matchesSearch = searchQuery === '' || 
      `${r.nombre_completo} ${r.matricula}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const getStudentTodayStatus = (alumnoId: string) => {
    const todayLogs = asistencias.filter(a => (a.alumno_id === alumnoId || a.alumno?.id === alumnoId) && a.fecha === todayStr);
    if (todayLogs.length === 0) return { label: 'Ausente / Pendiente', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    const lastLog = todayLogs[0];
    if (lastLog.tipo === 'entrada') {
      return { label: `Presente (${lastLog.hora.substring(0, 5)})`, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    return { label: `Salida (${lastLog.hora.substring(0, 5)})`, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  };

  if (role !== 'docente' && role !== 'administrador') {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-4xl mx-auto">
          👨‍🏫
        </div>
        <h1 className="text-3xl font-bold text-white">Panel Exclusivo para Docentes UNRC</h1>
        <p className="text-gray-400 max-w-md mx-auto">
          Ingresa con tu cuenta de Gmail institucional o Número de Empleado para gestionar asistencias, participaciones, tareas, proyectos y autoevaluaciones.
        </p>
        <button
          onClick={() => openAuthModal('docente')}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all"
        >
          🔑 Iniciar Sesión como Docente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1528] via-[#070D18] to-[#0A382B] p-8 border border-blue-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <span>👨‍🏫 Sistema Fullstack de Gestión Académica UNRC</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Bienvenido, <span className="text-blue-400">{user?.nombre || 'Docente'}</span>
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Control integral por carreras y materias: Asistencia, Participaciones (AP/RP), Tareas, Proyectos e Integración de Autoevaluaciones.
            </p>
          </div>

          <Link
            href="/scanner"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center space-x-3 shrink-0"
          >
            <span className="text-xl">🎥</span>
            <span>Escáner QR de Aula</span>
          </Link>
        </div>
      </div>

      {/* Control Bar: Quick Scan & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Check-In */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <span>⚡ Registro Rápido por Matrícula</span>
          </h3>

          <form onSubmit={handleManualCheckIn} className="space-y-3">
            <input
              type="text"
              value={manualScanInput}
              onChange={(e) => setManualScanInput(e.target.value)}
              placeholder="Ej: UNRC-2026-005"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-600/20"
            >
              Registrar Entrada / Salida
            </button>
          </form>

          {scanMessage && (
            <div className={`p-3 rounded-xl text-xs font-medium ${scanMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'}`}>
              {scanMessage.text}
            </div>
          )}
        </div>

        {/* WhatsApp Notification Toggle */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>💬 Notificaciones por WhatsApp</span>
            </h3>
            <button
              onClick={() => setWhatsappEnabled(!whatsappEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative p-1 ${whatsappEnabled ? 'bg-emerald-500' : 'bg-gray-700'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${whatsappEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {whatsappEnabled
              ? '✅ Alertas activas por WhatsApp. Tutores notificados inmediatamente ante asistencia o inasistencia.'
              : '⏸️ Notificaciones desactivadas.'}
          </p>
        </div>

        {/* Attendance Summary Stat */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-2 flex flex-col justify-center">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total de Alumnos Registrados</div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {alumnos.length} Alumnos
          </div>
          <p className="text-[11px] text-gray-500">
            Distribuidos en 5 Grupos (101, 102, 201, 301, 501)
          </p>
        </div>

      </div>

      {/* Main Academic Management Board */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
        
        {/* Navigation Tabs and Filters */}
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-b border-white/10 pb-4">
          
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('asistencias')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'asistencias' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              📋 Asistencias
            </button>
            <button
              onClick={() => setActiveTab('participaciones')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'participaciones' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              💡 Participaciones (AP / RP)
            </button>
            <button
              onClick={() => setActiveTab('tareas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'tareas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              📝 Tareas
            </button>
            <button
              onClick={() => setActiveTab('proyectos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'proyectos' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              📊 Proyectos
            </button>
            <button
              onClick={() => setActiveTab('autoevaluacion')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'autoevaluacion' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              👤 Autoevaluación
            </button>
            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'resumen' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              🎓 Resumen & Finales
            </button>
          </div>

          {/* Controls: Search and Group Filter */}
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar alumno o matrícula..."
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500"
            />

            <select
              value={selectedGrupo}
              onChange={(e) => setSelectedGrupo(e.target.value)}
              className="px-4 py-2 rounded-xl bg-[#090D16] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="todos">Todos los Grupos</option>
              <option value="101">Grupo 101 (Lic. Ciencias de Datos)</option>
              <option value="102">Grupo 102 (Lic. Ciencias de Datos)</option>
              <option value="201">Grupo 201 (Lic. TIC)</option>
              <option value="301">Grupo 301 (Lic. TIC)</option>
              <option value="501">Grupo 501 (Lic. Ciberseguridad)</option>
            </select>
          </div>
        </div>

        {/* TAB 1: ASISTENCIAS */}
        {activeTab === 'asistencias' && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-3">Alumno</th>
                  <th className="p-3">Matrícula</th>
                  <th className="p-3">Carrera / Materia</th>
                  <th className="p-3">Grupo</th>
                  <th className="p-3">Asistencia de Hoy</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-black/20">
                {filteredAlumnos.map(al => {
                  const status = getStudentTodayStatus(al.id);
                  return (
                    <tr key={al.id} className="hover:bg-white/5">
                      <td className="p-3">
                        <div className="font-bold text-white">{al.nombre} {al.apellido_paterno} {al.apellido_materno}</div>
                        <div className="text-[10px] text-gray-500">Tutor: {al.tutor}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{al.matricula}</td>
                      <td className="p-3">
                        <div className="font-medium text-white">{al.carrera}</div>
                        <div className="text-[10px] text-gray-400">{al.grado}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 text-[11px]">
                          Grupo {al.grupo}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={async () => {
                            await db.registrarAsistencia(al.matricula, undefined, 'Consola Docente', 'Aula', user?.nombre || 'Docente');
                            loadData();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-all shadow"
                        >
                          ⚡ Presente
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: PARTICIPACIONES */}
        {activeTab === 'participaciones' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <p>Registro de Participación en clase: <span className="text-emerald-400 font-bold">AP (Aprobada / Excelente - 10 pts)</span> | <span className="text-amber-400 font-bold">RP (Requerido / Por mejorar - 5 pts)</span></p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Alumno</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3">Historial de Participaciones</th>
                    <th className="p-3 text-right">Registrar Nueva</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {filteredAlumnos.map(al => {
                    const studentParts = participaciones.filter(p => p.alumno_id === al.id || p.alumno?.id === al.id);
                    return (
                      <tr key={al.id} className="hover:bg-white/5">
                        <td className="p-3">
                          <div className="font-bold text-white">{al.nombre} {al.apellido_paterno} {al.apellido_materno}</div>
                          <div className="text-[10px] font-mono text-emerald-400">{al.matricula}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-white/5 text-gray-300 font-bold">G-{al.grupo}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            {studentParts.length === 0 ? (
                              <span className="text-[11px] text-gray-500 italic">Sin registros aun</span>
                            ) : (
                              studentParts.map(p => (
                                <span
                                  key={p.id}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    p.tipo === 'AP' 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  }`}
                                  title={p.observaciones}
                                >
                                  {p.tipo} ({p.fecha})
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => handleAddParticipacion(al.id, 'AP')}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all"
                          >
                            + AP (10 pts)
                          </button>
                          <button
                            onClick={() => handleAddParticipacion(al.id, 'RP')}
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition-all"
                          >
                            + RP (5 pts)
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TAREAS */}
        {activeTab === 'tareas' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
              📝 **Ponderación de Tareas**: 20% de la calificación final del periodo. Se muestran entregas activas.
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Alumno</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3">Tarea 1: Práctica SQL / Código</th>
                    <th className="p-3">Tarea 2: Documentación</th>
                    <th className="p-3 text-right">Promedio Tareas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {filteredAlumnos.map(al => (
                    <tr key={al.id} className="hover:bg-white/5">
                      <td className="p-3 font-bold text-white">{al.nombre} {al.apellido_paterno}</td>
                      <td className="p-3 text-gray-400">Grupo {al.grupo}</td>
                      <td className="p-3 text-emerald-400 font-bold">10.0 (Entregado)</td>
                      <td className="p-3 text-emerald-400 font-bold">10.0 (Entregado)</td>
                      <td className="p-3 text-right font-bold text-blue-400">10.0 / 10</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PROYECTOS */}
        {activeTab === 'proyectos' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
              📊 **Proyectos Integradores**: 25% de la calificación final del semestre.
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Alumno</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3">Proyecto Final de Asignatura</th>
                    <th className="p-3">Calificación Proyecto</th>
                    <th className="p-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {filteredAlumnos.map(al => (
                    <tr key={al.id} className="hover:bg-white/5">
                      <td className="p-3 font-bold text-white">{al.nombre} {al.apellido_paterno}</td>
                      <td className="p-3 text-gray-400">Grupo {al.grupo}</td>
                      <td className="p-3 text-gray-300">Desarrollo Web / Sistema BD UNRC</td>
                      <td className="p-3 font-mono font-bold text-purple-400">10.0</td>
                      <td className="p-3 text-right"><span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Calificado</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUTOEVALUACION */}
        {activeTab === 'autoevaluacion' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              👤 **Autoevaluación del Alumno**: 15% de la ponderación global. Reflexión del propio desempeño.
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Alumno</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3">Puntaje Asignado</th>
                    <th className="p-3">Reflexión / Comentario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {filteredAlumnos.map(al => (
                    <tr key={al.id} className="hover:bg-white/5">
                      <td className="p-3 font-bold text-white">{al.nombre} {al.apellido_paterno}</td>
                      <td className="p-3 text-gray-400">Grupo {al.grupo}</td>
                      <td className="p-3 font-bold text-amber-400">10.0 / 10</td>
                      <td className="p-3 text-gray-400 italic">"Demostré compromiso en las sesiones presenciales y entregué las prácticas completas."</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: RESUMEN Y CALIFICACIONES FINALES */}
        {activeTab === 'resumen' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Alumno</th>
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Carrera / Materia</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3 text-center">Asist. (20%)</th>
                    <th className="p-3 text-center">Part. (20%)</th>
                    <th className="p-3 text-center">Tareas (20%)</th>
                    <th className="p-3 text-center">Proy. (25%)</th>
                    <th className="p-3 text-center">AutoEv. (15%)</th>
                    <th className="p-3 text-right">Calificación Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {filteredResumen.map(r => (
                    <tr key={r.alumno_id} className="hover:bg-white/5">
                      <td className="p-3 font-bold text-white">{r.nombre_completo}</td>
                      <td className="p-3 font-mono text-emerald-400 font-bold">{r.matricula}</td>
                      <td className="p-3">
                        <div className="font-medium text-white">{r.carrera}</div>
                        <div className="text-[10px] text-gray-400">{r.materia}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                          {r.grupo}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-400">{r.porcentaje_asistencia}%</td>
                      <td className="p-3 text-center font-bold text-blue-400">{r.promedio_participacion} pts</td>
                      <td className="p-3 text-center text-gray-300">10.0</td>
                      <td className="p-3 text-center text-purple-400 font-bold">10.0</td>
                      <td className="p-3 text-center text-amber-400 font-bold">10.0</td>
                      <td className="p-3 text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold shadow ${
                          r.calificacion_final >= 8.0 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {r.calificacion_final} / 10
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
