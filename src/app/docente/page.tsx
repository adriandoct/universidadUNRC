"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, Alumno, Asistencia } from '../../lib/db';
import { useAuth } from '../../lib/AuthContext';

export default function DocentePage() {
  const { user, role, openAuthModal } = useAuth();
  
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [manualScanInput, setManualScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      const aList = await db.getAlumnos();
      const logs = await db.getAsistencias();
      setAlumnos(aList);
      setAsistencias(logs);
    } catch (e) {
      console.error('Error fetching docente data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAlumnos = alumnos.filter(al => {
    const matchesGroup = selectedGrupo === 'todos' || al.grupo === selectedGrupo;
    const matchesSearch = searchQuery === '' || 
      `${al.nombre} ${al.apellido_paterno} ${al.matricula}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const getStudentTodayStatus = (alumnoId: string) => {
    const todayLogs = asistencias.filter(a => (a.alumno_id === alumnoId || a.alumno?.id === alumnoId) && a.fecha === todayStr);
    if (todayLogs.length === 0) return { label: 'Ausente / Pendiente', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    const lastLog = todayLogs[0]; // sorted descending
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
          Ingresa con tu cuenta de Gmail institucional o Número de Empleado para gestionar asistencias y pasar lista en aula.
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
              <span>👨‍🏫 Módulo de Control de Aula UNRC</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Bienvenido, <span className="text-blue-400">{user?.nombre || 'Docente'}</span>
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Pase de lista automatizado mediante código QR, consulta de asistencia de tus alumnos por grupo y alertas directas por WhatsApp.
            </p>
          </div>

          <Link
            href="/scanner"
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold text-sm shadow-xl shadow-blue-600/20 transition-all flex items-center space-x-3 shrink-0"
          >
            <span className="text-xl">🎥</span>
            <span>Abrir Escáner QR de Aula</span>
          </Link>
        </div>
      </div>

      {/* Control Bar: Manual Check-In & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Manual Check-In */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <span>⚡ Registro Rápido por Matrícula</span>
          </h3>

          <form onSubmit={handleManualCheckIn} className="space-y-3">
            <input
              type="text"
              value={manualScanInput}
              onChange={(e) => setManualScanInput(e.target.value)}
              placeholder="Ej: UNRC-2026-001"
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
              ? '✅ Notificaciones automáticas por WhatsApp activas. El tutor recibirá un mensaje inmediato cada vez que se escanee el QR del alumno.'
              : '⏸️ Notificaciones desactivadas temporariamente.'}
          </p>
        </div>

        {/* Attendance Rate */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-2 flex flex-col justify-center">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asistencia General de Hoy</div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {alumnos.length > 0
              ? `${Math.round((asistencias.filter(a => a.fecha === todayStr && a.tipo === 'entrada').length / alumnos.length) * 100)}%`
              : '0%'}
          </div>
          <p className="text-[11px] text-gray-500">
            {asistencias.filter(a => a.fecha === todayStr && a.tipo === 'entrada').length} de {alumnos.length} alumnos registrados en campus.
          </p>
        </div>

      </div>

      {/* Roster & Attendance Table */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Lista de Alumnos Asignados ({filteredAlumnos.length})</h3>
            <p className="text-xs text-gray-400">Pase de lista y estado en tiempo real</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o matrícula..."
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500"
            />

            {/* Filter by Group */}
            <select
              value={selectedGrupo}
              onChange={(e) => setSelectedGrupo(e.target.value)}
              className="px-4 py-2 rounded-xl bg-[#090D16] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="todos">Todos los Grupos</option>
              <option value="101">Grupo 101</option>
              <option value="302">Grupo 302</option>
              <option value="501">Grupo 501</option>
            </select>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3">Alumno</th>
                <th className="p-3">Matrícula</th>
                <th className="p-3">Grupo / Carrera</th>
                <th className="p-3">Estado de Hoy</th>
                <th className="p-3 text-right">Acción Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-black/20">
              {filteredAlumnos.map(al => {
                const status = getStudentTodayStatus(al.id);
                return (
                  <tr key={al.id} className="hover:bg-white/5">
                    <td className="p-3">
                      <div className="flex items-center space-x-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={al.foto_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200'}
                          alt={al.nombre}
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                        />
                        <div>
                          <div className="font-bold text-white">{al.nombre} {al.apellido_paterno} {al.apellido_materno}</div>
                          <div className="text-[10px] text-gray-500">Tutor: {al.tutor}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-mono font-bold text-emerald-400">{al.matricula}</td>
                    
                    <td className="p-3">
                      <div className="font-medium text-white">{al.grupo} ({al.grado})</div>
                      <div className="text-[10px] text-gray-400">{al.carrera || 'Universidad Rosario Castellanos'}</div>
                    </td>

                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${status.color}`}>
                        {status.label}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={async () => {
                          await db.registrarAsistencia(al.matricula, undefined, 'Consola Docente UNRC', 'Aula Principal', user?.nombre || 'Docente');
                          loadData();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-all shadow"
                      >
                        ⚡ Tomar Asistencia
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
