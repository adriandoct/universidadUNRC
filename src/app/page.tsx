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
          credentialInput,
          passwordInput === '••••••••••••' ? '2026-2' : passwordInput,
          selectedRole === 'teacher' ? 'docente' : 'alumno'
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
      {/* 2. BREADCRUMB PILL: [Icono Casa] Dashboard               */}
      {/* ========================================================= */}
      <div className="flex items-center space-x-3 pt-2">
        <div className="inline-flex items-center space-x-2 bg-[#253858] text-white px-3 py-1.5 rounded-md shadow-xs">
          <HomeIcon className="w-3.5 h-3.5 text-white" />
          <span className="text-xs font-bold tracking-wide">Dashboard</span>
        </div>
        <span className="text-xs text-gray-400">•</span>
        <span className="text-xs font-semibold text-gray-600">Sistema Integral de Control Escolar UNRC</span>
      </div>

      {/* Optional Drawer/Modal for Institutional Login (Image 1 Colors) */}
      {showQuickLogin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0D1527] text-white border border-[#5B142F]/60 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQuickLogin(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 text-sm font-bold"
            >
              ✕
            </button>

            {/* Header Logo matching Image 1 */}
            <div className="text-center space-y-2 mb-6">
              <div className="w-20 h-14 bg-[#5B142F] rounded-xl mx-auto flex items-center justify-center shadow-lg border border-[#851D44]">
                <span className="font-extrabold text-amber-300 text-sm tracking-widest">✤ UNRC</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Acceso Institucional Seguro</h2>
              <p className="text-xs text-gray-400">Universidad Nacional Rosario Castellanos — Campus Tijuana</p>
            </div>

            {/* Role Selector Tabs matching Image 1 */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/50 rounded-2xl border border-white/10 text-[11px] font-bold text-center mb-5">
              {(['admin', 'teacher', 'student'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`py-2 rounded-xl transition-all ${
                    selectedRole === r
                      ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {r === 'admin' ? 'Administrador' : r === 'teacher' ? 'Docente' : 'Alumno'}
                </button>
              ))}
            </div>

            {/* Login Form */}
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#E2E8F0] text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-300">Contraseña Institucional</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#E2E8F0] text-gray-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>
              </div>

              {/* Action Button matching Image 1 (Emerald Green) */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00A86B] to-[#00C853] hover:from-[#00965D] hover:to-[#00B048] text-white font-extrabold text-sm shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 active:scale-98"
              >
                <span>{loginLoading ? 'Validando...' : 'Ingresar al Sistema Seguro'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Bottom Security Note matching Image 1 */}
              <div className="p-3 rounded-2xl bg-black/40 border border-emerald-500/20 text-center space-y-1 mt-4">
                <div className="flex items-center justify-center space-x-1.5 text-xs text-emerald-400 font-bold">
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
      {/* 3. TOP 3 KPI BANNERS WITH VECTOR CURVES (EXACT IMAGE 2)   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Teachers (Coral/Pink gradient with vector curves) */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FF7A8A] via-[#FF8595] to-[#FFA07A] p-6 text-white shadow-sm transition-transform hover:-translate-y-0.5">
          {/* Overlapping translucent geometric circles in corner */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/20" />
          <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/15" />
          
          <div className="relative z-10 flex flex-col justify-between h-32">
            <span className="text-sm font-medium tracking-wide text-white/95">Total Teachers</span>
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                {docentes.length > 0 ? docentes.length : 9}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Students (Sky Blue gradient with vector curves) */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3BA9F5] via-[#4AB5F9] to-[#60C3FF] p-6 text-white shadow-sm transition-transform hover:-translate-y-0.5">
          {/* Overlapping translucent geometric circles in corner */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/20" />
          <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/15" />
          
          <div className="relative z-10 flex flex-col justify-between h-32">
            <span className="text-sm font-medium tracking-wide text-white/95">Total Students</span>
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                {alumnos.length > 0 ? alumnos.length : 26}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Parents (Teal / Mint gradient with vector curves) */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#20CBA5] via-[#2ED9B4] to-[#45E4C2] p-6 text-white shadow-sm transition-transform hover:-translate-y-0.5">
          {/* Overlapping translucent geometric circles in corner */}
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/20" />
          <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-white/15" />
          
          <div className="relative z-10 flex flex-col justify-between h-32">
            <span className="text-sm font-medium tracking-wide text-white/95">Total Parents</span>
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                {grupos.length + secciones.length > 0 ? grupos.length + secciones.length : 30}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MIDDLE ROW: TOP RANKERS 🏆 & ATTENDANCE BAR CHART      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Top Rankers 🏆 in White Card */}
        <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-xs border border-gray-200/70 flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-800 flex items-center space-x-2">
                <span>Top Rankers</span>
                <span className="text-lg">🏆</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] text-gray-400 font-semibold">
                    <th className="pb-3 w-12 text-left">No.</th>
                    <th className="pb-3 px-3 text-left">Class Name</th>
                    <th className="pb-3 px-3 text-left">Student Name</th>
                    <th className="pb-3 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 font-bold text-gray-700">1</td>
                    <td className="py-3.5 px-3 text-gray-700">201Maestria - 201 Español</td>
                    <td className="py-3.5 px-3 font-semibold text-gray-900">Carlos Alonso Cano Ramirez</td>
                    <td className="py-3.5 text-right font-semibold text-gray-800">96 %</td>
                  </tr>
                  <tr className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 font-bold text-gray-700">2</td>
                    <td className="py-3.5 px-3 text-gray-700">201-TUR - Hospedaje</td>
                    <td className="py-3.5 px-3 font-semibold text-gray-900">
                      {alumnos[0] ? `${alumnos[0].nombre} ${alumnos[0].apellido_paterno} ${alumnos[0].apellido_materno || ''}`.trim() : 'Angélica Altamirano Solórzano'}
                    </td>
                    <td className="py-3.5 text-right font-semibold text-gray-800">95 %</td>
                  </tr>
                  <tr className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 font-bold text-gray-700">3</td>
                    <td className="py-3.5 px-3 text-gray-700">203-ADM - Matemáticas</td>
                    <td className="py-3.5 px-3 font-semibold text-gray-900">
                      {alumnos[1] ? `${alumnos[1].nombre} ${alumnos[1].apellido_paterno} ${alumnos[1].apellido_materno || ''}`.trim() : 'Dayanna Gissel Buitimea Garma'}
                    </td>
                    <td className="py-3.5 text-right font-semibold text-gray-800">94 %</td>
                  </tr>
                  <tr className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 font-bold text-gray-700">4</td>
                    <td className="py-3.5 px-3 text-gray-700">101 - Ciencia de Datos</td>
                    <td className="py-3.5 px-3 font-semibold text-gray-900">
                      {alumnos[2] ? `${alumnos[2].nombre} ${alumnos[2].apellido_paterno} ${alumnos[2].apellido_materno || ''}`.trim() : 'Emili Janeht Armenta Mancinas'}
                    </td>
                    <td className="py-3.5 text-right font-semibold text-gray-800">92 %</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Récord académico verificado • Campus Tijuana</span>
            <button
              onClick={() => setShowQuickLogin(true)}
              className="text-[#5B142F] hover:text-[#851D44] font-bold text-xs flex items-center space-x-1"
            >
              <span>Ingresar al sistema</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Right: Attendance Bar Chart in White Card */}
        <div className="lg:col-span-5 bg-white rounded-xl p-6 shadow-xs border border-gray-200/70 flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">Attendance</h3>
            </div>

            {/* Vertical Bar Chart matching Image 2 */}
            <div className="relative pt-6 pb-2">
              <div className="flex">
                {/* Y-axis Labels (100 to 0) */}
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

                {/* Bars Container */}
                <div className="flex-1 h-44 border-b border-l border-gray-200 flex items-end justify-around px-6 relative">
                  {/* Bar 1: Pink/Coral 98% (201Maestria - 201 Español) */}
                  <div className="flex flex-col items-center group relative z-10 w-16">
                    <div
                      style={{ height: '98%' }}
                      className="w-12 bg-[#FF6584] rounded-t-sm shadow-xs transition-transform group-hover:scale-105 cursor-pointer"
                    ></div>
                  </div>

                  {/* Bar 2: Blue 72% (101Maestria - 101 Español) */}
                  <div className="flex flex-col items-center group relative z-10 w-16">
                    <div
                      style={{ height: '72%' }}
                      className="w-12 bg-[#0080E6] rounded-t-sm shadow-xs transition-transform group-hover:scale-105 cursor-pointer"
                    ></div>
                  </div>
                </div>
              </div>

              {/* X-axis Labels */}
              <div className="flex justify-around pl-8 pt-2.5 text-[9.5px] text-gray-500 font-medium">
                <span className="w-28 text-center truncate">201Maestria - 201 Español</span>
                <span className="w-28 text-center truncate">101Maestria - 101 Español</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-center text-gray-400 mt-2 font-medium">
            Attendance Percentage by Class Section
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. BOTTOM ROW: TEACHER & GENDER (EXACT IMAGE 2)          */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Teacher List in White Card */}
        <div className="lg:col-span-7 bg-white rounded-xl p-6 shadow-xs border border-gray-200/70 flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">Teacher</h3>
            </div>

            <div className="space-y-4">
              {/* Teacher 1: Diego Alberto Pineda Gonzalez */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 text-sm shadow-2xs">
                    👨‍🏫
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-snug">
                      Diego Alberto Pineda Gonzalez
                    </p>
                    <p className="text-[11px] text-gray-400">Excelente</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs mr-3"></span>
              </div>

              {/* Teacher 2: Scandy Michelle patron palma */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 text-sm shadow-2xs">
                    👩‍🏫
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-snug">
                      Scandy Michelle patron palma
                    </p>
                    <p className="text-[11px] text-gray-400">excelente</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs mr-3"></span>
              </div>

              {/* Teacher 3: Dr. Adrian Silva */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#5B142F]/10 border border-[#5B142F]/30 flex items-center justify-center text-[#5B142F] font-bold text-xs shadow-2xs">
                    AS
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-snug">
                      {docentes[2] ? `${docentes[2].nombre} ${docentes[2].apellido_paterno}` : 'Dr. Adrian Silva'}
                    </p>
                    <p className="text-[11px] text-gray-400">Excelente • Dirección Campus Tijuana</p>
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs mr-3"></span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Claustro académico activo ({docentes.length || 9})</span>
            <button
              onClick={() => setShowQuickLogin(true)}
              className="text-[#5B142F] hover:text-[#851D44] font-semibold"
            >
              Acceso Docente →
            </button>
          </div>
        </div>

        {/* Right: Gender Donut Chart in White Card */}
        <div className="lg:col-span-5 bg-white rounded-xl p-6 shadow-xs border border-gray-200/70 flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">Gender</h3>
            </div>

            {/* Semicircle Donut Chart matching Image 2 */}
            <div className="relative flex flex-col items-center justify-center pt-2">
              <svg viewBox="0 0 160 85" className="w-56 h-28 overflow-visible">
                {/* Left Arc: Pink / Coral (58%) */}
                <path
                  d="M 20 80 A 60 60 0 0 1 80 20 L 80 45 A 35 35 0 0 0 45 80 Z"
                  fill="#FF6584"
                  className="hover:opacity-90 transition-opacity cursor-pointer"
                />

                {/* Right Arc: Blue (42%) */}
                <path
                  d="M 80 20 A 60 60 0 0 1 140 80 L 115 80 A 35 35 0 0 0 80 45 Z"
                  fill="#38BDF8"
                  className="hover:opacity-90 transition-opacity cursor-pointer"
                />
              </svg>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#FF6584]"></span>
                <span className="text-gray-700 font-medium">Femenino (58%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-[#38BDF8]"></span>
                <span className="text-gray-700 font-medium">Masculino (42%)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center text-[10px] text-gray-400">
            Distribución estudiantil UNRC • Campus Tijuana
          </div>
        </div>
      </div>

    </div>
  );
}

