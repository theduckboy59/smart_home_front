# Instrucciones completas para actualizar el frontend Smart Home

**Proyecto:** `C:\smart_home\smart_home_front`  
**Tecnología:** Angular 17 + TypeScript + HTML + CSS  
**Objetivo:** adaptar la plataforma existente al nuevo sistema de seguridad, usuarios, puerta, alarma y comunicación con el backend Spring Boot.

Estas instrucciones se basan en el código Angular compartido en `frontend(1).txt` y en la especificación del backend definida previamente.

> **Alcance:** documento de instrucciones. Los componentes, servicios y endpoints nuevos descritos aquí deben implementarse y probarse; no se consideran ya construidos solo por estar documentados.

---

## 1. Reglas generales del desarrollo

Se debe **conservar el proyecto actual y ampliar sus funcionalidades**, no reconstruirlo desde cero.

| Elemento | Instrucción |
|---|---|
| Framework | Mantener Angular 17 |
| Arquitectura | Conservar componentes basados en `AppModule` |
| Inicio de sesión | Mantener `nombre` y `contrasena` |
| Autenticación | Incorporar el token de sesión emitido por el backend |
| Administración | Crear interfaz CRUD de usuarios |
| Apertura de puerta | Exclusivamente mediante PIN del teclado físico |
| Desactivación del buzzer | Exclusivamente mediante teclado virtual y `passwordapp` |
| Seguridad perimétrica | Mostrar vigilancia, advertencia y alarma |
| Comunicación con servidor | HTTP REST mediante `HttpClient` |
| Comunicación MQTT | Gestionada por el backend, no directamente por Angular |
| Estado de dispositivos | Consultar información real del servidor |
| Funciones existentes | Preservar las que siguen siendo compatibles |

**Regla principal:** Angular presenta información y solicita operaciones; Spring Boot valida las credenciales y autoriza las acciones.

## 2. Análisis del frontend actual

El proyecto ya contiene una estructura aprovechable:

| Archivo actual | Función |
|---|---|
| `app.component.ts` | Login y gestión básica de dispositivos |
| `app.component.html` | Pantalla de inicio de sesión y contenido principal |
| `app.component.css` | Estilos generales |
| `smart-home-panel.component.ts` | Lógica del panel domótico |
| `smart-home-panel.component.html` | Control de luces, ventilador, puerta, alarma y audio |
| `smart-home-panel.component.css` | Estilos del panel |
| `smart-home.service.ts` | Consultas de estado y envío de comandos |
| `dispositivo.service.ts` | CRUD informativo de dispositivos |
| `fan-dial.component.ts` | Control gráfico del ventilador |
| `api.config.ts` | Dirección de acceso a la API |
| `app.module.ts` | Registro de los componentes y módulos Angular |

### Cambios críticos identificados

Actualmente:

1. El login se valida, pero el frontend solo guarda un booleano `autenticado`; todavía no administra un token verificable por el servidor.
2. Existe un botón **Abrir** que envía directamente `puerta/estado/1`. Esto debe restringirse porque ahora la apertura exige `passwordpuerta` desde el teclado físico.
3. Existe un botón **Silenciar** que envía directamente `alarma/estado/0`. Debe reemplazarse por una validación de `passwordapp` mediante teclado virtual.
4. La pantalla permite modificar libremente el ángulo del servomotor. Esto permitiría eludir la autenticación de puerta si el backend no lo restringe.
5. El estado actual de Angular espera campos que no coinciden completamente con el JSON del ESP32 actualizado.
6. La pantalla muestra Arduino 1 y Arduino 2, mientras que la configuración actual utiliza un Arduino físico y dos identificadores lógicos en el JSON.
7. No existe todavía una pantalla específica para administrar usuarios ni consultar los eventos de seguridad.

El desarrollo debe resolver estos puntos sin eliminar innecesariamente las demás secciones.

## 3. Estructura visual propuesta

Después de iniciar sesión, el panel deberá organizarse en secciones:

```text
┌───────────────────────────────────────────────┐
│ SMART HOME                  Panel de control  │
│ Panel de control y seguridad                  │
├───────────────────────┬───────────────────────┤
│ SEGURIDAD             │ ACCESO                │
│ Alarma y temporizador │ Estado de la puerta   │
├───────────────────────┼───────────────────────┤
│ USUARIOS              │ HISTORIAL             │
│ CRUD y contraseñas    │ Eventos de seguridad  │
└───────────────────────┴───────────────────────┘
```

El diseño debe ser adaptable a computadoras y teléfonos, especialmente para utilizar el teclado virtual de seguridad.

Se conservan además las secciones compatibles de **iluminación**, **climatización**, **audio** y **diagnóstico**.

---

## 4. Actualizar el inicio de sesión

Archivos principales:

- `src/app/app.component.ts`
- `src/app/app.component.html`
- `src/app/app.module.ts`

Actualmente se utiliza:

```http
POST /api/auth/login
```

Con el JSON:

```json
{
  "nombre": "postgres",
  "contrasena": "CONTRASEÑA_DE_LOGIN"
}
```

**Debe conservarse esta solicitud.**

### Nueva respuesta del backend

El frontend deberá admitir:

```json
{
  "autenticado": true,
  "mensaje": "Autenticacion correcta",
  "usuarioId": 1,
  "nombre": "postgres",
  "accessToken": "TOKEN_GENERADO_POR_EL_SERVIDOR",
  "expiresIn": 1800
}
```

El token será necesario para solicitar la desactivación del buzzer y acceder a las operaciones protegidas.

### Crear `AuthService`

Ruta propuesta: `src/app/services/auth.service.ts`

Sus responsabilidades serán:

- Ejecutar el login.
- Guardar temporalmente la sesión.
- Proporcionar el token al interceptor HTTP.
- Identificar al usuario autenticado.
- Consultar la vigencia de la sesión.
- Ejecutar logout.
- Limpiar las credenciales cuando expire la sesión.

Para esta aplicación puede utilizarse `sessionStorage` como persistencia de sesión por pestaña. No se debe almacenar ninguna de las tres contraseñas. El token sí es sensible a XSS, por lo que debe evitarse introducir HTML no confiable o código dinámico en la página.

### Interfaz TypeScript

```typescript
export interface LoginResponse {
  autenticado: boolean;
  mensaje: string;
  usuarioId: number | null;
  nombre: string | null;
  accessToken?: string;
  expiresIn?: number;
}
```

### Crear un interceptor HTTP

Ruta propuesta: `src/app/interceptors/auth.interceptor.ts`

El interceptor agregará automáticamente:

```http
Authorization: Bearer TOKEN_GENERADO
```

a las solicitudes protegidas dirigidas a la API propia.

No deberá enviar el token a servicios externos ni incluirlo innecesariamente en la solicitud de login.

Cuando el backend responda `401 Unauthorized` por sesión inválida o vencida, el frontend limpiará la sesión y exigirá autenticarse nuevamente.

### Cerrar sesión

Actualmente `cerrarSesion()` únicamente cambia variables locales.

El nuevo comportamiento será:

1. Enviar `POST /api/auth/logout`.
2. Invalidar el token en el backend.
3. Eliminar los datos locales de sesión.
4. Cancelar las consultas periódicas del panel.
5. Regresar a la pantalla de login.

Si el backend no está disponible, se limpiará de todos modos el estado local y se notificará que no fue posible confirmar la revocación remota.

---

## 5. Crear el módulo de administración de usuarios

Actualmente el frontend permite registrar dispositivos, pero todavía no administra los usuarios de PostgreSQL.

Crear:

| Archivo | Responsabilidad |
|---|---|
| `components/usuarios/usuarios.component.ts` | Lógica del CRUD |
| `components/usuarios/usuarios.component.html` | Formulario y tabla de usuarios |
| `components/usuarios/usuarios.component.css` | Estilos |
| `services/usuario.service.ts` | Comunicación REST |
| `models/usuario.model.ts` | Interfaces TypeScript |

Registrar `UsuariosComponent` en `app.module.ts`, porque el proyecto utiliza componentes Angular no standalone.

### Endpoints a consumir

| Método | Endpoint | Función |
|---|---|---|
| GET | `/api/usuarios` | Listar usuarios autorizados |
| GET | `/api/usuarios/{id}` | Consultar usuario |
| POST | `/api/usuarios` | Crear usuario |
| PUT | `/api/usuarios/{id}` | Actualizar usuario |
| DELETE | `/api/usuarios/{id}` | Eliminar usuario |
| GET | `/api/usuarios/me` | Consultar cuenta autenticada |

Estos endpoints son parte de la especificación nueva; deben estar implementados en el backend antes de activar las pantallas que los utilizan.

### Interfaz del usuario

```typescript
export interface Usuario {
  id: number;
  nombre: string;
  passwordappConfigurada: boolean;
  passwordpuertaConfigurada: boolean;
}
```

La respuesta del backend no deberá proporcionar los hashes BCrypt.

### Formulario de creación y actualización

```text
┌──────────────────────────────────────────────────┐
│ USUARIO                                          │
│ [operador1                                    ]  │
│                                                  │
│ CONTRASEÑA DE INICIO DE SESIÓN                   │
│ [••••••••••••••••                             ]  │
│                                                  │
│ CONTRASEÑA DE PUERTA                             │
│ [••••                                          ]  │
│ Exactamente 4 caracteres entre A–D y 1–9         │
│                                                  │
│ CONTRASEÑA DE ALARMA                             │
│ [••••                                          ]  │
│ Independiente de la contraseña de puerta         │
└──────────────────────────────────────────────────┘
```

Reglas obligatorias:

- `nombre` será único.
- `contrasena` podrá contener una contraseña de login convencional.
- `passwordpuerta` y `passwordapp` admitirán exactamente cuatro caracteres de `1-9` o `A-D`.
- Mostrar caracteres enmascarados por defecto.
- En edición, dejar vacíos los campos de contraseñas hasta que el usuario solicite cambiarlos.
- Un campo de contraseña vacío en una actualización significará **mantener la contraseña actual**, según el contrato acordado con el backend.
- No recuperar ni mostrar una contraseña anterior.

Utilizar:

```typescript
const PIN_REGEX = /^[1-9A-D]{4}$/;
```

La validación Angular es preventiva; **el backend debe repetirla obligatoriamente**.

### Permisos de administración

No mostrar operaciones administrativas a usuarios sin autorización.

El modelo actual todavía no tiene roles. Por lo tanto, hasta que el backend establezca permisos administrativos, limitar la gestión ordinaria a la cuenta autenticada. No asumir que cualquier usuario puede editar o eliminar cuentas ajenas.

---

## 6. Crear el teclado virtual para desactivar el buzzer

**Esta es una de las funcionalidades principales del nuevo frontend.**

El teclado debe estar dentro de la plataforma y solamente aparecer como operación de seguridad después del inicio de sesión.

No será el mismo teclado matricial físico utilizado para abrir la puerta.

Crear:

| Archivo | Función |
|---|---|
| `components/security-keypad/security-keypad.component.ts` | Entrada y validación visual |
| `components/security-keypad/security-keypad.component.html` | Teclado |
| `components/security-keypad/security-keypad.component.css` | Presentación |

### Diseño propuesto

```text
┌─────────────────────────────┐
│     DESACTIVAR ALARMA       │
│ Introduce tu contraseña    │
│      ●  ●  ○  ○             │
│                             │
│  [ 1 ] [ 2 ] [ 3 ] [ A ]  │
│  [ 4 ] [ 5 ] [ 6 ] [ B ]  │
│  [ 7 ] [ 8 ] [ 9 ] [ C ]  │
│  [⌫]  [Limpiar]      [ D ]  │
│                             │
│     [ Confirmar PIN ]       │
└─────────────────────────────┘
```

La representación es un esquema visual. En la implementación real, cada tecla será un botón accesible y el botón de confirmación llamará a `SeguridadService` para realizar la validación en el backend.

### Funcionamiento del teclado

1. El usuario inicia sesión.
2. Se detecta una alarma activa.
3. El usuario abre la sección de desactivación.
4. Introduce los cuatro caracteres.
5. Angular comprueba que el formato sea válido.
6. Envía `passwordapp` al backend mediante HTTPS y con token de sesión.
7. Espera el resultado.
8. Si es correcto, actualiza el estado de la alarma.
9. Si es incorrecto, muestra un error y permite reintentar cuando corresponda.

No mostrar el PIN escrito, guardarlo en `localStorage`, imprimirlo en consola ni añadirlo al historial.

### Endpoint que utilizará

```http
POST /api/seguridad/alarma/desactivar
Authorization: Bearer TOKEN
Content-Type: application/json
```

Cuerpo:

```json
{
  "passwordapp": "AB12"
}
```

Respuesta esperada cuando el backend y el dispositivo confirman:

```json
{
  "autorizado": true,
  "resultado": "aplicado",
  "alarma": "desactivada",
  "mensaje": "Alarma desactivada correctamente"
}
```

No basta con recibir HTTP 200: también debe comprobarse `resultado`.

| Resultado | Comportamiento visual |
|---|---|
| `aplicado` | Mostrar alarma desactivada |
| `rechazado` | Mostrar error; mantener alarma activa |
| `incierto` | Indicar que no se confirmó; consultar estado actual |
| HTTP 401 | Exigir nueva autenticación |
| HTTP 429 | Mostrar bloqueo temporal de intentos |
| HTTP 503 | Mostrar pérdida de conexión |

**Nunca enviar directamente un comando para apagar el buzzer desde este componente.** Solo se utilizará el endpoint que verifica `passwordapp`.

---

## 7. Actualizar el panel de puerta

Archivo existente:

`src/app/components/smart-home-panel/smart-home-panel.component.html`

Actualmente contiene controles para abrir, cerrar y modificar manualmente el ángulo del servo.

En la pantalla de uso normal, sustituir esos controles por una tarjeta de estado de puerta.

```text
┌─────────────────────────────────────────┐
│ PUERTA PRINCIPAL                 Cerrada │
├───────────────────┬─────────────────────┤
│ Posición lógica   │ Tiempo de apertura  │
│       0°          │         5 s         │
└───────────────────┴─────────────────────┘

La apertura se autoriza mediante el teclado físico
 y el backend. El estado mostrado no sustituye
 un sensor de cierre.
```

La tarjeta deberá mostrar:

- Estado abierto, cerrado, bloqueado o sin datos.
- Última apertura confirmada.
- Disponibilidad del dispositivo.
- Bloqueo por alarma.
- Retorno automático tras 5 segundos.

### Comportamiento definido

Cuando el backend autorice una apertura por `passwordpuerta`, el frontend actualizará el estado a partir de la información recibida del servidor.

El servo se mueve de **0° a 90°** y posteriormente regresa a **0°**.

El audio de bienvenida es `0002.mp3`, reproducido automáticamente por el Arduino al abrir la puerta.

**No debe existir una segunda orden de reproducción desde Angular.**

Los controles directos de apertura y de ángulo deben retirarse del panel operativo. Dejar el botón visible, pero deshabilitado, no sustituye la protección que también debe aplicar el backend.

---
## 8. Crear el panel de seguridad perimétrica

Este panel debe tener prioridad visual sobre el control de luces y climatización.

Crear:

- `components/seguridad/seguridad.component.ts`
- `components/seguridad/seguridad.component.html`
- `components/seguridad/seguridad.component.css`
- `services/seguridad.service.ts`
- `models/seguridad.model.ts`

### Estados que debe mostrar

| Estado | Tiempo | Presentación |
|---|---|---|
| `NORMAL` | Sin presencia | Sistema vigilando |
| `VIGILANCIA` | 0–15 s | Objeto detectado |
| `PRESENCIA_CONFIRMADA` | 15–25 s | Presencia persistente |
| `ADVERTENCIA` | 25–30 s | Advertencia de voz |
| `ALARMA` | Desde 30 s | Buzzer y bloqueo activos |
| `REARMADO` | Tras validación | Alarma desactivada |
| `SENSOR_SIN_DATOS` | Lecturas no disponibles | Estado desconocido |

### Ejemplo visual del módulo

```text
┌───────────────────────────────────────────────────┐
│ SEGURIDAD PERIMÉTRICA                             │
│                                                   │
│ Estado: ADVERTENCIA                         27 s   │
│ [███████████████████████░░░]                     │
│                                                   │
│ Distancia: 12 cm    Umbral: 15 cm   Buzzer: OFF    │
└───────────────────────────────────────────────────┘

Cronología del estado de demostración:
  0 s ────── 15 s ────── 25 s ─── 30 s
  Vigilancia  Presencia  Advert.  Alarma
              confirmada
```

En la respuesta visual anterior había un control deslizante de **demostración**, para explorar manualmente valores de 0 a 30 segundos. Ese control es **solo una previsualización**, no forma parte del temporizador real ni envía órdenes al servidor.

La aplicación real obtendrá el tiempo y el estado del backend.

### Información obligatoria

El panel debe mostrar:

- Distancia ultrasónica actual.
- Umbral de detección de 15 cm.
- Tiempo acumulado de presencia.
- Etapa actual de seguridad.
- Estado del buzzer.
- Bloqueo de la puerta.
- Disponibilidad del sensor y del servidor.

No calcular los temporizadores de seguridad exclusivamente en Angular. El backend debe ser la fuente de verdad.

Por ejemplo, si el usuario abre la página cuando han transcurrido 27 segundos, Angular debe mostrar 27 segundos y `ADVERTENCIA`, no iniciar un nuevo contador desde cero.

## 9. Conectar el panel con el endpoint de seguridad

Endpoint propuesto:

```http
GET /api/seguridad/estado
```

Ejemplo de respuesta:

```json
{
  "estado": "ADVERTENCIA",
  "distanciaCm": 12,
  "presencia": true,
  "tiempoPresenciaSegundos": 27,
  "umbralCm": 15,
  "advertenciaSegundo": 25,
  "alarmaSegundo": 30,
  "puertaBloqueada": false,
  "buzzerActivo": false,
  "esp32Online": true,
  "arduinoOnline": true,
  "ultimaMedicionValida": "2026-11-06T06:10:27Z"
}
```

### Crear la interfaz TypeScript

```typescript
export type EstadoAlarma =
  | 'NORMAL'
  | 'VIGILANCIA'
  | 'PRESENCIA_CONFIRMADA'
  | 'ADVERTENCIA'
  | 'ALARMA'
  | 'REARMADO'
  | 'SENSOR_SIN_DATOS';

export interface SeguridadEstado {
  estado: EstadoAlarma;
  distanciaCm: number | null;
  presencia: boolean;
  tiempoPresenciaSegundos: number;
  umbralCm: number;
  advertenciaSegundo: number;
  alarmaSegundo: number;
  puertaBloqueada: boolean;
  buzzerActivo: boolean;
  esp32Online: boolean;
  arduinoOnline: boolean;
  ultimaMedicionValida: string | null;
}
```

### Crear `SeguridadService`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { SeguridadEstado } from '../models/seguridad.model';

export interface DesactivarAlarmaResponse {
  autorizado: boolean;
  resultado: 'aplicado' | 'rechazado' | 'incierto';
  alarma?: string;
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeguridadService {
  private readonly apiUrl = `${API_BASE_URL}/seguridad`;

  constructor(private http: HttpClient) {}

  consultarEstado(): Observable<SeguridadEstado> {
    return this.http
      .get<SeguridadEstado>(`${this.apiUrl}/estado`)
      .pipe(timeout(3500));
  }

  desactivarAlarma(
    passwordapp: string
  ): Observable<DesactivarAlarmaResponse> {
    return this.http
      .post<DesactivarAlarmaResponse>(
        `${this.apiUrl}/alarma/desactivar`,
        { passwordapp }
      )
      .pipe(timeout(8000));
  }
}
```

El interceptor incorporará el token de sesión.

### Actualización automática

Conservar el mecanismo actual de consulta cada segundo, mediante RxJS `timer()` y `exhaustMap()`, para evitar peticiones simultáneas.

No crear suscripciones sin cancelarlas al destruir el componente.

Cuando el servidor deje de responder:

- Mostrar **Sin conexión**.
- Marcar las lecturas como no disponibles.
- No mostrar datos antiguos como si fueran actuales.
- Evitar afirmar que la alarma está apagada.
- Deshabilitar operaciones que requieran confirmación del servidor.

---

## 10. Adaptar las interfaces al JSON real del ESP32

Este es un punto crítico porque el archivo `smart-home.service.ts` todavía espera una estructura anterior.

Actualmente, Angular espera algunos campos como:

```typescript
uno1.alarma
uno1.puerta.angulo_ordenado
uno2.audio.pista_solicitada
```

Sin embargo, el nuevo ESP32 publica:

```json
{
  "tipo": "estado",
  "version": 1,
  "uno1": {
    "online": true,
    "puerta": {
      "estado": 0
    },
    "alarma": {
      "estado": 0
    }
  },
  "uno2": {
    "online": true,
    "audio": {
      "pista": 3
    }
  }
}
```

### Modificaciones necesarias

| Información | Lectura compatible |
|---|---|
| Estado de puerta | `estado.uno1.puerta.estado` |
| Estado de alarma | `estado.uno1.alarma.estado` |
| Última pista de audio | `estado.uno2.audio.pista` |
| Disponibilidad Arduino | `estado.uno1.online` |

Por ejemplo:

```typescript
export interface Uno1 {
  online: boolean;

  puerta?: {
    estado: number;
  };

  alarma?: {
    estado: number;
  };
}

export interface Uno2 {
  online: boolean;

  audio?: {
    pista: number;
  };
}
```

No reemplazar ciegamente todas las interfaces existentes: deben conservarse como opcionales los campos de iluminación, ventilador y otras lecturas que aún utilizan las pantallas anteriores.

### Distancia ultrasónica

El ESP32 envía las distancias mediante eventos MQTT separados.

Por tanto, la pantalla de seguridad deberá obtener `distanciaCm` desde:

```http
GET /api/seguridad/estado
```

No deberá seguir suponiendo que cada respuesta de `/api/smart-home/status` contiene `uno1.distancia`.

### Identificación del Arduino

En la pantalla de conectividad se debe mostrar un único Arduino UNO físico.

Los identificadores `uno1` y `uno2` son alias lógicos del protocolo actual y no representan dos placas físicas independientes.

---

## 11. Actualizar la sección de alarma existente

Dentro de `smart-home-panel.component.html`, la tarjeta actual tiene dos botones:

- Activar.
- Silenciar.

El botón **Silenciar** debe desaparecer como acción directa.

Su funcionalidad será sustituida por el teclado virtual que valida `passwordapp`.

El botón **Activar** tampoco debería utilizarse para el funcionamiento automático ordinario, ya que el backend activa la alarma cuando se cumplen 30 segundos de detección continua.

Si se conserva una operación de prueba manual, debe estar separada del flujo normal y restringida por permisos administrativos.

### Reglas de presentación

| Situación | Interfaz |
|---|---|
| Buzzer apagado | Mostrar estado normal |
| Vigilancia | Mostrar tiempo y distancia |
| Advertencia | Mostrar que se ordenó reproducir `0003.mp3` |
| Buzzer activo | Mostrar teclado virtual de desactivación |
| PIN incorrecto | Mostrar error y mantener estado activo |
| PIN correcto | Esperar confirmación del backend |
| MQTT desconectado | Mostrar error de comunicación |

El frontend nunca debe actualizar `buzzerActivo` a `false` antes de recibir una respuesta autorizada y confirmada.

## 12. Mantener la sección de audio DFPlayer Mini

La sección de audio existente ya tiene controles para:

- Seleccionar pista.
- Cambiar volumen.
- Detener reproducción.

Se puede conservar como herramienta de diagnóstico, siempre que el backend autorice las acciones correspondientes.

### Pistas definidas

| Archivo | Función | Activación |
|---|---|---|
| `0002.mp3` | Bienvenida | Apertura autorizada de puerta |
| `0003.mp3` | Advertencia de propiedad privada | 25 segundos de presencia |

Los mensajes de seguridad deben reproducirse automáticamente por las órdenes del backend.

No enviar desde Angular una reproducción adicional de `0002.mp3` después de una apertura.

Si se conserva la reproducción manual, mostrar claramente que se trata de una función de prueba, y evitar que interrumpa un mensaje de seguridad prioritario.

La pantalla deberá leer `uno2.audio.pista`, no el anterior `pista_solicitada`, para el protocolo actualmente definido.

**Importante:** mostrar la última pista registrada no demuestra que el altavoz esté produciendo sonido en ese instante.

## 13. Mantener iluminación y climatización sin mostrar información ficticia

El frontend actual dispone de controles para cuatro habitaciones y un ventilador con regulador circular.

Estas secciones deben conservar su lógica actual, pero mostrando estados reales.

El firmware ESP32/Arduino de seguridad que definimos no publica todavía las lecturas de las cuatro zonas, temperatura, humedad y ventilador que esperan algunas partes del panel.

Por lo tanto:

- Conservar los componentes y servicios correspondientes.
- Mantenerlos deshabilitados cuando no exista telemetría válida.
- Mostrar `Sin datos` cuando el backend no proporcione una medición.
- No inventar valores de temperatura, velocidad o iluminación.
- No representar el control como aplicado cuando el backend o dispositivo lo rechace.

Si posteriormente se amplía el protocolo para esos dispositivos, Angular podrá reutilizar los controles ya existentes.

---

## 14. Crear historial de eventos de seguridad

Crear: `components/historial-seguridad/`, con sus archivos `.ts`, `.html` y `.css`.

El módulo consultará:

```http
GET /api/seguridad/eventos
```

### Datos a presentar

| Fecha | Evento | Resultado | Detalle |
|---|---|---|---|
| 00:10:00 | Vigilancia | Iniciada | Distancia 12 cm |
| 00:10:25 | Advertencia | Aplicada | Audio 0003 |
| 00:10:30 | Alarma | Activada | Buzzer encendido |
| 00:11:05 | Alarma | Desactivada | Usuario autorizado |

El historial incluirá accesos correctos e incorrectos, activaciones, advertencias, rearmes y errores de comunicación.

### Requisitos funcionales

Incorporar paginación, orden cronológico descendente y, de ser compatible con el backend, filtros por tipo de evento y fecha.

El formato exacto de paginación debe coincidir con el que implemente la API. Si utiliza una respuesta `Page` de Spring Data, Angular deberá procesar `content`, `totalElements`, `number` y `size`.

El historial **no deberá exponer PIN, contraseñas, tokens ni hashes**.

El historial de diagnóstico HTTP que ya existe puede mantenerse por separado.

---

## 15. Actualizar los servicios Angular

La arquitectura de servicios propuesta será:

```text
src/app/
├── components/
│   ├── fan-dial/
│   ├── smart-home-panel/
│   ├── security-keypad/
│   ├── seguridad/
│   ├── usuarios/
│   └── historial-seguridad/
│
├── services/
│   ├── auth.service.ts
│   ├── usuario.service.ts
│   ├── seguridad.service.ts
│   ├── smart-home.service.ts
│   └── dispositivo.service.ts
│
├── models/
│   ├── usuario.model.ts
│   └── seguridad.model.ts
│
├── interceptors/
│   └── auth.interceptor.ts
│
├── config/
│   └── api.config.ts
│
├── app.component.ts
├── app.component.html
├── app.component.css
└── app.module.ts
```

Las responsabilidades deben quedar separadas:

| Servicio | Responsabilidad |
|---|---|
| `AuthService` | Login, sesión y logout |
| `UsuarioService` | CRUD y cambios de contraseñas |
| `SeguridadService` | Estados, buzzer e historial de seguridad |
| `SmartHomeService` | Telemetría y comandos domóticos existentes |
| `DispositivoService` | Registro informativo actual |

El componente no debe construir comandos MQTT ni decidir si una contraseña es correcta.

## 16. Configuración de conexión con el backend

El proyecto contiene `src/app/config/api.config.ts`.

Este archivo ya determina la URL base.

Actualmente, cuando se abre el frontend en `localhost` o `127.0.0.1`, apunta a una API HTTPS específica; cuando se accede desde otro hostname, utiliza `/api`.

También existe `proxy.conf.json`, cuya configuración está orientada a una API local en el puerto 8080.

### Instrucciones

Mantener `API_BASE_URL` como fuente central de las direcciones HTTP.

Todos los servicios nuevos deberán construir sus URLs a partir de esa constante:

```typescript
private readonly apiUrl =
  `${API_BASE_URL}/seguridad`;
```

No escribir direcciones IP del servidor dentro de cada componente.

No configurar el ESP32 desde Angular ni utilizar directamente la IP del broker Mosquitto.

La conectividad debe comprobarse con las rutas HTTP reales. El proxy de Angular no se utilizará automáticamente cuando `API_BASE_URL` apunte a una dirección HTTPS absoluta.

Para las operaciones de autenticación y seguridad debe utilizarse HTTPS, especialmente cuando se transmiten contraseñas.

---

## 17. Manejo centralizado de errores

Crear una estrategia uniforme para presentar resultados.

| Respuesta | Mensaje al usuario |
|---|---|
| HTTP 200 / 201 | Operación completada |
| HTTP 400 | Datos inválidos |
| HTTP 401 | Sesión no válida o expirada |
| HTTP 403 | Operación no autorizada |
| HTTP 404 | Recurso inexistente |
| HTTP 409 | Conflicto u operación pendiente |
| HTTP 429 | Demasiados intentos |
| HTTP 503 | Dispositivo o servidor no disponible |
| `incierto` | No se confirmó la ejecución |
| Timeout | No se recibió respuesta a tiempo |

Se deben diferenciar dos situaciones:

**Solicitud aceptada:** el servidor recibió la petición.

**Acción aplicada:** el dispositivo confirmó que procesó la orden.

La interfaz no debe presentar ambos resultados como equivalentes.

Tampoco debe repetir automáticamente acciones críticas como apertura, apagado de alarma o modificación de cerradura después de un timeout.

## 18. Seguridad del frontend

El frontend deberá aplicar estas medidas:

| Control | Implementación |
|---|---|
| Acceso a funciones | Comprobar sesión autenticada |
| Autorización real | Validación obligatoria en Spring Boot |
| Token | Enviar únicamente a la API propia |
| Contraseñas | Campos enmascarados |
| PIN virtual | Limitar a cuatro caracteres válidos |
| Intentos repetidos | Respetar bloqueos indicados por backend |
| Datos sensibles | No mostrar en historial ni consola |
| Logout | Revocar y limpiar sesión |
| Control de apertura | No ofrecer una ruta directa sin autorización |
| Estado desconectado | No permitir falsas confirmaciones |

La ocultación de botones mediante `*ngIf` o su deshabilitación con `[disabled]` es únicamente una medida de interfaz. No sustituye la autorización del servidor.

---

## 19. Pruebas funcionales que deberá superar Angular

| N.º | Prueba | Resultado esperado |
|---|---|---|
| 1 | Login correcto | Abre el panel y conserva token |
| 2 | Login incorrecto | Muestra error |
| 3 | Cerrar sesión | Revoca sesión y vuelve al login |
| 4 | Token expirado | Solicita autenticación |
| 5 | Consultar usuarios | Muestra registros autorizados |
| 6 | Crear usuario | Envía datos correctos |
| 7 | Actualizar `passwordapp` | No modifica las demás contraseñas |
| 8 | Actualizar `passwordpuerta` | Actualiza únicamente ese campo |
| 9 | Consultar estado normal | Muestra vigilancia disponible |
| 10 | Detección a 12 cm | Muestra presencia |
| 11 | Transcurren 15 s | Muestra presencia confirmada |
| 12 | Transcurren 25 s | Muestra advertencia |
| 13 | Transcurren 30 s | Muestra alarma activa |
| 14 | Introducir PIN virtual inválido | No envía la solicitud |
| 15 | Introducir `passwordapp` incorrecta | Mantiene alarma activa |
| 16 | Introducir `passwordapp` correcta | Espera confirmación de desactivación |
| 17 | Intentar desactivar sin sesión | Operación denegada |
| 18 | Apertura autorizada físicamente | Visualiza el cambio de estado |
| 19 | Cerradura regresa a 0° | Refleja el cierre reportado |
| 20 | MQTT desconectado | Muestra estado sin datos recientes |
| 21 | Backend no responde | Informa error y evita resultados falsos |
| 22 | Consultar historial | Presenta eventos sin contraseñas |
| 23 | Abrir desde teléfono | Teclado virtual adaptable y utilizable |

### Validación final en Windows

Desde PowerShell:

```powershell
cd C:\smart_home\smart_home_front
```

Comprobar compilación:

```powershell
npm run build
```

Iniciar el entorno de desarrollo:

```powershell
npm start
```

Revisar en las herramientas de desarrollo del navegador:

- Que las solicitudes HTTP utilicen la API correcta.
- Que los endpoints protegidos incluyan el token.
- Que las respuestas del servidor se interpreten correctamente.
- Que no existan errores de TypeScript.
- Que no se impriman contraseñas o tokens en consola.

---

## 20. Orden recomendado de implementación

1. **Autenticación:** crear `AuthService`, integrar token de sesión y actualizar login/logout.
2. **Seguridad HTTP:** crear interceptor y controlar expiración de sesiones.
3. **Modelos:** actualizar las interfaces TypeScript para los nuevos JSON.
4. **Usuarios:** implementar el CRUD y los formularios de contraseñas independientes.
5. **Seguridad perimétrica:** crear el servicio y la pantalla con estados de 15, 25 y 30 segundos.
6. **Teclado virtual:** desarrollar la entrada de `passwordapp` y conectarla al endpoint protegido.
7. **Puerta:** eliminar la apertura directa del panel operativo y mostrar su estado real.
8. **Alarma:** sustituir el silenciamiento directo por la operación autenticada.
9. **Audio:** adaptar las lecturas y preservar el control de diagnóstico cuando esté autorizado.
10. **Historial:** mostrar eventos de seguridad obtenidos de PostgreSQL mediante la API.
11. **Compatibilidad:** conservar iluminación, climatización y diagnóstico, corrigiendo los campos incompatibles.
12. **Pruebas:** compilar Angular y validar de extremo a extremo la autenticación y el control de seguridad.

## 21. Resultado esperado

La plataforma Smart Home permitirá iniciar sesión, administrar credenciales autorizadas, consultar el estado de la puerta y observar en tiempo real la vigilancia ultrasónica.

Cuando la presencia alcance **25 segundos**, mostrará la advertencia; al llegar a **30 segundos**, mostrará el buzzer activo y la puerta bloqueada.

El usuario podrá desactivar la alarma mediante el **teclado virtual**, introduciendo `passwordapp` y utilizando una sesión válida. El sistema informará si la operación fue aplicada, rechazada o quedó sin confirmación.

La apertura de la puerta continuará dependiendo del **teclado matricial físico** y de la validación de `passwordpuerta` realizada por Spring Boot.

**Criterio de aceptación:** ningún botón del frontend podrá abrir directamente la puerta ni apagar el buzzer eludiendo las validaciones de seguridad del backend.

Estas instrucciones describen el desarrollo requerido; los nuevos endpoints y componentes todavía deben implementarse y probarse conjuntamente para considerar el sistema funcional.

---

## Referencia de integración (resumen del contrato acordado)

Esta tabla consolida los nombres de los endpoints utilizados en las 21 secciones anteriores; **no sustituye** su explicación detallada.

| Endpoint HTTP | Método | Autorización |
|---|---|---|
| `/api/auth/login` | POST | Credenciales de login |
| `/api/auth/logout` | POST | Token de sesión |
| `/api/usuarios` | GET / POST | Permisos sobre usuarios |
| `/api/usuarios/{id}` | GET / PUT / DELETE | Permisos sobre usuario |
| `/api/usuarios/me` | GET | Sesión autenticada |
| `/api/seguridad/estado` | GET | Según política de seguridad |
| `/api/seguridad/alarma/desactivar` | POST | Sesión + `passwordapp` |
| `/api/seguridad/eventos` | GET | Sesión autorizada |
| `/api/smart-home/status` | GET | Consulta domótica existente |
| `/api/smart-home/commands` | POST | Autorización por tipo de comando |

**Protocolo físico:** teclado matricial del Arduino → ESP32 → MQTT → Spring Boot para la puerta; teclado virtual de Angular → HTTPS → Spring Boot para apagar el buzzer. Angular no envía mensajes MQTT directamente.
