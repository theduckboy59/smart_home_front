import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  HttpErrorResponse
} from '@angular/common/http';
import { Subscription } from 'rxjs';

import {
  DiagnosticoApi,
  Dispositivo,
  DispositivoService
} from './services/dispositivo.service';

import {
  AuthService
} from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [
    './app.component.css'
  ]
})
export class AppComponent implements OnInit, OnDestroy {

  dispositivos: Dispositivo[] = [];

  nombre = '';
  estado = 'APAGADO';

  cargando = false;
  guardando = false;
  operacionEnCurso = false;

  error = '';
  mensaje = '';

  estadoApi:
    | 'verificando'
    | 'disponible'
    | 'error'
    | 'sin-verificar' = 'sin-verificar';

  diagnostico:
    DiagnosticoApi | null = null;

  historialDiagnostico:
    DiagnosticoApi[] = [];

  mostrandoHistorial = false;

  autenticado = false;

  nombreUsuario = '';
  contrasena = '';
  usuarioActual = '';
  usuarioId: number | null = null;

  cargandoLogin = false;
  errorLogin = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private dispositivoService:
      DispositivoService,

    private auth:
      AuthService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(this.auth.session$.subscribe(session => {
      if (!session) {
        const sessionWasActive = this.autenticado;
        this.autenticado = false;
        this.usuarioActual = '';
        this.usuarioId = null;
        this.dispositivos = [];
        this.diagnostico = null;
        this.historialDiagnostico = [];
        this.mostrandoHistorial = false;
        this.estadoApi = 'sin-verificar';
        if (sessionWasActive) this.errorLogin = 'La sesión terminó. Inicia sesión nuevamente.';
        return;
      }

      const newSession = !this.autenticado;
      this.autenticado = true;
      this.usuarioActual = session.nombre;
      this.usuarioId = session.usuarioId;
      this.errorLogin = '';
      if (newSession) this.listar();
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  iniciarSesion(): void {

    if (
      !this.nombreUsuario.trim() ||
      !this.contrasena
    ) {

      this.errorLogin =
        'Ingresa tu usuario y contraseña.';

      return;
    }

    this.cargandoLogin = true;
    this.errorLogin = '';

    this.auth
      .login({
        nombre: this.nombreUsuario.trim(),
        contrasena: this.contrasena
      })
      .subscribe({

        next: respuesta => {

          this.cargandoLogin = false;

          if (!respuesta.autenticado) {

            this.errorLogin =
              respuesta.mensaje ||
              'Credenciales incorrectas.';

            return;
          }

          this.contrasena = '';
          this.errorLogin = '';
        },

        error: (err: unknown) => {

          this.cargandoLogin = false;

          this.errorLogin = err instanceof HttpErrorResponse
            ? err.status === 401
              ? 'Usuario o contraseña incorrectos.'
              : err.status === 0
                ? 'No se pudo conectar con la API. Comprueba la conexión.'
                : `Error al iniciar sesión (HTTP ${err.status}).`
            : err instanceof Error
              ? err.message
              : 'No se pudo iniciar sesión.';
        }
      });
  }

  cerrarSesion(): void {
    this.nombreUsuario = '';
    this.contrasena = '';
    this.auth.logout().subscribe(revoked => {
      this.errorLogin = revoked
        ? ''
        : 'Se cerró la sesión local, pero no se pudo confirmar la revocación en el servidor.';
    });
  }

  listar(): void {

    this.cargando = true;

    this.error = '';

    const inicio =
      Date.now();

    const url =
      this.dispositivoService
        .urlDelRecurso();

    this.dispositivoService
      .listar()
      .subscribe({

        next: (
          datos: Dispositivo[]
        ) => {

          this.dispositivos =
            datos;

          this.cargando =
            false;

          this.registrarExito(
            'GET',
            url,
            inicio
          );
        },

        error: (
          err: unknown
        ) => {

          this.cargando =
            false;

          this.error =
            'No se pudieron cargar los dispositivos. ' +
            'Revisa el diagnóstico de conexión.';

          this.registrarError(
            err,
            'GET',
            url,
            inicio
          );
        }
      });
  }

  verificarConexion(): void {

    this.estadoApi =
      'verificando';

    this.error = '';
    this.mensaje = '';

    const inicio =
      Date.now();

    const url =
      this.dispositivoService
        .urlDelRecurso();

    this.dispositivoService
      .listar()
      .subscribe({

        next: (
          datos: Dispositivo[]
        ) => {

          this.dispositivos =
            datos;

          this.registrarExito(
            'GET',
            url,
            inicio
          );

          this.mensaje =
            'Conexión con la API verificada correctamente.';
        },

        error: (
          err: unknown
        ) => {

          this.registrarError(
            err,
            'GET',
            url,
            inicio
          );

          this.error =
            'Falló la comprobación. ' +
            'Consulta el diagnóstico para ver causas probables.';
        }
      });
  }

  crear(): void {

    const nombreLimpio =
      this.nombre.trim();

    if (!nombreLimpio) {

      this.error =
        'Escribe el nombre del dispositivo.';

      return;
    }

    this.guardando = true;

    this.operacionEnCurso = true;

    this.error = '';
    this.mensaje = '';

    const inicio =
      Date.now();

    const url =
      this.dispositivoService
        .urlDelRecurso();

    this.dispositivoService
      .crear({
        nombre:
          nombreLimpio,

        estado:
          this.estado
      })
      .subscribe({

        next: () => {

          this.nombre = '';

          this.estado =
            'APAGADO';

          this.guardando =
            false;

          this.operacionEnCurso =
            false;

          this.registrarExito(
            'POST',
            url,
            inicio
          );

          this.mensaje =
            'Dispositivo registrado correctamente.';

          this.listar();
        },

        error: (
          err: unknown
        ) => {

          this.guardando =
            false;

          this.operacionEnCurso =
            false;

          this.error =
            'No se pudo registrar el dispositivo. ' +
            'Consulta el diagnóstico.';

          this.registrarError(
            err,
            'POST',
            url,
            inicio
          );
        }
      });
  }

  cambiarEstado(
    dispositivo: Dispositivo
  ): void {

    const nuevoEstado =
      dispositivo.estado ===
      'ENCENDIDO'

        ? 'APAGADO'
        : 'ENCENDIDO';

    this.error = '';
    this.mensaje = '';

    this.operacionEnCurso =
      true;

    const inicio =
      Date.now();

    const url =
      this.dispositivoService
        .urlDelRecurso(
          dispositivo.id
        );

    this.dispositivoService
      .actualizar(
        dispositivo.id,
        {
          nombre:
            dispositivo.nombre,

          estado:
            nuevoEstado
        }
      )
      .subscribe({

        next: () => {

          this.operacionEnCurso =
            false;

          this.registrarExito(
            'PUT',
            url,
            inicio
          );

          this.mensaje =
            `Estado actualizado a ${nuevoEstado}.`;

          this.listar();
        },

        error: (
          err: unknown
        ) => {

          this.operacionEnCurso =
            false;

          this.error =
            'No se pudo actualizar el dispositivo. ' +
            'Consulta el diagnóstico.';

          this.registrarError(
            err,
            'PUT',
            url,
            inicio
          );
        }
      });
  }

  eliminar(
    id: number
  ): void {

    const confirmado =
      window.confirm(
        '¿Seguro que deseas eliminar este dispositivo?'
      );

    if (!confirmado) {
      return;
    }

    this.error = '';
    this.mensaje = '';

    this.operacionEnCurso =
      true;

    const inicio =
      Date.now();

    const url =
      this.dispositivoService
        .urlDelRecurso(id);

    this.dispositivoService
      .eliminar(id)
      .subscribe({

        next: () => {

          this.operacionEnCurso =
            false;

          this.registrarExito(
            'DELETE',
            url,
            inicio
          );

          this.mensaje =
            'Dispositivo eliminado correctamente.';

          this.listar();
        },

        error: (
          err: unknown
        ) => {

          this.operacionEnCurso =
            false;

          this.error =
            'No se pudo eliminar el dispositivo. ' +
            'Consulta el diagnóstico.';

          this.registrarError(
            err,
            'DELETE',
            url,
            inicio
          );
        }
      });
  }

  alternarHistorial(): void {

    this.mostrandoHistorial =
      !this.mostrandoHistorial;
  }

  limpiarHistorial(): void {

    this.historialDiagnostico =
      [];

    this.mostrandoHistorial =
      false;
  }

  trackById(
    _index: number,
    dispositivo: Dispositivo
  ): number {

    return dispositivo.id;
  }

  private registrarExito(
    metodo: string,
    url: string,
    inicio: number,
    codigoHttp = 200
  ): void {

    this.diagnostico =
      this.dispositivoService
        .crearDiagnosticoExitoso(
          metodo,
          url,
          Date.now() - inicio,
          codigoHttp
        );

    this.estadoApi =
      'disponible';

    this.guardarEnHistorial(
      this.diagnostico
    );
  }

  private registrarError(
    error: unknown,
    metodo: string,
    url: string,
    inicio: number
  ): void {

    this.diagnostico =
      this.dispositivoService
        .diagnosticarError(
          error,
          metodo,
          url,
          Date.now() - inicio
        );

    this.estadoApi =
      'error';

    this.guardarEnHistorial(
      this.diagnostico
    );
  }

  private guardarEnHistorial(
    diagnostico:
      DiagnosticoApi
  ): void {

    this.historialDiagnostico = [
      diagnostico,
      ...this.historialDiagnostico
    ].slice(
      0,
      10
    );
  }
}
