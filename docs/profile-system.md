# Sistema de perfiles

## Una sola configuración

`frontend/src/config/profiles.ts` define `ProfileIdentity`, los cuatro `PROFILES`, `CUSTOM_PROFILE` y `resolveProfile(username)`. No depende del backend ni de React: puede validarse con Vitest.

| Nombre visible | Username MAL     | Dirección artística                                     |
| -------------- | ---------------- | ------------------------------------------------------- |
| SadPuyana      | `SadPuyana`      | Fantasía, magia y aventura; azul, turquesa y lavanda.   |
| Nora           | `Noraaa_12`      | Misterio botánico, delicadeza; rosa, vino y salvia.     |
| Anto           | `Antoniioman`    | Romance, música y calma; azul suave y lila.             |
| Anita          | `aniitabombii09` | Libertad y aventura marina; rojo, dorado y azul marino. |

El nombre visible nunca se usa como sustituto del username al consultar MAL. La selección llama a la misma API existente con `malUsername`; el encabezado y las tarjetas muestran el nombre y, como referencia secundaria, `@username`. La resolución es insensible a mayúsculas. El último usuario sigue guardándose con su username MAL, por lo que el almacenamiento anterior sigue siendo compatible.

Cada entrada contiene `id`, `displayName`, `malUsername`, `subtitle`, `tagline`, `description`, `inspirations`, `palette`, `accentColor`, `avatarAsset`, `heroAsset`, `decorativeTokens` y `microcopy`.

## Componentes y aplicación del tema

- `components/ProfileCard.tsx`: tarjeta reutilizable con retrato, halo, subtítulo, nombre, username y tagline. Tiene estado seleccionado mediante `aria-pressed`, foco visible y una marca de selección.
- `components/ProfileAvatar.tsx`: retrato del perfil activo o icono neutro para usuarios personalizados. Resuelve los assets con `import.meta.env.BASE_URL` para mantener compatibilidad con `/NextAnime-/`.
- `App.tsx`: obtiene la identidad del username real y aplica variables CSS en la raíz de la aplicación. Conserva el flujo, el estado y las llamadas API existentes.
- `profiles.css`: estilos comunes que consumen tokens de configuración; no contiene selectores de persona ni depende del orden de los perfiles.

Los tokens controlan acento, color secundario, superficie, contraste del CTA, imagen de ambiente y recorte. La marca NextAnime conserva su rosa. Los encabezados, botones, chips seleccionados, afinidades, resumen lateral y explicaciones usan detalles de la identidad activa. El retrato y su ambiente se reutilizan deliberadamente en el avatar y el resumen para evitar una colección arbitraria de imágenes.

`Otro usuario` mantiene una tarjeta neutra, permite introducir cualquier username público válido y no hereda la imagen de un perfil predefinido. Si el username escrito corresponde a uno de los cuatro perfiles conocidos, se recupera su identidad. Para un usuario distinto se muestra su nombre MAL y un icono genérico.

## Qué no cambia

Las inspiraciones son preferencias visuales facilitadas por el propietario, no conclusiones obtenidas de MAL. No se usan para modificar filtros, géneros favoritos, candidatos, pesos, puntuaciones ni explicaciones del motor. Las afinidades que se muestran siguen calculándose con las valoraciones reales. Las portadas de resultados siguen siendo las de MAL.

El contrato API, la caché, CORS, Railway, los workflows y la ruta base de Pages permanecen compatibles. No hay nuevas dependencias de ejecución.

## Cambiar o añadir un perfil

1. Añade un retrato original optimizado a `frontend/public/art/profiles/`.
2. Crea o modifica la entrada en `PROFILES`, con un `id` estable y un `malUsername` real. No cambies IDs para reordenar tarjetas.
3. Ajusta paleta, textos, inspiraciones y recortes. `palette.primary` y `accentColor` deben coincidir; `palette.onAccent` debe contrastar con el botón.
4. Usa rutas relativas a `public`, sin `/NextAnime-/` ni URLs localhost en la configuración. El helper añade la base de Vite.
5. Documenta la dirección artística y el prompt si generas nuevos recursos.
6. Ejecuta lint, typecheck, Vitest, E2E y build. Verifica los tres pasos tanto en móvil como en escritorio y revisa la correspondencia nombre/username.

`tests/profiles.test.ts` protege las correspondencias originales, el fallback neutro, la existencia de assets y los metadatos. Los E2E recorren los tres pasos con las cuatro identidades y comprueban que las consultas usan el username correcto.
