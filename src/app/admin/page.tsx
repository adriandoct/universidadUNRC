"use client";

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db, isSupabaseConfigured, Alumno, Docente, ResumenAcademico, Asistencia, Participacion } from '../../lib/db';
import { useAuth } from '../../lib/AuthContext';

export default function AdminPage() {
  const { role, openAuthModal } = useAuth();
  
  // Custom Database connection override inputs
  const [dbUrlInput, setDbUrlInput] = useState('https://uyqkxqlovxkgurnuxnfd.supabase.co');
  const [dbKeyInput, setDbKeyInput] = useState('sb_publishable_F-KMTWS6SQt_hOvo9UGK4A_gbDsM0SQ');
  const [customConnected, setCustomConnected] = useState(false);

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'gestion' | 'upload' | 'preview' | 'schema' | 'stats'>('gestion');

  // Academic Management States
  const [alumnosList, setAlumnosList] = useState<Alumno[]>([]);
  const [resumenList, setResumenList] = useState<ResumenAcademico[]>([]);
  const [asistenciasList, setAsistenciasList] = useState<Asistencia[]>([]);
  const [participacionesList, setParticipacionesList] = useState<Participacion[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing Modal State
  const [editingAlumno, setEditingAlumno] = useState<Alumno | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // File Upload & Data States
  const [selectedTable, setSelectedTable] = useState<'alumnos' | 'docentes'>('alumnos');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Syncing progress & logs
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncSuccess, setSyncSuccess] = useState<boolean | null>(null);

  // Live Database Table Statistics
  const [stats, setStats] = useState({ alumnosCount: 0, docentesCount: 0, asistenciasCount: 0 });
  const [sqlSchemaCode, setSqlSchemaCode] = useState('');

  // Fetch all database records
  const loadAllData = async () => {
    try {
      const alumnos = await db.getAlumnos();
      const docentes = await db.getDocentes();
      const asistencias = await db.getAsistencias();
      const participaciones = await db.getParticipaciones();
      const resumen = await db.getResumenAcademico(selectedGrupo);

      setAlumnosList(alumnos);
      setAsistenciasList(asistencias);
      setParticipacionesList(participaciones);
      setResumenList(resumen);

      setStats({
        alumnosCount: alumnos.length,
        docentesCount: docentes.length,
        asistenciasCount: asistencias.length
      });
    } catch (e) {
      console.error('Error loading admin data:', e);
    }
  };

  useEffect(() => {
    loadAllData();

    // Load schema text preview
    fetch('/supabase_schema.sql')
      .then(res => res.text())
      .then(text => setSqlSchemaCode(text))
      .catch(() => {
        setSqlSchemaCode(`-- Database Schema for UNRC\nCREATE TABLE alumnos (...);\nCREATE TABLE docentes (...);`);
      });
  }, [selectedGrupo]);

  // Filter Alumnos based on Group & Search Query
  const filteredAlumnos = alumnosList.filter(al => {
    const matchesGrupo = selectedGrupo === 'todos' || al.grupo === selectedGrupo || al.grupo_id === selectedGrupo;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      al.nombre.toLowerCase().includes(q) ||
      al.apellido_paterno.toLowerCase().includes(q) ||
      (al.apellido_materno && al.apellido_materno.toLowerCase().includes(q)) ||
      al.matricula.toLowerCase().includes(q) ||
      (al.carrera && al.carrera.toLowerCase().includes(q));

    return matchesGrupo && matchesSearch;
  });

  // Handle Quick Attendance Toggle (Presente, Retardo, Justificado, Ausente)
  const handleAttendanceToggle = async (alumno: Alumno, estado: 'A' | 'R' | 'J' | 'F') => {
    try {
      await db.registrarAsistencia(
        alumno.matricula,
        'entrada',
        'Consola Administrador',
        'Campus UNRC',
        'Administrador de Sistema'
      );
      await loadAllData();
    } catch (e: any) {
      alert(`Error al registrar asistencia: ${e.message}`);
    }
  };

  // Handle Quick Participation Add
  const handleParticipationAdd = async (alumnoId: string, tipo: 'AP' | 'RP') => {
    try {
      await db.registrarParticipacion(alumnoId, tipo, tipo === 'AP' ? 'Aprobada por Administrador' : 'Requerida por Administrador');
      await loadAllData();
      alert(`Participación ${tipo} registrada exitosamente.`);
    } catch (e: any) {
      alert(`Error al registrar participación: ${e.message}`);
    }
  };

  // Save Student Modifications
  const handleSaveStudent = async () => {
    if (!editingAlumno) return;
    setIsSaving(true);
    try {
      await db.updateAlumno(editingAlumno.id, {
        nombre: editingAlumno.nombre,
        apellido_paterno: editingAlumno.apellido_paterno,
        apellido_materno: editingAlumno.apellido_materno,
        matricula: editingAlumno.matricula,
        carrera: editingAlumno.carrera,
        grupo: editingAlumno.grupo,
        grado: editingAlumno.grado,
        tutor: editingAlumno.tutor,
        telefono: editingAlumno.telefono
      });

      alert('✅ Datos del alumno actualizados correctamente.');
      setEditingAlumno(null);
      await loadAllData();
    } catch (e: any) {
      alert(`❌ Error al guardar cambios: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente al alumno ${nombre}?`)) return;
    try {
      await db.deleteAlumno(id);
      await loadAllData();
      alert(`Alumno ${nombre} eliminado.`);
    } catch (e: any) {
      alert(`Error al eliminar alumno: ${e.message}`);
    }
  };

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    setSyncLogs([]);
    setSyncSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (json.length === 0) {
          alert('El archivo no contiene filas de datos.');
          setIsParsing(false);
          return;
        }

        const headers = Object.keys(json[0]);
        setColumnHeaders(headers);
        setParsedRows(json);
        setActiveTab('preview');
      } catch (err: any) {
        alert('Error al leer el archivo Excel/CSV: ' + err.message);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Perform Push / Sync to Database
  const handleSyncToDatabase = async () => {
    if (parsedRows.length === 0) {
      alert('Primero debes seleccionar y cargar un archivo de base de datos.');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(10);
    setSyncLogs(['🚀 Iniciando proceso de lectura y normalización de registros...']);

    try {
      if (selectedTable === 'alumnos') {
        const formattedAlumnos: Omit<Alumno, 'id' | 'created_at'>[] = parsedRows.map((row, i) => ({
          matricula: row.matricula || row.Matricula || row['MATRICULA'] || `UNRC-2026-${String(i + 1).padStart(3, '0')}`,
          nombre: row.nombre || row.Nombre || row['NOMBRE'] || 'Alumno Sin Nombre',
          apellido_paterno: row.apellido_paterno || row.ApellidoPaterno || row['APELLIDO_PATERNO'] || row.apellido || 'Sin Apellido',
          apellido_materno: row.apellido_materno || row.ApellidoMaterno || row['APELLIDO_MATERNO'] || '',
          grado: String(row.grado || row.Grado || row['GRADO'] || '1° Semestre'),
          grupo: String(row.grupo || row.Grupo || row['GRUPO'] || '101'),
          carrera: row.carrera || row.Carrera || row['CARRERA'] || 'Universidad Rosario Castellanos',
          tutor: row.tutor || row.Tutor || row['TUTOR'] || 'Tutor Institucional',
          telefono: String(row.telefono || row.Telefono || row['TELEFONO'] || '+525500000000'),
          foto_url: row.foto_url || row.Foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
          qr_code: row.qr_code || row.matricula || row.Matricula || `UNRC-2026-${String(i + 1).padStart(3, '0')}`
        }));

        setSyncProgress(50);
        setSyncLogs(prev => [...prev, `📦 ${formattedAlumnos.length} alumnos preparados para subir a la Base de Datos.`]);

        const res = await db.syncToSupabase(
          { alumnos: formattedAlumnos as any },
          customConnected ? dbUrlInput : undefined,
          customConnected ? dbKeyInput : undefined
        );

        setSyncLogs(prev => [...prev, ...res.logs]);
        setSyncSuccess(res.success);
      } else {
        const formattedDocentes: Omit<Docente, 'id' | 'created_at'>[] = parsedRows.map((row, i) => ({
          num_empleado: row.num_empleado || row.NumEmpleado || row['NUM_EMPLEADO'] || `DOC-UNRC-${String(i + 1).padStart(2, '0')}`,
          nombre: row.nombre || row.Nombre || 'Docente Sin Nombre',
          apellido_paterno: row.apellido_paterno || row.ApellidoPaterno || 'Sin Apellido',
          apellido_materno: row.apellido_materno || row.ApellidoMaterno || '',
          email: row.email || row.Email || `docente.${i}@rcastellanos.cdmx.gob.mx`,
          departamento: row.departamento || row.Departamento || 'Licenciaturas UNRC',
          materias: row.materias ? String(row.materias).split(',') : ['Ciencias de Datos'],
          telefono: String(row.telefono || '+525500000000'),
          foto_url: row.foto_url
        }));

        setSyncProgress(50);
        setSyncLogs(prev => [...prev, `📦 ${formattedDocentes.length} docentes preparados para subir a la Base de Datos.`]);

        const res = await db.syncToSupabase(
          { docentes: formattedDocentes as any },
          customConnected ? dbUrlInput : undefined,
          customConnected ? dbKeyInput : undefined
        );

        setSyncLogs(prev => [...prev, ...res.logs]);
        setSyncSuccess(res.success);
      }

      setSyncProgress(100);
      await loadAllData();
    } catch (e: any) {
      setSyncLogs(prev => [...prev, `❌ Error fatal durante la carga: ${e.message}`]);
      setSyncSuccess(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        matricula: 'UNRC-2026-101',
        nombre: 'Ana María',
        apellido_paterno: 'García',
        apellido_materno: 'Ríos',
        grado: '1° Semestre',
        grupo: '101',
        carrera: 'Lic. en Inteligencia Artificial',
        tutor: 'Sra. Elena Ríos',
        telefono: '+525511223344'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos_UNRC');
    XLSX.writeFile(wb, 'Plantilla_Alumnos_UNRC_BaseDeDatos.xlsx');
  };

  if (role !== 'administrador') {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl mx-auto">
          🔒
        </div>
        <h1 className="text-3xl font-bold text-white">Acceso Reservado para Administrador de Base de Datos</h1>
        <p className="text-gray-400 max-w-md mx-auto">
          Esta consola está diseñada exclusivamente para que el Administrador gestione, edite y sincronice los registros académicos.
        </p>
        <button
          onClick={() => openAuthModal('administrador')}
          className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-lg shadow-amber-600/30 transition-all"
        >
          🔑 Iniciar Sesión como Administrador
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#090D16] to-[#052219] p-8 border border-amber-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <span>⚡ Consola Senior de Edición & Administración de Datos</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Gestión y Edición de Base de Datos <span className="text-amber-400">UNRC</span>
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl">
              Modulo de edición completa para el Administrador. Visualiza y edita en tiempo real la información de alumnos, grupos, asistencias y participaciones.
            </p>
          </div>

          {/* Connection Status Badge */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-left space-y-1 shrink-0 min-w-[240px]">
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${isSupabaseConfigured || customConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-xs font-bold text-white">
                {isSupabaseConfigured || customConnected ? 'Conectado a Supabase' : 'Modo Sandbox Activo'}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 truncate">
              {process.env.NEXT_PUBLIC_SUPABASE_URL || (customConnected ? dbUrlInput : 'Servidor de Datos')}
            </div>
            <div className="text-[10px] text-amber-400 font-semibold pt-1">
              {stats.alumnosCount} alumnos • {stats.docentesCount} docentes en BD
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('gestion')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'gestion'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          <span>✏️ 1. Ver y Editar Registros ({filteredAlumnos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'upload'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          <span>📤 2. Cargar Archivo Excel / CSV</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          disabled={parsedRows.length === 0}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'preview'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-40'
          }`}
        >
          <span>👀 Previsualización ({parsedRows.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'stats'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          <span>📊 Métricas de Tablas</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'schema'
              ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          <span>📜 Script SQL Editor</span>
        </button>
      </div>

      {/* TAB: GESTION Y EDICION COMPLETA */}
      {activeTab === 'gestion' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
            
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Edición de Alumnos y Evaluaciones</span>
                </h3>
                <p className="text-xs text-gray-400">Filtra por grupo o busca por nombre/matrícula para modificar datos directamente en Supabase</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar alumno o matrícula..."
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-amber-500 w-full sm:w-64"
                />

                <select
                  value={selectedGrupo}
                  onChange={(e) => setSelectedGrupo(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-[#090D16] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="todos">Todos los Grupos</option>
                  <option value="101">Grupo 101 (Lic. Ciencias de Datos)</option>
                  <option value="102">Grupo 102 (Lic. Ciencias de Datos)</option>
                  <option value="201">Grupo 201 (Lic. TIC)</option>
                  <option value="201-TUR">Grupo 201 (Lic. Turismo)</option>
                  <option value="203-ADM">Grupo 203 (Lic. Administración)</option>
                  <option value="301">Grupo 301 (Lic. TIC)</option>
                  <option value="501">Grupo 501 (Lic. Ciberseguridad)</option>
                </select>
              </div>
            </div>

            {/* Table of Alumnos for Admin Editing */}
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">Alumno</th>
                    <th className="p-3">Matrícula</th>
                    <th className="p-3">Carrera / Semestre</th>
                    <th className="p-3">Grupo</th>
                    <th className="p-3">Asistencia Rápida</th>
                    <th className="p-3">Participación</th>
                    <th className="p-3 text-right">Acciones de Edición</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {filteredAlumnos.map((al) => {
                    const res = resumenList.find(r => r.alumno_id === al.id || r.matricula === al.matricula);

                    return (
                      <tr key={al.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-semibold text-white">
                          <div>{al.nombre} {al.apellido_paterno} {al.apellido_materno || ''}</div>
                          <div className="text-[10px] text-gray-500 font-normal">Tutor: {al.tutor || 'Sin tutor'}</div>
                        </td>
                        <td className="p-3 font-mono text-amber-400 font-bold">{al.matricula}</td>
                        <td className="p-3">
                          <div>{al.carrera || 'Licenciatura UNRC'}</div>
                          <div className="text-[10px] text-gray-500">{al.grado || '1° Semestre'}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold">
                            Grupo {al.grupo}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleAttendanceToggle(al, 'A')}
                              className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold"
                              title="Marcar Asistencia (A)"
                            >
                              ⚡ A
                            </button>
                            <button
                              onClick={() => handleAttendanceToggle(al, 'R')}
                              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 text-[10px] font-bold"
                              title="Marcar Retardo (R)"
                            >
                              ⏱️ R
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleParticipationAdd(al.id, 'AP')}
                              className="px-2 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-[10px] font-bold"
                              title="Asignar Participación Aprobada (+10)"
                            >
                              + AP
                            </button>
                            <button
                              onClick={() => handleParticipationAdd(al.id, 'RP')}
                              className="px-2 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-[10px] font-bold"
                              title="Asignar Participación Requerida (+5)"
                            >
                              + RP
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => setEditingAlumno(al)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-xs border border-amber-500/30 transition-all"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(al.id, `${al.nombre} ${al.apellido_paterno}`)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs border border-rose-500/30 transition-all"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredAlumnos.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-xs">
                No se encontraron alumnos para el grupo o término de búsqueda seleccionado.
              </div>
            )}

          </div>
        </div>
      )}

      {/* EDIT MODAL FOR ADMIN */}
      {editingAlumno && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl border border-amber-500/30 max-w-lg w-full space-y-6 shadow-2xl animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>✏️ Editar Alumno (Administrador)</span>
              </h3>
              <button
                onClick={() => setEditingAlumno(null)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Nombre(s)</label>
                <input
                  type="text"
                  value={editingAlumno.nombre}
                  onChange={(e) => setEditingAlumno({ ...editingAlumno, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Apellido Paterno</label>
                  <input
                    type="text"
                    value={editingAlumno.apellido_paterno}
                    onChange={(e) => setEditingAlumno({ ...editingAlumno, apellido_paterno: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Apellido Materno</label>
                  <input
                    type="text"
                    value={editingAlumno.apellido_materno || ''}
                    onChange={(e) => setEditingAlumno({ ...editingAlumno, apellido_materno: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Matrícula</label>
                  <input
                    type="text"
                    value={editingAlumno.matricula}
                    onChange={(e) => setEditingAlumno({ ...editingAlumno, matricula: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-amber-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Grupo</label>
                  <input
                    type="text"
                    value={editingAlumno.grupo}
                    onChange={(e) => setEditingAlumno({ ...editingAlumno, grupo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Carrera</label>
                <input
                  type="text"
                  value={editingAlumno.carrera || ''}
                  onChange={(e) => setEditingAlumno({ ...editingAlumno, carrera: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Semestre / Grado</label>
                  <input
                    type="text"
                    value={editingAlumno.grado || ''}
                    onChange={(e) => setEditingAlumno({ ...editingAlumno, grado: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Tutor</label>
                  <input
                    type="text"
                    value={editingAlumno.tutor || ''}
                    onChange={(e) => setEditingAlumno({ ...editingAlumno, tutor: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setEditingAlumno(null)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveStudent}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: UPLOAD AREA */}
      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Upload Box */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-8 rounded-3xl border border-white/10 space-y-6">
              
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>📁 Seleccionar Tabla de Destino en la Base de Datos</span>
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedTable('alumnos')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedTable === 'alumnos' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400'
                    }`}
                  >
                    🎓 Tabla Alumnos
                  </button>
                  <button
                    onClick={() => setSelectedTable('docentes')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedTable === 'docentes' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'
                    }`}
                  >
                    👨‍🏫 Tabla Docentes
                  </button>
                </div>
              </div>

              {/* Drag & Drop Upload Container */}
              <div className="relative border-2 border-dashed border-amber-500/30 hover:border-amber-400 rounded-3xl p-10 text-center bg-amber-500/5 hover:bg-amber-500/10 transition-all cursor-pointer group">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv, .json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto group-hover:scale-110 transition-transform text-amber-300 shadow-lg shadow-amber-500/20">
                    📊
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Arrastra o selecciona tu archivo Excel o CSV</h4>
                    <p className="text-xs text-gray-400 mt-1">Soporta formatos <code className="text-amber-400 font-bold">.xlsx</code>, <code className="text-amber-400 font-bold">.csv</code> o <code className="text-amber-400 font-bold">.json</code></p>
                  </div>
                  <span className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs shadow-md">
                    Examinar Archivos de Mi Equipo
                  </span>
                </div>
              </div>

              {/* Sample Excel Helper */}
              <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
                <span>¿No tienes una plantilla? Descarga un archivo de prueba configurado para la Base de Datos:</span>
                <button
                  onClick={downloadSampleExcel}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 font-semibold border border-amber-500/20 transition-colors"
                >
                  📥 Descargar Plantilla .xlsx
                </button>
              </div>

            </div>
          </div>

          {/* Right Panel: Database Custom Config */}
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>⚙️ Configuración Directa de Servidor de Datos</span>
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Si deseas sincronizar con tu propio servidor remoto de base de datos, ingresa la URL y la Key de acceso:
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">DATABASE_URL</label>
                  <input
                    type="text"
                    value={dbUrlInput}
                    onChange={(e) => setDbUrlInput(e.target.value)}
                    placeholder="https://tu-servidor-db.co"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">DATABASE_ANON_KEY</label>
                  <input
                    type="password"
                    value={dbKeyInput}
                    onChange={(e) => setDbKeyInput(e.target.value)}
                    placeholder="Key de acceso..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={() => {
                    if (dbUrlInput && dbKeyInput) {
                      setCustomConnected(true);
                      alert('✅ Credenciales de Base de Datos aplicadas.');
                    } else {
                      alert('Ingresa la URL y la Key del Servidor.');
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/10"
                >
                  Conectar a Servidor Remoto
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: PREVIEW & SYNC */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Previsualización de Registros Parsed ({parsedRows.length} filas)</span>
                </h3>
                <p className="text-xs text-gray-400">Archivo: <span className="text-amber-400 font-mono">{fileName}</span> | Destino: <span className="text-emerald-400 font-bold uppercase">{selectedTable}</span></p>
              </div>

              <button
                onClick={handleSyncToDatabase}
                disabled={isSyncing}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 hover:from-emerald-400 hover:to-amber-400 text-black font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <span>{isSyncing ? '⏳ Sincronizando...' : '🚀 Sincronizar Registros a Base de Datos'}</span>
              </button>
            </div>

            {/* Sync Progress Bar */}
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-amber-300 font-bold">
                  <span>Procesando lote de base de datos...</span>
                  <span>{syncProgress}%</span>
                </div>
                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-amber-400 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${syncProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Sync Logs Console */}
            {syncLogs.length > 0 && (
              <div className="p-4 rounded-2xl bg-black/80 border border-white/10 font-mono text-xs text-emerald-400 space-y-1 max-h-40 overflow-y-auto">
                {syncLogs.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            )}

            {/* Table Preview */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="p-3">#</th>
                    {columnHeaders.map((col, idx) => (
                      <th key={idx} className="p-3">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {parsedRows.slice(0, 50).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-white/5">
                      <td className="p-3 text-gray-500 font-mono">{rIdx + 1}</td>
                      {columnHeaders.map((col, cIdx) => (
                        <td key={cIdx} className="p-3 font-medium truncate max-w-[200px]">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedRows.length > 50 && (
              <p className="text-center text-xs text-gray-500">Mostrando las primeras 50 filas de {parsedRows.length} encontradas en el archivo.</p>
            )}

          </div>
        </div>
      )}

      {/* TAB 4: TABLE STATISTICS */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 space-y-3">
            <div className="text-3xl font-extrabold text-emerald-400">{stats.alumnosCount}</div>
            <div className="text-sm font-bold text-white">Alumnos Registrados en BD</div>
            <p className="text-xs text-gray-400">Registros sincronizados en la tabla de alumnos de la Base de Datos.</p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-blue-500/20 space-y-3">
            <div className="text-3xl font-extrabold text-blue-400">{stats.docentesCount}</div>
            <div className="text-sm font-bold text-white">Docentes Registrados en BD</div>
            <p className="text-xs text-gray-400">Profesores con perfil activo para pase de lista con código QR.</p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-amber-500/20 space-y-3">
            <div className="text-3xl font-extrabold text-amber-400">{stats.asistenciasCount}</div>
            <div className="text-sm font-bold text-white">Logs de Asistencia Registrados</div>
            <p className="text-xs text-gray-400">Entradas y salidas escaneadas por QR en el campus.</p>
          </div>
        </div>
      )}

      {/* TAB 5: SQL SCHEMA EDITOR */}
      {activeTab === 'schema' && (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Esquema SQL de la Base de Datos (SQL Script)</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(sqlSchemaCode);
                alert('¡Script SQL copiado al portapapeles!');
              }}
              className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs hover:bg-amber-500/30 transition-all border border-amber-500/30"
            >
              📋 Copiar Código SQL
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-black/90 border border-white/10 font-mono text-xs text-emerald-400 overflow-x-auto max-h-96">
            {sqlSchemaCode}
          </pre>
        </div>
      )}

    </div>
  );
}
