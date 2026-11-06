import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, finalize, map, of, tap, timeout } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface LoginResponse {
  autenticado: boolean;
  mensaje: string;
  usuarioId: number | null;
  nombre: string | null;
  accessToken?: string;
  expiresIn?: number;
}

export interface LoginRequest {
  nombre: string;
  contrasena: string;
}

export interface AuthSession {
  usuarioId: number | null;
  nombre: string;
  accessToken: string;
  expiresAt: number | null;
}

const SESSION_KEY = 'smart-home-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${API_BASE_URL}/auth`;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(this.readSession());
  readonly session$ = this.sessionSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    const session = this.sessionSubject.value;
    if (session) this.scheduleExpiry(session);
  }

  get session(): AuthSession | null {
    const session = this.sessionSubject.value;
    if (session?.expiresAt !== null && session && Date.now() >= session.expiresAt) {
      this.clearSession();
      return null;
    }
    return session;
  }

  get isAuthenticated(): boolean {
    return this.session !== null;
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      timeout(8000),
      tap(response => {
        if (response.autenticado) {
          if (!response.accessToken) {
            throw new Error('El servidor no devolvió el token de sesión requerido.');
          }
          const expiresAt = response.expiresIn && response.expiresIn > 0
            ? Date.now() + response.expiresIn * 1000
            : null;
          this.saveSession({
            usuarioId: response.usuarioId,
            nombre: response.nombre || credentials.nombre,
            accessToken: response.accessToken,
            expiresAt
          });
        }
      })
    );
  }

  logout(): Observable<boolean> {
    if (!this.session) {
      this.clearSession();
      return of(true);
    }
    return this.http.post<void>(`${this.apiUrl}/logout`, {}).pipe(
      timeout(5000),
      map(() => true),
      catchError(() => of(false)),
      finalize(() => this.clearSession())
    );
  }

  clearSession(): void {
    if (this.expiryTimer !== null) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    sessionStorage.removeItem(SESSION_KEY);
    this.sessionSubject.next(null);
  }

  updateUserName(nombre: string): void {
    const session = this.session;
    if (session) this.saveSession({ ...session, nombre });
  }

  private saveSession(session: AuthSession): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.sessionSubject.next(session);
    this.scheduleExpiry(session);
  }

  private scheduleExpiry(session: AuthSession): void {
    if (this.expiryTimer !== null) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
    if (session.expiresAt === null) return;
    this.expiryTimer = setTimeout(() => this.clearSession(), Math.max(0, session.expiresAt - Date.now()));
  }

  private readSession(): AuthSession | null {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    try {
      const session = JSON.parse(saved) as AuthSession;
      if (!session.accessToken || !session.nombre ||
          (session.expiresAt !== null && Date.now() >= session.expiresAt)) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }
}
