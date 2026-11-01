# Evaluación de recomendaciones · 3.0

## Diseño

Se ocultan hasta ocho completados con nota ≥8 y ocho con nota ≤5, intentando una entrega por familia de título. Se eliminan del perfil de aprendizaje y se presentan como candidatos sin nota personal. El ranking solo ve sus metadatos y la media pública. Se comparan las posiciones de positivos y negativos y se calcula nDCG@10 con relevancia derivada de las notas ocultadas.

El script reproducible es `scripts/evaluate.ts`; el informe agregado queda en `.local/recommendation-evaluation.json`, sin guardar historiales completos. La diversidad es la distancia media de Jaccard entre los géneros de los candidatos ordenados. Su valor sobre todo el holdout no mide por sí solo diversidad en las primeras posiciones.

## Resultados reales del motor clásico

Datos de listas públicas, 1 de noviembre de 2026. Un solo corte por perfil; cifras no equivalen a porcentajes de compatibilidad.

| Perfil    | Notas de completados | Ocultados + / − | Acierto de pares | nDCG@10 | Diversidad | CPU del ranking |
| --------- | -------------------: | --------------: | ---------------: | ------: | ---------: | --------------: |
| SadPuyana |                  337 |           8 / 8 |            0,906 |   0,923 |      0,834 |        57,19 ms |
| Nora      |                  141 |           8 / 8 |            0,625 |   0,745 |      0,910 |        21,13 ms |
| Anto      |                  295 |           8 / 8 |            0,922 |   0,934 |      0,849 |        28,20 ms |
| Anita     |                  107 |           8 / 3 |            1,000 |   1,000 |      0,891 |         9,55 ms |

Todos los IDs pertenecían al holdout y ninguno seguía en el perfil de entrenamiento. Las latencias excluyen red, descarga MAL y verificación de detalles. No es un benchmark de producción.

## Comparación con Gemini

**Pendiente de evaluación real:** cero llamadas reales, cero tokens reales y cero gasto observado en Gemini. El proyecto no dispone de configuración gratuita aplicable a esta web española. No hay latencia, tasa de fallback del proveedor ni métrica de calidad real que atribuirle.

En pruebas deterministas con respuestas simuladas, el segundo motor cambia IDs elegidos y orden, y valida restricciones, cantidades, evidencias y motivos. Los errores de proveedor, cuota, modelo, timeout y respuesta disparan fallback. Esto verifica la arquitectura y su seguridad, **no demuestra una mejora de recomendación**. No se usa la opinión de otro modelo como juez.

Una evaluación futura debería repetir varios cortes temporales, medir nDCG/pares/diversidad@K de ambos motores con la misma preselección, registrar tokens reales incluyendo razonamiento, latencia extremo a extremo, llamadas, caché y tasa de fallback, y revisar explicaciones y spoilers manualmente con criterios documentados.

## Límites

La muestra es pequeña y sesgada hacia extremos de puntuación; Anita solo tiene tres negativos elegibles en esta selección. El agrupamiento por título es heurístico. La media pública puede correlacionar con la nota personal y facilitar el experimento. Las relaciones faltantes de MAL limitan la evaluación de precuelas. No se extrapola esta prueba a todos los usuarios ni se afirma que Gemini la haya superado.
