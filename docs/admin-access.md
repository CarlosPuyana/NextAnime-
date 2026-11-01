# NextAnime 3.1 · acceso privado

**Actualización 3.2:** el login se mantiene; el proveedor principal pasa a [Groq](groq.md), con Gemini desactivado. Este documento conserva el historial de las pruebas Gemini de 3.1.

El botón **Iniciar sesión** abre el acceso de la única cuenta de administrador. Las variables privadas son `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` y `ADMIN_SESSION_SECRET`. La herramienta local `scripts/setup-admin.ts` permite elegir una contraseña de 12–128 caracteres y envía únicamente su hash PBKDF2-SHA256, con sal aleatoria y 600.000 iteraciones, a Railway. La contraseña no se guarda en archivos ni registros. No hay registro de usuarios ni recuperación de contraseña.

La sesión dura cuatro horas. El token firmado se envía mediante `Authorization: Bearer`, se conserva en memoria/sessionStorage de la pestaña y no depende de cookies entre dominios. El backend verifica firma, caducidad y sesión vigente antes de consultar MAL y nuevamente antes de invocar el ranker Gemini. Cerrar sesión revoca el token; un reinicio también termina las sesiones. El servicio existente tiene una réplica. El login limita cinco intentos por IP y veinte globales cada quince minutos; estos límites en memoria se reinician con el proceso. No se registran cuerpos ni cabeceras de autenticación.

Gemini solo admite `SadPuyana`, `Noraaa_12`, `Antoniioman` y `aniitabombii09`. Las peticiones directas sin sesión reciben 401 y otro username autenticado recibe 403. «Otro usuario» y visitantes conservan el modo clásico. Cambiar el frontend no concede permisos. Se mantienen consentimiento, validación y fallback.

## Pruebas personales autorizadas

El propietario confirmó el uso exclusivamente individual y que lo consultó con Google. `GEMINI_PERSONAL_TEST_MODE=true` habilita ese escenario; no constituye una certificación de las condiciones del proveedor. Se conserva `GEMINI_DEPLOYMENT_REGION=EEA`, el interruptor `GEMINI_ENABLED` y las verificaciones de administrador/perfil/consentimiento. No se marcan como verificados los indicadores preventivos del despliegue público ni se altera la ubicación. Google sigue aplicando sus restricciones y cuotas reales.

La clave existente continúa en Railway, sin introducirla en archivos versionados o en React. Modelo confirmado mediante el catálogo oficial: `gemini-3.1-flash-lite`. No hay un volumen existente ni se contrató ninguno: en modo personal se reutilizan las mismas reservas atómicas y circuit breaker con SQLite `:memory:`. **Los contadores y circuitos se reinician con el proceso.** No garantizan límites entre reinicios, despliegues o varias réplicas. Una base realmente persistente sigue teniendo prioridad cuando está configurada.

Límites preparados en Railway: seis llamadas por día del Pacífico, perfil y cliente; una concurrente; timeout de 12 segundos; caché 30 minutos; sin reintentos automáticos; presupuesto conservador de 250.000 tokens reservados al día. Las respuestas 400/401/403/404/429/5xx y los resultados no válidos usan fallback clásico. El diagnóstico expone únicamente código y estado HTTP del proveedor, nunca texto bruto ni claves.

Para probar: inicia sesión, selecciona **SadPuyana**, elige **Gemini experimental**, confirma el consentimiento y solicita recomendaciones. El despliegue reinicia las sesiones: es necesario volver a entrar. Las recomendaciones clásicas siguen disponibles sin login.

## Validación dirigida

Lint, tipos y build correctos; 103 pruebas unitarias/integración. Se conserva la suite de navegador de escritorio y móvil. Se añaden casos de activación personal EEA, seis llamadas con cuota en memoria, reinicio explícito de contadores y esquema de generación simplificado con validación local estricta.

Se hicieron dos llamadas reales, la segunda autorizada expresamente tras fallar la primera con `400 INVALID_ARGUMENT`. Se simplificó únicamente el esquema enviado para evitar la complejidad de límites anidados, conservando toda la validación Zod. La segunda respondió y pasó validación: **5.997 tokens de entrada, 908 de salida, 3.429 ms**; orden final: Fullmetal Alchemist: Brotherhood (5114), Berserk (33), Steins;Gate (9253). Se verificó que todos los IDs pertenecían a los candidatos. [Restricciones oficiales de los esquemas](https://ai.google.dev/gemini-api/docs/structured-output).

La prueba real usó una instancia local aislada de la misma API, una sesión autenticada temporal y variables privadas inyectadas desde Railway, sin cambiar la contraseña de producción. También verificó 401 sin sesión y 403 para otro perfil. El primer fallo conservó tres resultados clásicos y Google no devolvió consumo; no se presenta como cero tokens medidos. Este ensayo demuestra funcionamiento real del ranking, no una mejora comparativa de calidad. No se activó facturación ni se crearon servicios de pago.
