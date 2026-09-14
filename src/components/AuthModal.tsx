"use client";

import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { UserRole } from '../lib/db';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    activeModalTab,
    loginAsAdmin,
    loginWithCredentials
  } = useAuth();

  const [activeTab, setActiveTab] = useState<UserRole>(activeModalTab || 'alumno');
  const [credentialInput, setCredentialInput] = useState('');
  const [userPasswordInput, setUserPasswordInput] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    if (activeTab === 'administrador') {
      if (!adminEmailInput.trim()) {
        setErrorMessage('Por favor ingrese el usuario o correo del Administrador.');
        setIsSubmitting(false);
        return;
      }
      if (!adminKeyInput.trim()) {
        setErrorMessage('Por favor ingrese la contraseña de Administrador.');
        setIsSubmitting(false);
        return;
      }

      const res = await loginAsAdmin(adminEmailInput, adminKeyInput);
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciales de Administrador incorrectas.');
      }
    } else {
      if (!credentialInput.trim()) {
        setErrorMessage(`Por favor ingrese su ${activeTab === 'alumno' ? 'Matrícula Oficial' : 'Número de Empleado'}.`);
        setIsSubmitting(false);
        return;
      }
      if (!userPasswordInput.trim()) {
        setErrorMessage('Por favor ingrese su contraseña institucional.');
        setIsSubmitting(false);
        return;
      }

      const res = await loginWithCredentials(activeTab, credentialInput, userPasswordInput);
      if (!res.success) {
        setErrorMessage(res.error || 'Credenciales incorrectas. Verifique sus datos de acceso.');
      }
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
            <span>Administrador</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">

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
              
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 flex items-center space-x-2">
                <span className="text-base">🛡️</span>
                <span>Ingrese sus credenciales institucionales oficiales para autenticarse.</span>
              </div>

              {/* Credential Form */}
              <form onSubmit={handleCredentialSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-300 mb-1 font-medium">
                    {activeTab === 'alumno' 
                      ? 'Matrícula Oficial o Correo Institucional' 
                      : 'Número de Empleado o Correo Institucional'}
                  </label>
                  <input
                    type="text"
                    required
                    value={credentialInput}
                    onChange={(e) => setCredentialInput(e.target.value)}
                    placeholder={activeTab === 'alumno' ? 'UNRC-2026-...' : 'DOC-UNRC-...'}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-gray-300 font-medium">
                      Contraseña Institucional Oficial
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showUserPassword ? 'text' : 'password'}
                      required
                      value={userPasswordInput}
                      onChange={(e) => setUserPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-mono transition-all"
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
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Verificando...' : `Ingresar como ${activeTab === 'alumno' ? 'Alumno' : 'Docente'}`}
                </button>
              </form>
            </div>
          )}

          {/* ADMIN AUTH OPTIONS */}
          {activeTab === 'administrador' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
                <div className="font-bold text-amber-400 flex items-center space-x-1.5">
                  <span>🔒</span>
                  <span>Rol Restringido: Administrador de Base de Datos</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  Acceso exclusivo para personal autorizado de Rectoría y Control Escolar UNRC.
                </p>
              </div>

              <form onSubmit={handleCredentialSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-medium">Usuario o Correo Administrador</label>
                  <input
                    type="text"
                    required
                    value={adminEmailInput}
                    onChange={(e) => setAdminEmailInput(e.target.value)}
                    placeholder="admin"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-medium">Contraseña Administrador</label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminKeyInput}
                      onChange={(e) => setAdminKeyInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-white text-xs"
                    >
                      {showAdminPassword ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-sm transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Verificando...' : 'Acceder al Panel de Administración'}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-black/40 text-center text-[11px] text-gray-500">
          🔒 Sistema de Control Escolar UNRC — Encriptación SSL & RLS Activo
        </div>
      </div>
    </div>
  );
};
