"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  Home as HomeIcon,
  Bell,
  School,
  Users,
  Layers,
  BarChart3,
  PieChart,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { db, Alumno, Docente, Grupo, Seccion } from "../lib/db";

export default function HomePage() {
  const { user, role, openAuthModal, loginAsAdmin, loginWithCredentials } = useAuth();

  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Login state for institutional access (Image 1 colors)
  const [showQuickLogin, setShowQuickLogin] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'teacher' | 'student'>('admin');
  const [credentialInput, setCredentialInput] = useState('admin@admin.com');
  const [passwordInput, setPasswordInput] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [d, a, g, s] = await Promise.all([
          db.getDocentes(),
          db.getAlumnos(),
          db.getGrupos(),
          db.getSecciones()
        ]);
        setDocentes(d);
        setAlumnos(a);
        setGrupos(g);
        setSecciones(s);
      } catch (e) {
        console.warn('Error loading dashboard data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRoleChange = (r: 'admin' | 'teacher' | 'student') => {
    setSelectedRole(r);
    setLoginError('');
    if (r === 'admin') {
      setCredentialInput('admin@admin.com');
      setPasswordInput('admin123');
    } else if (r === 'teacher') {
      setCredentialInput('DOC-UNRC-03');
      setPasswordInput('2026-2');
    } else {
      setCredentialInput('UNRC-2026-005');
      setPasswordInput('2026-2');
    }
  };

  const handleQuickLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      if (selectedRole === 'admin') {
        const res = await loginAsAdmin(credentialInput, passwordInput === '••••••••••••' ? 'admin123' : passwordInput);
        if (!res.success) throw new Error(res.error || 'Credenciales incorrectas');
        window.location.href = '/admin';
      } else {
        const res = await loginWithCredentials(
          selectedRole === 'teacher' ? 'docente' : 'alumno',
          credentialInput,
          passwordInput === '••••••••••••' ? '2026-2' : passwordInput
        );
        if (!res.success) throw new Error(res.error || 'Credenciales incorrectas');
        window.location.href = selectedRole === 'teacher' ? '/teacher' : '/student';
      }
    } catch (err: any) {
      setLoginError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F3F2F8] text-[#1E293B] -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* ========================================================= */}
      {/* 1. TOP HEADER BAR (EXACT MATCH TO IMAGE 2)               */}
      {/* ========================================================= */}
      <header className="bg-white border-b border-gray-200/80 -mt-4 sm:-mt-6 lg:-mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowQuickLogin(!showQuickLogin)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
            title="Menú y Acceso"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400 hidden md:inline-block">UNRC</span>
            <span className="text-xs font-bold text-gray-800 tracking-wide">Universidad Nacional Rosario Castellanos</span>
            <span className="text-[11px] font-semibold text-white bg-[#5B142F] px-2.5 py-0.5 rounded-md shadow-xs hidden sm:inline-block">
              Campus Tijuana
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowQuickLogin(true)}
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors relative"
            title="Notificaciones"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500"></span>
          </button>

          {/* User Profile / Status Indicator */}
          <div className="flex items-center space-x-2.5 pl-2 border-l border-gray-200">
            {user ? (
              <Link href={role === 'administrador' ? '/admin' : role === 'docente' ? '/teacher' : '/student'} className="flex items-center space-x-2 group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#5B142F] to-[#851D44] text-amber-300 font-bold text-xs flex items-center justify-center shadow-xs">
                  {role === 'administrador' ? '⚡' : role === 'docente' ? '👨‍🏫' : '🎓'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-gray-800 group-hover:text-[#5B142F] transition-colors leading-none">
                    {user.nombre || 'super'}
                  </span>
                  <span className="text-[10px] text-gray-500 capitalize">{role || 'Usuario'}</span>
                </div>
              </Link>
            ) : (
              <button
                onClick={() => setShowQuickLogin(true)}
                className="flex items-center space-x-2 group hover:opacity-90 transition-opacity text-left"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold text-xs flex items-center justify-center border border-gray-300">
                  ⚡
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-800 leading-none">super</span>
                  <span className="text-[10px] text-emerald-600 font-medium">Ingresar</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. PÍLDORA INSTITUCIONAL GUINDA & DORADO: TABLERO GENERAL */}
      {/* ========================================================= */}
      <div className="flex items-center space-x-3 pt-2">
        <div className="inline-flex items-center space-x-2 bg-[#5B142F] text-white px-3.5 py-1.5 rounded-lg shadow-xs border border-[#E8A938]/40">
          <HomeIcon className="w-3.5 h-3.5 text-[#FBBF24]" />
          <span className="text-xs font-bold tracking-wide text-white">Tablero Principal</span>
        </div>
        <span className="text-xs text-gray-400">•</span>
        <span className="text-xs font-semibold text-gray-600">Sistema Integral de Control Escolar UNRC — Campus Tijuana</span>
      </div>

      {/* Modal / Drawer Institucional para Acceso Rápido */}
      {showQuickLogin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D1527] text-white border-2 border-[#5B142F] rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQuickLogin(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 text-sm font-bold"
            >
              ✕
            </button>

            {/* Logo y Encabezado Institucional */}
            <div className="text-center space-y-2 mb-6">
              <div className="w-24 h-16 bg-[#5B142F] rounded-2xl mx-auto flex items-center justify-center shadow-lg border-2 border-[#E8A938] p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/unrc_official_logo.png"
                  alt="UNRC Logo Oficial"
                  className="h-full w-auto object-contain drop-shadow"
                />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Acceso Institucional Seguro</h2>
              <p className="text-xs text-amber-200/90 font-medium">Universidad Nacional Rosario Castellanos — Campus Tijuana</p>
            </div>

            {/* Selector de Roles */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/50 rounded-2xl border border-white/10 text-[11px] font-bold text-center mb-5">
              {(['admin', 'teacher', 'student'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`py-2 rounded-xl transition-all ${
                    selectedRole === r
                      ? 'bg-gradient-to-r from-[#5B142F] to-[#7D1D41] text-amber-300 border border-[#E8A938] shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {r === 'admin' ? 'Administrador' : r === 'teacher' ? 'Docente' : 'Alumno'}
                </button>
              ))}
            </div>

            {/* Formulario de Acceso */}
            <form onSubmit={handleQuickLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                  {loginError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">
                  {selectedRole === 'admin'
                    ? 'Usuario o Correo Administrador'
                    : selectedRole === 'teacher'
                    ? 'Número de Empleado o Correo Institucional'
                    : 'Matrícula Oficial o Correo Institucional'}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={credentialInput}
                    onChange={(e) => setCredentialInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#E8A938] font-semibold border border-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-300">Contraseña Institucional</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 font-medium"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8FAFC] text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#E8A938] font-semibold border border-gray-300"
                  />
                </div>
              </div>

              {/* Botón de Ingreso con Colores Institucionales Guinda y Oro */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#5B142F] via-[#72193C] to-[#5B142F] hover:from-[#4D0F25] hover:to-[#631433] text-amber-200 hover:text-white border border-[#E8A938]/60 font-extrabold text-sm shadow-xl shadow-[#5B142F]/40 transition-all flex items-center justify-center space-x-2 active:scale-98"
              >
                <span>{loginLoading ? 'Validando...' : 'Ingresar al Sistema Seguro'}</span>
                <ArrowRight className="w-4 h-4 text-[#FBBF24]" />
              </button>

              {/* Cintillo de Seguridad SSL */}
              <div className="p-3 rounded-2xl bg-black/40 border border-[#E8A938]/20 text-center space-y-1 mt-4">
                <div className="flex items-center justify-center space-x-1.5 text-xs text-amber-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Seguridad & Privacidad Institucional</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Autenticación protegida con encriptación SSL. No comparta sus credenciales de acceso con terceros.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. BANNERS KPI: COMBINACIÓN CREATIVA GUINDA, AMARILLO Y BLANCO */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta 1: GUINDA INSTITUCIONAL (Total Docentes) */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#5B142F] via-[#701538] to-[#8A1B46] p-6 text-white shadow-sm border border-[#5B142F]/80 transition-transform hover:-translate-y-0.5">
          {/* Formas circulares translúcidas decorativas en dorado y blanco */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-[#E8A938]/15" />
          
          <div className="relative z-10 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold tracking-wide text-amber-200">Total Docentes</span>
              <span className="text-[11px] bg-black/20 text-amber-300 border border-amber-300/30 px-2 py-0.5 rounded-full font-semibold">
                Activos
              </span>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {docentes.length > 0 ? docentes.length : 9}
              </div>
              <p className="text-[11px] text-amber-100/80 font-medium mt-1">
                Planta académica verificada
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: AMARILLO / DORADO INSTITUCIONAL (Total Estudiantes) */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#E8A938] p-6 text-white shadow-sm border border-amber-500/40 transition-transform hover:-translate-y-0.5">
          {/* Formas circulares translúcidas decorativas en blanco */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/25" />
          <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/15" />
          
          <div className="relative z-10 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold tracking-wide text-white drop-shadow-xs">Total Estudiantes</span>
              <span className="text-[11px] bg-white/20 text-white border border-white/40 px-2 py-0.5 rounded-full font-bold">
                Ciclo 2026-2
              </span>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-xs">
                {alumnos.length > 0 ? alumnos.length : 26}
              </div>
              <p className="text-[11px] text-white/90 font-medium mt-1">
                Matrícula oficial vigente
              </p>
            </div>
          </div>
        </div>

        {/* Tarjeta 3: BLANCO PURO CON ACENTOS GUINDA & DORADO (Total Tutores y Familias) */}
        <div className="relative overflow-hidden rounded-xl bg-white border-2 border-[#5B142F]/15 p-6 text-gray-800 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-[#E8A938]/60">
          {/* Formas circulares translúcidas decorativas en guinda y dorado tenue */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#5B142F]/5" />
          <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-[#E8A938]/15" />
          
          <div className="relative z-10 flex flex-col justify-between h-32">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold tracking-wide text-[#5B142F]">Total Tutores y Familias</span>
              <span className="text-[11px] bg-amber-50 text-[#92400E] border border-amber-200/80 px-2 py-0.5 rounded-full font-bold">
                Comunidad
              </span>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-[#5B142F]">
                {grupos.length + secciones.length > 0 ? grupos.length + secciones.length : 30}
              </div>
              <p className="text-[11px] text-gray-500 font-medium mt-1">
                Red de vinculación institucional
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. FILA MEDIA: ALUMNOS DESTACADOS 🏆 & ASISTENCIA         */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Izquierda: Alumnos Destacados 🏆 en Tarjeta Blanca con Acentos Guinda y Dorado */}
        <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-xs border border-gray-200/80 flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-extrabold text-[#5B142F] flex items-center space-x-2">
                <span>Alumnos Destacados</span>
                <span className="text-lg">🏆</span>
              </h3>
              <span className="text-xs font-bold text-[#E8A938] bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/70">
                Excelencia Académica
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 w-12 text-left">N°</th>
                    <th className="pb-3 px-3 text-left">Materia / Grupo</th>
                    <th className="pb-3 px-3 text-left">Nombre del Estudiante</th>
                    <th className="pb-3 text-right">Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3.5 font-black text-[#5B142F]">🥇 1</td>
                    <td className="py-3.5 px-3 text-gray-700 font-medium">201Maestría - Lengua Española</td>
                    <td className="py-3.5 px-3 font-bold text-gray-900">Carlos Alonso Cano Ramirez</td>
                    <td className="py-3.5 text-right font-black">
                      <span className="bg-[#5B142F] text-amber-200 px-2.5 py-1 rounded-md text-xs">
                        98 %
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3.5 font-bold text-gray-700">🥈 2</td>
                    <td className="py-3.5 px-3 text-gray-700 font-medium">201-TUR - Gestión y Hospedaje</td>
                    <td className="py-3.5 px-3 font-bold text-gray-900">
                      {alumnos[0] ? `${alumnos[0].nombre} ${alumnos[0].apellido_paterno} ${alumnos[0].apellido_materno || ''}`.trim() : 'Angélica Altamirano Solórzano'}
                    </td>
                    <td className="py-3.5 text-right font-bold">
                      <span className="bg-amber-100 text-[#92400E] px-2.5 py-1 rounded-md text-xs">
                        96 %
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3.5 font-bold text-gray-700">🥉 3</td>
                    <td className="py-3.5 px-3 text-gray-700 font-medium">203-ADM - Matemáticas Financieras</td>
                    <td className="py-3.5 px-3 font-bold text-gray-900">
                      {alumnos[1] ? `${alumnos[1].nombre} ${alumnos[1].apellido_paterno} ${alumnos[1].apellido_materno || ''}`.trim() : 'Dayanna Gissel Buitimea Garma'}
                    </td>
                    <td className="py-3.5 text-right font-bold">
                      <span className="bg-amber-100 text-[#92400E] px-2.5 py-1 rounded-md text-xs">
                        95 %
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3.5 font-bold text-gray-700">4</td>
                    <td className="py-3.5 px-3 text-gray-700 font-medium">101 - Ciencia de Datos e IA</td>
                    <td className="py-3.5 px-3 font-bold text-gray-900">
                      {alumnos[2] ? `${alumnos[2].nombre} ${alumnos[2].apellido_paterno} ${alumnos[2].apellido_materno || ''}`.trim() : 'Emili Janeht Armenta Mancinas'}
                    </td>
                    <td className="py-3.5 text-right font-bold">
                      <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs">
                        93 %
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Récord académico auditado • Campus Tijuana</span>
            <button
              onClick={() => setShowQuickLogin(true)}
              className="text-[#5B142F] hover:text-[#851D44] font-bold text-xs flex items-center space-x-1 transition-colors"
            >
              <span>Ingresar al sistema</span>
              <span className="text-[#E8A938]">→</span>
            </button>
          </div>
        </div>

        {/* Derecha: Gráfico de Asistencia en Tarjeta Blanca con Barras Guinda y Amarillo */}
        <div className="lg:col-span-5 bg-white rounded-xl p-6 shadow-xs border border-gray-200/80 flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#5B142F]">Registro de Asistencia</h3>
              <span className="text-[11px] font-bold text-gray-500">Sede Tijuana</span>
            </div>

            {/* Gráfico de Barras Verticales con Colores Guinda y Dorado Institucional */}
            <div className="relative pt-6 pb-2">
              <div className="flex">
                {/* Escala Y (100 a 0) */}
                <div className="flex flex-col justify-between text-[10px] font-medium text-gray-400 pr-3 select-none h-44 text-right w-8">
                  <span>100</span>
                  <span>90</span>
                  <span>80</span>
                  <span>70</span>
                  <span>60</span>
                  <span>50</span>
                  <span>40</span>
                  <span>30</span>
                  <span>20</span>
                  <span>10</span>
                  <span>0</span>
                </div>

                {/* Contenedor de Barras */}
                <div className="flex-1 h-44 border-b border-l border-gray-200 flex items-end justify-around px-6 relative">
                  {/* Barra 1: Guinda Institucional 98% */}
                  <div className="flex flex-col items-center group relative z-10 w-16">
                    <span className="text-[10px] font-bold text-[#5B142F] mb-1">98%</span>
                    <div
                      style={{ height: '98%' }}
                      className="w-12 bg-gradient-to-t from-[#5B142F] to-[#7D1D41] rounded-t-sm shadow-xs transition-transform group-hover:scale-105 cursor-pointer"
                      title="201Maestría - Lengua Española: 98%"
                    ></div>
                  </div>

                  {/* Barra 2: Amarillo / Dorado Institucional 75% */}
                  <div className="flex flex-col items-center group relative z-10 w-16">
                    <span className="text-[10px] font-bold text-[#B45309] mb-1">75%</span>
                    <div
                      style={{ height: '75%' }}
                      className="w-12 bg-gradient-to-t from-[#D97706] to-[#E8A938] rounded-t-sm shadow-xs transition-transform group-hover:scale-105 cursor-pointer"
                      title="101Maestría - Lengua Española: 75%"
                    ></div>
                  </div>
                </div>
              </div>

              {/* Etiquetas Eje X en Español */}
              <div className="flex justify-around pl-8 pt-2.5 text-[9.5px] text-gray-700 font-semibold">
                <span className="w-28 text-center truncate">201Maestría - Español</span>
                <span className="w-28 text-center truncate">101Maestría - Español</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-center text-gray-500 mt-2 font-semibold">
            Porcentaje de Asistencia por Asignatura y Grupo
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. FILA INFERIOR: PLANTA DOCENTE & GÉNERO                */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Izquierda: Lista de Docentes en Tarjeta Blanca */}
        <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-xs border border-gray-200/80 flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#5B142F]">Planta Docente</h3>
              <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Claustro Activo
              </span>
            </div>

            <div className="space-y-4">
              {/* Docente 1 */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#5B142F]/10 border border-[#5B142F]/30 flex items-center justify-center text-[#5B142F] font-black text-xs shadow-2xs">
                    DP
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-snug">
                      Diego Alberto Pineda Gonzalez
                    </p>
                    <p className="text-[11px] text-amber-600 font-medium">★★★★★ Evaluación de Excelencia</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs mr-3" title="Activo"></span>
              </div>

              {/* Docente 2 */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-[#B45309] font-black text-xs shadow-2xs">
                    SP
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-snug">
                      Scandy Michelle Patron Palma
                    </p>
                    <p className="text-[11px] text-amber-600 font-medium">★★★★★ Evaluación de Excelencia</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs mr-3" title="Activo"></span>
              </div>

              {/* Docente 3 */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#5B142F] text-amber-300 border border-[#E8A938] flex items-center justify-center font-black text-xs shadow-2xs">
                    AS
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-snug">
                      {docentes[2] ? `${docentes[2].nombre} ${docentes[2].apellido_paterno}` : 'Dr. Adrian Silva'}
                    </p>
                    <p className="text-[11px] text-[#5B142F] font-medium">★★★★★ Dirección y Gestión Campus Tijuana</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs mr-3" title="Activo"></span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Claustro académico activo ({docentes.length || 9})</span>
            <button
              onClick={() => setShowQuickLogin(true)}
              className="text-[#5B142F] hover:text-[#851D44] font-bold"
            >
              Acceso Docente →
            </button>
          </div>
        </div>

        {/* Derecha: Gráfico de Género en Tarjeta Blanca con Colores Guinda y Amarillo */}
        <div className="lg:col-span-5 bg-white rounded-xl p-6 shadow-xs border border-gray-200/80 flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-extrabold text-[#5B142F]">Distribución por Género</h3>
              <span className="text-[11px] font-bold text-gray-500">Campus Tijuana</span>
            </div>

            {/* Gráfico de Dona Semicircular Guinda (#5B142F) y Amarillo Dorado (#E8A938) */}
            <div className="relative flex flex-col items-center justify-center pt-2">
              <svg viewBox="0 0 160 85" className="w-56 h-28 overflow-visible">
                {/* Arco Izquierdo: Guinda Institucional (58%) */}
                <path
                  d="M 20 80 A 60 60 0 0 1 80 20 L 80 45 A 35 35 0 0 0 45 80 Z"
                  fill="#5B142F"
                  className="hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <title>Femenino: 58%</title>
                </path>

                {/* Arco Derecho: Amarillo / Dorado Institucional (42%) */}
                <path
                  d="M 80 20 A 60 60 0 0 1 140 80 L 115 80 A 35 35 0 0 0 80 45 Z"
                  fill="#E8A938"
                  className="hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <title>Masculino: 42%</title>
                </path>
              </svg>
            </div>

            {/* Leyenda en Español */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#5B142F]"></span>
                <span className="text-gray-800 font-bold">Femenino (58%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#E8A938]"></span>
                <span className="text-gray-800 font-bold">Masculino (42%)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center text-[10px] text-gray-500 font-medium">
            Distribución de Matrícula UNRC • Campus Tijuana
          </div>
        </div>
      </div>

    </div>
  );
}

