/**
 * Utilidades de fecha y hora configuradas específicamente para la Zona Horaria de Tijuana (America/Tijuana).
 * Garantiza que la fecha y hora reflejen el horario local de Tijuana (UTC-7 en verano / UTC-8 en invierno).
 */

export const TIJUANA_TIMEZONE = 'America/Tijuana';

/**
 * Retorna la fecha actual o de la fecha provista en formato ISO estándar YYYY-MM-DD
 * en la zona horaria de Tijuana (ideal para inputs tipo date y almacenamiento en BD).
 */
export function getTijuanaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIJUANA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Retorna la hora actual o de la fecha provista en formato HH:MM:SS (24 horas)
 * en la zona horaria de Tijuana.
 */
export function getTijuanaTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIJUANA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Formatea una fecha en texto legible en español según la zona horaria de Tijuana.
 */
export function formatTijuanaDisplayDate(
  date: Date = new Date(),
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIJUANA_TIMEZONE,
    weekday: options?.weekday ?? 'long',
    year: options?.year ?? 'numeric',
    month: options?.month ?? 'long',
    day: options?.day ?? 'numeric',
    ...options,
  }).format(date);
}
