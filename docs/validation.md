# Validación

La validación de la mejora posterior de identidades visuales se registra en [profile-validation.md](profile-validation.md): 42 pruebas unitarias/integración y 32 E2E. Este documento conserva el registro del despliegue inicial.

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

## Producción verificada

El 1 de noviembre de 2026 se publicó el commit de aplicación `33a432b44a67b6473e0f2777d0c7c8cfc63a0443` en el repositorio original. Main local y remoto coincidían.

- [GitHub Actions](https://github.com/CarlosPuyana/NextAnime-/actions/runs/41330951889): finalizado con éxito; incluyó instalación limpia, lint, pruebas, build, Playwright y publicación Pages.
- [Frontend](https://carlospuyana.github.io/NextAnime-/): HTTP 200, recursos correctos bajo `/NextAnime-/` y arte original cargado.
- [API](https://nextanime-server.up.railway.app/api/health): HTTP 200, versión 2.0.0, MAL configurado, IA generativa desactivada.
- Railway: despliegue `8a2209cb-1d16-4f4e-92fb-6631a6567b4d` en estado SUCCESS. Se reutilizaron proyecto, servicio y dominio. La infraestructura moderna quedó aplicada con cero cambios pendientes; las variables privadas se conservaron.
- CORS confirmó `Access-Control-Allow-Origin: https://carlospuyana.github.io`.
- El recorrido de navegador sobre la URL pública, sin mocks, recuperó cinco propuestas, comprobó sus cinco portadas y links MAL, obtuvo otra ronda sin repeticiones, regresó a preferencias y recargó correctamente. La vista móvil no desbordó horizontalmente y no hubo errores JavaScript.
- SadPuyana en producción: 501 títulos, 337 notas de completados; catálogo de 78 categorías. Resultados de ambos orígenes, con relaciones verificadas.
- Auditoría final completa y de producción: cero vulnerabilidades.

Las capturas de `docs/screenshots` corresponden a esta web pública. Los commits posteriores exclusivamente de documentación no cambian el bundle ni el servidor ya verificados.
