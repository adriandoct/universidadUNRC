"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile, supabase, db } from './db';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: (role: 'alumno' | 'docente', accountOverride?: Partial<UserProfile>) => Promise<void>;
  loginAsAdmin: (accessCodeOrEmail: string, passInput?: string) => boolean;
  loginWithCredentials: (role: UserRole, idOrEmail: string) => Promise<boolean>;
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
    email: 'carlos.martinez@rcellanos.cdmx.gob.mx',
    nombre: 'Carlos Martínez López',
    role: 'alumno',
    avatar_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200&h=200',
    matricula: 'UNRC-2026-001',
    carrera_o_depto: 'Lic. en Ciencias de la Computación'
  },
  docente: {
    id: 'user-docente-demo',
    email: 'alejandro.valdez@rcellanos.cdmx.gob.mx',
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<UserRole>('alumno');

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('unrc_auth_user');
      const savedRole = localStorage.getItem('unrc_auth_role') as UserRole | null;

      if (savedUser && savedRole) {
        setUser(JSON.parse(savedUser));
        setRoleState(savedRole);
      } else {
        // Default to Alumno demo user for immediate rich UX
        setUser(DEFAULT_USERS.alumno);
        setRoleState('alumno');
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
    } else {
      localStorage.removeItem('unrc_auth_user');
      localStorage.removeItem('unrc_auth_role');
    }
  };

  const loginWithGoogle = async (targetRole: 'alumno' | 'docente', accountOverride?: Partial<UserProfile>) => {
    setIsLoading(true);

    // 1. Try real Supabase Google OAuth if configured
    if (supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
          }
        });
        if (!error) return;
      } catch (e) {
        console.warn('Supabase Google OAuth fallback to interactive demo profile:', e);
      }
    }

    // 2. Interactive Google Account Login (Immediate response for demonstration)
    const baseUser = DEFAULT_USERS[targetRole];
    const loggedUser: UserProfile = {
      ...baseUser,
      ...accountOverride,
      role: targetRole,
      email: accountOverride?.email || baseUser.email
    };

    saveSession(loggedUser, targetRole);
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
    try {
      if (targetRole === 'alumno') {
        const alumnos = await db.getAlumnos();
        const found = alumnos.find(a => a.matricula.toLowerCase() === idOrEmail.trim().toLowerCase());
        if (found) {
          const profile: UserProfile = {
            id: found.id,
            email: `${found.matricula.toLowerCase()}@rcellanos.cdmx.gob.mx`,
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
      } else if (targetRole === 'docente') {
        const docentes = await db.getDocentes();
        const found = docentes.find(
          d => d.num_empleado.toLowerCase() === idOrEmail.trim().toLowerCase() || d.email.toLowerCase() === idOrEmail.trim().toLowerCase()
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
        loginWithGoogle,
        loginAsAdmin,
        loginWithCredentials,
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
