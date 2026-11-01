# NextAnime 3.0 · ranking híbrido con Gemini

## Estado de esta publicación

**Preparado, pero desactivado en producción.** La aplicación clásica funciona sin Google. No hay una clave Gemini configurada ni se han realizado llamadas reales. El propietario confirmó la revocación de la clave antigua. No se activó facturación ni se crearon recursos de pago.

Google exige servicios de pago para ofrecer clientes API a usuarios del EEE, y restringe los clientes dirigidos o probablemente accesibles a menores. El presupuesto cero impide activar esta web española en el nivel gratuito. El consentimiento del visitante no sustituye esos requisitos. [Condiciones oficiales](https://ai.google.dev/gemini-api/terms).

## Modelo y cuota

Modelo preparado: **`gemini-3.1-flash-lite`**, estable, de baja latencia, con salida estructurada. Su ficha publica límites de 1.048.576 tokens de entrada y 65.536 de salida. NextAnime usa límites mucho menores. [Ficha oficial](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite).

La tarifa general incluye tokens gratuitos para ese modelo; no acredita una cuota gratuita aplicable al proyecto `728401362410` ni a este despliegue. Los RPM/TPM/RPD efectivos se consultan en AI Studio, varían por proyecto y se comparten entre claves. No se verificaron cuotas privadas ni facturación del proyecto. [Precios](https://ai.google.dev/gemini-api/docs/pricing), [límites](https://ai.google.dev/gemini-api/docs/rate-limits).

## Dónde introducir manualmente la nueva clave

En Railway, abre **Server NextAnimeJS → production → NextAnime- → Variables → New Variable**. Nombre: **`GEMINI_API_KEY`**. Introduce únicamente el valor de la nueva clave en ese campo y guarda/aplica el cambio.

Nunca la pegues en el chat, README, GitHub, React, `VITE_` o un campo de la web pública. Déjala exclusivamente en las variables privadas del backend. **Mantén `GEMINI_ENABLED=false`**: guardar la clave no activa llamadas ni resuelve los requisitos de región, audiencia y almacenamiento.

## Cómo se decide el ranking

1. El motor clásico analiza todas las notas explícitas de completados y mantiene afinidades, negativos suavizados, similitud de sinopsis, formatos, calidad pública y diversidad.
2. Los filtros de géneros/origen, IDs ya mostrados, estados personales, duplicados y precuelas se comprueban antes de preparar el conjunto. Se verifican hasta 100 candidatos; no se devuelven títulos que fallen esa verificación.
3. Se preseleccionan hasta 28 candidatos para cantidades pequeñas y 40 para pedir 20. Si hay menos disponibles, se utilizan los válidos.
4. El contexto incluye estadísticas, seis afinidades positivas y hasta cuatro negativas, ocho ejemplos bien valorados y tres mal valorados. Solo completados con nota 1–10; un cero no expresa rechazo. Se limita aproximadamente a una entrega por familia de título, usando una heurística documentada de nombre, no un grafo inventado de franquicias.
5. Gemini elige IDs y orden final, por tanto puede cambiar tanto la selección como el ranking. No recibe el username, la IP, imágenes, claves o la lista completa.
6. Zod exige JSON estricto, cantidad exacta disponible, IDs del conjunto, rangos consecutivos y ausencia de duplicados. Cada motivo requiere una cita literal del fragmento de sinopsis enviado y, cuando hay favoritos con sinopsis, una referencia y cita de uno de ellos.
7. El texto libre del modelo no se publica. La explicación visible se construye con motivos narrativos acotados y títulos realmente presentes en las evidencias. No se exponen citas de trama. Esto reduce alucinaciones y spoilers; no prueba objetivamente que la interpretación semántica sea correcta.
8. Una respuesta parcial, malformada, ajena al conjunto o no verificable conserva íntegramente el resultado clásico. También se vuelve a comprobar elegibilidad después del ranking.

## Consumo y persistencia

| Control                       | Valor predeterminado                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Llamadas globales             | 10 por día del Pacífico                                                                                          |
| Llamadas por perfil / cliente | 3 / 3 por día                                                                                                    |
| Llamadas globales por minuto  | 2                                                                                                                |
| Concurrencia                  | 1                                                                                                                |
| Reserva global de tokens      | 200.000 por día                                                                                                  |
| Contexto                      | Sinopsis de 300 caracteres, títulos de 100; máximo conservador de 32.000 tokens de entrada usando bytes y margen |
| Salida                        | 8.192 tokens como máximo                                                                                         |
| Timeout                       | 12 segundos                                                                                                      |
| Reintentos SDK                | Una sola tentativa, sin bucles de reintento                                                                      |

SQLite reserva atómicamente llamadas y presupuesto conservador de tokens **antes** de contactar al proveedor, sin devolver la reserva ante error. Contadores y circuit breaker sobreviven a reaperturas del archivo. Se conservan contadores agregados, nunca historiales ni prompts. Los identificadores de cliente/perfil son HMAC con secreto privado y fecha, sin guardar IP o username en claro. Los contadores caducados se eliminan durante las reservas, con retención máxima lógica de 48 horas.

En producción, el archivo debe quedar dentro de `RAILWAY_VOLUME_MOUNT_PATH`. Sin volumen persistente y secreto de al menos 32 caracteres, Gemini no se habilita. El servicio actual no tiene volumen y no se contrató ninguno. Un archivo efímero no se presenta como garantía entre despliegues. La solución admite la réplica única existente; varias réplicas requieren un almacén atómico compartido. Borrar el archivo, cambiar el secreto o consumir la misma cuota desde otros servicios queda fuera de sus garantías.

Un 429 pausa el circuito una hora; credencial/modelo inválidos, 24 horas; tres fallos ordinarios, diez minutos. Se registra solo una categoría técnica, sin mensajes completos del proveedor, prompts ni claves. Si falla el almacén, se bloquea la llamada y se usa el motor clásico.

## Cachés

- MAL: perfil 5 minutos, catálogo 1 hora, detalles 24 horas, como antes.
- Resumen de gustos: 5 minutos, identificado por hash del contenido real de la lista.
- Ranking Gemini validado: 30 minutos, máximo 100 entradas, solo memoria. La clave combina perfil seudonimizado, versión de datos, filtros, cantidad, origen, contexto/candidatos, modelo, versiones de algoritmo/prompt e IDs mostrados.
- Peticiones idénticas en curso comparten promesa. Una ronda nueva cambia la clave al incluir los títulos mostrados. Otro usuario o filtros distintos no reutilizan el resultado.

La caducidad impide devolver una entrada vencida; su eliminación física de memoria se realiza al consultarla o insertar otras entradas. No se almacenan resultados personales en la base SQLite.

## Configuración y privacidad

`.env.example` enumera todas las variables. Los indicadores `GEMINI_KEY_ROTATED`, `GEMINI_FREE_TIER_VERIFIED` y `GEMINI_ADULT_AUDIENCE_APPROVED` no deben ponerse a true sin las comprobaciones correspondientes. `GEMINI_DEPLOYMENT_REGION=other` solo describe un despliegue genuinamente distinto y compatible; no debe utilizarse para eludir condiciones de usuarios del EEE. Esta implementación no habilita servicios de pago.

El frontend parte del modo clásico. Consulta `/api/capabilities`, informa del análisis externo y, cuando es aplicable, exige consentimiento explícito y confirmación de mayoría de edad. No guarda ese consentimiento en localStorage; se reinicia al cambiar de perfil. El servidor valida su versión. Cambiar chips o modos no llama a Gemini. Los resultados muestran el motor realmente utilizado.

La política de Google sobre los datos depende del territorio y modalidad. El aviso enlaza sus condiciones; no promete ausencia de almacenamiento o entrenamiento por parte del proveedor. [Tratamiento de datos](https://ai.google.dev/gemini-api/terms).

## Pruebas y evaluación

Los mocks verifican que Gemini puede cambiar la selección y orden, respeta filtros, rechaza salida inválida y cae al clásico con límites, errores y timeout. La prueba SQLite cierra y vuelve a abrir el archivo para comprobar persistencia. Los E2E cubren modo, consentimiento, indicador real y fallback.

`node --env-file=.env --import tsx scripts/evaluate.ts --live` evalúa offline el algoritmo clásico con las cuatro listas públicas, sin compartirlas con Google. [Resultados y límites](recommendation-evaluation.md). No existe una comparación real de calidad Gemini/clásico hasta disponer de configuración compatible y una evaluación autorizada; no se simula ese resultado.
