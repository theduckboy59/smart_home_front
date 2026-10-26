import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import {
  DiagnosticoApi,
  Dispositivo,
  DispositivoService
} from './services/dispositivo.service';

interface LoginResponse {
  autenticado: boolean;
  mensaje: string;
  usuarioId: number | null;
  nombre: string | null;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
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

  diagnostico: DiagnosticoApi | null = null;
  historialDiagnostico: DiagnosticoApi[] = [];
  mostrandoHistorial = false;

  // Inicio de sesión
  autenticado = false;
  nombreUsuario = '';
  contrasena = '';
  usuarioActual = '';
  cargandoLogin = false;
  errorLogin = '';

  private readonly loginUrl =
    'https://smarthome.aeropuertolosprimos.me/api/auth/login';

  constructor(
    private dispositivoService: DispositivoService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Los dispositivos se cargan después del inicio de sesión.
  }

  iniciarSesion(): void {
    if (!this.nombreUsuario.trim() || !this.contrasena) {
      this.errorLogin = 'Ingresa tu usuario y contraseña.';
      return;
    }

    this.cargandoLogin = true;
    this.errorLogin = '';

    const inicio = Date.now();

    this.http.post<LoginResponse>(this.loginUrl, {
      nombre: this.nombreUsuario.trim(),
      contrasena: this.contrasena
    }).subscribe({
      next: respuesta => {
        this.cargandoLogin = false;

        if (!respuesta.autenticado) {
          this.errorLogin =
            respuesta.mensaje || 'Credenciales incorrectas.';
          return;
        }

        this.autenticado = true;
        this.usuarioActual =
          respuesta.nombre || this.nombreUsuario.trim();

        this.contrasena = '';
        this.errorLogin = '';
        this.listar();
      },
      error: (err: HttpErrorResponse) => {
        this.cargandoLogin = false;

        this.errorLogin =
          err.status === 401
            ? 'Usuario o contraseña incorrectos.'
            : err.status === 0
              ? 'No se pudo conectar con la API. Comprueba la conexión.'
              : `Error al iniciar sesión (HTTP ${err.status}).`;
      }
    });
  }

  cerrarSesion(): void {
    this.autenticado = false;
    this.nombreUsuario = '';
    this.contrasena = '';
    this.usuarioActual = '';
    this.errorLogin = '';

    this.dispositivos = [];
    this.diagnostico = null;
    this.historialDiagnostico = [];
    this.mostrandoHistorial = false;

    this.estadoApi = 'sin-verificar';
    this.error = '';
    this.mensaje = '';
  }

  listar(): void {
    this.cargando = true;
    this.error = '';

    const inicio = Date.now();
    const url = this.dispositivoService.urlDelRecurso();

    this.dispositivoService.listar().subscribe({
      next: datos => {
        this.dispositivos = datos;
        this.cargando = false;
        this.registrarExito('GET', url, inicio);
      },
      error: err => {
        this.cargando = false;
        this.error =
          'No se pudieron cargar los dispositivos. Revisa el diagnóstico de conexión.';
        this.registrarError(err, 'GET', url, inicio);
      }
    });
  }

  verificarConexion(): void {
    this.estadoApi = 'verificando';
    this.error = '';
    this.mensaje = '';

    const inicio = Date.now();
    const url = this.dispositivoService.urlDelRecurso();

    this.dispositivoService.listar().subscribe({
      next: datos => {
        this.dispositivos = datos;
        this.registrarExito('GET', url, inicio);
        this.mensaje =
          'Conexión con la API verificada correctamente.';
      },
      error: err => {
        this.registrarError(err, 'GET', url, inicio);
        this.error =
          'Falló la comprobación. Consulta el diagnóstico para ver causas probables.';
      }
    });
  }

  crear(): void {
    const nombreLimpio = this.nombre.trim();

    if (!nombreLimpio) {
      this.error = 'Escribe el nombre del dispositivo.';
      return;
    }

    this.guardando = true;
    this.operacionEnCurso = true;
    this.error = '';
    this.mensaje = '';

    const inicio = Date.now();
    const url = this.dispositivoService.urlDelRecurso();

    this.dispositivoService.crear({
      nombre: nombreLimpio,
      estado: this.estado
    }).subscribe({
      next: () => {
        this.nombre = '';
        this.estado = 'APAGADO';
        this.guardando = false;
        this.operacionEnCurso = false;

        this.registrarExito('POST', url, inicio);
        this.mensaje = 'Dispositivo registrado correctamente.';

        this.listar();
      },
      error: err => {
        this.guardando = false;
        this.operacionEnCurso = false;

        this.error =
          'No se pudo registrar el dispositivo. Consulta el diagnóstico.';

        this.registrarError(err, 'POST', url, inicio);
      }
    });
  }

  cambiarEstado(dispositivo: Dispositivo): void {
    const nuevoEstado =
      dispositivo.estado === 'ENCENDIDO'
        ? 'APAGADO'
        : 'ENCENDIDO';

    this.error = '';
    this.mensaje = '';
    this.operacionEnCurso = true;

    const inicio = Date.now();
    const url =
      this.dispositivoService.urlDelRecurso(dispositivo.id);

    this.dispositivoService.actualizar(
      dispositivo.id,
      {
        nombre: dispositivo.nombre,
        estado: nuevoEstado
      }
    ).subscribe({
      next: () => {
        this.operacionEnCurso = false;

        this.registrarExito('PUT', url, inicio);
        this.mensaje = `Estado actualizado a ${nuevoEstado}.`;

        this.listar();
      },
      error: err => {
        this.operacionEnCurso = false;

        this.error =
          'No se pudo actualizar el dispositivo. Consulta el diagnóstico.';

        this.registrarError(err, 'PUT', url, inicio);
      }
    });
  }

  eliminar(id: number): void {
    const confirmado = window.confirm(
      '¿Seguro que deseas eliminar este dispositivo?'
    );

    if (!confirmado) {
      return;
    }

    this.error = '';
    this.mensaje = '';
    this.operacionEnCurso = true;

    const inicio = Date.now();
    const url = this.dispositivoService.urlDelRecurso(id);

    this.dispositivoService.eliminar(id).subscribe({
      next: () => {
        this.operacionEnCurso = false;

        this.registrarExito('DELETE', url, inicio);
        this.mensaje = 'Dispositivo eliminado correctamente.';

        this.listar();
      },
      error: err => {
        this.operacionEnCurso = false;

        this.error =
          'No se pudo eliminar el dispositivo. Consulta el diagnóstico.';

        this.registrarError(err, 'DELETE', url, inicio);
      }
    });
  }

  alternarHistorial(): void {
    this.mostrandoHistorial = !this.mostrandoHistorial;
  }

  limpiarHistorial(): void {
    this.historialDiagnostico = [];
    this.mostrandoHistorial = false;
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
      this.dispositivoService.crearDiagnosticoExitoso(
        metodo,
        url,
        Date.now() - inicio,
        codigoHttp
      );

    this.estadoApi = 'disponible';
    this.guardarEnHistorial(this.diagnostico);
  }

  private registrarError(
    error: unknown,
    metodo: string,
    url: string,
    inicio: number
  ): void {
    this.diagnostico =
      this.dispositivoService.diagnosticarError(
        error,
        metodo,
        url,
        Date.now() - inicio
      );

    this.estadoApi = 'error';
    this.guardarEnHistorial(this.diagnostico);
  }

  private guardarEnHistorial(
    diagnostico: DiagnosticoApi
  ): void {
    this.historialDiagnostico = [
      diagnostico,
      ...this.historialDiagnostico
    ].slice(0, 10);
  }
}