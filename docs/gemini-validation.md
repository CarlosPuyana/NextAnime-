# Validación NextAnime 3.0

La auditoría partió de la versión funcional `922859b2af1ee2e60a26b4e7f6cf3fd789bfcfb8`, conservada en `backup/pre-gemini-3-2026-11-01`. Se mantiene el diseño personalizado, los cuatro perfiles, sus assets, las tres pantallas, filtros, exclusiones y rondas.

## Comprobaciones

- SDK oficial `@google/genai`, únicamente backend. La integración antigua de OpenAI se sustituyó por clasificación Gemini con fallback clásico.
- Lint, comprobación de tipos y build ejecutados. Suite unitaria/integración: 85 pruebas, con 42 casos específicos Gemini y un caso adicional HTTP de disponibilidad/consentimiento.
- E2E: se amplían los 32 anteriores con modo, consentimiento e identificación correcta del fallback en escritorio y móvil. La navegación de pruebas espera DOMContentLoaded para no bloquearse por fuentes externas.
- Recorrido real local: perfiles y recomendaciones clásicas con portadas y links MAL, segunda ronda sin repeticiones, retorno y recarga; móvil con Nora. Ningún dato enviado a Google ni llamada generativa.
- Evaluación offline real de cuatro listas públicas, con resultados en [recommendation-evaluation.md](recommendation-evaluation.md).
- Cuotas SQLite comprobadas tras cerrar y reabrir el archivo; errores de almacenamiento impiden llamadas. No se crean volúmenes de pago.
- El propietario confirmó que revocó la clave antigua. La nueva se introducirá manualmente en Railway; no aparece en fuentes, bundle ni documentación.

## Publicación

El estado y las verificaciones de producción se añadirán tras desplegar. Gemini debe permanecer preparado pero desactivado, y no se considerará validada su calidad real mediante mocks.
