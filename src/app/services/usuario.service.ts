import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Usuario, UsuarioRequest } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly apiUrl = `${API_BASE_URL}/usuarios`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl).pipe(timeout(8000));
  }

  obtener(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`).pipe(timeout(8000));
  }

  cuentaActual(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/me`).pipe(timeout(8000));
  }

  crear(datos: UsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, datos).pipe(timeout(8000));
  }

  actualizar(id: number, datos: UsuarioRequest): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, datos).pipe(timeout(8000));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(timeout(8000));
  }
}
