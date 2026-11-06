import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  Subscription,
  catchError,
  exhaustMap,
  finalize,
  of,
  timer
} from 'rxjs';

import {
  CommandResult,
  HomeStatus,
  LightId,
  SmartHomeService,
  Uno1
} from '../../services/smart-home.service';

@Component({
  selector:
    'app-smart-home-panel',

  templateUrl:
    './smart-home-panel.component.html',

  styleUrls: [
    './smart-home-panel.component.css'
  ]
})
export class SmartHomePanelComponent
  implements OnInit, OnDestroy {

  status:
    HomeStatus | null = null;

  apiError = '';

  feedback = '';

  result = '';

  busy = false;

  private updated = 0;

  private readonly subscriptions =
    new Subscription();

  readonly rooms: {
    id: LightId;
    name: string;
    ir: keyof Uno1;
  }[] = [

    {
      id: 'luz_sala',
      name: 'Sala',
      ir: 'ir_sala'
    },

    {
      id: 'luz_comedor',
      name: 'Comedor',
      ir: 'ir_comedor'
    },

    {
      id: 'luz_cocina',
      name: 'Cocina',
      ir: 'ir_cocina'
    },

    {
      id: 'luz_habitacion',
      name: 'Habitación',
      ir: 'ir_habitacion'
    }
  ];

  constructor(
    private home:
      SmartHomeService
  ) {}

  ngOnInit(): void {

    this.subscriptions.add(

      timer(
        0,
        1000
      )
        .pipe(

          exhaustMap(
            () =>

              this.home
                .status()
                .pipe(

                  catchError(
                    () => {

                      this.apiError =
                        'No se puede consultar el servidor. ' +
                        'Los controles están deshabilitados.';

                      return of(
                        null
                      );
                    }
                  )
                )
          )
        )
        .subscribe(
          (
            status:
              HomeStatus | null
          ) => {

            this.status =
              status;

            if (status) {

              this.updated =
                Date.now();

              this.apiError =
                '';
            }
          }
        )
    );
  }

  ngOnDestroy(): void {

    this.subscriptions
      .unsubscribe();
  }

  get fresh():
    boolean {

    return (
      this.status?.fresh === true &&
      Date.now() -
      this.updated <
      3000
    );
  }

  get uno1() {

    return (
      this.fresh &&
      this.status
        ?.estado
        ?.uno1
        .online
    )

      ? this.status
          .estado
          .uno1

      : null;
  }

  get uno2() {

    return (
      this.fresh &&
      this.status
        ?.estado
        ?.uno2
        .online
    )

      ? this.status
          .estado
          .uno2

      : null;
  }

  get occupied():
    boolean {

    return (
      this.busy ||
      this.status?.busy === true
    );
  }

  canControl(
    node: number
  ): boolean {

    return (
      !this.occupied &&
      !!(
        node === 1
          ? this.uno1
          : this.uno2
      )
    );
  }

  light(
    id: LightId
  ): number | null {

    return (
      this.uno1?.[id]
      ?? null
    );
  }

  ir(
    key: keyof Uno1
  ): string {

    const value =
      this.uno1?.[key];

    return value === 1

      ? 'Detecta'

      : value === 0

        ? 'Sin detección'

        : 'Sin datos';
  }

  get fanValue():
    number | null {

    return (
      this.uno2
        ?.ventilador
        ?.velocidad
      ?? null
    );
  }

  get fanManual():
    boolean {

    return (
      this.uno2
        ?.ventilador
        ?.modo
      === 'manual'
    );
  }

  get alarmaValue(): number | null {
    const alarma = this.uno1?.alarma;
    if (typeof alarma === 'number') return alarma;
    return alarma?.estado ?? null;
  }

  get doorValue(): number | null {
    return this.uno1?.puerta?.estado ?? null;
  }

  get lastDoorOpening(): string | null {
    return this.uno1?.puerta?.ultimaAperturaConfirmada ?? null;
  }

  hasLight(id: LightId): boolean {
    const value = this.uno1?.[id];
    return value === 0 || value === 1;
  }

  command(
    id: string,
    action: string,
    value:
      number | string
  ): void {

    const node =
      id === 'ventilador' ||
      id === 'audio'

        ? 2

        : 1;

    if (
      !this.canControl(
        node
      )
    ) {
      return;
    }

    this.busy = true;

    this.feedback =
      'Esperando confirmación del Arduino…';

    this.result =
      'pendiente';

    this.subscriptions.add(

      this.home
        .command(
          id,
          action,
          value
        )
        .pipe(

          finalize(
            () => {

              this.busy =
                false;
            }
          )
        )
        .subscribe({

          next: (
            response:
              CommandResult
          ) => {

            this.result =
              response.resultado;

            this.feedback =
              response.resultado
              === 'aplicado'

                ? `Orden aplicada por el Arduino: ${id}.`

                : response.detalle;
          },

          error: (
            error:
              HttpErrorResponse
          ) => {

            this.result =
              error.status === 400 ||
              error.status === 409 ||
              error.status === 503

                ? 'rechazado'

                : 'incierto';

            this.feedback =
              error.status === 409

                ? 'Hay una orden pendiente o el ventilador está en modo manual.'

                : error.status === 503

                  ? 'El ESP32 o el Arduino no tiene datos recientes.'

                  : error.status === 400

                    ? 'El valor o comando no es válido.'

                    : 'Sin confirmación del servidor. ' +
                      'La orden pudo aplicarse: ' +
                      'revisa el estado antes de repetir.';
          }
        })
    );
  }
}
