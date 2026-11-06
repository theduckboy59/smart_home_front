import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly apiBase = new URL(API_BASE_URL, window.location.origin);

  constructor(private readonly auth: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const target = new URL(request.url, window.location.origin);
    const ownApi = target.origin === this.apiBase.origin &&
      target.pathname.startsWith(this.apiBase.pathname.replace(/\/$/, '') + '/');
    const isLogin = target.pathname.endsWith('/auth/login');
    const token = ownApi && !isLogin ? this.auth.session?.accessToken : null;
    const outgoing = token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

    return next.handle(outgoing).pipe(
      catchError((error: unknown) => {
        if (ownApi && error instanceof HttpErrorResponse && error.status === 401 && !isLogin) {
          this.auth.clearSession();
        }
        return throwError(() => error);
      })
    );
  }
}
