import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EventoSeguridad, PaginaEventosSeguridad } from '../../models/seguridad.model';
import { SeguridadService } from '../../services/seguridad.service';

@Component({
  selector: 'app-historial-seguridad',
  templateUrl: './historial-seguridad.component.html',
  styleUrls: ['./historial-seguridad.component.css']
})
export class HistorialSeguridadComponent implements OnInit {
  eventos: EventoSeguridad[] = [];
  private eventosLocales: EventoSeguridad[] = [];
  pagina = 0;
  readonly tamano = 10;
  total = 0;
  tipo = '';
  desde = '';
  hasta = '';
  cargando = false;
  error = '';

  constructor(private readonly seguridad: SeguridadService) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.seguridad.eventos(this.pagina, this.tamano, this.tipo || undefined, this.desde || undefined, this.hasta || undefined).subscribe({
      next: response => {
        if (Array.isArray(response)) {
          this.eventosLocales = response
            .filter(evento => this.coincideConFiltros(evento))
            .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
          this.total = this.eventosLocales.length;
          this.eventos = this.eventosLocales.slice(this.pagina * this.tamano, (this.pagina + 1) * this.tamano);
        } else {
          const page = response as PaginaEventosSeguridad;
          this.eventos = page.content || [];
          this.total = page.totalElements ?? this.eventos.length;
          this.pagina = page.number ?? this.pagina;
        }
        this.eventos = [...this.eventos].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
        this.cargando = false;
      },
      error: (err: HttpErrorResponse) => {
        this.cargando = false;
        this.error = err.status === 404
          ? 'La API todavía no ofrece el endpoint de eventos de seguridad.'
          : err.status === 401
            ? 'La sesión expiró. Inicia sesión nuevamente.'
            : 'No se pudo cargar el historial de seguridad.';
      }
    });
  }

  aplicarFiltros(): void { this.pagina = 0; this.cargar(); }
  anterior(): void { if (this.pagina > 0) { this.pagina--; this.cargar(); } }
  siguiente(): void { if ((this.pagina + 1) * this.tamano < this.total) { this.pagina++; this.cargar(); } }

  private coincideConFiltros(evento: EventoSeguridad): boolean {
    const tipoCoincide = !this.tipo || evento.tipo.toLocaleUpperCase().includes(this.tipo);
    if (!tipoCoincide) return false;
    const fecha = new Date(evento.fecha);
    if (!Number.isFinite(fecha.getTime())) return false;
    const dia = fecha.toISOString().slice(0, 10);
    return (!this.desde || dia >= this.desde) && (!this.hasta || dia <= this.hasta);
  }

  detalleSeguro(detalle: string | null | undefined): string {
    return (detalle || '—')
      .replace(/(passwordapp|passwordpuerta|password|contrasena|contraseña|pin|token|authorization|hash|bcrypt)\s*[:=]\s*[^,;\s]+/gi, '$1: [oculto]')
      .replace(/bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [oculto]');
  }
}
