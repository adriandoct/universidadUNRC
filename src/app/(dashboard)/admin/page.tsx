"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Search,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  Bell,
  Send,
  Sparkles,
  Building,
  School,
  FileSpreadsheet,
  RefreshCw,
  X,
  Download,
  QrCode,
  MapPin,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  UserCheck,
  Layers,
  Award,
  Briefcase,
  Globe,
  FileText,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import {
  generateDocenteHorarioPDF,
  downloadDocenteICS,
  createGoogleCalendarUrl
} from '@/lib/horarioDocenteUtils';
import { getTijuanaDateString } from '@/lib/tijuanaTime';
import BulkUploadAlumnosModal from '@/components/BulkUploadAlumnosModal';
import {
  db,
  Docente,
  Alumno,
  Carrera,
  Materia,
  Grupo,
  AuditoriaLog,
  AnuncioInstitucional,
  Sede,
  CicloEscolar,
  Grado,
  Seccion,
  HorarioDocenteItem,
  getDefaultUserPassword
} from '@/lib/db';

type TabType =
  | 'sedes'
  | 'ciclos'
  | 'grados_secciones'
  | 'carreras_materias'
  | 'personal'
  | 'matriculas'
  | 'auditoria'
  | 'anuncios';

export default function AdminDashboardPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('personal');

  // Strict Authentication Guard
  useEffect(() => {
    if (!authLoading && (!user || role !== 'administrador')) {
      window.location.href = '/login?error=admin_required';
    }
  }, [user, role, authLoading]);

  // Core Data States
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ciclos, setCiclos] = useState<CicloEscolar[]>([]);
  const [grados, setGrados] = useState<Grado[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [auditorias, setAuditorias] = useState<AuditoriaLog[]>([]);
  const [anuncios, setAnuncios] = useState<AnuncioInstitucional[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCarrera, setFilterCarrera] = useState('todos');
  const [filterSede, setFilterSede] = useState('todos');
  const [filterEstadoMatricula, setFilterEstadoMatricula] = useState('todos');
  const [filterAuditoriaModulo, setFilterAuditoriaModulo] = useState('todos');

  // Modal Control
  const [modalType, setModalType] = useState<
    | 'sede'
    | 'ciclo'
    | 'grado'
    | 'seccion'
    | 'carrera'
    | 'materia'
    | 'personal'
    | 'asignar_docente'
    | 'alumno'
    | 'anuncio'
    | 'credencial_qr'
    | null
  >(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedAlumnoQr, setSelectedAlumnoQr] = useState<Alumno | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Toast Feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Form States
  const [sedeForm, setSedeForm] = useState({
    clave: '',
    nombre: '',
    direccion: '',
    director: '',
    telefono: '',
    capacidad: 1000,
    activa: true,
  });

  const [cicloForm, setCicloForm] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    is_active: false,
  });

  const [gradoForm, setGradoForm] = useState({
    nombre: '',
    nivel: 'Licenciatura',
    orden: 1,
  });

  const [seccionForm, setSeccionForm] = useState({
    nombre: '',
    grado_id: '',
    carrera_id: '',
    sede_id: '',
    turno: 'Matutino' as 'Matutino' | 'Vespertino' | 'Sabatino',
    aula: '',
    cupo_maximo: 35,
  });

  const [carreraForm, setCarreraForm] = useState({
    clave: '',
    nombre: '',
    nivel: 'Licenciatura',
    sede_id: '',
  });

  const [materiaForm, setMateriaForm] = useState({
    clave: '',
    nombre: '',
    carrera_id: '',
    creditos: 8,
    semestre: '1° Semestre',
    horas_semana: 6,
  });

  const [personalForm, setPersonalForm] = useState({
    num_empleado: '',
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    email: '',
    departamento: 'Lic. en Turismo',
    puesto: 'docente' as 'docente' | 'coordinador' | 'secretaria' | 'rectoria',
    telefono: '',
    sede_nombre: 'Campus Magdalena Contreras',
    password: '',
  });
  const [showPersonalPassword, setShowPersonalPassword] = useState(false);

  // State for Asignación Docente (carreras + horarios)
  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null);
  const [assignedCarreras, setAssignedCarreras] = useState<string[]>([]);
  const [assignedMaterias, setAssignedMaterias] = useState<string[]>([]);
  const [assignedHorarios, setAssignedHorarios] = useState<HorarioDocenteItem[]>([]);
  const [assignedSede, setAssignedSede] = useState('');
  const [editingHorarioIndex, setEditingHorarioIndex] = useState<number | null>(null);
  
  // New Horario Slot sub-form
  const [newHorarioSlot, setNewHorarioSlot] = useState<HorarioDocenteItem>({
    dia: 'Miércoles',
    hora_inicio: '09:00',
    hora_fin: '11:00',
    carrera: 'Lic. en Turismo',
    materia: 'Administración de Empresas de Hospedaje',
    grupo: '201-TUR',
    aula: 'Edificio A - Aula Magna 2',
    es_en_linea: false,
  });

  const [alumnoForm, setAlumnoForm] = useState({
    matricula: '',
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    grado: '2° Semestre',
    grupo: '201-TUR',
    carrera_id: '',
    sede_id: '',
    ciclo_id: '',
    estado_matricula: 'activo' as 'activo' | 'baja_temporal' | 'egresado' | 'aspirante',
    tutor: 'Dr. Adrian Silva',
    telefono: '',
    password: '',
  });
  const [showAlumnoPassword, setShowAlumnoPassword] = useState(false);

  const [anuncioForm, setAnuncioForm] = useState({
    titulo: '',
    contenido: '',
    audiencia: 'todos' as 'todos' | 'docentes' | 'alumnos',
    prioridad: 'normal' as 'normal' | 'alta' | 'urgente',
    autor: 'Rectoría General UNRC',
  });

  // Fetch all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [
        sds,
        cls,
        grs,
        scs,
        cars,
        mats,
        grps,
        docs,
        als,
        auds,
        anus,
      ] = await Promise.all([
        db.getSedes(),
        db.getCiclosEscolares(),
        db.getGrados(),
        db.getSecciones(),
        db.getCarreras(),
        db.getMaterias(),
        db.getGrupos(),
        db.getDocentes(),
        db.getAlumnos(),
        db.getAuditorias(),
        db.getAnuncios(),
      ]);

      setSedes(sds);
      setCiclos(cls);
      setGrados(grs);
      setSecciones(scs);
      setCarreras(cars);
      setMaterias(mats);
      setGrupos(grps);
      setDocentes(docs);
      setAlumnos(als);
      setAuditorias(auds);
      setAnuncios(anus);

      if (cars.length > 0 && !alumnoForm.carrera_id) {
        setAlumnoForm((prev) => ({
          ...prev,
          carrera_id: cars[0].id,
          sede_id: sds[0]?.id || '',
          ciclo_id: cls.find((c) => c.is_active)?.id || cls[0]?.id || '',
        }));
        setMateriaForm((prev) => ({ ...prev, carrera_id: cars[0].id }));
        setSeccionForm((prev) => ({
          ...prev,
          carrera_id: cars[0].id,
          grado_id: grs[0]?.id || '',
          sede_id: sds[0]?.id || '',
        }));
      }
    } catch (err) {
      console.error('Error cargando datos administrativos UNRC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers for Sedes
  const handleSaveSede = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await db.updateSede(editingId, sedeForm);
        setSedes((prev) =>
          prev.map((s) => (s.id === editingId ? { ...s, ...(updated || sedeForm) } : s))
        );
        showToast('Sede universitaria actualizada con éxito');
      } else {
        const newSede = await db.addSede(sedeForm);
        setSedes((prev) => [...prev, newSede]);
        showToast('Nueva sede incorporada al sistema');
      }
      setModalType(null);
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteSede = async (id: string, name: string) => {
    if (confirm(`¿Confirma eliminar la sede "${name}"?`)) {
      await db.deleteSede(id);
      setSedes((prev) => prev.filter((s) => s.id !== id));
      showToast(`Sede ${name} eliminada.`);
      await loadData();
    }
  };

  // Handlers for Ciclos Escolares
  const handleSaveCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCiclo = await db.addCicloEscolar(cicloForm);
      setCiclos((prev) => [...prev, newCiclo]);
      showToast(`Ciclo escolar ${cicloForm.nombre} creado.`);
      setModalType(null);
      setCicloForm({ nombre: '', fecha_inicio: '', fecha_fin: '', is_active: false });
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleActivarCiclo = async (id: string, nombre: string) => {
    await db.activarCicloEscolar(id);
    setCiclos((prev) =>
      prev.map((c) => ({ ...c, is_active: c.id === id }))
    );
    showToast(`Ciclo oficial activo cambiado a: ${nombre}`);
    await loadData();
  };

  const handleDeleteCiclo = async (id: string, name: string) => {
    if (confirm(`¿Eliminar ciclo escolar "${name}"?`)) {
      await db.deleteCicloEscolar(id);
      setCiclos((prev) => prev.filter((c) => c.id !== id));
      showToast('Ciclo eliminado.');
      await loadData();
    }
  };

  // Handlers for Grados
  const handleSaveGrado = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newGrado = await db.addGrado({
        nombre: gradoForm.nombre,
        nivel: gradoForm.nivel,
        orden: Number(gradoForm.orden),
      });
      setGrados((prev) => [...prev, newGrado]);
      showToast(`Semestre/Grado ${gradoForm.nombre} creado.`);
      setModalType(null);
      setGradoForm({ nombre: '', nivel: 'Licenciatura', orden: grados.length + 1 });
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteGrado = async (id: string) => {
    if (confirm('¿Eliminar este nivel/semestre?')) {
      await db.deleteGrado(id);
      setGrados((prev) => prev.filter((g) => g.id !== id));
      showToast('Grado eliminado.');
      await loadData();
    }
  };

  // Handlers for Secciones
  const handleSaveSeccion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const gObj = grados.find((g) => g.id === seccionForm.grado_id);
      const cObj =
        carreras.find((c) => c.id === seccionForm.carrera_id) ||
        carreras.find(
          (c) =>
            (seccionForm.carrera_id === 'c1' && (c.id.includes('c1') || c.nombre.toLowerCase().includes('datos'))) ||
            (seccionForm.carrera_id === 'c2' && (c.id.includes('c2') || c.nombre.toLowerCase().includes('tecnolog'))) ||
            (seccionForm.carrera_id === 'c3' && (c.id.includes('c3') || c.nombre.toLowerCase().includes('ciber'))) ||
            (seccionForm.carrera_id === 'c4' && (c.id.includes('c4') || c.nombre.toLowerCase().includes('turis'))) ||
            (seccionForm.carrera_id === 'c5' && (c.id.includes('c5') || c.nombre.toLowerCase().includes('admin')))
        ) ||
        carreras.find((c) => c.nombre.toLowerCase().includes('datos')) ||
        carreras[0];
      const sObj = sedes.find((s) => s.id === seccionForm.sede_id) || sedes[0];

      const resolvedCarreraId = cObj?.id || seccionForm.carrera_id || carreras[0]?.id || '';
      const resolvedCarreraNombre = cObj?.nombre || 'Licenciatura en Ciencias de Datos e Inteligencia Artificial';

      if (editingId) {
        const updated = await db.updateSeccion(editingId, {
          ...seccionForm,
          carrera_id: resolvedCarreraId,
          grado_nombre: gObj?.nombre,
          carrera_nombre: resolvedCarreraNombre,
          sede_nombre: sObj?.nombre,
          cupo_maximo: Number(seccionForm.cupo_maximo),
        });
        setSecciones((prev) =>
          prev.map((s) =>
            s.id === editingId
              ? {
                  ...s,
                  ...(updated || seccionForm),
                  carrera_id: resolvedCarreraId,
                  carrera_nombre: resolvedCarreraNombre,
                  grado_nombre: gObj?.nombre || s.grado_nombre,
                  sede_nombre: sObj?.nombre || s.sede_nombre,
                }
              : s
          )
        );
        showToast('Sección actualizada.');
      } else {
        const newSec = await db.addSeccion({
          ...seccionForm,
          carrera_id: resolvedCarreraId,
          grado_nombre: gObj?.nombre,
          carrera_nombre: resolvedCarreraNombre,
          sede_nombre: sObj?.nombre,
          cupo_maximo: Number(seccionForm.cupo_maximo),
        });
        setSecciones((prev) => [...prev, newSec]);
        showToast(`Sección ${seccionForm.nombre} dada de alta.`);
      }
      setModalType(null);
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteSeccion = async (id: string, name: string) => {
    if (confirm(`¿Eliminar la sección "${name}"?`)) {
      await db.deleteSeccion(id);
      setSecciones((prev) => prev.filter((s) => s.id !== id));
      showToast(`Sección ${name} eliminada.`);
      await loadData();
    }
  };

  // Handlers for Carreras
  const handleSaveCarrera = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sObj = sedes.find((s) => s.id === carreraForm.sede_id);
      if (editingId) {
        const updated = await db.updateCarrera(editingId, {
          clave: carreraForm.clave,
          nombre: carreraForm.nombre,
          nivel: carreraForm.nivel,
          sede_id: carreraForm.sede_id,
          sede_nombre: sObj?.nombre,
        });
        setCarreras((prev) =>
          prev.map((c) =>
            c.id === editingId || c.clave === editingId || c.clave === carreraForm.clave || (updated && c.id === updated.id)
              ? {
                  ...c,
                  ...(updated || {}),
                  clave: carreraForm.clave,
                  nombre: carreraForm.nombre,
                  nivel: carreraForm.nivel,
                  sede_id: carreraForm.sede_id,
                  sede_nombre: sObj?.nombre || c.sede_nombre,
                }
              : c
          )
        );
        showToast(`Carrera ${carreraForm.nombre} actualizada.`);
      } else {
        const newCar = await db.addCarrera({
          clave: carreraForm.clave,
          nombre: carreraForm.nombre,
          nivel: carreraForm.nivel,
          sede_id: carreraForm.sede_id,
          sede_nombre: sObj?.nombre,
        });
        setCarreras((prev) => [...prev, newCar]);
        showToast(`Carrera ${carreraForm.nombre} agregada.`);
      }
      setModalType(null);
      setEditingId(null);
      setCarreraForm({ clave: '', nombre: '', nivel: 'Licenciatura', sede_id: '' });
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteCarrera = async (id: string, name: string) => {
    if (confirm(`¿Eliminar la carrera "${name}"?`)) {
      await db.deleteCarrera(id);
      setCarreras((prev) => prev.filter((c) => c.id !== id && c.clave !== id));
      showToast(`Carrera eliminada.`);
      await loadData();
    }
  };

  // Handlers for Materias
  const handleSaveMateria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await db.updateMateria(editingId, {
          clave: materiaForm.clave,
          nombre: materiaForm.nombre,
          carrera_id: materiaForm.carrera_id,
          creditos: Number(materiaForm.creditos),
          semestre: materiaForm.semestre,
          horas_semana: Number(materiaForm.horas_semana),
        });
        setMaterias((prev) =>
          prev.map((m) =>
            m.id === editingId || m.clave === editingId || m.clave === materiaForm.clave || (updated && m.id === updated.id)
              ? {
                  ...m,
                  ...(updated || {}),
                  clave: materiaForm.clave,
                  nombre: materiaForm.nombre,
                  carrera_id: materiaForm.carrera_id,
                  creditos: Number(materiaForm.creditos),
                  semestre: materiaForm.semestre,
                  horas_semana: Number(materiaForm.horas_semana),
                }
              : m
          )
        );
        showToast(`Asignatura ${materiaForm.nombre} actualizada.`);
      } else {
        const newMat = await db.addMateria({
          clave: materiaForm.clave,
          nombre: materiaForm.nombre,
          carrera_id: materiaForm.carrera_id,
          creditos: Number(materiaForm.creditos),
          semestre: materiaForm.semestre,
          horas_semana: Number(materiaForm.horas_semana),
        });
        setMaterias((prev) => [...prev, newMat]);
        showToast(`Asignatura ${materiaForm.nombre} registrada.`);
      }
      setModalType(null);
      setEditingId(null);
      setMateriaForm({
        clave: '',
        nombre: '',
        carrera_id: carreras[0]?.id || '',
        creditos: 8,
        semestre: '1° Semestre',
        horas_semana: 6,
      });
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteMateria = async (id: string, name: string) => {
    if (confirm(`¿Eliminar asignatura "${name}"?`)) {
      await db.deleteMateria(id);
      setMaterias((prev) => prev.filter((m) => m.id !== id && m.clave !== id));
      showToast(`Asignatura eliminada.`);
      await loadData();
    }
  };

  // Handlers for Personal & Docentes
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assignedPassword =
        personalForm.password.trim() ||
        getDefaultUserPassword(personalForm.num_empleado, '2026-2');

      if (editingId) {
        const updated = await db.updateDocente(editingId, {
          num_empleado: personalForm.num_empleado,
          nombre: personalForm.nombre,
          apellido_paterno: personalForm.apellido_paterno,
          apellido_materno: personalForm.apellido_materno,
          email: personalForm.email,
          departamento: personalForm.departamento,
          puesto: personalForm.puesto,
          telefono: personalForm.telefono,
          sede_nombre: personalForm.sede_nombre,
          password: assignedPassword,
        });
        setDocentes((prev) =>
          prev.map((d) =>
            d.id === editingId || d.num_empleado === editingId || (updated && d.id === updated.id)
              ? { ...d, ...(updated || personalForm), password: assignedPassword }
              : d
          )
        );
        showToast('Expediente de personal y contraseña actualizados');
      } else {
        const newDoc = await db.addDocente({
          num_empleado: personalForm.num_empleado,
          nombre: personalForm.nombre,
          apellido_paterno: personalForm.apellido_paterno,
          apellido_materno: personalForm.apellido_materno,
          email: personalForm.email,
          departamento: personalForm.departamento,
          puesto: personalForm.puesto,
          telefono: personalForm.telefono,
          sede_nombre: personalForm.sede_nombre,
          password: assignedPassword,
          materias: [],
          carreras_asignadas: [personalForm.departamento],
          horario_resumen: 'Por programar',
          horarios: [],
        });
        setDocentes((prev) => [...prev, newDoc]);
        showToast('Personal registrado con contraseña institucional');
      }
      setModalType(null);
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeletePersonal = async (id: string, name: string) => {
    if (confirm(`¿Confirma dar de baja a ${name}?`)) {
      await db.deleteDocente(id);
      setDocentes((prev) => prev.filter((d) => d.id !== id && d.num_empleado !== id));
      showToast(`Personal ${name} dado de baja.`);
      await loadData();
    }
  };

  // Open Asignación Docente Modal (Audio requirement)
  const handleOpenAsignarDocente = (doc: Docente) => {
    setSelectedDocente(doc);
    setAssignedCarreras(doc.carreras_asignadas || [doc.departamento]);
    setAssignedMaterias(doc.materias || []);
    setAssignedHorarios(doc.horarios || []);
    setAssignedSede(doc.sede_nombre || 'Campus Magdalena Contreras');
    setEditingHorarioIndex(null);
    setNewHorarioSlot({
      dia: 'Miércoles',
      hora_inicio: '09:00',
      hora_fin: '11:00',
      carrera: doc.carreras_asignadas?.[0] || doc.departamento || 'Lic. en Turismo',
      materia: doc.materias?.[0] || 'Administración de Empresas de Hospedaje',
      grupo: secciones[0]?.nombre || '201-TUR',
      aula: 'Edificio A - Aula Magna 2',
      es_en_linea: false,
    });
    setModalType('asignar_docente');
  };

  const handleToggleCarreraAsignada = (carreraNombre: string) => {
    setAssignedCarreras((prev) =>
      prev.includes(carreraNombre)
        ? prev.filter((c) => c !== carreraNombre)
        : [...prev, carreraNombre]
    );
  };

  const handleToggleMateriaAsignada = (materiaNombre: string) => {
    setAssignedMaterias((prev) =>
      prev.includes(materiaNombre)
        ? prev.filter((m) => m !== materiaNombre)
        : [...prev, materiaNombre]
    );
  };

  const handleStartEditHorarioSlot = (index: number) => {
    setEditingHorarioIndex(index);
    const targetSlot = assignedHorarios[index];
    if (targetSlot) {
      setNewHorarioSlot({ ...targetSlot });
      showToast(`Editando bloque: ${targetSlot.dia} ${targetSlot.hora_inicio}-${targetSlot.hora_fin} hrs`);
    }
  };

  const handleCancelEditHorarioSlot = () => {
    setEditingHorarioIndex(null);
    setNewHorarioSlot({
      dia: 'Miércoles',
      hora_inicio: '09:00',
      hora_fin: '11:00',
      carrera: selectedDocente?.carreras_asignadas?.[0] || selectedDocente?.departamento || 'Lic. en Turismo',
      materia: selectedDocente?.materias?.[0] || 'Administración de Empresas de Hospedaje',
      grupo: secciones[0]?.nombre || '201-TUR',
      aula: 'Edificio A - Aula Magna 2',
      es_en_linea: false,
    });
  };

  const handleSaveHorarioSlot = () => {
    if (!newHorarioSlot.materia || !newHorarioSlot.grupo) {
      showToast('Selecciona materia y grupo para el bloque de horario', 'error');
      return;
    }
    if (editingHorarioIndex !== null) {
      setAssignedHorarios((prev) => {
        const updated = [...prev];
        updated[editingHorarioIndex] = { ...newHorarioSlot };
        return updated;
      });
      setEditingHorarioIndex(null);
      showToast(`Bloque de horario actualizado (${newHorarioSlot.es_en_linea ? 'En línea 🌐' : 'Presencial 🏛️'})`);
    } else {
      setAssignedHorarios((prev) => [...prev, { ...newHorarioSlot, id: `h-${Date.now()}` }]);
      showToast(`Bloque de horario añadido (${newHorarioSlot.es_en_linea ? 'En línea 🌐' : 'Presencial 🏛️'})`);
    }
  };

  const handleRemoveHorarioSlot = (index: number) => {
    if (editingHorarioIndex === index) {
      setEditingHorarioIndex(null);
    }
    setAssignedHorarios((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAsignacionDocente = async () => {
    if (!selectedDocente) return;
    try {
      // Build text summary of schedule with modality indicator
      const summary =
        assignedHorarios.length > 0
          ? assignedHorarios
              .map((h) => `${h.dia} (${h.hora_inicio}-${h.hora_fin} hrs • ${h.grupo} • ${h.es_en_linea ? 'En línea' : 'Presencial'})`)
              .join(' | ')
          : 'Sin horario fijado';

      const updatedDoc = await db.asignarDocenteHorarioCarreras(selectedDocente.id, {
        carreras_asignadas: assignedCarreras,
        materias: assignedMaterias,
        horario_resumen: summary,
        horarios: assignedHorarios,
        sede_nombre: assignedSede,
      });

      // Update local state immediately so UI updates right now!
      setDocentes((prev) =>
        prev.map((d) =>
          d.id === selectedDocente.id || d.num_empleado === selectedDocente.num_empleado
            ? {
                ...d,
                ...(updatedDoc || {}),
                carreras_asignadas: assignedCarreras,
                materias: assignedMaterias,
                horario_resumen: summary,
                horarios: assignedHorarios,
                sede_nombre: assignedSede,
              }
            : d
        )
      );

      showToast(`Asignación académica guardada para ${selectedDocente.nombre} ${selectedDocente.apellido_paterno}`);
      setModalType(null);
      setSelectedDocente(null);
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Handlers for Alumnos & Matrículas
  const handleSaveAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedCarrera = carreras.find((c) => c.id === alumnoForm.carrera_id);
      const selectedSede = sedes.find((s) => s.id === alumnoForm.sede_id);
      const assignedPassword =
        alumnoForm.password.trim() ||
        getDefaultUserPassword(alumnoForm.matricula, '2026-2');

      if (editingId) {
        const updated = await db.updateAlumnoMatricula(editingId, {
          matricula: alumnoForm.matricula,
          nombre: alumnoForm.nombre,
          apellido_paterno: alumnoForm.apellido_paterno,
          apellido_materno: alumnoForm.apellido_materno,
          grado: alumnoForm.grado,
          grupo: alumnoForm.grupo,
          carrera_id: alumnoForm.carrera_id,
          carrera: selectedCarrera?.nombre || 'Licenciatura UNRC',
          sede_id: alumnoForm.sede_id,
          sede_nombre: selectedSede?.nombre,
          ciclo_id: alumnoForm.ciclo_id,
          estado_matricula: alumnoForm.estado_matricula,
          tutor: alumnoForm.tutor,
          telefono: alumnoForm.telefono,
          password: assignedPassword,
        });
        setAlumnos((prev) =>
          prev.map((a) =>
            a.id === editingId || a.matricula === editingId || (updated && a.id === updated.id)
              ? {
                  ...a,
                  ...(updated || {}),
                  matricula: alumnoForm.matricula,
                  nombre: alumnoForm.nombre,
                  apellido_paterno: alumnoForm.apellido_paterno,
                  apellido_materno: alumnoForm.apellido_materno,
                  grado: alumnoForm.grado,
                  grupo: alumnoForm.grupo,
                  carrera_id: alumnoForm.carrera_id,
                  carrera: selectedCarrera?.nombre || a.carrera,
                  sede_id: alumnoForm.sede_id,
                  sede_nombre: selectedSede?.nombre || a.sede_nombre,
                  ciclo_id: alumnoForm.ciclo_id,
                  estado_matricula: alumnoForm.estado_matricula,
                  tutor: alumnoForm.tutor,
                  telefono: alumnoForm.telefono,
                  password: assignedPassword,
                }
              : a
          )
        );
        showToast('Expediente, matrícula y contraseña actualizados.');
      } else {
        const newAl = await db.addAlumno({
          matricula: alumnoForm.matricula,
          nombre: alumnoForm.nombre,
          apellido_paterno: alumnoForm.apellido_paterno,
          apellido_materno: alumnoForm.apellido_materno,
          grado: alumnoForm.grado,
          grupo: alumnoForm.grupo,
          carrera_id: alumnoForm.carrera_id,
          carrera: selectedCarrera?.nombre || 'Licenciatura UNRC',
          sede_id: alumnoForm.sede_id,
          sede_nombre: selectedSede?.nombre,
          ciclo_id: alumnoForm.ciclo_id,
          estado_matricula: alumnoForm.estado_matricula,
          tutor: alumnoForm.tutor,
          telefono: alumnoForm.telefono,
          qr_code: alumnoForm.matricula,
          password: assignedPassword,
        });
        setAlumnos((prev) => [...prev, newAl]);
        showToast('Estudiante matriculado con contraseña institucional.');
      }
      setModalType(null);
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleQuickStatusChange = async (
    id: string,
    newStatus: 'activo' | 'baja_temporal' | 'egresado'
  ) => {
    await db.updateAlumnoMatricula(id, { estado_matricula: newStatus });
    setAlumnos((prev) =>
      prev.map((a) => (a.id === id || a.matricula === id ? { ...a, estado_matricula: newStatus } : a))
    );
    showToast(`Estado de matrícula actualizado a: ${newStatus.toUpperCase()}`);
    await loadData();
  };

  const handleDeleteAlumno = async (id: string, name: string) => {
    if (confirm(`¿Confirma dar de baja definitiva la matrícula de ${name}?`)) {
      await db.deleteAlumno(id);
      setAlumnos((prev) => prev.filter((a) => a.id !== id && a.matricula !== id));
      showToast(`Estudiante ${name} eliminado.`);
      await loadData();
    }
  };

  // Handlers for Anuncios
  const handleSaveAnuncio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newAnuncio = await db.addAnuncio(anuncioForm);
      setAnuncios((prev) => [newAnuncio, ...prev]);
      showToast('Comunicado institucional publicado.');
      setModalType(null);
      setAnuncioForm({
        titulo: '',
        contenido: '',
        audiencia: 'todos',
        prioridad: 'normal',
        autor: 'Rectoría General UNRC',
      });
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  const handleDeleteAnuncio = async (id: string) => {
    if (confirm('¿Eliminar este comunicado?')) {
      await db.deleteAnuncio(id);
      setAnuncios((prev) => prev.filter((a) => a.id !== id));
      showToast('Comunicado eliminado.');
      await loadData();
    }
  };

  // Export Auditoria Log
  const handleExportAuditoria = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditorias, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `bitacora_auditoria_unrc_${getTijuanaDateString()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Bitácora de auditoría exportada correctamente.');
  };

  // Normalizer for career text matching
  const normCareerText = (str: string = '') =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^lic(\.|\s+en\s+)?/, 'licenciatura en ')
      .replace(/\s+/g, ' ')
      .trim();

  // Filtered Alumnos
  const filteredAlumnos = alumnos.filter((a) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      `${a.nombre} ${a.apellido_paterno} ${a.apellido_materno || ''}`
        .toLowerCase()
        .includes(query) ||
      a.matricula.toLowerCase().includes(query) ||
      a.grupo.toLowerCase().includes(query);

    const selectedCarreraObj = carreras.find(
      (c) => c.id === filterCarrera || c.nombre === filterCarrera || c.clave === filterCarrera
    );

    let matchesCarrera = filterCarrera === 'todos';
    if (!matchesCarrera && selectedCarreraObj) {
      const selId = (selectedCarreraObj.id || '').toLowerCase();
      const selClave = (selectedCarreraObj.clave || '').toUpperCase();
      const selNameNorm = normCareerText(selectedCarreraObj.nombre);

      const aCId = (a.carrera_id || '').toLowerCase();
      const aNameNorm = normCareerText(a.carrera);

      if (
        aCId === selId ||
        aCId === filterCarrera.toLowerCase() ||
        a.carrera === selectedCarreraObj.nombre ||
        a.carrera === filterCarrera ||
        (selNameNorm && aNameNorm && (selNameNorm === aNameNorm || selNameNorm.includes(aNameNorm) || aNameNorm.includes(selNameNorm)))
      ) {
        matchesCarrera = true;
      } else if (selClave.includes('ADM') || selNameNorm.includes('administra')) {
        matchesCarrera = aNameNorm.includes('administra') || aCId.includes('c5');
      } else if (selClave.includes('TUR') || selNameNorm.includes('turis')) {
        matchesCarrera = aNameNorm.includes('turis') || aCId.includes('c4');
      } else if (selClave.includes('CDIA') || selNameNorm.includes('datos') || selNameNorm.includes('inteligencia')) {
        matchesCarrera = aNameNorm.includes('datos') || aNameNorm.includes('inteligencia') || aCId.includes('c1');
      } else if (selClave.includes('TIC') || selNameNorm.includes('tecnolog') || selNameNorm.includes('informacion')) {
        matchesCarrera = aNameNorm.includes('tecnolog') || aNameNorm.includes('tic') || aCId.includes('c2');
      } else if (selClave.includes('CIB') || selNameNorm.includes('ciber')) {
        matchesCarrera = aNameNorm.includes('ciber') || aCId.includes('c3');
      }
    }

    const selectedSedeObj = sedes.find((s) => s.id === filterSede || s.nombre === filterSede);
    const matchesSede =
      filterSede === 'todos' ||
      a.sede_id === filterSede ||
      a.sede_nombre === filterSede ||
      (selectedSedeObj && (
        a.sede_id === selectedSedeObj.id ||
        (a.sede_nombre && a.sede_nombre.toLowerCase() === selectedSedeObj.nombre.toLowerCase())
      ));

    const matchesEstado =
      filterEstadoMatricula === 'todos' ||
      (a.estado_matricula || 'activo') === filterEstadoMatricula;

    return matchesSearch && matchesCarrera && matchesSede && matchesEstado;
  });

  // Alumnos in the currently selected Carrera regardless of Sede (to help user when sede filter hides them)
  const alumnosInSelectedCarrera = filterCarrera === 'todos'
    ? []
    : alumnos.filter((a) => {
        const selectedCarreraObj = carreras.find(
          (c) => c.id === filterCarrera || c.nombre === filterCarrera || c.clave === filterCarrera
        );
        if (!selectedCarreraObj) return false;
        const selId = (selectedCarreraObj.id || '').toLowerCase();
        const selClave = (selectedCarreraObj.clave || '').toUpperCase();
        const selNameNorm = normCareerText(selectedCarreraObj.nombre);
        const aCId = (a.carrera_id || '').toLowerCase();
        const aNameNorm = normCareerText(a.carrera);

        return (
          aCId === selId ||
          aCId === filterCarrera.toLowerCase() ||
          a.carrera === selectedCarreraObj.nombre ||
          (selNameNorm && aNameNorm && (selNameNorm === aNameNorm || selNameNorm.includes(aNameNorm) || aNameNorm.includes(selNameNorm))) ||
          (selClave.includes('ADM') && aNameNorm.includes('administra')) ||
          (selClave.includes('TUR') && aNameNorm.includes('turis')) ||
          (selClave.includes('CDIA') && (aNameNorm.includes('datos') || aNameNorm.includes('inteligencia'))) ||
          (selClave.includes('TIC') && (aNameNorm.includes('tecnolog') || aNameNorm.includes('tic'))) ||
          (selClave.includes('CIB') && aNameNorm.includes('ciber'))
        );
      });

  const sameCarreraOtherSedesCount = filterSede === 'todos'
    ? 0
    : alumnosInSelectedCarrera.filter((a) => {
        const selSede = sedes.find(s => s.id === filterSede || s.nombre === filterSede);
        return a.sede_id !== filterSede && a.sede_nombre !== selSede?.nombre;
      }).length;

  const handleMigrateStudentsToCurrentSede = async () => {
    const targetSedeObj = sedes.find((s) => s.id === filterSede || s.nombre === filterSede);
    if (!targetSedeObj) return;
    const toUpdate = alumnosInSelectedCarrera.filter(
      (a) => a.sede_id !== targetSedeObj.id && a.sede_nombre !== targetSedeObj.nombre
    );
    if (toUpdate.length === 0) return;

    for (const al of toUpdate) {
      await db.updateAlumnoMatricula(al.id, {
        sede_id: targetSedeObj.id,
        sede_nombre: targetSedeObj.nombre,
      });
    }
    showToast(`✅ ${toUpdate.length} alumnos reasignados a ${targetSedeObj.nombre}`);
    await loadData();
  };

  // Filtered Personal
  const filteredPersonal = docentes.filter((d) => {
    const query = searchQuery.toLowerCase();
    return (
      `${d.nombre} ${d.apellido_paterno} ${d.apellido_materno || ''}`
        .toLowerCase()
        .includes(query) ||
      d.num_empleado.toLowerCase().includes(query) ||
      d.departamento.toLowerCase().includes(query) ||
      (d.carreras_asignadas &&
        d.carreras_asignadas.some((c) => c.toLowerCase().includes(query)))
    );
  });

  // Active Ciclo
  const activeCiclo = ciclos.find((c) => c.is_active) || ciclos[0];

  return (
    <div className="space-y-8 animate-fadeIn text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold border transition-all animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-600/90 text-white border-emerald-400'
              : toast.type === 'info'
              ? 'bg-blue-600/90 text-white border-blue-400'
              : 'bg-rose-600/90 text-white border-rose-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1528] via-[#0E1C36] to-[#0A3022] p-8 border border-amber-500/20 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>SUPER ADMIN • Rectoría General & Secretaría Académica</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Sistema Integral de Gestión y Control Escolar (ERP UNRC)
            </h1>
            <p className="text-gray-400 text-sm max-w-3xl">
              Control institucional total: sedes, ciclos escolares, semestres, secciones/aulas,
              asignaturas, personal y matrículas con asignación docente especializada de horarios y
              carreras.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col items-end pr-2 border-r border-white/10">
              <span className="text-[10px] uppercase font-bold text-gray-400">Ciclo Activo</span>
              <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{activeCiclo?.nombre || '2026-2'}</span>
              </span>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all flex items-center space-x-1 text-xs"
              title="Recargar datos del ERP"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs border border-white/10 transition-all"
            >
              Cambiar Rol
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>SEDES</span>
            <Building className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{sedes.length}</div>
          <p className="text-[9px] text-rose-400">Planteles</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>CICLOS</span>
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{ciclos.length}</div>
          <p className="text-[9px] text-emerald-400">Periodos</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>SEMESTRES</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{grados.length}</div>
          <p className="text-[9px] text-cyan-400">Grados</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>SECCIONES</span>
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{secciones.length}</div>
          <p className="text-[9px] text-indigo-400">Grupos / Aulas</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>CARRERAS</span>
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{carreras.length}</div>
          <p className="text-[9px] text-amber-400">Oferta Académica</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>MATERIAS</span>
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{materias.length}</div>
          <p className="text-[9px] text-teal-400">Asignaturas</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>PERSONAL</span>
            <School className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{docentes.length}</div>
          <p className="text-[9px] text-purple-400">Claustro & Admin</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
            <span>MATRÍCULAS</span>
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{alumnos.length}</div>
          <p className="text-[9px] text-blue-400">Alumnos Inscritos</p>
        </div>
      </div>

      {/* Main Administrative Modules Container */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
        {/* Module Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => {
              setActiveTab('personal');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'personal'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>1. Personal & Asignación Docente ({docentes.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('matriculas');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'matriculas'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Matrículas & Estudiantes ({alumnos.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sedes');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'sedes'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>3. Sedes ({sedes.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ciclos');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'ciclos'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>4. Ciclos Escolares ({ciclos.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('grados_secciones');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'grados_secciones'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>5. Grados & Secciones ({secciones.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('carreras_materias');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'carreras_materias'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>6. Carreras & Asignaturas</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('auditoria');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'auditoria'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>7. Auditoría</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('anuncios');
              setSearchQuery('');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'anuncios'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>8. Anuncios Globales</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PERSONAL & ASIGNACIÓN DOCENTE DE CARRERAS/HORARIOS */}
        {/* ========================================================= */}
        {activeTab === 'personal' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Claustro Docente y Personal Institucional</span>
                  <span className="text-xs font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {docentes.length} Integrantes
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Control de personal, asignación de carreras a impartir y configuración de horarios
                  oficiales por docente.
                </p>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, clave o carrera..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const newEmp = `DOC-UNRC-0${docentes.length + 1}`;
                    setEditingId(null);
                    setPersonalForm({
                      num_empleado: newEmp,
                      nombre: '',
                      apellido_paterno: '',
                      apellido_materno: '',
                      email: '',
                      departamento: 'Lic. en Turismo',
                      puesto: 'docente',
                      telefono: '',
                      sede_nombre: sedes[0]?.nombre || 'Campus Magdalena Contreras',
                      password: getDefaultUserPassword(newEmp, '2026-2'),
                    });
                    setShowPersonalPassword(false);
                    setModalType('personal');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center space-x-1.5 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Personal</span>
                </button>
              </div>
            </div>

            {/* Docentes Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Clave / Puesto</th>
                    <th className="p-3.5">Nombre y Correo</th>
                    <th className="p-3.5">Carreras / Departamento</th>
                    <th className="p-3.5">Horarios Asignados</th>
                    <th className="p-3.5">Sede</th>
                    <th className="p-3.5">Contacto</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {filteredPersonal.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-amber-400 text-xs">
                          {doc.num_empleado}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-white/5 text-gray-400 border border-white/10">
                          {doc.puesto || 'DOCENTE'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm">
                          {doc.nombre} {doc.apellido_paterno} {doc.apellido_materno || ''}
                        </div>
                        <div className="text-[11px] text-gray-400">{doc.email}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {doc.carreras_asignadas && doc.carreras_asignadas.length > 0 ? (
                            doc.carreras_asignadas.map((c, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-medium"
                              >
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-[10px]">
                              {doc.departamento || 'Sin asignar'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="max-w-xs space-y-1">
                          {doc.horario_resumen ? (
                            <div className="font-mono text-cyan-300 text-[11px] bg-cyan-950/40 px-2 py-1 rounded border border-cyan-800/40">
                              {doc.horario_resumen}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-[10px]">Por programar</span>
                          )}
                          {doc.horarios && doc.horarios.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] flex-wrap">
                              <span className="text-emerald-400 font-semibold">
                                {doc.horarios.length} bloque(s)
                              </span>
                              {doc.horarios.some((h) => h.es_en_linea) && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                                  🌐 En línea
                                </span>
                              )}
                              {doc.horarios.some((h) => !h.es_en_linea) && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                  🏛️ Presencial
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-gray-300 font-medium">
                        <div className="flex items-center space-x-1 text-xs">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          <span>{doc.sede_nombre || 'Campus Magdalena Contreras'}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-gray-400 font-mono text-[11px]">
                        <div>{doc.telefono || 'Sin teléfono'}</div>
                        <div
                          className="mt-1 flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 max-w-fit font-bold"
                          title="Acceso institucional protegido"
                        >
                          <KeyRound className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Protegida</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Botón Asignar Horario & Carreras */}
                          <button
                            onClick={() => handleOpenAsignarDocente(doc)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-[11px] transition-all flex items-center space-x-1"
                            title="Asignar carreras y horarios de clase"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Horarios</span>
                          </button>

                          {/* Botón Descargar Horario PDF */}
                          <button
                            onClick={() => {
                              generateDocenteHorarioPDF(doc);
                              showToast(`Horario en PDF descargado para ${doc.nombre} ${doc.apellido_paterno}`);
                            }}
                            className="p-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-all"
                            title="Descargar horario oficial en PDF para el docente"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Sincronizar Google Calendar (.ics) */}
                          <button
                            onClick={() => {
                              downloadDocenteICS(doc);
                              showToast(`Archivo Google Calendar (.ics) generado para ${doc.nombre}`);
                            }}
                            className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all"
                            title="Descargar archivo para Google Calendar con recordatorios presencial/en línea"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingId(doc.id);
                              setPersonalForm({
                                num_empleado: doc.num_empleado,
                                nombre: doc.nombre,
                                apellido_paterno: doc.apellido_paterno,
                                apellido_materno: doc.apellido_materno || '',
                                email: doc.email,
                                departamento: doc.departamento,
                                puesto: doc.puesto || 'docente',
                                telefono: doc.telefono || '',
                                sede_nombre: doc.sede_nombre || 'Campus Magdalena Contreras',
                                password: doc.password || getDefaultUserPassword(doc.num_empleado, '2026-2'),
                              });
                              setShowPersonalPassword(false);
                              setModalType('personal');
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-all"
                            title="Editar expediente y contraseña"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() =>
                              handleDeletePersonal(
                                doc.id,
                                `${doc.nombre} ${doc.apellido_paterno}`
                              )
                            }
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                            title="Eliminar personal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MATRÍCULAS & ESTUDIANTES                           */}
        {/* ========================================================= */}
        {activeTab === 'matriculas' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Control Escolar de Matrículas</span>
                  <span className="text-xs font-normal text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/30">
                    {filteredAlumnos.length} Expedientes {filteredAlumnos.length !== alumnos.length ? `(${alumnos.length} en total)` : ''}
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Inscripción, estados de matrícula (Activo, Baja, Egresado), asignación de grupo y
                  credencialización QR.
                </p>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-1.5 whitespace-nowrap"
                  title="Cargar masivamente expedientes de alumnos desde archivo .CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Carga Masiva CSV</span>
                </button>

                <button
                  onClick={() => {
                    const newMat = `UNRC-2026-0${alumnos.length + 10}`;
                    setEditingId(null);
                    const defaultCar = filterCarrera !== 'todos' && carreras.some(c => c.id === filterCarrera)
                      ? filterCarrera
                      : carreras[0]?.id || '';
                    const defaultSede = filterSede !== 'todos' && sedes.some(s => s.id === filterSede)
                      ? filterSede
                      : sedes[0]?.id || '';
                    const selCarObj = carreras.find(c => c.id === defaultCar);
                    let defaultGrp = '201-TUR';
                    if (selCarObj?.nombre.toLowerCase().includes('admin') || selCarObj?.clave?.includes('ADM')) {
                      defaultGrp = '203-ADM';
                    } else if (selCarObj?.nombre.toLowerCase().includes('datos') || selCarObj?.clave?.includes('CDIA')) {
                      defaultGrp = '101';
                    } else if (selCarObj?.nombre.toLowerCase().includes('ciber') || selCarObj?.clave?.includes('CIB')) {
                      defaultGrp = '501';
                    } else if (selCarObj?.nombre.toLowerCase().includes('tecnolog') || selCarObj?.clave?.includes('TIC')) {
                      defaultGrp = '201';
                    }

                    setAlumnoForm({
                      matricula: newMat,
                      nombre: '',
                      apellido_paterno: '',
                      apellido_materno: '',
                      grado: '2° Semestre',
                      grupo: defaultGrp,
                      carrera_id: defaultCar,
                      sede_id: defaultSede,
                      ciclo_id: activeCiclo?.id || '',
                      estado_matricula: 'activo',
                      tutor: defaultGrp.includes('TUR') ? 'Dr. Adrian Silva' : 'Tutor Institucional',
                      telefono: '+525500000000',
                      password: getDefaultUserPassword(newMat, '2026-2'),
                    });
                    setShowAlumnoPassword(false);
                    setModalType('alumno');
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center space-x-1.5 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Matricular Estudiante</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-black/30 p-3 rounded-2xl border border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar alumno o matrícula..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <select
                  value={filterCarrera}
                  onChange={(e) => setFilterCarrera(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white text-xs"
                >
                  <option value="todos">Todas las carreras</option>
                  {carreras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterSede}
                  onChange={(e) => setFilterSede(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white text-xs"
                >
                  <option value="todos">Todas las sedes</option>
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={filterEstadoMatricula}
                  onChange={(e) => setFilterEstadoMatricula(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white text-xs"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activo</option>
                  <option value="baja_temporal">Baja Temporal</option>
                  <option value="egresado">Egresado</option>
                </select>
              </div>
            </div>

            {/* Alumnos Table */}
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Matrícula</th>
                    <th className="p-3.5">Nombre Completo</th>
                    <th className="p-3.5">Licenciatura / Programa</th>
                    <th className="p-3.5">Grupo / Semestre</th>
                    <th className="p-3.5">Sede</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/20">
                  {filteredAlumnos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <div className="max-w-lg mx-auto space-y-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">
                              No hay alumnos que coincidan con los filtros seleccionados
                            </h4>
                            <p className="text-xs text-gray-400 mt-1">
                              {filterCarrera !== 'todos' && `Carrera: ${carreras.find(c => c.id === filterCarrera)?.nombre || filterCarrera}`}
                              {filterSede !== 'todos' && ` • Sede: ${sedes.find(s => s.id === filterSede)?.nombre || filterSede}`}
                              {filterEstadoMatricula !== 'todos' && ` • Estado: ${filterEstadoMatricula}`}
                            </p>
                          </div>

                          {/* Quick helper when students exist in this Carrera but in another Sede */}
                          {sameCarreraOtherSedesCount > 0 && (
                            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200 text-left space-y-2">
                              <p className="font-semibold text-blue-300">
                                💡 Información: Hay {sameCarreraOtherSedesCount} alumnos asignados a esta carrera en otro plantel.
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setFilterSede('todos')}
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md"
                                >
                                  Ver todas las sedes de esta carrera
                                </button>
                                {filterSede !== 'todos' && (
                                  <button
                                    type="button"
                                    onClick={handleMigrateStudentsToCurrentSede}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md"
                                  >
                                    Reasignar los {sameCarreraOtherSedesCount} alumnos a {sedes.find(s => s.id === filterSede)?.nombre || 'esta sede'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setFilterCarrera('todos');
                                setFilterSede('todos');
                                setFilterEstadoMatricula('todos');
                              }}
                              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
                            >
                              Mostrar todos los expedientes ({alumnos.length} alumnos)
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAlumnos.map((al) => {
                      const status = al.estado_matricula || 'activo';
                      return (
                        <tr key={al.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3.5 font-mono text-xs">
                            <div className="font-bold text-blue-400">{al.matricula}</div>
                            <div
                              className="mt-1 flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 max-w-fit font-bold"
                              title="Acceso institucional protegido"
                            >
                              <KeyRound className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Protegida</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-white">
                              {al.nombre} {al.apellido_paterno} {al.apellido_materno || ''}
                            </div>
                            <div className="text-[10px] text-gray-400">Tutor: {al.tutor}</div>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={
                                carreras.find((c) => c.id === al.carrera_id)?.id ||
                                carreras.find((c) => c.nombre.toLowerCase() === (al.carrera || '').toLowerCase())?.id ||
                                (al.grupo?.toUpperCase().includes('TUR')
                                  ? (carreras.find((c) => c.clave?.includes('TUR'))?.id || '')
                                  : '')
                              }
                              onChange={async (e) => {
                                const newCId = e.target.value;
                                const targetCar = carreras.find((c) => c.id === newCId);
                                if (targetCar) {
                                  const isTur = targetCar.nombre.toLowerCase().includes('turismo');
                                  await db.updateAlumnoMatricula(al.id, {
                                    carrera: targetCar.nombre,
                                    carrera_id: targetCar.id,
                                    grupo: isTur ? '201-TUR' : al.grupo,
                                    tutor: isTur ? 'Dr. Adrian Silva' : al.tutor
                                  });
                                  showToast(`Carrera de ${al.nombre} reasignada a: ${targetCar.nombre}`);
                                  await loadData();
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-black/40 border border-white/10 hover:border-emerald-500/50 text-xs text-white cursor-pointer focus:outline-none focus:border-emerald-500 max-w-[200px] truncate"
                              title="Cambiar carrera de este estudiante"
                            >
                              {carreras.map((c) => (
                                <option key={c.id} value={c.id} className="bg-[#0c1220] text-white">
                                  {c.nombre}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-amber-300 font-mono">{al.grupo}</span>
                            <span className="text-[10px] text-gray-400 block">{al.grado}</span>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={
                                sedes.find((s) => s.id === al.sede_id)?.id ||
                                sedes.find((s) => s.nombre.toLowerCase() === (al.sede_nombre || '').toLowerCase())?.id ||
                                sedes[0]?.id || ''
                              }
                              onChange={async (e) => {
                                const newSId = e.target.value;
                                const targetSede = sedes.find((s) => s.id === newSId);
                                if (targetSede) {
                                  await db.updateAlumnoMatricula(al.id, {
                                    sede_id: targetSede.id,
                                    sede_nombre: targetSede.nombre
                                  });
                                  showToast(`Campus de ${al.nombre} reasignado a: ${targetSede.nombre}`);
                                  await loadData();
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-black/40 border border-white/10 hover:border-blue-500/50 text-xs text-white cursor-pointer focus:outline-none focus:border-blue-500 max-w-[170px] truncate"
                              title="Cambiar plantel/sede de este estudiante"
                            >
                              {sedes.map((s) => (
                                <option key={s.id} value={s.id} className="bg-[#0c1220] text-white">
                                  {s.nombre}
                                </option>
                              ))}
                            </select>
                          </td>
                        <td className="p-3.5">
                          <select
                            value={status}
                            onChange={(e) =>
                              handleQuickStatusChange(
                                al.id,
                                e.target.value as 'activo' | 'baja_temporal' | 'egresado'
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border bg-black/40 focus:outline-none ${
                              status === 'activo'
                                ? 'text-emerald-400 border-emerald-500/30'
                                : status === 'baja_temporal'
                                ? 'text-rose-400 border-rose-500/30'
                                : 'text-cyan-400 border-cyan-500/30'
                            }`}
                          >
                            <option value="activo">Activo</option>
                            <option value="baja_temporal">Baja Temporal</option>
                            <option value="egresado">Egresado</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Credencial QR Modal Button */}
                            <button
                              onClick={() => {
                                setSelectedAlumnoQr(al);
                                setModalType('credencial_qr');
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-bold flex items-center space-x-1"
                              title="Ver credencial digital QR"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>QR</span>
                            </button>

                            <button
                              onClick={() => {
                                setEditingId(al.id);
                                setAlumnoForm({
                                  matricula: al.matricula,
                                  nombre: al.nombre,
                                  apellido_paterno: al.apellido_paterno,
                                  apellido_materno: al.apellido_materno || '',
                                  grado: al.grado,
                                  grupo: al.grupo,
                                  carrera_id: al.carrera_id || '',
                                  sede_id: al.sede_id || '',
                                  ciclo_id: al.ciclo_id || '',
                                  estado_matricula: al.estado_matricula || 'activo',
                                  tutor: al.tutor,
                                  telefono: al.telefono,
                                  password: al.password || getDefaultUserPassword(al.matricula, '2026-2'),
                                });
                                setShowAlumnoPassword(false);
                                setModalType('alumno');
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                              title="Editar expediente y contraseña"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() =>
                                handleDeleteAlumno(
                                  al.id,
                                  `${al.nombre} ${al.apellido_paterno}`
                                )
                              }
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                              title="Dar de baja"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SEDES UNIVERSITARIAS (Campus)                      */}
        {/* ========================================================= */}
        {activeTab === 'sedes' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Planteles y Sedes Universitarias UNRC</span>
                  <span className="text-xs font-normal text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                    {sedes.length} Campus
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Control territorial, capacidad instalada y autoridades responsables de cada sede.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingId(null);
                  setSedeForm({
                    clave: `UNRC-S0${sedes.length + 1}`,
                    nombre: '',
                    direccion: '',
                    director: '',
                    telefono: '+5255',
                    capacidad: 1000,
                    activa: true,
                  });
                  setModalType('sede');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Sede</span>
              </button>
            </div>

            {/* Sedes Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sedes.map((s) => (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl bg-black/40 border border-white/10 hover:border-rose-500/30 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                        {s.clave}
                      </span>
                      <h4 className="text-base font-extrabold text-white mt-1">{s.nombre}</h4>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.activa ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {s.activa ? 'ACTIVA' : 'INACTIVA'}
                      </span>
                      <button
                        onClick={() => {
                          setEditingId(s.id);
                          setSedeForm({
                            clave: s.clave,
                            nombre: s.nombre,
                            direccion: s.direccion,
                            director: s.director,
                            telefono: s.telefono || '',
                            capacidad: s.capacidad,
                            activa: s.activa,
                          });
                          setModalType('sede');
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                        title="Editar sede"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSede(s.id, s.nombre)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                        title="Eliminar sede"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 flex items-start space-x-1.5">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{s.direccion}</span>
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Titular / Director:</span>
                      <span className="font-bold text-white">{s.director}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Capacidad:</span>
                      <span className="font-bold text-emerald-400">{s.capacidad} Alumnos</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CICLOS ESCOLARES                                   */}
        {/* ========================================================= */}
        {activeTab === 'ciclos' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Ciclos Escolares y Periodos Académicos</span>
                  <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {ciclos.length} Registrados
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Activación del periodo escolar vigente, fechas de apertura y cierre lectivo.
                </p>
              </div>

              <button
                onClick={() => {
                  setModalType('ciclo');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Ciclo Escolar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ciclos.map((c) => (
                <div
                  key={c.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    c.is_active
                      ? 'bg-gradient-to-br from-emerald-950/40 via-black/40 to-black/60 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                      : 'bg-black/30 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.is_active
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {c.is_active ? 'Periodo Vigente Oficial' : 'Inactivo / Histórico'}
                    </span>
                    {!c.is_active && (
                      <button
                        onClick={() => handleDeleteCiclo(c.id, c.nombre)}
                        className="text-gray-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h4 className="text-base font-extrabold text-white">{c.nombre}</h4>

                  <div className="space-y-1 text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha de Inicio:</span>
                      <span className="font-mono text-white">{c.fecha_inicio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Fecha de Conclusión:</span>
                      <span className="font-mono text-white">{c.fecha_fin}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    {c.is_active ? (
                      <div className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                        <Check className="w-4 h-4" />
                        <span>Ciclo Activo en Todo el ERP</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleActivarCiclo(c.id, c.nombre)}
                        className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-emerald-600/30 text-gray-300 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/40 text-xs font-bold transition-all"
                      >
                        Activar como Periodo Oficial
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: GRADOS & SECCIONES                                 */}
        {/* ========================================================= */}
        {activeTab === 'grados_secciones' && (
          <div className="space-y-8">
            {/* Grados Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Niveles Curriculares y Semestres</span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Estructura de grados académicos de avance estudiantil.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGradoForm({
                      nombre: `${grados.length + 1}° Semestre`,
                      nivel: 'Licenciatura',
                      orden: grados.length + 1,
                    });
                    setModalType('grado');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Grado</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {grados.map((g) => (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-center space-y-1 relative group"
                  >
                    <div className="text-xs font-bold text-white">{g.nombre}</div>
                    <div className="text-[10px] text-cyan-400">{g.nivel}</div>
                    <button
                      onClick={() => handleDeleteGrado(g.id)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-rose-400 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Secciones Section */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Secciones, Grupos y Aulas Asignadas</span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Configuración de grupos (101, 102, 201-TUR, 203-ADM, etc.), turnos, cupos y aulas físicas.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setSeccionForm({
                      nombre: '',
                      grado_id: grados[0]?.id || '',
                      carrera_id: carreras[0]?.id || '',
                      sede_id: sedes[0]?.id || '',
                      turno: 'Matutino',
                      aula: 'Edificio A - Aula 101',
                      cupo_maximo: 35,
                    });
                    setModalType('seccion');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Sección/Grupo</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-black/60 text-gray-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Sección / Grupo</th>
                      <th className="p-3">Semestre</th>
                      <th className="p-3">Carrera</th>
                      <th className="p-3">Turno</th>
                      <th className="p-3">Aula Asignada</th>
                      <th className="p-3">Sede</th>
                      <th className="p-3">Cupo</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-black/20">
                    {secciones.map((sec) => (
                      <tr key={sec.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-400 text-sm">
                          {sec.nombre}
                        </td>
                        <td className="p-3">{sec.grado_nombre || '2° Semestre'}</td>
                        <td className="p-3 text-white font-medium">
                          {sec.carrera_nombre && sec.carrera_nombre !== 'Licenciatura UNRC'
                            ? sec.carrera_nombre
                            : carreras.find(
                                (c) =>
                                  c.id === sec.carrera_id ||
                                  (sec.carrera_id === 'c1' && (c.id.includes('c1') || c.nombre.toLowerCase().includes('datos'))) ||
                                  (sec.carrera_id === 'c2' && (c.id.includes('c2') || c.nombre.toLowerCase().includes('tecnolog'))) ||
                                  (sec.carrera_id === 'c3' && (c.id.includes('c3') || c.nombre.toLowerCase().includes('ciber'))) ||
                                  (sec.carrera_id === 'c4' && (c.id.includes('c4') || c.nombre.toLowerCase().includes('turis'))) ||
                                  (sec.carrera_id === 'c5' && (c.id.includes('c5') || c.nombre.toLowerCase().includes('admin'))) ||
                                  (sec.aula?.includes('Edificio B') && c.nombre.toLowerCase().includes('datos'))
                              )?.nombre || 'Licenciatura en Ciencias de Datos e Inteligencia Artificial'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              sec.turno === 'Matutino'
                                ? 'bg-amber-500/10 text-amber-300'
                                : sec.turno === 'Vespertino'
                                ? 'bg-blue-500/10 text-blue-300'
                                : 'bg-purple-500/10 text-purple-300'
                            }`}
                          >
                            {sec.turno}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-cyan-300">{sec.aula}</td>
                        <td className="p-3 text-gray-400">
                          {sec.sede_nombre || 'Campus Magdalena Contreras'}
                        </td>
                        <td className="p-3 font-bold text-emerald-400">
                          {sec.cupo_maximo} Alumnos
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setEditingId(sec.id);
                                const matchedCarrera =
                                  carreras.find((c) => c.id === sec.carrera_id) ||
                                  carreras.find(
                                    (c) =>
                                      (sec.carrera_id === 'c1' && (c.id.includes('c1') || c.nombre.toLowerCase().includes('datos'))) ||
                                      (sec.carrera_id === 'c2' && (c.id.includes('c2') || c.nombre.toLowerCase().includes('tecnolog'))) ||
                                      (sec.carrera_id === 'c3' && (c.id.includes('c3') || c.nombre.toLowerCase().includes('ciber'))) ||
                                      (sec.carrera_id === 'c4' && (c.id.includes('c4') || c.nombre.toLowerCase().includes('turis'))) ||
                                      (sec.carrera_id === 'c5' && (c.id.includes('c5') || c.nombre.toLowerCase().includes('admin'))) ||
                                      (sec.carrera_nombre && c.nombre.toLowerCase() === sec.carrera_nombre.toLowerCase()) ||
                                      (sec.aula?.includes('Edificio B') && c.nombre.toLowerCase().includes('datos'))
                                  ) ||
                                  carreras[0];

                                setSeccionForm({
                                  nombre: sec.nombre,
                                  grado_id: sec.grado_id || grados[0]?.id || '',
                                  carrera_id: matchedCarrera?.id || sec.carrera_id || carreras[0]?.id || '',
                                  sede_id: sec.sede_id || sedes[0]?.id || '',
                                  turno: sec.turno,
                                  aula: sec.aula,
                                  cupo_maximo: sec.cupo_maximo,
                                });
                                setModalType('seccion');
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSeccion(sec.id, sec.nombre)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: CARRERAS & ASIGNATURAS (MATERIAS)                  */}
        {/* ========================================================= */}
        {activeTab === 'carreras_materias' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Carreras */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <GraduationCap className="w-4 h-4 text-amber-400" />
                    <span>Oferta Académica (Carreras)</span>
                  </h3>
                  <p className="text-xs text-gray-400">Programas de licenciatura activos en UNRC.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setCarreraForm({
                      clave: `LIC-${Date.now().toString().slice(-3)}`,
                      nombre: '',
                      nivel: 'Licenciatura',
                      sede_id: sedes[0]?.id || '',
                    });
                    setModalType('carrera');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Carrera</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {carreras.map((car) => (
                  <div
                    key={car.id}
                    className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between hover:border-white/20 transition-colors"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-amber-400 text-xs">
                          {car.clave}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-gray-400">
                          {car.nivel}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">{car.nombre}</h4>
                      <p className="text-[10px] text-gray-400">
                        Sede: {car.sede_nombre || 'Campus Magdalena Contreras'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setEditingId(car.id);
                          setCarreraForm({
                            clave: car.clave,
                            nombre: car.nombre,
                            nivel: car.nivel,
                            sede_id: car.sede_id || sedes[0]?.id || '',
                          });
                          setModalType('carrera');
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-all"
                        title="Editar Carrera"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCarrera(car.id, car.nombre)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-white/5 transition-all"
                        title="Eliminar Carrera"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Materias */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-teal-400" />
                    <span>Catálogo de Asignaturas</span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Materias, créditos, horas semanales y semestre asignado.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setMateriaForm({
                      clave: '',
                      nombre: '',
                      carrera_id: carreras[0]?.id || '',
                      creditos: 8,
                      semestre: '1° Semestre',
                      horas_semana: 6,
                    });
                    setModalType('materia');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Asignatura</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {materias.map((m) => {
                  const carObj =
                    carreras.find((c) => c.id === m.carrera_id) ||
                    carreras.find(
                      (c) =>
                        (m.carrera_id === 'c1' && (c.id.includes('c1') || c.nombre.toLowerCase().includes('datos'))) ||
                        (m.carrera_id === 'c2' && (c.id.includes('c2') || c.nombre.toLowerCase().includes('tecnolog'))) ||
                        (m.carrera_id === 'c3' && (c.id.includes('c3') || c.nombre.toLowerCase().includes('ciber'))) ||
                        (m.carrera_id === 'c4' && (c.id.includes('c4') || c.nombre.toLowerCase().includes('turis'))) ||
                        (m.carrera_id === 'c5' && (c.id.includes('c5') || c.nombre.toLowerCase().includes('admin')))
                    ) ||
                    carreras[0];
                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between hover:border-white/20 transition-colors"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-teal-400 text-xs">
                            {m.clave}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 font-medium">
                            {m.semestre}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {m.creditos} Créditos • {m.horas_semana || 6} hrs/sem
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-0.5">{m.nombre}</h4>
                        <p className="text-[10px] text-gray-500">
                          Programa: {carObj?.nombre || 'Licenciatura en Ciencias de Datos e Inteligencia Artificial'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingId(m.id);
                            setMateriaForm({
                              clave: m.clave,
                              nombre: m.nombre,
                              carrera_id: m.carrera_id,
                              creditos: m.creditos,
                              semestre: m.semestre,
                              horas_semana: m.horas_semana || 6,
                            });
                            setModalType('materia');
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-teal-400 hover:bg-white/5 transition-all"
                          title="Editar Asignatura"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMateria(m.id, m.nombre)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-white/5 transition-all"
                          title="Eliminar Asignatura"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: AUDITORÍA DEL SISTEMA                              */}
        {/* ========================================================= */}
        {activeTab === 'auditoria' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <span>Bitácora Inmutable de Auditoría y Trazabilidad</span>
                  <span className="text-xs font-normal text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                    {auditorias.length} Eventos
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Registro cronológico y estricto de todas las operaciones administrativas ejecutadas
                  en UNRC.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={filterAuditoriaModulo}
                  onChange={(e) => setFilterAuditoriaModulo(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#090E1A] border border-white/10 text-white text-xs focus:outline-none"
                >
                  <option value="todos">Todos los Módulos</option>
                  <option value="Sedes">Sedes</option>
                  <option value="Calendario">Calendario / Ciclos</option>
                  <option value="Programación Docente">Programación Docente</option>
                  <option value="Matrículas">Matrículas</option>
                  <option value="Comunicados">Comunicados</option>
                </select>
                <button
                  onClick={handleExportAuditoria}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar JSON</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {auditorias
                .filter(
                  (log) =>
                    filterAuditoriaModulo === 'todos' ||
                    log.modulo.toLowerCase().includes(filterAuditoriaModulo.toLowerCase())
                )
                .map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1 text-xs hover:border-amber-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-white/5 text-amber-300 font-mono text-[10px] font-bold border border-white/10">
                          {log.accion}
                        </span>
                        <span className="text-gray-400 font-medium">{log.modulo}</span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">{log.fecha}</span>
                    </div>
                    <p className="text-white font-medium text-xs pt-1">{log.detalle}</p>
                    <div className="text-[10px] text-gray-400 pt-1">
                      Ejecutado por:{' '}
                      <strong className="text-amber-300">{log.usuario}</strong>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: ANUNCIOS GLOBALES                                  */}
        {/* ========================================================= */}
        {activeTab === 'anuncios' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <span>Comunicados Institucionales Globales</span>
                  <span className="text-xs font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    {anuncios.length} Publicaciones
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Avisos oficiales para toda la comunidad universitaria (alumnos, docentes, tutores y
                  sedes).
                </p>
              </div>

              <button
                onClick={() => setModalType('anuncio')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Comunicado</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anuncios.map((a) => (
                <div
                  key={a.id}
                  className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2 hover:border-amber-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          a.prioridad === 'urgente'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : a.prioridad === 'alta'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {a.prioridad}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">{a.fecha}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-gray-400">
                        Alcance: <strong>{a.audiencia.toUpperCase()}</strong>
                      </span>
                      <button
                        onClick={() => handleDeleteAnuncio(a.id)}
                        className="text-gray-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-base font-bold text-white">{a.titulo}</h4>
                  <p className="text-xs text-gray-300">{a.contenido}</p>
                  <p className="text-[10px] text-gray-500 pt-2 border-t border-white/5">
                    Emitido por: {a.autor}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL ESPECIALIZADO: ASIGNACIÓN DOCENTE DE CARRERAS & HORARIOS (AUDIO)    */}
      {/* ========================================================================= */}
      {modalType === 'asignar_docente' && selectedDocente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0B132B] border border-amber-500/30 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span>
                    Asignación Académica y Horarios: {selectedDocente.nombre}{' '}
                    {selectedDocente.apellido_paterno}
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Clave: {selectedDocente.num_empleado} • Sede: {assignedSede}
                </p>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Seleccionar Carreras a impartir */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white block">
                1. Carreras que va a impartir este Docente (Selecciona una o varias):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {carreras.map((car) => {
                  const isChecked = assignedCarreras.includes(car.nombre);
                  return (
                    <button
                      type="button"
                      key={car.id}
                      onClick={() => handleToggleCarreraAsignada(car.nombre)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-amber-500/20 text-white border-amber-500/50 shadow-md'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span>{car.nombre}</span>
                      {isChecked && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Seleccionar Asignaturas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-white block">
                2. Asignaturas que tiene a su cargo:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                {materias.map((mat) => {
                  const isChecked = assignedMaterias.includes(mat.nombre);
                  return (
                    <button
                      type="button"
                      key={mat.id}
                      onClick={() => handleToggleMateriaAsignada(mat.nombre)}
                      className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-teal-500/20 text-teal-200 border-teal-500/50'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span className="truncate pr-2">{mat.nombre}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Configuración de Bloques de Horarios */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <label className="text-xs font-bold text-white block">
                3. Programar Horarios de Clase (Días, Horas, Grupo y Aula):
              </label>

              {/* Form to add or edit a slot */}
              <div className={`p-3.5 rounded-2xl border space-y-3 text-xs transition-all ${
                editingHorarioIndex !== null
                  ? 'bg-gradient-to-b from-[#1C1608] to-[#0E1726] border-amber-500/50 shadow-xl shadow-amber-950/30 ring-1 ring-amber-500/20'
                  : 'bg-black/40 border-white/10'
              }`}>
                {/* Editing Header Notice */}
                {editingHorarioIndex !== null && (
                  <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-between text-amber-200">
                    <div className="flex items-center space-x-2 font-bold text-xs">
                      <Edit className="w-4 h-4 text-amber-400" />
                      <span>Editando Bloque de Horario #{editingHorarioIndex + 1}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEditHorarioSlot}
                      className="text-[11px] text-gray-300 hover:text-white underline font-semibold cursor-pointer"
                    >
                      Cancelar edición
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-gray-400 block text-[10px] mb-1">Día de Clase</label>
                    <select
                      value={newHorarioSlot.dia}
                      onChange={(e) =>
                        setNewHorarioSlot({ ...newHorarioSlot, dia: e.target.value })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-[#090E1A] border border-white/10 text-white"
                    >
                      <option value="Lunes">Lunes</option>
                      <option value="Martes">Martes</option>
                      <option value="Miércoles">Miércoles</option>
                      <option value="Jueves">Jueves</option>
                      <option value="Viernes">Viernes</option>
                      <option value="Sábado">Sábado</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 block text-[10px] mb-1">Hora Inicio</label>
                    <input
                      type="text"
                      placeholder="09:00"
                      value={newHorarioSlot.hora_inicio}
                      onChange={(e) =>
                        setNewHorarioSlot({ ...newHorarioSlot, hora_inicio: e.target.value })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block text-[10px] mb-1">Hora Fin</label>
                    <input
                      type="text"
                      placeholder="11:00"
                      value={newHorarioSlot.hora_fin}
                      onChange={(e) =>
                        setNewHorarioSlot({ ...newHorarioSlot, hora_fin: e.target.value })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 block text-[10px] mb-1">Grupo / Sección</label>
                    <select
                      value={newHorarioSlot.grupo}
                      onChange={(e) =>
                        setNewHorarioSlot({ ...newHorarioSlot, grupo: e.target.value })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-[#090E1A] border border-white/10 text-white font-mono"
                    >
                      {Array.from(
                        new Set([
                          ...secciones.map((s) => s.nombre),
                          ...alumnos.map((a) => a.grupo),
                          ...grupos.map((g) => g.clave_grupo),
                          '401-LCDN'
                        ])
                      )
                        .filter(Boolean)
                        .sort()
                        .map((grupoName) => {
                          const sec = secciones.find((s) => s.nombre === grupoName);
                          return (
                            <option key={grupoName} value={grupoName}>
                              {grupoName} {sec?.turno ? `(${sec.turno})` : ''}
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 block text-[10px] mb-1">
                      {newHorarioSlot.es_en_linea ? 'Enlace / Espacio Virtual' : 'Aula Asignada en Campus'}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        newHorarioSlot.es_en_linea
                          ? 'Aula Virtual (Google Meet / Classroom)'
                          : 'Aula Magna 2 / Edificio A'
                      }
                      value={newHorarioSlot.aula}
                      onChange={(e) =>
                        setNewHorarioSlot({ ...newHorarioSlot, aula: e.target.value })
                      }
                      className={`w-full px-2 py-1.5 rounded-lg bg-white/5 border text-white transition-all ${
                        newHorarioSlot.es_en_linea ? 'border-cyan-500/50' : 'border-white/10'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 block text-[10px] mb-1">Asignatura a impartir en este horario</label>
                  <select
                    value={newHorarioSlot.materia}
                    onChange={(e) =>
                      setNewHorarioSlot({ ...newHorarioSlot, materia: e.target.value })
                    }
                    className="w-full px-2 py-1.5 rounded-lg bg-[#090E1A] border border-white/10 text-white"
                  >
                    {materias.map((m) => (
                      <option key={m.id} value={m.nombre}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* CHECKBOX: Identificar si la clase es En Línea o Presencial */}
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/30 flex items-center justify-between transition-all">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(newHorarioSlot.es_en_linea)}
                      onChange={(e) => {
                        const isOnline = e.target.checked;
                        setNewHorarioSlot({
                          ...newHorarioSlot,
                          es_en_linea: isOnline,
                          aula: isOnline
                            ? (!newHorarioSlot.aula || newHorarioSlot.aula.includes('Aula Magna')
                                ? 'Aula Virtual (Google Meet / Classroom)'
                                : newHorarioSlot.aula)
                            : (newHorarioSlot.aula === 'Aula Virtual (Google Meet / Classroom)'
                                ? 'Edificio A - Aula Magna 2'
                                : newHorarioSlot.aula),
                        });
                      }}
                      className="w-4 h-4 rounded text-cyan-500 bg-black/50 border-white/30 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                    />
                    <div>
                      <span className="text-white font-bold text-xs flex items-center space-x-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Clase En Línea (Virtual / Remota)</span>
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        {newHorarioSlot.es_en_linea
                          ? 'Modalidad remota por Google Meet / Classroom (se reflejará en la BD, PDF y Google Calendar)'
                          : 'Modalidad física presencial en aulas e instalaciones del plantel'}
                      </span>
                    </div>
                  </label>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border shadow-sm ${
                      newHorarioSlot.es_en_linea
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    }`}
                  >
                    {newHorarioSlot.es_en_linea ? '🌐 EN LÍNEA' : '🏛️ PRESENCIAL'}
                  </span>
                </div>

                {/* Botón Guardar / Modificar Bloque */}
                {editingHorarioIndex !== null ? (
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveHorarioSlot}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar Cambios del Bloque</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditHorarioSlot}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-xs transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveHorarioSlot}
                    className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Bloque de Horario</span>
                  </button>
                )}
              </div>

              {/* List of current assigned slots */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-400 block">
                  Horarios configurados para este docente ({assignedHorarios.length}):
                </span>
                {assignedHorarios.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No hay bloques agregados todavía.</p>
                ) : (
                  assignedHorarios.map((h, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        editingHorarioIndex === idx
                          ? 'bg-amber-500/15 border-amber-500/60 ring-2 ring-amber-500/40 shadow-lg shadow-amber-950/30'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="font-bold text-amber-400 font-mono">
                            {h.dia} {h.hora_inicio} - {h.hora_fin} hrs
                          </span>
                          {h.es_en_linea ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1">
                              <Globe className="w-2.5 h-2.5" />
                              <span>EN LÍNEA</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                              <Building className="w-2.5 h-2.5" />
                              <span>PRESENCIAL</span>
                            </span>
                          )}
                          {editingHorarioIndex === idx && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/30 text-amber-200 border border-amber-500/50 animate-pulse">
                              ✏️ Editando
                            </span>
                          )}
                        </div>
                        <span className="text-gray-400 block text-[11px]">
                          Grupo: <strong className="text-white">{h.grupo}</strong> • {h.materia} • Espacio:{' '}
                          <span className={h.es_en_linea ? 'text-cyan-300 font-semibold' : 'text-gray-300'}>
                            {h.aula || (h.es_en_linea ? 'Aula Virtual' : 'Campus')}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {/* Botón Editar Horario */}
                        <button
                          type="button"
                          onClick={() => handleStartEditHorarioSlot(idx)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            editingHorarioIndex === idx
                              ? 'bg-amber-500/30 text-amber-200 border-amber-500/60 ring-2 ring-amber-500/40'
                              : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10 hover:text-amber-300'
                          }`}
                          title="Editar este horario (día, horas, grupo, materia, aula o modalidad)"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Botón Google Calendar */}
                        {selectedDocente && (
                          <a
                            href={createGoogleCalendarUrl(h, selectedDocente)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold transition-all flex items-center space-x-1"
                            title={`Añadir esta clase al Google Calendar de ${selectedDocente.email} con recordatorio de modalidad`}
                          >
                            <Calendar className="w-3 h-3 text-blue-400" />
                            <span className="hidden sm:inline">Google Cal</span>
                          </a>
                        )}

                        {/* Botón Eliminar Horario */}
                        <button
                          type="button"
                          onClick={() => handleRemoveHorarioSlot(idx)}
                          className="text-gray-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer"
                          title="Eliminar este bloque"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer con opciones de PDF, Google Calendar y Guardar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {/* Botón Descargar PDF Oficial */}
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedDocente) return;
                    const docToExport: Docente = {
                      ...selectedDocente,
                      carreras_asignadas: assignedCarreras,
                      materias: assignedMaterias,
                      horarios: assignedHorarios,
                      sede_nombre: assignedSede,
                    };
                    generateDocenteHorarioPDF(docToExport);
                    showToast('PDF oficial del horario generado exitosamente');
                  }}
                  className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                  title="Descargar documento PDF con el horario del docente"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Descargar PDF</span>
                </button>

                {/* Botón Sincronizar Google Calendar (.ics) */}
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedDocente) return;
                    const docToExport: Docente = {
                      ...selectedDocente,
                      carreras_asignadas: assignedCarreras,
                      materias: assignedMaterias,
                      horarios: assignedHorarios,
                      sede_nombre: assignedSede,
                    };
                    downloadDocenteICS(docToExport);
                    showToast('Archivo .ICS descargado para sincronizar con Google Calendar');
                  }}
                  className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
                  title={`Descargar archivo de Google Calendar con recordatorios configurados para ${selectedDocente?.email}`}
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Google Cal (.ics)</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsignacionDocente}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/30 text-xs"
                >
                  Guardar Asignación Docente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR / EDITAR PERSONAL                                        */}
      {/* ========================================================================= */}
      {modalType === 'personal' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B132B] border border-white/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <School className="w-5 h-5 text-amber-400" />
                <span>{editingId ? 'Editar Personal' : 'Registrar Nuevo Personal'}</span>
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePersonal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">No. de Empleado / Clave</label>
                  <input
                    type="text"
                    required
                    value={personalForm.num_empleado}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, num_empleado: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Puesto / Cargo</label>
                  <select
                    value={personalForm.puesto}
                    onChange={(e) =>
                      setPersonalForm({
                        ...personalForm,
                        puesto: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    <option value="docente">Docente / Profesor</option>
                    <option value="coordinador">Coordinador Académico</option>
                    <option value="secretaria">Secretaría Escolar</option>
                    <option value="rectoria">Rectoría / Directivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Nombre(s)</label>
                <input
                  type="text"
                  required
                  placeholder="Adrian"
                  value={personalForm.nombre}
                  onChange={(e) => setPersonalForm({ ...personalForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Apellido Paterno</label>
                  <input
                    type="text"
                    required
                    placeholder="Silva"
                    value={personalForm.apellido_paterno}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, apellido_paterno: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Apellido Materno (Opcional)</label>
                  <input
                    type="text"
                    value={personalForm.apellido_materno}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, apellido_materno: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    placeholder="adrian.silva@rcastellanos.cdmx.gob.mx"
                    value={personalForm.email}
                    onChange={(e) => setPersonalForm({ ...personalForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+525511223344"
                    value={personalForm.telefono}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, telefono: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Departamento / Área</label>
                  <input
                    type="text"
                    required
                    value={personalForm.departamento}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, departamento: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Sede de Adscripción</label>
                  <select
                    value={personalForm.sede_nombre}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, sede_nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    {sedes.map((s) => (
                      <option key={s.id} value={s.nombre}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contraseña Institucional Personal */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-amber-300 font-bold flex items-center space-x-1.5 text-xs">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Contraseña Oficial Institucional</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultPwd = getDefaultUserPassword(personalForm.num_empleado, '2026-2');
                      setPersonalForm({ ...personalForm, password: defaultPwd });
                      showToast('Contraseña restablecida a los valores oficiales.');
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium flex items-center space-x-1"
                    title="Restaurar a Clave + Ciclo Escolar"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restablecer</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPersonalPassword ? 'text' : 'password'}
                    required
                    value={personalForm.password}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-amber-500/30 text-white font-mono text-xs pr-10 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPersonalPassword(!showPersonalPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-300"
                    title={showPersonalPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPersonalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Asigne o actualice la contraseña oficial para el acceso del docente.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg"
                >
                  Guardar Personal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR / EDITAR ALUMNO & MATRÍCULA                              */}
      {/* ========================================================================= */}
      {modalType === 'alumno' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B132B] border border-white/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>{editingId ? 'Editar Matrícula' : 'Matricular Nuevo Estudiante'}</span>
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAlumno} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Matrícula Escolar</label>
                  <input
                    type="text"
                    required
                    value={alumnoForm.matricula}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, matricula: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Carrera / Licenciatura</label>
                  <select
                    value={alumnoForm.carrera_id}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, carrera_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    {carreras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Nombre(s) del Alumno</label>
                <input
                  type="text"
                  required
                  placeholder="Dayanna Gissel"
                  value={alumnoForm.nombre}
                  onChange={(e) => setAlumnoForm({ ...alumnoForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Apellido Paterno</label>
                  <input
                    type="text"
                    required
                    placeholder="Buitimea"
                    value={alumnoForm.apellido_paterno}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, apellido_paterno: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Apellido Materno</label>
                  <input
                    type="text"
                    placeholder="Garma"
                    value={alumnoForm.apellido_materno}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, apellido_materno: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Grupo / Sección</label>
                  <select
                    value={alumnoForm.grupo}
                    onChange={(e) => setAlumnoForm({ ...alumnoForm, grupo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white font-mono"
                  >
                    {secciones.map((s) => (
                      <option key={s.id} value={s.nombre}>
                        {s.nombre} ({s.turno})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Semestre / Grado</label>
                  <select
                    value={alumnoForm.grado}
                    onChange={(e) => setAlumnoForm({ ...alumnoForm, grado: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    {grados.map((g) => (
                      <option key={g.id} value={g.nombre}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Sede Universitaria</label>
                  <select
                    value={alumnoForm.sede_id}
                    onChange={(e) => setAlumnoForm({ ...alumnoForm, sede_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Estado de Matrícula</label>
                  <select
                    value={alumnoForm.estado_matricula}
                    onChange={(e) =>
                      setAlumnoForm({
                        ...alumnoForm,
                        estado_matricula: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    <option value="activo">Activo / Inscrito</option>
                    <option value="baja_temporal">Baja Temporal</option>
                    <option value="egresado">Egresado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Docente Titular / Tutor</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Adrian Silva"
                    value={alumnoForm.tutor}
                    onChange={(e) => setAlumnoForm({ ...alumnoForm, tutor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+525500000000"
                    value={alumnoForm.telefono}
                    onChange={(e) => setAlumnoForm({ ...alumnoForm, telefono: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Contraseña Institucional Alumno */}
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-blue-300 font-bold flex items-center space-x-1.5 text-xs">
                    <KeyRound className="w-4 h-4 text-blue-400" />
                    <span>Contraseña Oficial Institucional</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultPwd = getDefaultUserPassword(alumnoForm.matricula, '2026-2');
                      setAlumnoForm({ ...alumnoForm, password: defaultPwd });
                      showToast('Contraseña restablecida a los valores oficiales.');
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium flex items-center space-x-1"
                    title="Restaurar a Matrícula + Ciclo Escolar"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restablecer</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showAlumnoPassword ? 'text' : 'password'}
                    required
                    value={alumnoForm.password}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-blue-500/30 text-white font-mono text-xs pr-10 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAlumnoPassword(!showAlumnoPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-300"
                    title={showAlumnoPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showAlumnoPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Asigne o actualice la contraseña oficial para el acceso del alumno.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg"
                >
                  Guardar Matrícula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREDENCIAL QR DIGITAL                                              */}
      {/* ========================================================================= */}
      {modalType === 'credencial_qr' && selectedAlumnoQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-br from-[#0B1528] to-[#082017] border border-amber-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">
                Credencial Digital Universitaria UNRC
              </span>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border-2 border-amber-400/40 shadow-lg">
              <img
                src={
                  selectedAlumnoQr.foto_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200'
                }
                alt={selectedAlumnoQr.nombre}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">
                {selectedAlumnoQr.nombre} {selectedAlumnoQr.apellido_paterno}
              </h3>
              <p className="text-xs text-amber-300 font-mono">{selectedAlumnoQr.matricula}</p>
              <p className="text-[11px] text-gray-300">{selectedAlumnoQr.carrera}</p>
              <p className="text-[10px] text-gray-400">
                Grupo: {selectedAlumnoQr.grupo} • {selectedAlumnoQr.sede_nombre || 'Campus Magdalena Contreras'}
              </p>
            </div>

            {/* Simulated QR Code */}
            <div className="p-4 bg-white rounded-2xl inline-block shadow-xl">
              <div className="w-36 h-36 border-4 border-black p-2 flex flex-col items-center justify-center space-y-1 bg-white">
                <QrCode className="w-24 h-24 text-black" />
                <span className="text-[9px] font-mono text-black font-bold">
                  {selectedAlumnoQr.matricula}
                </span>
              </div>
            </div>

            <p className="text-[9px] text-gray-400">
              Válido para acceso institucional y registro biométrico de asistencia en torniquetes UNRC.
            </p>

            <button
              onClick={() => setModalType(null)}
              className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg"
            >
              Cerrar Credencial
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SEDE                                                               */}
      {/* ========================================================================= */}
      {modalType === 'sede' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B132B] border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Building className="w-5 h-5 text-rose-400" />
                <span>{editingId ? 'Editar Sede' : 'Registrar Nueva Sede'}</span>
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSede} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Clave de la Sede</label>
                  <input
                    type="text"
                    required
                    placeholder="UNRC-MC"
                    value={sedeForm.clave}
                    onChange={(e) => setSedeForm({ ...sedeForm, clave: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Capacidad Máxima</label>
                  <input
                    type="number"
                    required
                    value={sedeForm.capacidad}
                    onChange={(e) =>
                      setSedeForm({ ...sedeForm, capacidad: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Nombre Oficial del Campus</label>
                <input
                  type="text"
                  required
                  placeholder="Campus Magdalena Contreras"
                  value={sedeForm.nombre}
                  onChange={(e) => setSedeForm({ ...sedeForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Dirección Completa</label>
                <input
                  type="text"
                  required
                  placeholder="Av. Álvaro Obregón 151, CDMX"
                  value={sedeForm.direccion}
                  onChange={(e) => setSedeForm({ ...sedeForm, direccion: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Director / Responsable</label>
                  <input
                    type="text"
                    required
                    placeholder="Dra. María Elena Sandoval"
                    value={sedeForm.director}
                    onChange={(e) => setSedeForm({ ...sedeForm, director: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={sedeForm.telefono}
                    onChange={(e) => setSedeForm({ ...sedeForm, telefono: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg"
                >
                  Guardar Sede
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CICLO ESCOLAR                                                      */}
      {/* ========================================================================= */}
      {modalType === 'ciclo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B132B] border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>Nuevo Ciclo Escolar</span>
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCiclo} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Nombre del Periodo / Ciclo</label>
                <input
                  type="text"
                  required
                  placeholder="Ciclo Escolar 2026-2 (Otoño)"
                  value={cicloForm.nombre}
                  onChange={(e) => setCicloForm({ ...cicloForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    required
                    value={cicloForm.fecha_inicio}
                    onChange={(e) => setCicloForm({ ...cicloForm, fecha_inicio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Fecha de Término</label>
                  <input
                    type="date"
                    required
                    value={cicloForm.fecha_fin}
                    onChange={(e) => setCicloForm({ ...cicloForm, fecha_fin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="cicloActivo"
                  checked={cicloForm.is_active}
                  onChange={(e) => setCicloForm({ ...cicloForm, is_active: e.target.checked })}
                  className="rounded bg-white/5 border-white/10 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="cicloActivo" className="text-xs text-white">
                  Establecer como ciclo vigente oficial de la Universidad
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg"
                >
                  Crear Ciclo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GRADO                                                              */}
      {/* ========================================================================= */}
      {modalType === 'grado' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B132B] border border-white/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <span>Agregar Semestre / Grado</span>
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrado} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Nombre del Semestre</label>
                <input
                  type="text"
                  required
                  placeholder="3° Semestre"
                  value={gradoForm.nombre}
                  onChange={(e) => setGradoForm({ ...gradoForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Nivel</label>
                  <select
                    value={gradoForm.nivel}
                    onChange={(e) => setGradoForm({ ...gradoForm, nivel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    <option value="Licenciatura">Licenciatura</option>
                    <option value="Posgrado">Posgrado</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Orden Numérico</label>
                  <input
                    type="number"
                    value={gradoForm.orden}
                    onChange={(e) =>
                      setGradoForm({ ...gradoForm, orden: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg"
                >
                  Guardar Grado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SECCIÓN / GRUPO                                                    */}
      {/* ========================================================================= */}
      {modalType === 'seccion' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B132B] border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Clock className="w-5 h-5 text-indigo-400" />
                <span>{editingId ? 'Editar Sección' : 'Nueva Sección / Grupo'}</span>
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSeccion} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Nombre / Clave de Grupo</label>
                  <input
                    type="text"
                    required
                    placeholder="201-TUR"
                    value={seccionForm.nombre}
                    onChange={(e) => setSeccionForm({ ...seccionForm, nombre: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Turno</label>
                  <select
                    value={seccionForm.turno}
                    onChange={(e) =>
                      setSeccionForm({ ...seccionForm, turno: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Sabatino">Sabatino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Semestre / Grado</label>
                  <select
                    value={seccionForm.grado_id}
                    onChange={(e) =>
                      setSeccionForm({ ...seccionForm, grado_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    {grados.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Carrera Asociada</label>
                  <select
                    value={seccionForm.carrera_id}
                    onChange={(e) =>
                      setSeccionForm({ ...seccionForm, carrera_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    {carreras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Aula Asignada</label>
                  <input
                    type="text"
                    required
                    placeholder="Edificio A - Aula Magna 2"
                    value={seccionForm.aula}
                    onChange={(e) => setSeccionForm({ ...seccionForm, aula: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Cupo Máximo</label>
                  <input
                    type="number"
                    required
                    value={seccionForm.cupo_maximo}
                    onChange={(e) =>
                      setSeccionForm({ ...seccionForm, cupo_maximo: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Sede de Impartición</label>
                <select
                  value={seccionForm.sede_id}
                  onChange={(e) => setSeccionForm({ ...seccionForm, sede_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                >
                  {sedes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg"
                >
                  Guardar Sección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CARRERA                                                            */}
      {/* ========================================================================= */}
      {modalType === 'carrera' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B132B] border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-amber-400" />
                <span>{editingId ? 'Editar Carrera / Programa' : 'Registrar Nueva Carrera'}</span>
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCarrera} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Clave de la Carrera</label>
                <input
                  type="text"
                  required
                  placeholder="LIC-TUR"
                  value={carreraForm.clave}
                  onChange={(e) => setCarreraForm({ ...carreraForm, clave: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Nombre del Programa</label>
                <input
                  type="text"
                  required
                  placeholder="Lic. en Turismo"
                  value={carreraForm.nombre}
                  onChange={(e) => setCarreraForm({ ...carreraForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Nivel Académico</label>
                  <select
                    value={carreraForm.nivel}
                    onChange={(e) => setCarreraForm({ ...carreraForm, nivel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    <option value="Licenciatura">Licenciatura</option>
                    <option value="Ingeniería">Ingeniería</option>
                    <option value="Maestría">Maestría</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Sede de Impartición</label>
                  <select
                    value={carreraForm.sede_id}
                    onChange={(e) => setCarreraForm({ ...carreraForm, sede_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg"
                >
                  {editingId ? 'Actualizar Carrera' : 'Crear Carrera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MATERIA / ASIGNATURA                                               */}
      {/* ========================================================================= */}
      {modalType === 'materia' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B132B] border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-teal-400" />
                <span>{editingId ? 'Editar Asignatura' : 'Agregar Asignatura'}</span>
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMateria} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Clave</label>
                  <input
                    type="text"
                    required
                    placeholder="TUR-201"
                    value={materiaForm.clave}
                    onChange={(e) => setMateriaForm({ ...materiaForm, clave: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Carrera</label>
                  <select
                    value={materiaForm.carrera_id}
                    onChange={(e) =>
                      setMateriaForm({ ...materiaForm, carrera_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    {carreras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Nombre de la Asignatura</label>
                <input
                  type="text"
                  required
                  placeholder="Administración de Empresas de Hospedaje"
                  value={materiaForm.nombre}
                  onChange={(e) => setMateriaForm({ ...materiaForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1">Semestre</label>
                  <select
                    value={materiaForm.semestre}
                    onChange={(e) => setMateriaForm({ ...materiaForm, semestre: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    {grados.map((g) => (
                      <option key={g.id} value={g.nombre}>
                        {g.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Créditos</label>
                  <input
                    type="number"
                    required
                    value={materiaForm.creditos}
                    onChange={(e) =>
                      setMateriaForm({ ...materiaForm, creditos: Number(e.target.value) })
                    }
                    className="w-full px-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Horas / Sem</label>
                  <input
                    type="number"
                    required
                    value={materiaForm.horas_semana}
                    onChange={(e) =>
                      setMateriaForm({ ...materiaForm, horas_semana: Number(e.target.value) })
                    }
                    className="w-full px-2 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg"
                >
                  {editingId ? 'Actualizar Asignatura' : 'Guardar Asignatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ANUNCIO GLOBAL                                                     */}
      {/* ========================================================================= */}
      {modalType === 'anuncio' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B132B] border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <span>Publicar Comunicado Global</span>
              </h3>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAnuncio} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Título del Comunicado</label>
                <input
                  type="text"
                  required
                  placeholder="Inicio Oficial de Actividades"
                  value={anuncioForm.titulo}
                  onChange={(e) => setAnuncioForm({ ...anuncioForm, titulo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Cuerpo del Mensaje</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escriba el comunicado para la comunidad..."
                  value={anuncioForm.contenido}
                  onChange={(e) => setAnuncioForm({ ...anuncioForm, contenido: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Audiencia Objetivo</label>
                  <select
                    value={anuncioForm.audiencia}
                    onChange={(e) =>
                      setAnuncioForm({
                        ...anuncioForm,
                        audiencia: e.target.value as 'todos' | 'docentes' | 'alumnos',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    <option value="todos">Toda la Universidad</option>
                    <option value="docentes">Sólo Docentes</option>
                    <option value="alumnos">Sólo Alumnos</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Nivel de Prioridad</label>
                  <select
                    value={anuncioForm.prioridad}
                    onChange={(e) =>
                      setAnuncioForm({
                        ...anuncioForm,
                        prioridad: e.target.value as 'normal' | 'alta' | 'urgente',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#090E1A] border border-white/10 text-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-400 block mb-1">Firma / Emisor</label>
                <input
                  type="text"
                  required
                  value={anuncioForm.autor}
                  onChange={(e) => setAnuncioForm({ ...anuncioForm, autor: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg"
                >
                  Publicar Aviso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Carga Masiva de Alumnos CSV */}
      <BulkUploadAlumnosModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={async () => {
          await loadData();
        }}
        existingAlumnos={alumnos}
        carreras={carreras}
        sedes={sedes}
        activeCiclo={activeCiclo}
        initialCarreraId={filterCarrera !== 'todos' ? filterCarrera : undefined}
        initialSedeId={filterSede !== 'todos' ? filterSede : undefined}
        showToast={showToast}
      />
    </div>
  );
}
