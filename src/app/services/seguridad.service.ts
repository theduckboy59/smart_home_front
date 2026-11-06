import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  DesactivarAlarmaResponse,
  EventoSeguridad,
  PaginaEventosSeguridad,
  SeguridadEstado
} from '../models/seguridad.model';

@Injectable({ providedIn: 'root' })
export class SeguridadService {
  private readonly apiUrl = `${API_BASE_URL}/seguridad`;

  constructor(private readonly http: HttpClient) {}

  consultarEstado(): Observable<SeguridadEstado> {
    return this.http.get<SeguridadEstado>(`${this.apiUrl}/estado`).pipe(timeout(3500));
  }

  desactivarAlarma(passwordapp: string): Observable<DesactivarAlarmaResponse> {
    return this.http.post<DesactivarAlarmaResponse>(
      `${this.apiUrl}/alarma/desactivar`, { passwordapp }
    ).pipe(timeout(8000));
  }

  eventos(
    page: number,
    size: number,
    tipo?: string,
    desde?: string,
    hasta?: string
  ): Observable<PaginaEventosSeguridad | EventoSeguridad[]> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'fecha,desc');
    if (tipo) params = params.set('tipo', tipo);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<PaginaEventosSeguridad | EventoSeguridad[]>(
      `${this.apiUrl}/eventos`, { params }
    ).pipe(timeout(8000));
  }
}
