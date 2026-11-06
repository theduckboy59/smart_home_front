export type EstadoAlarma =
  | 'NORMAL'
  | 'VIGILANCIA'
  | 'PRESENCIA_CONFIRMADA'
  | 'ADVERTENCIA'
  | 'ALARMA'
  | 'REARMADO'
  | 'SENSOR_SIN_DATOS';

export interface SeguridadEstado {
  estado: EstadoAlarma;
  distanciaCm: number | null;
  presencia: boolean;
  tiempoPresenciaSegundos: number;
  umbralCm: number;
  advertenciaSegundo: number;
  alarmaSegundo: number;
  puertaBloqueada: boolean;
  buzzerActivo: boolean;
  esp32Online: boolean;
  arduinoOnline: boolean;
  ultimaMedicionValida: string | null;
}

export interface DesactivarAlarmaResponse {
  autorizado: boolean;
  resultado: 'aplicado' | 'rechazado' | 'incierto';
  alarma?: string;
  mensaje: string;
}

export interface EventoSeguridad {
  id?: number | string;
  fecha: string;
  tipo: string;
  resultado: string;
  detalle?: string | null;
}

export interface PaginaEventosSeguridad {
  content: EventoSeguridad[];
  totalElements: number;
  number: number;
  size: number;
}
