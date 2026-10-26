import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, TimeoutError, timeout } from 'rxjs';

export interface Dispositivo {
  id: number;
  nombre: string;
  estado: string;
}

export interface DiagnosticoApi {
  estado: 'disponible' | 'error';
  tipo: string;
  mensaje: string;
  origen: string;
  causas: string[];
  recomendaciones: string[];
  metodo: string;
  url: string;
  codigoHttp: number | null;
  duracionMs: number;
  fecha: Date;
  detalleTecnico: string;
}

@Injectable({
  providedIn: 'root'
})
export class DispositivoService {
  private readonly apiUrl =
  'https://prueba.aeropuertolosprimos.me/api/dispositivos';

  private readonly timeoutMs = 8000;

  constructor(private http: HttpClient) {}

  urlDelRecurso(id?: number): string {
    return id === undefined
      ? this.apiUrl
      : `${this.apiUrl}/${id}`;
  }

  listar(): Observable<Dispositivo[]> {
    return this.conTiempoLimite(
      this.http.get<Dispositivo[]>(this.apiUrl)
    );
  }

  buscarPorId(id: number): Observable<Dispositivo> {
    return this.conTiempoLimite(
      this.http.get<Dispositivo>(`${this.apiUrl}/${id}`)
    );
  }

  crear(
    datos: Omit<Dispositivo, 'id'>
  ): Observable<Dispositivo> {
    return this.conTiempoLimite(
      this.http.post<Dispositivo>(this.apiUrl, datos)
    );
  }

  actualizar(
    id: number,
    datos: Omit<Dispositivo, 'id'>
  ): Observable<Dispositivo> {
    return this.conTiempoLimite(
      this.http.put<Dispositivo>(
        `${this.apiUrl}/${id}`,
        datos
      )
    );
  }

  eliminar(id: number): Observable<void> {
    return this.conTiempoLimite(
      this.http.delete<void>(`${this.apiUrl}/${id}`)
    );
  }

  crearDiagnosticoExitoso(
    metodo: string,
    url: string,
    duracionMs: number,
    codigoHttp = 200
  ): DiagnosticoApi {
    return {
      estado: 'disponible',
      tipo: 'Conexión correcta',
      mensaje: 'La API respondió correctamente.',
      origen: 'API Spring Boot',
      causas: [],
      recomendaciones: [],
      metodo,
      url,
      codigoHttp,
      duracionMs,
      fecha: new Date(),
      detalleTecnico:
        `Respuesta HTTP ${codigoHttp} recibida correctamente.`
    };
  }

  diagnosticarError(
    error: unknown,
    metodo: string,
    url: string,
    duracionMs: number
  ): DiagnosticoApi {
    const base = {
      metodo,
      url,
      duracionMs,
      fecha: new Date(),
      codigoHttp: null as number | null
    };

    if (error instanceof TimeoutError) {
      return {
        ...base,
        estado: 'error',
        tipo: 'Tiempo de espera agotado',
        mensaje: 'La petición no respondió en 8 segundos.',
        origen: 'Cliente Angular: límite de espera',
        causas: [
          'Spring Boot está saturado o tarda demasiado.',
          'Hay latencia o pérdida de paquetes en la red.',
          'El servidor recibió la petición, pero no respondió a tiempo.'
        ],
        recomendaciones: [
          'Comprueba que Spring Boot siga ejecutándose.',
          'Prueba el endpoint desde el servidor con curl.',
          'Revisa los registros del backend.'
        ],
        detalleTecnico: 'TimeoutError: límite configurado de 8000 ms.'
      };
    }

    if (error instanceof HttpErrorResponse) {
      const status = error.status;
      const detalle = this.detalleDelError(error);

      if (status === 0) {
        return {
          ...base,
          estado: 'error',
          tipo: 'Sin respuesta HTTP',
          mensaje:
            'El navegador no recibió una respuesta HTTP utilizable.',
          origen: 'Red, navegador, CORS o servidor inaccesible',
          causas: [
            'Spring Boot está detenido o el puerto 8080 no es accesible.',
            'El navegador pudo bloquear la petición por CORS.',
            'La IP o URL es incorrecta o no existe una ruta de red.',
            'Un firewall, VPN o extensión podría bloquear la petición.'
          ],
          recomendaciones: [
            `Prueba ${url} directamente en el navegador o con curl.`,
            'Revisa la consola y la pestaña Network para buscar un mensaje CORS.',
            'Confirma que el backend escuche en el puerto 8080 y que la IP sea accesible.'
          ],
          detalleTecnico:
            detalle || 'Angular reportó status 0; no se recibió un código HTTP.'
        };
      }

      const info: Record<
        number,
        {
          tipo: string;
          origen: string;
          causas: string[];
          recomendaciones: string[];
        }
      > = {
        400: {
          tipo: 'Solicitud incorrecta (HTTP 400)',
          origen: 'Datos enviados o backend',
          causas: [
            'El cuerpo enviado contiene datos incorrectos o incompletos.',
            'El formato JSON no coincide con lo esperado.'
          ],
          recomendaciones: [
            'Revisa el cuerpo de la petición en Network.',
            'Consulta el detalle de respuesta del backend.'
          ]
        },
        401: {
          tipo: 'No autenticado (HTTP 401)',
          origen: 'Autenticación del backend o proxy',
          causas: [
            'La API requiere autenticación o las credenciales no son válidas.'
          ],
          recomendaciones: [
            'Comprueba la configuración de autenticación.'
          ]
        },
        403: {
          tipo: 'Acceso prohibido (HTTP 403)',
          origen: 'Permisos, seguridad o CORS',
          causas: [
            'El servidor deniega la operación.',
            'Una política de seguridad o CORS podría bloquear la petición.'
          ],
          recomendaciones: [
            'Revisa Network y los logs del backend.',
            'Si la petición es cross-origin, comprueba CORS.'
          ]
        },
        404: {
          tipo: 'Endpoint no encontrado (HTTP 404)',
          origen: 'Ruta de API o recurso',
          causas: [
            'La ruta no existe o el ID solicitado no se encuentra.'
          ],
          recomendaciones: [
            'Comprueba la URL y las rutas del controlador Spring Boot.'
          ]
        },
        405: {
          tipo: 'Método HTTP no permitido (HTTP 405)',
          origen: 'Controlador o método HTTP',
          causas: [
            'La ruta no admite el método usado.'
          ],
          recomendaciones: [
            'Verifica que GET, POST, PUT o DELETE coincida con el controlador.'
          ]
        },
        409: {
          tipo: 'Conflicto (HTTP 409)',
          origen: 'Reglas de negocio',
          causas: [
            'La operación entra en conflicto con el estado actual del recurso.'
          ],
          recomendaciones: [
            'Revisa el detalle de la respuesta y las reglas de negocio.'
          ]
        },
        422: {
          tipo: 'Datos no procesables (HTTP 422)',
          origen: 'Validación de datos',
          causas: [
            'El servidor entiende la petición, pero rechaza sus datos.'
          ],
          recomendaciones: [
            'Revisa los campos y el mensaje de validación.'
          ]
        },
        429: {
          tipo: 'Demasiadas peticiones (HTTP 429)',
          origen: 'Límite de solicitudes',
          causas: [
            'Se superó el límite de frecuencia de peticiones.'
          ],
          recomendaciones: [
            'Espera antes de repetir y revisa los límites configurados.'
          ]
        },
        500: {
          tipo: 'Error interno (HTTP 500)',
          origen: 'Backend Spring Boot',
          causas: [
            'Se produjo una excepción al procesar la petición.'
          ],
          recomendaciones: [
            'Consulta los logs de Spring Boot y el stack trace.'
          ]
        },
        502: {
          tipo: 'Gateway incorrecto (HTTP 502)',
          origen: 'Proxy o gateway, si existe',
          causas: [
            'Un proxy no pudo obtener una respuesta válida del backend.'
          ],
          recomendaciones: [
            'Comprueba el backend y la configuración del proxy.'
          ]
        },
        503: {
          tipo: 'Servicio no disponible (HTTP 503)',
          origen: 'Backend o infraestructura',
          causas: [
            'El servicio está detenido, sobrecargado o temporalmente fuera de servicio.'
          ],
          recomendaciones: [
            'Comprueba el proceso Spring Boot y los recursos del servidor.'
          ]
        },
        504: {
          tipo: 'Tiempo de espera del gateway (HTTP 504)',
          origen: 'Proxy o gateway, si existe',
          causas: [
            'El gateway no recibió respuesta a tiempo.'
          ],
          recomendaciones: [
            'Comprueba latencia, logs y estado del backend.'
          ]
        }
      };

      const item = info[status] ?? {
        tipo: `Error HTTP ${status}`,
        origen: 'Servidor que respondió',
        causas: [
          'El servidor devolvió un estado HTTP de error.'
        ],
        recomendaciones: [
          'Consulta el detalle técnico y los logs del servicio.'
        ]
      };

      return {
        ...base,
        estado: 'error',
        ...item,
        mensaje: `La API respondió con HTTP ${status}.`,
        codigoHttp: status,
        detalleTecnico:
          detalle || error.message || `HTTP ${status}`
      };
    }

    return {
      ...base,
      estado: 'error',
      tipo: 'Error inesperado en el cliente',
      mensaje:
        'Ocurrió un error que no corresponde a una respuesta HTTP reconocida.',
      origen: 'Código del frontend o error no clasificado',
      causas: [
        'Puede existir un error en el código o al procesar la respuesta.'
      ],
      recomendaciones: [
        'Consulta la consola del navegador y el detalle técnico.'
      ],
      detalleTecnico:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error)
    };
  }

  private conTiempoLimite<T>(
    peticion: Observable<T>
  ): Observable<T> {
    return peticion.pipe(
      timeout({ first: this.timeoutMs })
    );
  }

  private detalleDelError(
    error: HttpErrorResponse
  ): string {
    if (
      typeof error.error === 'string' &&
      error.error.trim()
    ) {
      return error.error.slice(0, 1000);
    }

    if (
      error.error &&
      typeof error.error === 'object'
    ) {
      try {
        return JSON.stringify(error.error).slice(0, 1000);
      } catch {
        // Usa el mensaje general si no se puede serializar.
      }
    }

    return error.message ||
      `HttpErrorResponse: status ${error.status}`;
  }
}