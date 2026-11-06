import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable,
  timeout
} from 'rxjs';

import {
  API_BASE_URL
} from '../config/api.config';

export type LightId =
  | 'luz_sala'
  | 'luz_comedor'
  | 'luz_cocina'
  | 'luz_habitacion';

export interface Uno1 {

  online: boolean;

  luz_sala?: number;
  luz_comedor?: number;
  luz_cocina?: number;
  luz_habitacion?: number;

  ir_sala?: number;
  ir_comedor?: number;
  ir_cocina?: number;
  ir_habitacion?: number;

  temperatura?: number | null;
  humedad?: number | null;
  distancia?: number | null;

  puerta?: {
    estado: number;
    angulo_ordenado?: number;
    bloqueada?: boolean;
    ultimaAperturaConfirmada?: string | null;
  };

  alarma?: number | { estado: number };
}

export interface Uno2 {

  online: boolean;

  ventilador?: {
    velocidad: number;
    modo: 'web' | 'manual';
  };

  potenciometro?: number;

  audio?: {
    pista?: number;
    volumen?: number;
    reproduccion_solicitada?: boolean;
    interfaz_inicializada?: boolean;
  };
}

export interface HomeStatus {

  mqttConnected: boolean;

  espOnline: boolean;

  fresh: boolean;

  busy: boolean;

  receivedAt:
    string | null;

  estado: {
    uno1: Uno1;
    uno2: Uno2;
    uptime_ms: number;
  } | null;

  evento: {
    tecla?: string;
    contador?: number;
    receivedAt?: string;
  };
}

export interface CommandResult {

  request_id: string;

  id: string;

  resultado:
    | 'aplicado'
    | 'rechazado'
    | 'incierto';

  detalle: string;
}

@Injectable({
  providedIn: 'root'
})
export class SmartHomeService {

  private readonly apiUrl =
    `${API_BASE_URL}/smart-home`;

  constructor(
    private http: HttpClient
  ) {}

  status():
    Observable<HomeStatus> {

    return this.http
      .get<HomeStatus>(
        `${this.apiUrl}/status`
      )
      .pipe(
        timeout(3500)
      );
  }

  command(
    id: string,
    accion: string,
    valor: number | string
  ): Observable<CommandResult> {

    return this.http
      .post<CommandResult>(
        `${this.apiUrl}/commands`,
        {
          id,
          accion,
          valor
        }
      )
      .pipe(
        timeout(8000)
      );
  }
}
