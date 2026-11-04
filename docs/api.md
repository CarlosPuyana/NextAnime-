# API del backend de NextAnime en Railway

Base de producción: **`https://nextanime-server.up.railway.app/api`**.

La API recibe y devuelve JSON. Para enviar cuerpos usa `Content-Type: application/json`. Las respuestas de ejemplo muestran la estructura; IDs, notas, fechas y métricas son ilustrativos. La API no modifica listas MAL.

## Endpoints disponibles

| Método | Ruta relativa a `/api`      | Para qué sirve                                                                    | Autenticación                               |
| ------ | --------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------- |
| GET    | `/health`                   | Salud del proceso y configuración disponible de MAL/IA.                           | Pública                                     |
| GET    | `/capabilities`             | Disponibilidad del proveedor y versión del consentimiento. No consume IA.         | Pública                                     |
| GET    | `/genres`                   | Catálogo de géneros con IDs válidos para los filtros.                             | Pública                                     |
| POST   | `/anime/ratings`            | Resolver nombres de anime y devolver su ID, título oficial y nota pública de MAL. | Pública                                     |
| GET    | `/profiles/:username`       | Lista pública MAL del usuario y análisis de sus valoraciones.                     | Pública                                     |
| GET    | `/getPlanToWatch/:username` | Lista completa de pendientes, en formato MAL compatible con clientes anteriores.  | Pública                                     |
| POST   | `/admin/login`              | Verificar credenciales y crear una sesión de administrador.                       | Credenciales en el cuerpo                   |
| GET    | `/admin/session`            | Comprobar si el token presentado sigue vigente.                                   | Token opcional                              |
| POST   | `/admin/logout`             | Revocar la sesión correspondiente al token presentado.                            | Token para revocar esa sesión               |
| POST   | `/recommendations`          | Recomendaciones clásicas o selección/ordenación con Groq.                         | Pública para clásico; administrador para IA |

La ruta de pendientes también mantiene su URL histórica **fuera de `/api`**: `https://nextanime-server.up.railway.app/getPlanToWatch/:username`.

### GET `/getPlanToWatch/:username` (compatibilidad)

Ejemplo: [pendientes de SadPuyana](https://nextanime-server.up.railway.app/getPlanToWatch/SadPuyana). También admite `/api/getPlanToWatch/SadPuyana`. No requiere sesión ni utiliza IA. `username` admite 2–16 letras ASCII, números, `_` y `-`.

Devuelve **todos** los animes públicos con estado `plan_to_watch`, recuperando internamente todas las páginas de MAL, sin limitarse a los primeros 100 y eliminando IDs repetidos. Conserva el formato anterior para que `data.data.map(item => item.node.title)` siga funcionando:

```json
{
  "data": [
    {
      "node": {
        "id": 5114,
        "title": "Fullmetal Alchemist: Brotherhood",
        "main_picture": {
          "medium": "https://cdn.myanimelist.net/images/anime/1208/94745.jpg"
        }
      },
      "list_status": { "status": "plan_to_watch", "score": 0 }
    }
  ],
  "paging": {}
}
```

Las entradas conservan los campos devueltos por MAL; `main_picture` puede faltar. `list_status` añade el estado personal y otros campos disponibles. `paging` está vacío porque la respuesta ya agrega todas las páginas. Una lista vacía devuelve `{"data":[],"paging":{}}`. No se devuelven resultados parciales si falla una página.

Mejoras: validación de usuario, caché interna de cinco minutos, consultas simultáneas del mismo usuario compartidas, timeout/reintentos limitados del proveedor y límite de 30 peticiones/minuto por IP, compartido con `/api`. Respuesta `Cache-Control: no-store`. Errores JSON `{"error":"..."}`: **400** usuario inválido, **403** lista privada/no permitida, **404** usuario inexistente, **502** datos o paginación incompletos, **503** fuente no disponible o credencial MAL ausente, **429** límite HTTP.

Para clientes externos, **solo estas dos rutas públicas de pendientes** permiten además orígenes localhost/127.0.0.1/IPv6 loopback con cualquier puerto y origen `null`, utilizado al abrir un `index.html` mediante `file://`. El origen `null` también puede representar otros documentos de origen opaco; esta excepción se limita a lectura pública sin credenciales y no abre login, recomendaciones ni otras rutas privadas. Los demás endpoints conservan su política CORS habitual.

## Sesión y llamadas privadas

La clave `GROQ_API_KEY` pertenece exclusivamente al backend: **no es el token que envía el cliente**. El cliente utiliza el token opaco devuelto por `/admin/login`:

```http
Authorization: Bearer <TOKEN_DEVUELTO_POR_LOGIN>
```

No se utilizan cookies de terceros ni OAuth. La sesión dura cuatro horas; `expiresAt` es un timestamp Unix en **milisegundos**. Cerrar sesión revoca ese token, no los de otros dispositivos. Un reinicio o despliegue del proceso invalida las sesiones existentes. El frontend guarda el token en memoria y, si está disponible, en `sessionStorage` de la pestaña.

### POST `/admin/login`

Cuerpo:

```json
{
  "username": "SadPuyana",
  "password": "<tu contraseña de administrador>"
}
```

`username`: 1–64 caracteres; `password`: 1–256. Son las credenciales de la única cuenta administradora, no las de MyAnimeList.

Respuesta **200**:

```json
{
  "token": "<token opaco firmado>",
  "expiresAt": 1793635200000
}
```

Credenciales incorrectas: **401**, `{"error":"Usuario o contraseña incorrectos."}`. Configuración privada incompleta: **503**. Tras cinco intentos por IP o veinte globales en quince minutos: **429**. Estos límites están en memoria y se reinician con el proceso. Respuesta `Cache-Control: no-store`.

### GET `/admin/session`

Sin cuerpo. Envía el token en `Authorization` si existe. Respuesta **200**, incluso cuando no existe sesión o está caducada:

```json
{
  "authenticated": true,
  "configured": true,
  "expiresAt": 1793635200000
}
```

Sin sesión válida: `authenticated=false`, `expiresAt=null`. `configured` indica si el backend tiene la configuración administradora completa. No devuelve credenciales ni tokens. Respuesta `no-store`.

### POST `/admin/logout`

Envía `Authorization: Bearer ...`; puede enviarse cuerpo `{}`. Respuesta idempotente **200**:

```json
{ "ok": true }
```

Sin token válido también devuelve `ok=true`, pero no revoca ninguna otra sesión. Respuesta `no-store`.

## Salud y disponibilidad

### GET `/health`

Sin parámetros ni cuerpo. Comprueba que el proceso responde y expone indicadores de configuración; **no hace una llamada de prueba a Groq**.

Respuesta **200**:

```json
{
  "status": "ok",
  "version": "3.2.0",
  "malConfigured": true,
  "aiConfigured": true,
  "ai": {
    "provider": "groq",
    "available": true,
    "reason": "ready",
    "message": "Pruebas privadas: tres recomendaciones, máximo seis solicitudes diarias por proceso y una concurrente. Los contadores en memoria se reinician con el proceso.",
    "model": "openai/gpt-oss-20b"
  },
  "gemini": {
    "available": false,
    "reason": "disabled",
    "message": "Gemini está desactivado. Puedes utilizar la recomendación clásica.",
    "model": "gemini-3.1-flash-lite"
  }
}
```

`aiConfigured/available` no garantizan cuota disponible ni autorizan al visitante. El endpoint de recomendaciones verifica la sesión y las cuotas al solicitar IA. `/health` queda fuera del limitador HTTP general.

### GET `/capabilities`

Sin parámetros ni cuerpo. Respuesta **200**, `no-store`:

```json
{
  "ai": {
    "provider": "groq",
    "available": true,
    "reason": "ready",
    "message": "Pruebas privadas: tres recomendaciones, máximo seis solicitudes diarias por proceso y una concurrente. Los contadores en memoria se reinician con el proceso.",
    "model": "openai/gpt-oss-20b"
  },
  "gemini": {
    "available": false,
    "reason": "disabled",
    "message": "Gemini está desactivado. Puedes utilizar la recomendación clásica.",
    "model": "gemini-3.1-flash-lite"
  },
  "consentVersion": "2026-11-01"
}
```

El cliente utiliza `ai`; `gemini` conserva compatibilidad. Usa el valor devuelto de `consentVersion`: es una versión del consentimiento, no la fecha del día. `available=true` sigue requiriendo un administrador autenticado y un perfil autorizado. La disponibilidad puede ser `disabled`, `credential` o `quota` según la configuración.

## Datos de MyAnimeList

### GET `/genres`

Sin parámetros ni cuerpo. Respuesta **200**: un array de objetos `Genre`. Ejemplo abreviado:

```json
[
  { "id": 1, "name": "Action" },
  { "id": 2, "name": "Adventure" },
  { "id": 8, "name": "Drama" }
]
```

Los IDs se envían en `preferences.genres`. Los nombres de origen están en inglés; la interfaz aplica las etiquetas españolas. No se requiere token.

### POST `/anime/ratings`

Recibe una lista de **nombres**, busca en la API oficial de MyAnimeList y devuelve su ID, nombre canónico y nota media pública. No necesita login, no utiliza IA y **la aplicación no llama a esta ruta**: está disponible para clientes externos o llamadas manuales.

```http
POST https://nextanime-server.up.railway.app/api/anime/ratings
Content-Type: application/json
```

```json
{
  "names": ["Naruto", "Death Note", "Fullmetal Alchemist: Brotherhood"]
}
```

Respuesta **200**, array en el mismo orden que la entrada:

```json
[
  { "id": 20, "name": "Naruto", "score": 8.03 },
  { "id": 1535, "name": "Death Note", "score": 8.62 },
  { "id": 5114, "name": "Fullmetal Alchemist: Brotherhood", "score": 9.1 }
]
```

Las notas del ejemplo son ilustrativas: se devuelve el valor de MAL cuando se consulta y puede cambiar. Campos:

| Campo   | Tipo            | Significado                                                                                                                                                                                                                         |
| ------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`    | entero          | Identificador oficial de MyAnimeList.                                                                                                                                                                                               |
| `name`  | string          | Título canónico de MAL; puede estar en japonés romanizado aunque se busque por el título inglés.                                                                                                                                    |
| `score` | número o `null` | Media pública de MAL (`mean`), en escala 0–10. `null` significa que aún no hay una nota publicada; nunca se inventa un cero. No es la nota personal `score` que aparece dentro de `Anime` en las rutas de perfiles/recomendaciones. |

Se comparan el título canónico y los títulos alternativos ingleses, japoneses y sinónimos devueltos por MAL, ignorando mayúsculas, tildes, espacios y puntuación. Se prioriza una coincidencia exacta. Si no existe, se acepta una única coincidencia de búsqueda; varias coincidencias no se resuelven escogiendo arbitrariamente la primera temporada.

Para nombres desconocidos o ambiguos se mantiene una entrada en su posición con `id=null`, `score=null` y un `error`. Un mismo lote puede contener éxitos y estos resultados sin resolver. Ejemplo de errores, con candidatos abreviados:

```json
[
  {
    "id": null,
    "name": "Nombre inexistente",
    "score": null,
    "error": "not_found"
  },
  {
    "id": null,
    "name": "Frieren",
    "score": null,
    "error": "ambiguous",
    "candidates": [
      { "id": 52991, "name": "Sousou no Frieren", "score": 9.24 },
      { "id": 59978, "name": "Sousou no Frieren 2nd Season", "score": 8.83 }
    ]
  }
]
```

`not_found`: MAL no devolvió resultados. `ambiguous`: hay varias coincidencias posibles; `candidates` contiene hasta diez opciones con `id`, `name` y `score`. Se puede reenviar el nombre canónico completo de la opción deseada. Un ID real con `score=null` y sin `error` significa título encontrado pero aún sin nota.

Condiciones de entrada y operación:

- Cuerpo exacto `{"names":[...]}`; hasta **20 nombres**, de **3 a 120 caracteres** cada uno, sin caracteres de control. Se eliminan espacios en los extremos. MAL rechaza búsquedas de menos de tres caracteres: para títulos cortos utiliza un título alternativo más largo.
- `{"names":[]}` devuelve `[]` sin consultar MAL. Las repeticiones de la entrada se conservan en la salida, reutilizando la búsqueda.
- Caché interna de búsquedas/notas de hasta **una hora**; consultas equivalentes simultáneas comparten una petición. No utiliza las cuotas de Groq ni de Gemini.
- Hasta dos lotes activos; se conserva el ritmo de consultas MAL existente y el limitador general de 30 peticiones/minuto por IP.
- Parámetros inválidos: **400**. Fuente MAL incompleta: **502**. Fuente no disponible, credencial del servidor ausente o búsqueda ocupada: **503**. Un error de la fuente interrumpe el lote con el error HTTP; no se presenta como un título inexistente. Los errores de búsqueda `not_found/ambiguous`, en cambio, forman parte de una respuesta **200**.
- Respuesta `Cache-Control: no-store`; esta cabecera no elimina la caché interna del servidor.

La clave MAL configurada en Railway nunca se envía al cliente. No se requiere ni se admite una clave del proveedor en el cuerpo de esta llamada.

### GET `/profiles/:username`

Ejemplo: `/profiles/SadPuyana`. `username` admite 2–16 letras ASCII, números, `_` o `-`; debe codificarse como segmento URL.

Respuesta **200**, `no-store`: un `Profile` con `analysis`. Ejemplo abreviado a una entrada:

```json
{
  "username": "SadPuyana",
  "anime": [
    {
      "id": 28851,
      "title": "Koe no Katachi",
      "picture": "https://cdn.myanimelist.net/images/anime/1122/96435l.jpg",
      "synopsis": "Fragmento de ejemplo de la sinopsis de origen.",
      "genres": [{ "id": 8, "name": "Drama" }],
      "episodes": 1,
      "year": 2016,
      "mean": 8.9,
      "format": "movie",
      "duration": 7800,
      "status": "completed",
      "score": 10,
      "prequels": [],
      "relationsKnown": true
    }
  ],
  "fetchedAt": "2026-11-02T00:00:00.000Z",
  "analysis": {
    "rated": 337,
    "confidence": "high",
    "favorites": [
      {
        "genre": { "id": 8, "name": "Drama" },
        "mean": 7.4,
        "samples": 98,
        "affinity": 0.4
      }
    ]
  }
}
```

La respuesta real contiene la lista pública completa recuperada, no solo los favoritos. `analysis.rated` cuenta los completados con nota explícita; no es la longitud del array. `analysis.favorites` contiene **afinidades por género**, no IDs de animes favoritos. `confidence` puede ser `low`, `medium` o `high`.

Campos de `Anime`: `id`, `title`, `picture`, `synopsis`, `genres`, `episodes`, `year`, `mean`, `format`, `duration`, `score`, `prequels`, `relationsKnown` y, cuando existe en la lista, `status`. Los metadatos ausentes pueden ser `null`; `duration` está en segundos. `score` es la nota personal explícita 1–10 o `null`, no la media pública `mean`. `status` puede ser `completed`, `watching`, `on_hold`, `dropped` o `plan_to_watch`.

Errores habituales: **400** nombre inválido, **403** lista privada/no permitida, **404** usuario ausente, **502/503** respuesta incompleta o problema de la fuente/configuración MAL.

## Recomendaciones

### POST `/recommendations`

Modo clásico, sin autenticación:

```json
{
  "username": "SadPuyana",
  "preferences": {
    "genres": [],
    "source": "both",
    "count": 3
  },
  "seen": [],
  "mode": "classic"
}
```

Modo Groq: envía el token de administrador y el consentimiento:

```http
POST /api/recommendations
Content-Type: application/json
Authorization: Bearer <TOKEN_DEVUELTO_POR_LOGIN>
```

```json
{
  "username": "SadPuyana",
  "preferences": {
    "genres": [],
    "source": "both",
    "count": 3
  },
  "seen": [],
  "mode": "groq",
  "consent": {
    "externalProcessing": true,
    "adult": true,
    "version": "2026-11-01"
  }
}
```

| Campo                | Significado y valores                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `username`           | Usuario MAL, con las mismas reglas que `/profiles/:username`.                                                      |
| `preferences.genres` | Array de hasta 100 IDs enteros positivos. `[]` permite todos; varios IDs se combinan con OR.                       |
| `preferences.source` | `pending`: pendientes; `discover`: fuera de la lista; `both`: ambos.                                               |
| `preferences.count`  | `3`, `5`, `10` o `20`. La primera versión Groq utiliza `3`; otra cantidad conserva el clásico con motivo `count`.  |
| `seen`               | IDs ya mostrados para excluirlos en otra ronda; hasta 10.000. Opcional, por defecto `[]`.                          |
| `mode`               | `classic` por defecto, `groq` para IA; `gemini` se conserva como compatibilidad, actualmente desactivado.          |
| `consent`            | Opcional en el esquema. Para llamar a IA requiere los dos booleanos `true` y la versión exacta de `/capabilities`. |

Groq solo admite los nombres exactos `SadPuyana`, `Noraaa_12`, `Antoniioman` y `aniitabombii09`. Una solicitud IA válida sin sesión devuelve **401** antes de consultar MAL; otro username con sesión devuelve **403**. El modo clásico no requiere login para ningún usuario MAL válido.

Respuesta **200**, `no-store`, tipo `Results`. Ejemplo **abreviado a un elemento** para mostrar sus campos; normalmente se devuelven tres en Groq si hay suficientes candidatos elegibles:

```json
{
  "items": [
    {
      "anime": {
        "id": 5114,
        "title": "Fullmetal Alchemist: Brotherhood",
        "picture": "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg",
        "synopsis": "Sinopsis proporcionada por MyAnimeList.",
        "genres": [{ "id": 8, "name": "Drama" }],
        "episodes": 64,
        "year": 2009,
        "mean": 9.1,
        "format": "tv",
        "duration": 1440,
        "score": null,
        "prequels": [],
        "relationsKnown": true
      },
      "origin": "discover",
      "explanation": "Como te gustó Koe no Katachi (10/10), este anime podría gustarte también por el coste emocional de las decisiones de sus protagonistas. Su premisa parte de un experimento fallido y sus consecuencias personales.",
      "rankingScore": 0.74,
      "reasons": []
    }
  ],
  "available": 12,
  "warnings": [],
  "analysis": { "rated": 337, "confidence": "high", "favorites": [] },
  "explanationMode": "generative",
  "engine": "groq",
  "engineInfo": {
    "requested": "groq",
    "used": "groq",
    "model": "openai/gpt-oss-20b",
    "cacheHit": false,
    "latencyMs": 900,
    "inputTokens": 2300,
    "outputTokens": 500
  }
}
```

El ejemplo de explicación es ilustrativo. Los nombres y notas comparados se construyen a partir de favoritos positivos reales; la relación narrativa es una interpretación del modelo. Si no existen favoritos comparables, se permite una propuesta exploratoria sin atribuir gustos inexistentes.

### Interpretar la respuesta

| Campo                           | Qué representa                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`                         | Propuestas en su **orden final**. No hay un campo `rank` público: la posición en el array es el ranking.                                          |
| `items[].anime`                 | Objeto `Anime` descrito arriba; los descubrimientos normalmente no tienen `status` personal.                                                      |
| `origin`                        | `pending` o `discover`.                                                                                                                           |
| `explanation`                   | Motivo visible, con comparaciones personales cuando existen datos compatibles.                                                                    |
| `rankingScore`                  | Puntuación del algoritmo clásico antes de la ordenación IA. **No es una probabilidad** ni una puntuación generada por Groq.                       |
| `reasons`                       | Campo opcional de compatibilidad; puede ser `[]` con Groq.                                                                                        |
| `available`                     | Candidatos elegibles en el conjunto verificado de esa petición, no el tamaño del catálogo completo.                                               |
| `warnings`                      | Avisos de resultados insuficientes, omisiones, problemas de catálogo o fallback.                                                                  |
| `analysis`                      | Análisis de valoraciones/afinidades, como en el perfil.                                                                                           |
| `engine`                        | Motor realmente utilizado: `classic`, `groq` o el modo legado `gemini`.                                                                           |
| `explanationMode`               | `deterministic` en clásico o `generative` cuando se utilizó IA.                                                                                   |
| `engineInfo.requested / used`   | Motor pedido y motor usado: pueden diferir por fallback.                                                                                          |
| `model`                         | Modelo de la respuesta IA validada; puede no aparecer en fallback/clásico.                                                                        |
| `cacheHit`                      | Resultado IA validado reutilizado desde caché; no implica una llamada nueva.                                                                      |
| `latencyMs`                     | Tiempo del motor, incluyendo generación/validación cuando procede. Excluye la recuperación MAL previa de la ruta HTTP.                            |
| `inputTokens / outputTokens`    | Consumo comunicado por el proveedor. Son cero al reutilizar caché; pueden estar ausentes ante un rechazo sin métricas. Ausente no significa cero. |
| `fallbackReason`                | Motivo técnico opcional de haber utilizado el clásico.                                                                                            |
| `providerStatus / providerCode` | Diagnóstico opcional del proveedor; nunca incluye claves ni errores brutos.                                                                       |

Para otra ronda acumula `items[].anime.id` en `seen`. El servidor mantiene filtros, estados personales, IDs ya mostrados y restricciones de precuelas. Si no hay suficientes opciones verificadas devuelve menos títulos con un aviso, sin rellenar con datos inventados.

### Fallback no es un error HTTP de NextAnime

Un fallo de Groq normalmente devuelve **200 con resultados clásicos**, no un 504/429 HTTP de NextAnime:

```json
{
  "engine": "classic",
  "explanationMode": "deterministic",
  "engineInfo": {
    "requested": "groq",
    "used": "classic",
    "cacheHit": false,
    "latencyMs": 1500,
    "fallbackReason": "provider_timeout",
    "providerStatus": 504
  }
}
```

Este fragmento omite `items`, `available`, `warnings` y `analysis`, que también aparecen. El cliente debe revisar **`engine`**, no asumir que HTTP 200 significa IA. Motivos principales: `consent`, `count`, `credential`, `disabled`, `quota`, `busy`, `circuit`, `timeout` (local), `provider_timeout` (504 del proveedor), `network`, `model`, `invalid_response`, `provider`, `context` o `storage`.

Omitir `consent` en una petición IA autenticada conserva el clásico con motivo `consent`. Enviar booleanos falsos o una versión de consentimiento incorrecta viola el esquema y devuelve **400**.

## Límites y errores comunes

- Cuerpo JSON máximo: **128 KiB**.
- Limitador HTTP: **30 peticiones por minuto por IP**, salvo `/health`; también se aplica a rutas de login/datos.
- Recomendador: hasta cuatro solicitudes HTTP activas; si está ocupado devuelve **503**. Groq permite una sola generación concurrente y hasta seis intentos diarios por proceso, con cuotas adicionales por perfil, cliente y tokens.
- Caché IA interna: 30 minutos; perfil MAL: cinco minutos; catálogo: una hora; detalles MAL: 24 horas. Las respuestas `no-store` no desactivan esas cachés internas.
- Timeout de Groq: 45 segundos. El cliente debe permitir además tiempo para obtener/verificar los datos MAL; el frontend usa un máximo total de 180 segundos.
- Los contadores y las sesiones en memoria se reinician con el proceso. Google/Groq aplican además sus cuotas externas; ningún endpoint activa facturación o cambia de plan.

Los errores HTTP tienen forma `{"error":"Mensaje comprensible"}`. Estados principales:

| Estado    | Situaciones                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| 400       | JSON o parámetros inválidos; nombre MAL inválido; consentimiento enviado con valores/versiones incorrectos. |
| 401       | Credenciales incorrectas o petición IA sin sesión válida.                                                   |
| 403       | Origen CORS no permitido, perfil IA fuera de la lista o recurso MAL privado/no permitido.                   |
| 404       | Ruta inexistente o usuario/recurso MAL no encontrado.                                                       |
| 413       | Cuerpo demasiado grande.                                                                                    |
| 429       | Limitador HTTP o de login. Un 429 del proveedor puede aparecer dentro de un fallback HTTP 200.              |
| 502 / 503 | Fuente MAL incompleta/no disponible, configuración incompleta o recomendador ocupado.                       |
| 500       | Error interno no expuesto al cliente.                                                                       |

Orígenes web permitidos por defecto: `https://carlospuyana.github.io`, `http://127.0.0.1:5173` y `http://localhost:5173`. Se pueden configurar mediante `CORS_ORIGINS`. El navegador utiliza preflight para `Authorization`; CORS no sustituye la autenticación. Clientes sin cabecera `Origin` también pasan el control CORS y siguen sujetos a los permisos de cada endpoint.

No hay endpoints públicos para invocar directamente al proveedor, administrar claves, registrar usuarios o consultar estadísticas de cuotas. Las comprobaciones operativas de Railway descritas en [groq.md](groq.md) no son rutas HTTP públicas.
