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

Verificada el 1 de noviembre de 2026, después de publicar el commit de aplicación `d66cebca77259b5ef53191a1dbfcb04a16977a15`:

- [GitHub Actions](https://github.com/CarlosPuyana/NextAnime-/actions/runs/41336278708): compilación, lint, tests y publicación completados con éxito.
- [Pages](https://carlospuyana.github.io/NextAnime-/): HTTP 200; los cuatro retratos nuevos devuelven HTTP 200 y sus rutas respetan la base del repositorio.
- [Railway](https://nextanime-server.up.railway.app/api/health): HTTP 200 y versión 2.0.0; MAL configurado. Despliegue `df0a00fd-3d21-4170-920d-a81f0c28d676` en SUCCESS. Se conservan servicio y dominio.
- Consulta real de Anto: username `Antoniioman`, 401 entradas. SadPuyana y Nora también se consultaron mediante el recorrido público.
- Recorrido Playwright sobre Pages, sin mocks: perfil y tema, preferencias, cinco recomendaciones con portadas y links reales, otra ronda sin repeticiones, vuelta a preferencias y recarga. Móvil: las tres pantallas, con la identidad de Nora en preferencias y resultados. Sin desbordamiento horizontal ni errores JavaScript.
- Las capturas finales esperan a que carguen los retratos para evitar registrar un estado intermedio de la red. Se revisaron también las capturas locales de las tres pantallas en móvil.

No quedan bloqueos funcionales o de despliegue. No se ha alterado el recomendador ni el backend. Los tests con fixtures se distinguen expresamente del recorrido real de producción.
