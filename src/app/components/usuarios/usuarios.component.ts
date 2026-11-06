import { Component, Input, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Usuario } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';

const PIN_REGEX = /^[1-9A-D]{4}$/;

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  @Input() usuarioId: number | null = null;
  @Input() nombreActual = '';

  cuenta: Usuario | null = null;
  nombre = '';
  contrasena = '';
  passwordpuerta = '';
  passwordapp = '';
  cambiarContrasena = false;
  cambiarPasswordpuerta = false;
  cambiarPasswordapp = false;
  cargando = true;
  guardando = false;
  mensaje = '';
  error = '';

  constructor(private readonly usuarios: UsuarioService, private readonly auth: AuthService) {}

  ngOnInit(): void { this.cargarCuenta(); }

  guardar(): void {
    if (!this.cuenta || !this.nombre.trim()) {
      this.error = 'Escribe un nombre de usuario válido.';
      return;
    }
    if (this.cambiarPasswordpuerta && !PIN_REGEX.test(this.passwordpuerta)) {
      this.error = 'El PIN de puerta debe tener cuatro caracteres entre 1–9 y A–D.';
      return;
    }
    if (this.cambiarPasswordapp && !PIN_REGEX.test(this.passwordapp)) {
      this.error = 'El PIN de alarma debe tener cuatro caracteres entre 1–9 y A–D.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';
    this.usuarios.actualizar(this.cuenta.id, {
      nombre: this.nombre.trim(),
      contrasena: this.cambiarContrasena ? this.contrasena : '',
      passwordpuerta: this.cambiarPasswordpuerta ? this.passwordpuerta : '',
      passwordapp: this.cambiarPasswordapp ? this.passwordapp : ''
    }).subscribe({
      next: usuario => {
        this.cuenta = usuario;
        this.nombre = usuario.nombre;
        this.auth.updateUserName(usuario.nombre);
        this.limpiarCredenciales();
        this.mensaje = 'Cuenta actualizada. Las contraseñas nuevas no se vuelven a mostrar.';
        this.guardando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        this.error = err.status === 409
          ? 'Ese nombre ya está en uso.'
          : err.status === 403
            ? 'El servidor no autorizó modificar esta cuenta.'
            : err.status === 401
              ? 'La sesión expiró. Inicia sesión nuevamente.'
              : err.status === 400
                ? 'Revisa los datos ingresados.'
                : 'No se pudo actualizar la cuenta.';
      }
    });
  }

  private cargarCuenta(): void {
    this.cargando = true;
    this.usuarios.cuentaActual().subscribe({
      next: cuenta => {
        const sessionId = this.auth.session?.usuarioId ?? this.usuarioId;
        if (sessionId !== null && sessionId !== undefined && sessionId !== cuenta.id) {
          this.error = 'El servidor devolvió una cuenta distinta a la sesión actual.';
          this.cuenta = null;
        } else {
          this.cuenta = cuenta;
          this.nombre = cuenta.nombre || this.nombreActual;
        }
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.error = err.status === 404
          ? 'La API todavía no ofrece la consulta de cuenta actual (/usuarios/me).'
          : 'No se pudo consultar la cuenta autenticada.';
      }
    });
  }

  private limpiarCredenciales(): void {
    this.contrasena = '';
    this.passwordpuerta = '';
    this.passwordapp = '';
    this.cambiarContrasena = false;
    this.cambiarPasswordpuerta = false;
    this.cambiarPasswordapp = false;
  }
}
