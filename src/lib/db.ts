import { createClient } from '@supabase/supabase-js';

// User Roles
export type UserRole = 'alumno' | 'docente' | 'administrador';

// Types
export interface Alumno {
  id: string;
  matricula: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  grado: string;
  grupo: string;
  carrera?: string;
  tutor: string;
  telefono: string;
  foto_url?: string;
  qr_code: string;
  created_at?: string;
}

export interface Docente {
  id: string;
  num_empleado: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno?: string;
  email: string;
  departamento: string;
  materias?: string[];
  telefono?: string;
  foto_url?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  role: UserRole;
  avatar_url?: string;
  matricula?: string;
  num_empleado?: string;
  carrera_o_depto?: string;
}

export interface Asistencia {
  id: string;
  alumno_id: string;
  tipo: 'entrada' | 'salida';
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM:SS
  dispositivo?: string;
  ubicacion?: string;
  escaneado_por?: string;
  created_at?: string;
  alumno?: Alumno; // Populated join
}

// Environment variables check
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Supabase client instance (or null)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial mock data for UNRC Alumnos
const MOCK_ALUMNOS: Alumno[] = [
  {
    id: 'student-1',
    matricula: 'UNRC-2026-001',
    nombre: 'Carlos',
    apellido_paterno: 'Martínez',
    apellido_materno: 'López',
    grado: '1° Semestre',
    grupo: '101',
    carrera: 'Lic. en Ciencias de la Computación',
    tutor: 'Sra. Mariana López',
    telefono: '+525512345678',
    foto_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200&h=200',
    qr_code: 'UNRC-2026-001',
    created_at: new Date().toISOString()
  },
  {
    id: 'student-2',
    matricula: 'UNRC-2026-002',
    nombre: 'Sofía',
    apellido_paterno: 'Herrera',
    apellido_materno: 'Díaz',
    grado: '3° Semestre',
    grupo: '302',
    carrera: 'Lic. en Inteligencia Artificial',
    tutor: 'Sr. Roberto Herrera',
    telefono: '+525523456789',
    foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200',
    qr_code: 'UNRC-2026-002',
    created_at: new Date().toISOString()
  },
  {
    id: 'student-3',
    matricula: 'UNRC-2026-003',
    nombre: 'Mateo',
    apellido_paterno: 'Ramírez',
    apellido_materno: 'Gómez',
    grado: '5° Semestre',
    grupo: '501',
    carrera: 'Lic. en Ciberseguridad',
    tutor: 'Sra. Patricia Gómez',
    telefono: '+525534567890',
    foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200&h=200',
    qr_code: 'UNRC-2026-003',
    created_at: new Date().toISOString()
  },
  {
    id: 'student-4',
    matricula: 'UNRC-2026-004',
    nombre: 'Valentina',
    apellido_paterno: 'Castro',
    apellido_materno: 'Vega',
    grado: '1° Semestre',
    grupo: '101',
    carrera: 'Lic. en Ciencias de la Computación',
    tutor: 'Sr. Fernando Castro',
    telefono: '+525545678901',
    foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200',
    qr_code: 'UNRC-2026-004',
    created_at: new Date().toISOString()
  }
];

// Initial mock data for UNRC Docentes
const MOCK_DOCENTES: Docente[] = [
  {
    id: 'docente-1',
    num_empleado: 'DOC-UNRC-01',
    nombre: 'Alejandro',
    apellido_paterno: 'Valdez',
    apellido_materno: 'Mendoza',
    email: 'alejandro.valdez@rcellanos.cdmx.gob.mx',
    departamento: 'Ciencias de la Computación',
    materias: ['Bases de Datos Avanzadas', 'Programación Web II'],
    telefono: '+525599887766',
    foto_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200',
    created_at: new Date().toISOString()
  },
  {
    id: 'docente-2',
    num_empleado: 'DOC-UNRC-02',
    nombre: 'Beatriz',
    apellido_paterno: 'Sánchez',
    apellido_materno: 'Pineda',
    email: 'beatriz.sanchez@rcellanos.cdmx.gob.mx',
    departamento: 'Inteligencia Artificial',
    materias: ['Redes Neuronales y Deep Learning', 'Algoritmos Complejos'],
    telefono: '+525588776655',
    foto_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
    created_at: new Date().toISOString()
  }
];

// Helper to initialize local storage
const initLocalStorage = () => {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('unrc_alumnos')) {
    localStorage.setItem('unrc_alumnos', JSON.stringify(MOCK_ALUMNOS));
  }

  if (!localStorage.getItem('unrc_docentes')) {
    localStorage.setItem('unrc_docentes', JSON.stringify(MOCK_DOCENTES));
  }

  if (!localStorage.getItem('unrc_asistencias')) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formatD = (d: Date) => d.toISOString().split('T')[0];

    const mockAsistencias: Asistencia[] = [
      {
        id: 'log-1',
        alumno_id: 'student-1',
        tipo: 'entrada',
        fecha: formatD(yesterday),
        hora: '07:12:15',
        dispositivo: 'Tablet Acceso Principal',
        ubicacion: 'Entrada Campus A',
        escaneado_por: 'Prefecto Juan',
        created_at: `${formatD(yesterday)}T07:12:15.000Z`
      },
      {
        id: 'log-2',
        alumno_id: 'student-1',
        tipo: 'salida',
        fecha: formatD(yesterday),
        hora: '13:48:32',
        dispositivo: 'Tablet Acceso Principal',
        ubicacion: 'Entrada Campus A',
        escaneado_por: 'Prefecto Juan',
        created_at: `${formatD(yesterday)}T13:48:32.000Z`
      },
      {
        id: 'log-3',
        alumno_id: 'student-2',
        tipo: 'entrada',
        fecha: formatD(today),
        hora: '07:05:12',
        dispositivo: 'Escáner Aula 102',
        ubicacion: 'Edificio B',
        escaneado_por: 'Dr. Alejandro Valdez',
        created_at: `${formatD(today)}T07:05:12.000Z`
      }
    ];

    localStorage.setItem('unrc_asistencias', JSON.stringify(mockAsistencias));
  }
};

// Database API Implementation
export const db = {
  isSandboxMode: () => {
    return !isSupabaseConfigured;
  },

  // Alumnos operations
  getAlumnos: async (): Promise<Alumno[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('alumnos')
          .select('*')
          .order('apellido_paterno', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) return data;
      } catch (err) {
        console.warn('Falling back to local data:', err);
      }
    }
    initLocalStorage();
    const raw = localStorage.getItem('unrc_alumnos');
    const list: Alumno[] = raw ? JSON.parse(raw) : MOCK_ALUMNOS;
    return list.sort((a, b) => a.apellido_paterno.localeCompare(b.apellido_paterno));
  },

  getAlumnoByQR: async (qrCode: string): Promise<Alumno | null> => {
    const list = await db.getAlumnos();
    return list.find(a => a.qr_code === qrCode || a.matricula === qrCode) || null;
  },

  addAlumno: async (alumno: Omit<Alumno, 'id' | 'created_at'>): Promise<Alumno> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('alumnos')
          .insert([{ ...alumno }])
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase insert failed, storing locally:', e);
      }
    }
    initLocalStorage();
    const list = await db.getAlumnos();
    const newAlumno: Alumno = {
      ...alumno,
      id: `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString()
    };
    list.push(newAlumno);
    localStorage.setItem('unrc_alumnos', JSON.stringify(list));
    return newAlumno;
  },

  addAlumnosBulk: async (alumnos: Omit<Alumno, 'id' | 'created_at'>[]): Promise<Alumno[]> => {
    initLocalStorage();
    const current = await db.getAlumnos();
    const newItems: Alumno[] = [];

    alumnos.forEach((al, idx) => {
      const item: Alumno = {
        ...al,
        id: `student-${Date.now()}-${idx}`,
        created_at: new Date().toISOString()
      };
      newItems.push(item);
      current.push(item);
    });

    localStorage.setItem('unrc_alumnos', JSON.stringify(current));

    // Try syncing to Supabase if configured
    if (supabase) {
      try {
        await supabase.from('alumnos').upsert(alumnos, { onConflict: 'matricula' });
      } catch (e) {
        console.warn('Supabase bulk sync notice:', e);
      }
    }

    return newItems;
  },

  updateAlumno: async (id: string, updates: Partial<Omit<Alumno, 'id' | 'created_at'>>): Promise<Alumno> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('alumnos')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase update notice:', e);
      }
    }
    initLocalStorage();
    const list = await db.getAlumnos();
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Student not found');
    const updated: Alumno = { ...list[idx], ...updates };
    list[idx] = updated;
    localStorage.setItem('unrc_alumnos', JSON.stringify(list));
    return updated;
  },

  deleteAlumno: async (id: string): Promise<boolean> => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('alumnos')
          .delete()
          .eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.warn('Supabase delete notice:', e);
      }
    }
    initLocalStorage();
    let list = await db.getAlumnos();
    const initialLen = list.length;
    list = list.filter(a => a.id !== id);
    localStorage.setItem('unrc_alumnos', JSON.stringify(list));
    
    let asistencias = await db.getAsistencias();
    asistencias = asistencias.filter(a => a.alumno_id !== id);
    localStorage.setItem('unrc_asistencias', JSON.stringify(asistencias));

    return list.length < initialLen;
  },

  // Docentes operations
  getDocentes: async (): Promise<Docente[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('docentes')
          .select('*')
          .order('apellido_paterno', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Docentes fetch fallback:', err);
      }
    }
    initLocalStorage();
    const raw = localStorage.getItem('unrc_docentes');
    return raw ? JSON.parse(raw) : MOCK_DOCENTES;
  },

  addDocentesBulk: async (docentes: Omit<Docente, 'id' | 'created_at'>[]): Promise<Docente[]> => {
    initLocalStorage();
    const current = await db.getDocentes();
    const newItems: Docente[] = [];

    docentes.forEach((doc, idx) => {
      const item: Docente = {
        ...doc,
        id: `docente-${Date.now()}-${idx}`,
        created_at: new Date().toISOString()
      };
      newItems.push(item);
      current.push(item);
    });

    localStorage.setItem('unrc_docentes', JSON.stringify(current));

    if (supabase) {
      try {
        await supabase.from('docentes').upsert(docentes, { onConflict: 'num_empleado' });
      } catch (e) {
        console.warn('Supabase docentes bulk sync notice:', e);
      }
    }

    return newItems;
  },

  // Asistencia operations
  getAsistencias: async (): Promise<Asistencia[]> => {
    initLocalStorage();
    const raw = localStorage.getItem('unrc_asistencias');
    const list: Asistencia[] = raw ? JSON.parse(raw) : [];
    const alumnos = await db.getAlumnos();
    
    const enriched = list.map(item => ({
      ...item,
      alumno: alumnos.find(al => al.id === item.alumno_id || al.matricula === item.alumno_id)
    }));
    
    return enriched.sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  },

  registrarAsistencia: async (
    matricula: string,
    tipoOverride?: 'entrada' | 'salida',
    dispositivo = 'Escáner UNRC',
    ubicacion = 'Acceso Principal',
    escaneadoPor = 'Docente / Sistema'
  ): Promise<{ asistencia: Asistencia; alumno: Alumno; duplicateWarning: boolean }> => {
    const alumno = await db.getAlumnoByQR(matricula);
    if (!alumno) {
      throw new Error(`Estudiante con matrícula/QR '${matricula}' no registrado en UNRC.`);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];

    const allAsistencias = await db.getAsistencias();
    const todayLogs = allAsistencias.filter(
      log => (log.alumno_id === alumno.id || log.alumno_id === alumno.matricula) && log.fecha === todayStr
    );

    const now = new Date();
    const duplicateWarning = todayLogs.some(log => {
      const logTime = new Date(`${log.fecha}T${log.hora}`);
      return Math.abs(now.getTime() - logTime.getTime()) < 30000;
    });

    let tipo: 'entrada' | 'salida' = 'entrada';
    if (tipoOverride) {
      tipo = tipoOverride;
    } else if (todayLogs.length > 0) {
      const lastLog = todayLogs[todayLogs.length - 1];
      tipo = lastLog.tipo === 'entrada' ? 'salida' : 'entrada';
    }

    const list = JSON.parse(localStorage.getItem('unrc_asistencias') || '[]');
    const asistenciaData: Asistencia = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      alumno_id: alumno.id,
      tipo,
      fecha: todayStr,
      hora: timeStr,
      dispositivo,
      ubicacion,
      escaneado_por: escaneadoPor,
      created_at: new Date().toISOString(),
      alumno
    };
    list.push(asistenciaData);
    localStorage.setItem('unrc_asistencias', JSON.stringify(list));

    if (supabase) {
      try {
        await supabase.from('asistencias').insert([
          {
            alumno_id: alumno.id,
            tipo,
            fecha: todayStr,
            hora: timeStr,
            dispositivo,
            ubicacion,
            escaneado_por: escaneadoPor
          }
        ]);
      } catch (e) {
        console.warn('Supabase asistencia insert notice:', e);
      }
    }

    // Trigger WhatsApp notification simulation
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('dojoia_whatsapp_alert', {
        detail: { alumno, asistencia: asistenciaData }
      });
      window.dispatchEvent(event);
    }

    return { asistencia: asistenciaData, alumno, duplicateWarning };
  },

  // Supabase Administrator Database Sync Operations
  syncToSupabase: async (
    data: { alumnos?: Alumno[]; docentes?: Docente[] },
    targetSupabaseUrl?: string,
    targetSupabaseKey?: string
  ): Promise<{ success: boolean; alumnosSynced: number; docentesSynced: number; logs: string[] }> => {
    const logs: string[] = [];
    let alumnosCount = 0;
    let docentesCount = 0;

    const activeClient = (targetSupabaseUrl && targetSupabaseKey)
      ? createClient(targetSupabaseUrl, targetSupabaseKey)
      : supabase;

    if (!activeClient) {
      logs.push('⚠️ No se ha proporcionado cliente de Supabase. Los datos se sincronizaron en almacenamiento local.');
      // Local sync fallback
      if (data.alumnos && data.alumnos.length > 0) {
        await db.addAlumnosBulk(data.alumnos);
        alumnosCount = data.alumnos.length;
        logs.push(`✅ ${alumnosCount} alumnos cargados localmente en Sandbox.`);
      }
      if (data.docentes && data.docentes.length > 0) {
        await db.addDocentesBulk(data.docentes);
        docentesCount = data.docentes.length;
        logs.push(`✅ ${docentesCount} docentes cargados localmente en Sandbox.`);
      }
      return { success: true, alumnosSynced: alumnosCount, docentesSynced: docentesCount, logs };
    }

    try {
      logs.push('🔗 Conectando con proyecto Supabase PostgreSQL...');

      if (data.alumnos && data.alumnos.length > 0) {
        logs.push(`📤 Insertando/actualizando ${data.alumnos.length} registros en tabla 'alumnos'...`);
        const { data: inserted, error } = await activeClient
          .from('alumnos')
          .upsert(
            data.alumnos.map(a => ({
              matricula: a.matricula,
              nombre: a.nombre,
              apellido_paterno: a.apellido_paterno,
              apellido_materno: a.apellido_materno || '',
              grado: a.grado,
              grupo: a.grupo,
              carrera: a.carrera || 'Universidad Rosario Castellanos',
              tutor: a.tutor || 'Tutor Registrado',
              telefono: a.telefono || '+525500000000',
              foto_url: a.foto_url,
              qr_code: a.qr_code || a.matricula
            })),
            { onConflict: 'matricula' }
          )
          .select();

        if (error) {
          logs.push(`❌ Error en tabla 'alumnos': ${error.message}`);
        } else {
          alumnosCount = inserted?.length || data.alumnos.length;
          logs.push(`✅ ${alumnosCount} alumnos sincronizados con éxito en Supabase.`);
        }
      }

      if (data.docentes && data.docentes.length > 0) {
        logs.push(`📤 Insertando/actualizando ${data.docentes.length} registros en tabla 'docentes'...`);
        const { data: insertedDoc, error: docError } = await activeClient
          .from('docentes')
          .upsert(
            data.docentes.map(d => ({
              num_empleado: d.num_empleado,
              nombre: d.nombre,
              apellido_paterno: d.apellido_paterno,
              apellido_materno: d.apellido_materno || '',
              email: d.email,
              departamento: d.departamento || 'Licenciaturas UNRC',
              materias: d.materias || ['Computación'],
              telefono: d.telefono || '+525500000000',
              foto_url: d.foto_url
            })),
            { onConflict: 'num_empleado' }
          )
          .select();

        if (docError) {
          logs.push(`❌ Error en tabla 'docentes': ${docError.message}`);
        } else {
          docentesCount = insertedDoc?.length || data.docentes.length;
          logs.push(`✅ ${docentesCount} docentes sincronizados con éxito en Supabase.`);
        }
      }

      // Also update local storage for live UI preview consistency
      if (data.alumnos) await db.addAlumnosBulk(data.alumnos);
      if (data.docentes) await db.addDocentesBulk(data.docentes);

      logs.push('🎉 Proceso de sincronización con Supabase finalizado.');
      return { success: true, alumnosSynced: alumnosCount, docentesSynced: docentesCount, logs };
    } catch (err: any) {
      logs.push(`❌ Excepción al conectar con Supabase: ${err.message || err}`);
      return { success: false, alumnosSynced: 0, docentesSynced: 0, logs };
    }
  },

  clearDatabase: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('unrc_alumnos');
    localStorage.removeItem('unrc_docentes');
    localStorage.removeItem('unrc_asistencias');
    initLocalStorage();
  }
};
