# Validación NextAnime 3.0

La auditoría partió de la versión funcional `922859b2af1ee2e60a26b4e7f6cf3fd789bfcfb8`, conservada en `backup/pre-gemini-3-2026-11-01`. Se mantiene el diseño personalizado, los cuatro perfiles, sus assets, las tres pantallas, filtros, exclusiones y rondas.

## Comprobaciones

- SDK oficial `@google/genai`, únicamente backend. La integración antigua de OpenAI se sustituyó por clasificación Gemini con fallback clásico.
- Lint, comprobación de tipos y build ejecutados. Suite unitaria/integración: 85 pruebas, con 42 casos específicos Gemini y un caso adicional HTTP de disponibilidad/consentimiento.
- E2E: 38 pruebas aprobadas, localmente y en GitHub Actions. Se amplían los 32 anteriores con modo, consentimiento e identificación correcta del fallback en escritorio y móvil. La navegación de pruebas espera DOMContentLoaded para no bloquearse por fuentes externas.
- Recorrido real local: perfiles y recomendaciones clásicas con portadas y links MAL, segunda ronda sin repeticiones, retorno y recarga; móvil con Nora. Ningún dato enviado a Google ni llamada generativa.
- Evaluación offline real de cuatro listas públicas, con resultados en [recommendation-evaluation.md](recommendation-evaluation.md).
- Cuotas SQLite comprobadas tras cerrar y reabrir el archivo; errores de almacenamiento impiden llamadas. No se crean volúmenes de pago.
- El propietario confirmó que revocó la clave antigua. La nueva se introducirá manualmente en Railway; no aparece en fuentes, bundle ni documentación.

## Publicación

Versión implementada: [`dc3356e`](https://github.com/CarlosPuyana/NextAnime-/commit/dc3356ecda14b8636d67942cf6f4bf657fe30b2e). [GitHub Actions](https://github.com/CarlosPuyana/NextAnime-/actions/runs/41345696143): compilación, lint, 85 pruebas unitarias/integración, 38 E2E y despliegue completados correctamente.

- [GitHub Pages](https://carlospuyana.github.io/NextAnime-/): bundle nuevo confirmado y recorrido real Playwright completado con datos MAL, cinco recomendaciones con portadas cargadas, enlaces válidos, segunda ronda sin repeticiones, recarga y móvil sin desbordamiento. Sin errores de página. Se guardaron las seis capturas en `.local/gemini-production/`.
- [Railway](https://nextanime-server.up.railway.app/api/health): despliegue `830e9835-bf45-4b6f-9171-7f1600420a81` correcto; salud versión `3.0.0`, MAL configurado y Gemini no disponible por `region_policy`.
- Petición real solicitando Gemini con consentimiento: cinco resultados clásicos, `engine=classic`, `engineInfo.requested=gemini`, `fallbackReason=region_policy` y aviso explícito. No contactó con Google.
- Variables privadas preparadas: modelo, región EEE y límites conservadores; `GEMINI_ENABLED=false`. No se añadió ninguna clave ni recurso de pago.

Gemini permanece **preparado y desactivado**. Pendientes: introducir una clave nueva manualmente cuando el propietario lo decida, cumplir las condiciones de disponibilidad y persistencia antes de cualquier activación y evaluar calidad real Gemini/clásico. Añadir la clave por sí solo no permite activar esta web con presupuesto cero. Consumo real de Gemini en esta entrega: **0 llamadas y 0 tokens**.
