import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, catchError, exhaustMap, of, timer } from 'rxjs';
import { SeguridadEstado } from '../../models/seguridad.model';
import { SeguridadService } from '../../services/seguridad.service';

@Component({
  selector: 'app-seguridad',
  templateUrl: './seguridad.component.html',
  styleUrls: ['./seguridad.component.css']
})
export class SeguridadComponent implements OnInit, OnDestroy {
  estado: SeguridadEstado | null = null;
  error = '';
  private actualizado = 0;
  private readonly subscription = new Subscription();

  constructor(private readonly seguridad: SeguridadService) {}

  ngOnInit(): void {
    this.subscription.add(timer(0, 1000).pipe(
      exhaustMap(() => this.seguridad.consultarEstado().pipe(
        catchError((error: HttpErrorResponse) => {
          this.estado = null;
          this.error = error.status === 401
            ? 'La sesión expiró. Inicia sesión nuevamente.'
            : 'Sin conexión con el servicio de seguridad. Las lecturas no están disponibles.';
          return of(null);
        })
      ))
    ).subscribe(value => {
      if (value) {
        this.estado = value;
        this.actualizado = Date.now();
        this.error = '';
      }
    }));
  }

  ngOnDestroy(): void { this.subscription.unsubscribe(); }

  get reciente(): boolean {
    return !!this.estado && Date.now() - this.actualizado < 3500;
  }

  get alarmaActiva(): boolean {
    return this.reciente && (!!this.estado?.buzzerActivo || this.estado?.estado === 'ALARMA');
  }

  get progreso(): number {
    const segundos = this.estado?.tiempoPresenciaSegundos ?? 0;
    const limite = this.estado?.alarmaSegundo || 30;
    return Math.max(0, Math.min(100, segundos / limite * 100));
  }

  estadoLegible(estado: SeguridadEstado['estado']): string {
    const etiquetas: Record<SeguridadEstado['estado'], string> = {
      NORMAL: 'Sistema vigilando',
      VIGILANCIA: 'Objeto detectado',
      PRESENCIA_CONFIRMADA: 'Presencia confirmada',
      ADVERTENCIA: 'Advertencia de voz',
      ALARMA: 'Alarma activa',
      REARMADO: 'Alarma rearmada',
      SENSOR_SIN_DATOS: 'Sensor sin datos'
    };
    return etiquetas[estado];
  }

  alConfirmar(resultado: 'aplicado' | 'rechazado' | 'incierto'): void {
    if (resultado === 'incierto') this.consultarAhora();
  }

  private consultarAhora(): void {
    this.seguridad.consultarEstado().subscribe({
      next: estado => { this.estado = estado; this.actualizado = Date.now(); this.error = ''; },
      error: () => { this.estado = null; this.error = 'No se pudo confirmar el estado actual de la alarma.'; }
    });
  }
}
