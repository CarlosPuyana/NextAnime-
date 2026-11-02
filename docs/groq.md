# NextAnime 3.2 · Groq

Proveedor principal: GroqCloud, API oficial compatible `https://api.groq.com/openai/v1`, mediante `fetch` nativo de Node. Modelo: `openai/gpt-oss-20b`, salida JSON Schema `strict: true`, razonamiento bajo y máximo 1.280 tokens de salida. No necesita una suscripción ni una clave de OpenAI. [Contrato de endpoints de Railway](api.md).

## Comprobación real desde Railway

Antes de modificar el motor se desplegó un sondeo mínimo en el contenedor existente: modelo disponible, HTTP 200, JSON correcto, 160 ms, 113 tokens de entrada y 39 de salida. Las cabeceras reales indicaron 1.000 solicitudes diarias y 8.000 tokens/minuto, coincidentes con los límites Free publicados para este modelo. No se activó facturación ni se añadió un medio de pago. El nombre del plan privado no se expone en esas cabeceras; no se presenta esa observación como una auditoría de facturación de la cuenta. [Límites oficiales](https://console.groq.com/docs/rate-limits), [salidas estrictas](https://console.groq.com/docs/structured-outputs).

Después se ejecutó una recomendación dentro de Railway, compartiendo la instancia del motor de producción y usando una sesión temporal en un servidor de prueba accesible solo por loopback. Se preservó la contraseña real. SadPuyana, ambos orígenes, todos los géneros, cantidad 3: motor `groq`, validación correcta, sin fallback, 632 ms, 2.101 tokens de entrada y 187 de salida. Orden: Fullmetal Alchemist (121), Berserk (33), Fullmetal Alchemist: Brotherhood (5114). También se comprobaron 401 sin sesión y 403 para otro perfil. No fue una prueba local con la red del ordenador.

## Reutilización y límites

Se conserva el motor clásico, el login, el filtrado y las precuelas. Un adaptador pequeño permite reutilizar caché, validación de elegibilidad, cuotas y fallback del motor híbrido; Gemini continúa disponible en código pero desactivado. Las variables Gemini no condicionan la disponibilidad de Groq.

Contexto: hasta 12 candidatos (se reduce hasta 10 cuando el presupuesto lo requiere), cinco favoritos, dos negativos y sinopsis de hasta 240 caracteres, recortadas más si es necesario. El presupuesto se estima de forma conservadora y se adapta al TPM observado; los tokens reales se toman de la respuesta. No se envían username, IP, imágenes ni listas completas. Cada candidato incluye IDs de favoritos comparables por géneros compartidos, excluyendo coincidencias basadas únicamente en demografía o premios. Si existe esa compatibilidad, el modelo debe elegir uno o dos IDs y explicar una conexión narrativa apoyada en las sinopsis. El servidor valida los IDs, añade nombres y notas reales y construye «Como te gustó/gustaron…, este podría gustarte también por…». Sin favoritos comparables no se inventan referencias. Se comprueban cantidad, rangos, duplicados, filtros, spoilers evidentes y explicaciones repetidas. La interpretación narrativa sigue siendo generativa, no una verificación semántica formal. La versión del contexto pasa a `groq-personal-comparisons-3` para invalidar las explicaciones anteriores en caché.

Máximo seis intentos diarios por proceso, una llamada concurrente, caché 30 minutos y reserva atómica de tokens en una ventana móvil de 60 segundos. Los contadores en memoria se reinician con el proceso. Se distinguen timeout local de 45 segundos, HTTP 504, cuota 429, credenciales, modelo y JSON inválido. Un 429 respeta Retry-After; los fallos transitorios no inhabilitan permanentemente la integración. No hay reintentos automáticos ni cambio a un plan de pago.

Variables privadas: `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_ENABLED`, `GROQ_TIMEOUT_MS`, `GROQ_TPM_LIMIT=8000`. Login y secreto de sesión no cambian. Los indicadores operativos `GROQ_CONNECTIVITY_CHECK` y `GROQ_RECOMMENDATION_CHECK` solo se activaron para las comprobaciones; permanecen desactivados en operación normal para no repetir consumo al arrancar.

Uso: recarga la web, inicia sesión, elige SadPuyana, selecciona **IA experimental — Groq**, confirma el consentimiento y solicita tres propuestas. Si se usa Groq aparece **Recomendado con IA · Groq**; cualquier fallback queda identificado como **Recomendación clásica**.
