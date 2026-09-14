// Official Holidays & Festive Days Calendar for UNRC / México (Ciclo 2026 - 2027)
import { getTijuanaDateString } from './tijuanaTime';

export interface DiaFestivo {
  id: string;
  fecha: string; // YYYY-MM-DD
  nombre: string;
  descripcion: string;
  tipo: 'nacional' | 'institucional' | 'vacaciones';
  suspension_labores: boolean;
  icono?: string;
}

export const DIAS_FESTIVOS_UNRC: DiaFestivo[] = [
  {
    id: 'fest-1',
    fecha: '2026-09-16',
    nombre: 'Día de la Independencia de México',
    descripcion: 'Conmemoración del inicio de la gesta de Independencia Nacional (1810). Suspensión oficial de labores y clases.',
    tipo: 'nacional',
    suspension_labores: true,
    icono: '🇲🇽'
  },
  {
    id: 'fest-2',
    fecha: '2026-10-12',
    nombre: 'Día de la Nación Pluricultural',
    descripcion: 'Reflexión y conmemoración de la diversidad cultural de los pueblos originarios de México.',
    tipo: 'institucional',
    suspension_labores: false,
    icono: '🌎'
  },
  {
    id: 'fest-3',
    fecha: '2026-11-01',
    nombre: 'Día de Todos los Santos',
    descripcion: 'Tradición cultural mexicana de Todos los Santos. Actividades culturales universitarias.',
    tipo: 'institucional',
    suspension_labores: false,
    icono: '🕯️'
  },
  {
    id: 'fest-4',
    fecha: '2026-11-02',
    nombre: 'Día de Muertos (Oficial)',
    descripcion: 'Patrimonio Cultural Inmaterial. Suspensión de labores académicas y administrativas en todos los planteles UNRC.',
    tipo: 'nacional',
    suspension_labores: true,
    icono: '💀'
  },
  {
    id: 'fest-5',
    fecha: '2026-11-16',
    nombre: 'Aniversario de la Revolución Mexicana',
    descripcion: 'Conmemoración oficial del inicio de la Revolución Mexicana de 1910 (3er lunes de noviembre por Ley Federal).',
    tipo: 'nacional',
    suspension_labores: true,
    icono: '🎖️'
  },
  {
    id: 'fest-6',
    fecha: '2026-12-19',
    nombre: 'Inicio Periodo Vacacional de Invierno',
    descripcion: 'Receso intersemestral académico y administrativo de fin de año en la Universidad Rosario Castellanos.',
    tipo: 'vacaciones',
    suspension_labores: true,
    icono: '❄️'
  },
  {
    id: 'fest-7',
    fecha: '2026-12-25',
    nombre: 'Navidad',
    descripcion: 'Festividad navideña oficial. Suspensión total de actividades.',
    tipo: 'nacional',
    suspension_labores: true,
    icono: '🎄'
  },
  {
    id: 'fest-8',
    fecha: '2027-01-01',
    nombre: 'Año Nuevo 2027',
    descripcion: 'Inicio del año nuevo civil. Suspensión general de actividades.',
    tipo: 'nacional',
    suspension_labores: true,
    icono: '🎆'
  },
  {
    id: 'fest-9',
    fecha: '2027-02-01',
    nombre: 'Día de la Constitución Política',
    descripcion: 'Promulgación de la Constitución de 1917 (Primer lunes de febrero por Ley Federal del Trabajo).',
    tipo: 'nacional',
    suspension_labores: true,
    icono: '📜'
  },
  {
    id: 'fest-10',
    fecha: '2027-03-15',
    nombre: 'Natalicio de Don Benito Juárez',
    descripcion: 'Conmemoración del Benemérito de las Américas (Tercer lunes de marzo). Suspensión de clases.',
    tipo: 'nacional',
    suspension_labores: true,
    icono: '🦅'
  },
  {
    id: 'fest-11',
    fecha: '2027-03-25',
    nombre: 'Jueves y Viernes Santo (Semana Mayor)',
    descripcion: 'Receso institucional de primavera de la Universidad Rosario Castellanos.',
    tipo: 'vacaciones',
    suspension_labores: true,
    icono: '🕊️'
  },
  {
    id: 'fest-12',
    fecha: '2027-05-01',
    nombre: 'Día Internacional de los Trabajadores',
    descripcion: 'Día del Trabajo. Suspensión obligatoria conforme a la Ley Federal del Trabajo.',
    tipo: 'nacional',
    suspension_labores: true,
    icono: '⚙️'
  },
  {
    id: 'fest-13',
    fecha: '2027-05-05',
    nombre: 'Batalla de Puebla',
    descripcion: 'Conmemoración de la victoria de las armas nacionales sobre el ejército expedicionario francés en 1862.',
    tipo: 'institucional',
    suspension_labores: true,
    icono: '🛡️'
  },
  {
    id: 'fest-14',
    fecha: '2027-05-15',
    nombre: 'Día del Maestro y Docente UNRC',
    descripcion: 'Reconocimiento y homenaje al cuerpo académico y docente de la Universidad Nacional Rosario Castellanos.',
    tipo: 'institucional',
    suspension_labores: true,
    icono: '🎓'
  },
  {
    id: 'fest-15',
    fecha: '2027-05-25',
    nombre: 'Aniversario Institucional Rosario Castellanos',
    descripcion: 'Homenaje a la destacada escritora y diplomática mexicana Rosario Castellanos, patrona de nuestra casa de estudios.',
    tipo: 'institucional',
    suspension_labores: false,
    icono: '🏛️'
  }
];

export function getDiasFestivos(): DiaFestivo[] {
  return [...DIAS_FESTIVOS_UNRC].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );
}

export function getProximoDiaFestivo(): DiaFestivo | null {
  const hoy = getTijuanaDateString();
  const futuros = DIAS_FESTIVOS_UNRC.filter(d => d.fecha >= hoy).sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );
  return futuros.length > 0 ? futuros[0] : DIAS_FESTIVOS_UNRC[0];
}
