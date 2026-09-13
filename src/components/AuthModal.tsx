"use client";

import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { UserRole } from '../lib/db';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    activeModalTab,
    loginWithGoogle,
    loginAsAdmin,
    loginWithCredentials,
    lastDetectedAccount,
    loginWithLastAccount
  } = useAuth();

  const [activeTab, setActiveTab] = useState<UserRole>(activeModalTab || 'alumno');
  const [credentialInput, setCredentialInput] = useState('');
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('admin@admin.com');
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showGmailAccountPicker, setShowGmailAccountPicker] = useState(false);
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);
  const [customInstitutionalEmail, setCustomInstitutionalEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    if (activeTab === 'administrador') {
      if (!adminEmailInput.trim()) {
        setErrorMessage('Ingresa el correo o usuario del Administrador.');
        setIsSubmitting(false);
        return;
      }
      if (!adminKeyInput.trim()) {
        setErrorMessage('Ingresa la contraseña del Administrador.');
        setIsSubmitting(false);
        return;
      }

      const res = await loginAsAdmin(adminEmailInput, adminKeyInput);
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciales de Administrador incorrectas.');
      }
    } else {
      if (!credentialInput.trim()) {
        setErrorMessage(`Ingresa tu ${activeTab === 'alumno' ? 'Matrícula Oficial' : 'Número de Empleado'}.`);
        setIsSubmitting(false);
        return;
      }
      const res = await loginWithCredentials(activeTab, credentialInput, userPasswordInput);
      if (!res.success) {
        setErrorMessage(res.error || `Acceso Denegado: No cuenta con registro activo validado por el Superadmin.`);
      }
    }
    setIsSubmitting(false);
  };

  const handleGoogleClick = () => {
    setShowGmailAccountPicker(true);
    setShowCustomEmailInput(false);
    setCustomInstitutionalEmail('');
  };

  const handleSelectGmailAccount = async (name: string, email: string, matriculaOrEmp: string) => {
    setShowGmailAccountPicker(false);
    setIsSubmitting(true);
    const res = await loginWithGoogle(activeTab as 'alumno' | 'docente', {
      nombre: name,
      email: email,
      matricula: activeTab === 'alumno' ? matriculaOrEmp : undefined,
      num_empleado: activeTab === 'docente' ? matriculaOrEmp : undefined
    });
    if (!res.success) {
      setErrorMessage(res.error || 'Cuenta Google institucional no validada por el Superadmin.');
    }
    setIsSubmitting(false);
  };

  const handleCustomEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInstitutionalEmail.trim()) return;

    let fullEmail = customInstitutionalEmail.trim();
    if (!fullEmail.includes('@')) {
      fullEmail = `${fullEmail}@rcastellanos.cdmx.gob.mx`;
    }

    setShowGmailAccountPicker(false);
    setIsSubmitting(true);
    const res = await loginWithGoogle(activeTab as 'alumno' | 'docente', {
      email: fullEmail
    });
    if (!res.success) {
      setErrorMessage(res.error || 'Cuenta institucional no validada por el Superadmin.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#090D16] border border-[#5B142F]/40 shadow-[0_0_50px_rgba(91,20,47,0.3)] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#5B142F] via-emerald-400 to-amber-400"></div>

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-10"
          aria-label="Cerrar"
        >
          ✕
        </button>

        {/* Header with UNRC Official Logo */}
        <div className="p-6 text-center border-b border-white/10 bg-gradient-to-b from-[#5B142F]/40 to-transparent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/unrc_official_logo.png"
            alt="Universidad Nacional Rosario Castellanos"
            className="h-16 w-auto mx-auto mb-3 object-contain rounded-xl shadow-lg border border-[#5B142F]/60"
          />
          <h2 className="text-xl font-bold text-white tracking-tight">Portal de Acceso Institucional</h2>
          <p className="text-xs text-amber-300 font-medium mt-1">Universidad Nacional Rosario Castellanos — CDMX</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 p-2 bg-black/40 gap-1 border-b border-white/5">
          <button
            onClick={() => { setActiveTab('alumno'); setErrorMessage(''); }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'alumno'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🎓</span>
            <span>Alumno</span>
          </button>

          <button
            onClick={() => { setActiveTab('docente'); setErrorMessage(''); }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'docente'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>👨‍🏫</span>
            <span>Docente</span>
          </button>

          <button
            onClick={() => { setActiveTab('administrador'); setErrorMessage(''); }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all ${
              activeTab === 'administrador'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>⚙️</span>
            <span>Admin BD</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">

          {/* DETECTED ACCOUNT QUICK LOGIN CARD */}
          {lastDetectedAccount && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-blue-950/60 border border-emerald-500/40 shadow-lg flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-3 overflow-hidden">
                {lastDetectedAccount.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={lastDetectedAccount.avatar_url}
                    alt={lastDetectedAccount.nombre}
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {lastDetectedAccount.nombre.charAt(0)}
                  </div>
                )}
                <div className="truncate">
                  <div className="text-xs text-emerald-300 font-semibold flex items-center space-x-1">
                    <span>✨ Cuenta Detectada</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded uppercase font-mono">
                      {lastDetectedAccount.role}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white truncate">{lastDetectedAccount.nombre}</div>
                  <div className="text-[11px] text-gray-300 truncate">{lastDetectedAccount.email}</div>
                </div>
              </div>

              <button
                onClick={loginWithLastAccount}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1"
              >
                <span>Acceso Inmediato</span>
                <span>➔</span>
              </button>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center space-x-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ALUMNO & DOCENTE AUTH OPTIONS */}
          {(activeTab === 'alumno' || activeTab === 'docente') && (
            <div className="space-y-4">
              
              {/* Google / Gmail Sign In Option */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Método 1: Autenticación Gmail Institucional
                </label>

                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-100 text-gray-900 font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg shadow-white/5 active:scale-[0.99] border border-gray-200"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Seleccionar o Escribir Cuenta Gmail</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    @rcastellanos.cdmx.gob.mx
                  </span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center py-1">
                <div className="border-t border-white/10 w-full"></div>
                <span className="bg-[#090D16] px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                  O escribe tu cuenta directamente
                </span>
              </div>

              {/* Credential Form */}
              <form onSubmit={handleCredentialSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-300 mb-1 font-medium">
                    {activeTab === 'alumno' 
                      ? 'Escribe tu Matrícula o Correo Institucional' 
                      : 'Escribe tu N° de Empleado o Correo Institucional'}
                  </label>
                  <input
                    type="text"
                    value={credentialInput}
                    onChange={(e) => setCredentialInput(e.target.value)}
                    placeholder={activeTab === 'alumno' ? 'UNRC-2026-005 o tu.nombre@rcastellanos.cdmx.gob.mx' : 'DOC-UNRC-02 o tu.nombre@rcastellanos.cdmx.gob.mx'}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-gray-300 font-medium">
                      Contraseña Institucional Oficial
                    </label>
                    <span className="text-[10px] text-gray-400">
                      Ciclo: <span className="text-emerald-400 font-mono font-bold">2026-2</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showUserPassword ? 'text' : 'password'}
                      value={userPasswordInput}
                      onChange={(e) => setUserPasswordInput(e.target.value)}
                      placeholder={activeTab === 'alumno' ? 'Ej. UNRC-2026-005-2026-2' : 'Ej. DOC-UNRC-02-2026-2'}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-white text-xs"
                      title={showUserPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showUserPassword ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-400/90 mt-1">
                    🔐 Contraseña por defecto: <span className="font-mono font-bold text-white">{credentialInput ? `${credentialInput.trim()}-2026-2` : 'MATRICULA-2026-2'}</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/20"
                >
                  {isSubmitting ? 'Verificando...' : `Ingresar Inmediatamente como ${activeTab === 'alumno' ? 'Alumno' : 'Docente'}`}
                </button>
              </form>
            </div>
          )}

          {/* ADMIN AUTH OPTIONS */}
          {activeTab === 'administrador' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-2">
                <div className="font-bold text-amber-400 flex items-center space-x-1.5">
                  <span>🔒</span>
                  <span>Rol Restringido: Administrador de Base de Datos</span>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Este panel está dedicado exclusivamente a la **gestión, carga de archivos Excel/CSV y migración de tablas en la Base de Datos**.
                </p>
              </div>

              <form onSubmit={handleCredentialSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-medium">Correo / Usuario Administrador</label>
                  <input
                    type="text"
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    placeholder="admin@admin.com"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-medium">Contraseña Administrador</label>
                  <input
                    type="password"
                    value={adminKeyInput}
                    onChange={(e) => setAdminKeyInput(e.target.value)}
                    placeholder="12345678Rosario"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm transition-all"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Usuario: <code className="text-amber-400 font-bold">admin@admin.com</code> | Contraseña: <code className="text-amber-400 font-bold">12345678Rosario</code>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-sm transition-all shadow-lg shadow-amber-600/20"
                >
                  {isSubmitting ? 'Verificando...' : 'Acceder a Consola de Base de Datos'}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-black/40 text-center text-[11px] text-gray-500">
          🔒 Sistema de Control Escolar UNRC — Encriptación SSL & RLS Enabled
        </div>
      </div>

      {/* GMAIL ACCOUNT PICKER POPUP */}
      {showGmailAccountPicker && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="text-base font-bold text-white">Selecciona una Cuenta de Google</h3>
              </div>
              <button onClick={() => setShowGmailAccountPicker(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-gray-400">
              Elige tu cuenta de Gmail institucional para ingresar como <strong className="text-emerald-400 capitalize">{activeTab}</strong>:
            </p>

            <div className="space-y-2">
              {activeTab === 'alumno' ? (
                <>
                  <button
                    onClick={() => handleSelectGmailAccount('Carlos Martínez López', 'carlos.martinez@rcastellanos.cdmx.gob.mx', 'UNRC-2026-001')}
                    className="w-full p-3 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-left flex items-center space-x-3 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200&h=200" alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-white">Carlos Martínez López</div>
                      <div className="text-xs text-emerald-400">carlos.martinez@rcastellanos.cdmx.gob.mx</div>
                      <div className="text-[10px] text-gray-400">Matrícula: UNRC-2026-001 • Lic. Ciencias de la Computación</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectGmailAccount('Sofía Herrera Díaz', 'sofia.herrera@rcastellanos.cdmx.gob.mx', 'UNRC-2026-002')}
                    className="w-full p-3 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-left flex items-center space-x-3 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200" alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-white">Sofía Herrera Díaz</div>
                      <div className="text-xs text-emerald-400">sofia.herrera@rcastellanos.cdmx.gob.mx</div>
                      <div className="text-[10px] text-gray-400">Matrícula: UNRC-2026-002 • Lic. Inteligencia Artificial</div>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleSelectGmailAccount('Dr. Alejandro Valdez Mendoza', 'alejandro.valdez@rcastellanos.cdmx.gob.mx', 'DOC-UNRC-01')}
                    className="w-full p-3 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-left flex items-center space-x-3 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200" alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-white">Dr. Alejandro Valdez Mendoza</div>
                      <div className="text-xs text-emerald-400">alejandro.valdez@rcastellanos.cdmx.gob.mx</div>
                      <div className="text-[10px] text-gray-400">N° Empleado: DOC-UNRC-01 • Profesor Titular</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectGmailAccount('Dra. Beatriz Sánchez Pineda', 'beatriz.sanchez@rcastellanos.cdmx.gob.mx', 'DOC-UNRC-02')}
                    className="w-full p-3 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-left flex items-center space-x-3 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200" alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-white">Dra. Beatriz Sánchez Pineda</div>
                      <div className="text-xs text-emerald-400">beatriz.sanchez@rcastellanos.cdmx.gob.mx</div>
                      <div className="text-[10px] text-gray-400">N° Empleado: DOC-UNRC-02 • Profesora Investigadora</div>
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* Custom Institutional Email Writing Form */}
            <div className="border-t border-white/10 pt-4">
              {!showCustomEmailInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomEmailInput(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 font-semibold text-xs transition-all border border-amber-400/30 flex items-center justify-center space-x-2"
                >
                  <span>✍️</span>
                  <span>Escribir otra cuenta institucional...</span>
                </button>
              ) : (
                <form onSubmit={handleCustomEmailSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Ingresa tu correo institucional UNRC:
                    </label>
                    <input
                      type="text"
                      value={customInstitutionalEmail}
                      onChange={(e) => setCustomInstitutionalEmail(e.target.value)}
                      placeholder="nombre.apellido@rcastellanos.cdmx.gob.mx"
                      autoFocus
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-amber-400/50 text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md"
                    >
                      Acceder Inmediatamente
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomEmailInput(false)}
                      className="py-2 px-3 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 text-xs"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
