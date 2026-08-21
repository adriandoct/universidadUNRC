"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile, supabase, db } from './db';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  lastDetectedAccount: UserProfile | null;
  loginWithGoogle: (role: 'alumno' | 'docente', accountOverride?: Partial<UserProfile>) => Promise<void>;
  loginAsAdmin: (accessCodeOrEmail: string, passInput?: string) => boolean;
  loginWithCredentials: (role: UserRole, idOrEmail: string) => Promise<boolean>;
  loginWithLastAccount: () => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  openAuthModal: (defaultRole?: UserRole) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  activeModalTab: UserRole;
}

const DEFAULT_USERS: Record<UserRole, UserProfile> = {
  alumno: {
    id: 'user-alumno-demo',
    email: 'carlos.martinez@rcastellanos.cdmx.gob.mx',
    nombre: 'Carlos Martínez López',
    role: 'alumno',
    avatar_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200&h=200',
    matricula: 'UNRC-2026-001',
    carrera_o_depto: 'Lic. en Ciencias de la Computación'
  },
  docente: {
    id: 'user-docente-demo',
    email: 'alejandro.valdez@rcastellanos.cdmx.gob.mx',
    nombre: 'Dr. Alejandro Valdez Mendoza',
    role: 'docente',
    avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200',
    num_empleado: 'DOC-UNRC-01',
    carrera_o_depto: 'Departamento de Computación e IA'
  },
  administrador: {
    id: 'user-admin-demo',
    email: 'admin@admin.com',
    nombre: 'Administrador UNRC',
    role: 'administrador',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
    carrera_o_depto: 'Coordinación de Tecnologías y Base de Datos'
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [lastDetectedAccount, setLastDetectedAccount] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<UserRole>('alumno');

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('unrc_auth_user');
      const savedRole = localStorage.getItem('unrc_auth_role') as UserRole | null;
      const lastAcc = localStorage.getItem('unrc_last_account');

      if (lastAcc) {
        try {
          setLastDetectedAccount(JSON.parse(lastAcc));
        } catch (e) {
          console.warn('Could not parse last account');
        }
      }

      if (savedUser && savedRole) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setRoleState(savedRole);
        setLastDetectedAccount(parsed);
      } else {
        // Default to Alumno demo user for immediate rich UX
        setUser(DEFAULT_USERS.alumno);
        setRoleState('alumno');
        setLastDetectedAccount(DEFAULT_USERS.alumno);
      }
    } catch (err) {
      console.error('Error restoring auth session:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSession = (newUser: UserProfile | null, newRole: UserRole | null) => {
    setUser(newUser);
    setRoleState(newRole);
    if (newUser && newRole) {
      localStorage.setItem('unrc_auth_user', JSON.stringify(newUser));
      localStorage.setItem('unrc_auth_role', newRole);
      localStorage.setItem('unrc_last_account', JSON.stringify(newUser));
      setLastDetectedAccount(newUser);
    } else {
      localStorage.removeItem('unrc_auth_user');
      localStorage.removeItem('unrc_auth_role');
    }
  };

  const loginWithLastAccount = () => {
    if (lastDetectedAccount) {
      saveSession(lastDetectedAccount, lastDetectedAccount.role);
      setIsAuthModalOpen(false);
    }
  };

  const helperBuildProfileFromEmail = (email: string, targetRole: 'alumno' | 'docente'): UserProfile => {
    const cleanEmail = email.trim().toLowerCase();
    const usernamePart = cleanEmail.split('@')[0] || 'usuario';
    const formattedName = usernamePart
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const randomNum = Math.floor(100 + Math.random() * 900);

    return {
      id: `user-custom-${Date.now()}`,
      email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@rcastellanos.cdmx.gob.mx`,
      nombre: formattedName || (targetRole === 'alumno' ? 'Estudiante UNRC' : 'Docente UNRC'),
      role: targetRole,
      avatar_url: targetRole === 'alumno' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200' 
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
      matricula: targetRole === 'alumno' ? `UNRC-2026-${randomNum}` : undefined,
      num_empleado: targetRole === 'docente' ? `DOC-UNRC-${randomNum}` : undefined,
      carrera_o_depto: targetRole === 'alumno' ? 'Universidad Rosario Castellanos' : 'Cuerpo Académico UNRC'
    };
  };

  const loginWithGoogle = async (targetRole: 'alumno' | 'docente', accountOverride?: Partial<UserProfile>) => {
    setIsLoading(true);

    // If explicit account selected or custom email typed from modal picker
    if (accountOverride) {
      const baseUser = DEFAULT_USERS[targetRole];
      const email = accountOverride.email || baseUser.email;
      const isCustomEmail = email && !email.includes('carlos.martinez') && !email.includes('sofia.herrera') && !email.includes('alejandro.valdez') && !email.includes('beatriz.sanchez');

      let loggedUser: UserProfile;
      if (isCustomEmail) {
        const derived = helperBuildProfileFromEmail(email, targetRole);
        loggedUser = { ...derived, ...accountOverride };
      } else {
        loggedUser = {
          ...baseUser,
          ...accountOverride,
          role: targetRole,
          email: email
        };
      }

      saveSession(loggedUser, targetRole);
      setIsLoading(false);
      setIsAuthModalOpen(false);
      return;
    }

    // Fallback to demo Gmail account for instantaneous sign-in
    const baseUser = DEFAULT_USERS[targetRole];
    saveSession(baseUser, targetRole);
    setIsLoading(false);
    setIsAuthModalOpen(false);
  };

  const loginAsAdmin = (accessCodeOrEmail: string, passInput?: string): boolean => {
    const email = accessCodeOrEmail.trim().toLowerCase();
    const pass = (passInput || '').trim();

    // Valid admin credentials: admin@admin.com & 12345678Rosario
    const isValidUser = email === 'admin@admin.com' || email === 'admin' || email === 'admin@admin';
    const isValidPass = pass === '12345678Rosario' || pass === '12345678rosario' || accessCodeOrEmail.trim().toLowerCase() === '12345678rosario' || accessCodeOrEmail.trim().toLowerCase() === 'admin';

    if (isValidUser && (isValidPass || !passInput)) {
      saveSession(DEFAULT_USERS.administrador, 'administrador');
      setIsAuthModalOpen(false);
      return true;
    }
    return false;
  };

  const loginWithCredentials = async (targetRole: UserRole, idOrEmail: string): Promise<boolean> => {
    setIsLoading(true);
    const cleanInput = idOrEmail.trim().toLowerCase();

    try {
      if (targetRole === 'alumno') {
        const alumnos = await db.getAlumnos();
        const found = alumnos.find(
          a => a.matricula.toLowerCase() === cleanInput || 
               a.qr_code.toLowerCase() === cleanInput ||
               `${a.matricula.toLowerCase()}@rcastellanos.cdmx.gob.mx` === cleanInput ||
               (a.nombre + a.apellido_paterno).toLowerCase().includes(cleanInput.replace(/\s+/g, ''))
        );

        if (found) {
          const profile: UserProfile = {
            id: found.id,
            email: `${found.matricula.toLowerCase()}@rcastellanos.cdmx.gob.mx`,
            nombre: `${found.nombre} ${found.apellido_paterno} ${found.apellido_materno || ''}`.trim(),
            role: 'alumno',
            avatar_url: found.foto_url,
            matricula: found.matricula,
            carrera_o_depto: found.carrera || 'Universidad Rosario Castellanos'
          };
          saveSession(profile, 'alumno');
          setIsAuthModalOpen(false);
          setIsLoading(false);
          return true;
        }

        // If user typed an institutional email or username, allow INSTANT ACCESS
        if (cleanInput.includes('@') || cleanInput.includes('.')) {
          const profile = helperBuildProfileFromEmail(cleanInput, 'alumno');
          saveSession(profile, 'alumno');
          setIsAuthModalOpen(false);
          setIsLoading(false);
          return true;
        }
      } else if (targetRole === 'docente') {
        const docentes = await db.getDocentes();
        const found = docentes.find(
          d => d.num_empleado.toLowerCase() === cleanInput || d.email.toLowerCase() === cleanInput
        );

        if (found) {
          const profile: UserProfile = {
            id: found.id,
            email: found.email,
            nombre: `${found.nombre} ${found.apellido_paterno} ${found.apellido_materno || ''}`.trim(),
            role: 'docente',
            avatar_url: found.foto_url,
            num_empleado: found.num_empleado,
            carrera_o_depto: found.departamento
          };
          saveSession(profile, 'docente');
          setIsAuthModalOpen(false);
          setIsLoading(false);
          return true;
        }

        // If docente typed an email, allow INSTANT ACCESS
        if (cleanInput.includes('@') || cleanInput.includes('.')) {
          const profile = helperBuildProfileFromEmail(cleanInput, 'docente');
          saveSession(profile, 'docente');
          setIsAuthModalOpen(false);
          setIsLoading(false);
          return true;
        }
      }
    } catch (e) {
      console.error('Credential auth error:', e);
    }

    setIsLoading(false);
    return false;
  };

  const logout = () => {
    saveSession(null, null);
  };

  const setRole = (newRole: UserRole) => {
    const defaultUser = DEFAULT_USERS[newRole];
    saveSession(defaultUser, newRole);
  };

  const openAuthModal = (defaultRole: UserRole = 'alumno') => {
    setActiveModalTab(defaultRole);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: Boolean(user && role),
        isLoading,
        lastDetectedAccount,
        loginWithGoogle,
        loginAsAdmin,
        loginWithCredentials,
        loginWithLastAccount,
        logout,
        setRole,
        openAuthModal,
        closeAuthModal,
        isAuthModalOpen,
        activeModalTab
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
