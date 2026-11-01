# Recomendaciones de NextAnime 3.0

El frontend React solicita recomendaciones al backend Express. El backend obtiene listas y candidatos reales de MyAnimeList, aplica filtros y verificaciones, calcula el ranking clásico y, cuando existe una configuración compatible y consentimiento, permite que Gemini seleccione y reordene candidatos. La clave permanece exclusivamente en Railway.

El algoritmo clásico combina valoraciones personales, afinidades por género, similitud de sinopsis, formato, calidad pública y diversidad. Sigue funcionando sin IA y respalda cualquier fallo de Gemini. Gemini participa en la selección de IDs y su orden, no solo en redactar explicaciones; la validación exige IDs permitidos, posiciones coherentes y evidencias literales del contexto. Una salida inválida se descarta completa.

Se preparan hasta 28–40 candidatos verificados. El resumen de gustos usa completados con nota explícita, ejemplos positivos y negativos y afinidades; limita repeticiones de una familia mediante una heurística de títulos. Se envían títulos, sinopsis limitadas, géneros y estadísticas, sin username, IP ni clave en el contexto del modelo.

Modelo preparado: `gemini-3.1-flash-lite`, por su latencia y salida estructurada. **Gemini está desactivado en producción.** No se ha verificado una cuota gratuita para el proyecto privado. Las condiciones de Google exigen servicios de pago para ofrecer clientes a usuarios del EEE; la web mantiene su presupuesto de 0 €. Añadir una clave no levanta este bloqueo.

Los límites predeterminados son 10 llamadas globales y 200.000 tokens reservados al día, 3 llamadas por perfil y cliente, 2 por minuto y una concurrente. El timeout es de 12 segundos, sin reintentos automáticos. SQLite reserva cuota antes de llamar; sin almacenamiento persistente verificado, la llamada se bloquea. El caché de ranking dura 30 minutos y distingue usuario, datos, filtros y ronda. El resumen de gustos dura 5 minutos.

La configuración completa, cachés, fallos, privacidad, límites y pasos para introducir la clave se describen en [gemini.md](gemini.md). Para desactivar se mantiene `GEMINI_ENABLED=false`; activar requiere además cumplir condiciones de región, audiencia, credencial, cuota y persistencia. No se activan servicios de pago desde esta implementación.

La [evaluación reproducible](recommendation-evaluation.md) usa las cuatro listas públicas, separa ejemplos de entrenamiento y evaluación y publica sus limitaciones. La comparación de calidad real Gemini/clásico sigue pendiente: los mocks prueban el mecanismo y sus controles, pero no una mejora narrativa. Consumo real observado de Gemini: **0 llamadas y 0 tokens**. Véase también la [validación y publicación](gemini-validation.md).
