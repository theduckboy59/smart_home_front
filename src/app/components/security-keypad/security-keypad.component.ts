import { Component, EventEmitter, Output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SeguridadService } from '../../services/seguridad.service';

const PIN_REGEX = /^[1-9A-D]{4}$/;
const KEYS = ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C'];

@Component({
  selector: 'app-security-keypad',
  templateUrl: './security-keypad.component.html',
  styleUrls: ['./security-keypad.component.css']
})
export class SecurityKeypadComponent {
  @Output() readonly resultadoConfirmado = new EventEmitter<'aplicado' | 'rechazado' | 'incierto'>();

  readonly keys = KEYS;
  pin = '';
  mensaje = '';
  estado: 'listo' | 'enviando' | 'exito' | 'error' | 'incierto' = 'listo';

  constructor(private readonly seguridad: SeguridadService) {}

  agregar(tecla: string): void {
    if (this.estado === 'enviando' || this.pin.length >= 4 || !/^[1-9A-D]$/.test(tecla)) return;
    this.pin += tecla;
    this.mensaje = '';
    this.estado = 'listo';
  }

  borrar(): void {
    if (this.estado !== 'enviando') this.pin = this.pin.slice(0, -1);
  }

  limpiar(): void {
    if (this.estado !== 'enviando') {
      this.pin = '';
      this.mensaje = '';
      this.estado = 'listo';
    }
  }

  confirmar(): void {
    if (!PIN_REGEX.test(this.pin) || this.estado === 'enviando') {
      this.mensaje = 'Ingresa un PIN válido de cuatro caracteres.';
      this.estado = 'error';
      return;
    }

    const passwordapp = this.pin;
    this.pin = '';
    this.estado = 'enviando';
    this.mensaje = 'Esperando confirmación del servidor…';

    this.seguridad.desactivarAlarma(passwordapp).subscribe({
      next: response => {
        if (response.resultado === 'aplicado' && response.autorizado) {
          this.estado = 'exito';
          this.mensaje = response.mensaje || 'El servidor confirmó la desactivación.';
          this.resultadoConfirmado.emit('aplicado');
          return;
        }
        if (response.resultado === 'rechazado' || !response.autorizado) {
          this.estado = 'error';
          this.mensaje = response.mensaje || 'PIN rechazado. La alarma continúa activa.';
          this.resultadoConfirmado.emit('rechazado');
          return;
        }
        this.estado = 'incierto';
        this.mensaje = response.mensaje || 'No se confirmó el resultado. Consultando el estado actual.';
        this.resultadoConfirmado.emit('incierto');
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 401) return;
        this.estado = error.status === 409 || error.status === 0 || error.status >= 500
          ? 'incierto'
          : 'error';
        this.mensaje = error.status === 429
          ? 'Demasiados intentos. Espera antes de volver a probar.'
          : error.status === 503
            ? 'El servidor o el dispositivo no está disponible.'
            : error.status === 0
              ? 'No hay conexión. No se confirmó el resultado.'
              : error.status === 400
                ? 'El PIN no cumple el formato requerido.'
                : error.status === 403
                  ? 'La operación no está autorizada.'
                  : 'No se pudo confirmar la operación. Revisa el estado antes de repetir.';
        this.resultadoConfirmado.emit(this.estado === 'incierto' ? 'incierto' : 'rechazado');
      }
    });
  }
}
