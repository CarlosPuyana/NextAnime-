# QA de personalización de perfiles

## Auditoría

La versión anterior definía los cuatro usernames en un array dentro de `App.tsx`, resolvía los avatares por posición del atlas y reutilizaba su primera imagen para usuarios desconocidos. Las imágenes estaban en `frontend/public/art`, el tema se repartía entre `styles.css` y `anime-theme.css`, y la dirección artística se documentaba en `docs/art-direction.md`.

Se conservan la aplicación, sus tres pantallas, el proveedor MAL, el recomendador, los contratos HTTP, la ruta de Pages y la configuración Railway. Las modificaciones están limitadas al frontend, sus recursos, pruebas y documentación. La instalación local incompleta se restauró con `npm ci` sin cambiar dependencias ni lockfile.

## Verificación local

- Lint: correcto.
- TypeScript frontend y backend: correcto.
- Vitest/Supertest: **42 pruebas superadas**, incluidas las 38 anteriores y cuatro sobre identidad, correspondencias MAL, fallback neutro y existencia de recursos.
- Playwright: **32 pruebas superadas** entre escritorio y móvil. Los cuatro perfiles recorren preferencias y resultados con su tema, conservan el username real y no desbordan horizontalmente. También se cubren el invitado neutro y el estado seleccionado ante error.
- Build de producción: correcto. No se añaden dependencias de ejecución.
- Recorrido real sin mocks: selección y recomendaciones de SadPuyana en escritorio; Nora en móvil. Se capturan los tres pasos en ambos formatos. Dos rondas de escritorio sin títulos repetidos, portadas y enlaces reales, vuelta a preferencias y recarga correcta. Sin errores JavaScript.

Las capturas se revisaron visualmente: tarjetas alineadas, retratos coherentes, usernames legibles, controles táctiles ampliados, resumen lateral temático y diferenciación entre pendientes y descubrimientos. La dirección visual de Nora no altera las afinidades inferidas de su lista.

## Producción

Se registrará la comprobación de Pages y del backend cuando termine la publicación de esta mejora. Los tests con fixtures no se confunden con validación real.
