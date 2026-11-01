# NextAnime 3.1 · acceso privado

El botón **Iniciar sesión** abre el acceso de la única cuenta de administrador. Las variables privadas son `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` y `ADMIN_SESSION_SECRET`. La herramienta local `scripts/setup-admin.ts` permite elegir una contraseña de 12–128 caracteres y envía únicamente su hash PBKDF2-SHA256, con sal aleatoria y 600.000 iteraciones, a Railway. La contraseña no se guarda en archivos ni registros. No hay registro de usuarios ni recuperación de contraseña.

La sesión dura cuatro horas. El token firmado se envía mediante `Authorization: Bearer`, se conserva en memoria/sessionStorage de la pestaña y no depende de cookies entre dominios. El backend verifica firma, caducidad y sesión vigente antes de consultar MAL y nuevamente antes de invocar el ranker Gemini. Cerrar sesión revoca el token; un reinicio también termina las sesiones. El servicio existente tiene una réplica. El login limita cinco intentos por IP y veinte globales cada quince minutos; estos límites en memoria se reinician con el proceso. No se registran cuerpos ni cabeceras de autenticación.

Gemini solo admite `SadPuyana`, `Noraaa_12`, `Antoniioman` y `aniitabombii09`. Las peticiones directas sin sesión reciben 401 y otro username autenticado recibe 403. «Otro usuario» y visitantes conservan el modo clásico. Cambiar el frontend no concede permisos. La selección experimental conserva el consentimiento y los indicadores/fallback de 3.0. Se reutilizan todos sus controles, con un máximo adicional de tres llamadas diarias y una concurrente.

## Activación pendiente

Se revisaron brevemente las [condiciones oficiales de Google](https://ai.google.dev/gemini-api/terms) el 1 de noviembre de 2026: el requisito regional de servicios de pago para clientes disponibles a usuarios del EEE no contiene una excepción expresa para un cliente alojado de uso individual autenticado. Esto no presupone que el proyecto sea comercial; no se ha podido confirmar que este despliegue privado quede exento. Se mantiene `GEMINI_DEPLOYMENT_REGION=EEA` y `GEMINI_ENABLED=false`; no se declara otra ubicación ni se activan facturación o servicios de pago. Una confirmación aplicable de Google permitiría revisar el bloqueo con ese alcance concreto.

La clave `GEMINI_API_KEY` ya está presente en Railway; su valor no se mostró ni se utilizó. El modelo sigue siendo `gemini-3.1-flash-lite`. Los indicadores de cuota gratuita y audiencia siguen sin verificarse. El servicio no tiene un volumen persistente ni otro almacén duradero disponible; no se contrató ninguno. Aunque se resolviera el requisito de uso, el control persistente de cuota debe quedar operativo antes de habilitar llamadas. No se sustituye por almacenamiento efímero. No se hicieron llamadas reales a Gemini ni se afirma que su calidad esté validada.

Cuando exista una configuración compatible, inicia sesión, selecciona **SadPuyana**, elige **Gemini experimental**, confirma el consentimiento y solicita recomendaciones. Mientras exista un bloqueo, la opción permanece desactivada con su motivo real. Las recomendaciones clásicas siguen disponibles sin login.

## Validación dirigida

Lint, tipos y build correctos. Pasaron 99 pruebas unitarias/integración y 10 pruebas de navegador dirigidas en escritorio y móvil: credenciales correctas e incorrectas, caducidad, manipulación de token, revocación al cerrar sesión, restauración de sesión, restricciones de perfil, acceso directo sin autenticación, limitación de intentos y fallback. Las pruebas no consumen llamadas Gemini. El flujo de publicación mantiene además la suite completa existente.
