# Validación

## Automatizada local

- 38 pruebas Vitest/Supertest: notas, afinidades, paginación de más de 1000 entradas, filtros, exclusiones, fuentes, cantidades, precuelas, CORS y errores de proveedor.
- 28 pruebas Playwright: escritorio y móvil, perfiles, usuario personalizado, errores, navegación, fuentes, cantidades 3/5/10/20, estados vacíos, teclado, almacenamiento y rondas sin repeticiones.
- Lint, TypeScript y compilación de producción ejecutados correctamente.
- Auditoría de dependencias de producción: cero vulnerabilidades. Herramientas de desarrollo revisadas por separado.

## Conectividad real local

Verificado el 1 de noviembre de 2026, sin mocks. Los recuentos pueden cambiar:

| Perfil         | Entradas | Notas de completados |
| -------------- | -------: | -------------------: |
| SadPuyana      |      501 |                  337 |
| Noraaa_12      |      285 |                  141 |
| Antoniioman    |      401 |                  295 |
| aniitabombii09 |      170 |                  107 |

Un usuario inexistente devolvió 404. El backend antiguo devolvía 100 pendientes y siguiente página, confirmando el truncamiento.

El recorrido real recuperó cinco propuestas con links y portadas MAL válidos, otra ronda sin repeticiones, retorno a preferencias, recarga y vista móvil sin desbordamiento horizontal. No hubo errores JavaScript de navegador. Las capturas se generan con ese recorrido; los datos ficticios permanecen exclusivamente en tests.

## Producción

Pendiente de registrar tras los despliegues. Un build local o tests con mocks no acreditan producción.
