# Arte original NextAnime

## Personalización de perfiles · noviembre de 2026

Se mantiene la identidad global oscura de NextAnime y la ilustración de entrada. La nueva familia de cuatro retratos se genera con ImageGen integrado a partir de un mismo brief de estilo: tinta limpia, ojos expresivos, cel shading cinematográfico, fondo pictórico discreto, textura suave y encuadre consistente. Pillow convierte los originales a WebP, con un máximo de 896 px y calidad 87; los PNG originales se conservan fuera del bundle. No se copian ilustraciones, pósters ni key visuals oficiales.

| Perfil    | Inspiración aportada                         | Traducción a un diseño original                                                                             | Asset                         |
| --------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------- |
| SadPuyana | Mushoku Tensei / Roxy Migurdia               | Maga viajera, trenza azul, capucha bordada, cristal y valle fantástico; turquesa y lavanda.                 | `art/profiles/sadpuyana.webp` |
| Nora      | Maomao / Nezuko                              | Boticaria de jardín nocturno, vial medicinal, peinado asimétrico y hojas; vino, rosa y salvia.              | `art/profiles/nora.webp`      |
| Anto      | The Quintessential Quintuplets / Nakano Miku | Joven de mirada tranquila, auriculares azules, punto crema y biblioteca luminosa; azul y lila.              | `art/profiles/anto.webp`      |
| Anita     | Luffy / One Piece                            | Aventurera marina original, sombrero tejido con cinta azul, chaqueta roja y brújula; rojo, dorado y marino. | `art/profiles/anita.webp`     |

La selección muestra la misma estructura para todos, con paleta y textos propios. En preferencias y resultados el acento es sutil y la marca permanece rosa. No se presentan las inspiraciones como datos inferidos del historial. La configuración y el proceso para añadir perfiles se describen en [profile-system.md](profile-system.md).

Los prompts completos de estos retratos se conservan en [profile-art-prompts.md](profile-art-prompts.md). Los recursos anteriores se conservan para recuperar la versión previa; el antiguo atlas ya no controla los perfiles activos.

## Recursos de la primera versión

Recursos generados con la herramienta integrada ImageGen, sin API key ni CLI de pago. Se mantienen las imágenes originales y se convierten a WebP para la web. No representan a los usuarios reales ni a personajes de franquicias existentes. Las portadas de resultados siguen siendo las de MyAnimeList.

- `frontend/public/art/nextanime-world.webp`: escena para la entrada y pequeños acentos de ambiente en preferencias y resultados.
- `frontend/public/art/nextanime-avatars.webp`: atlas de cuatro retratos, mostrado mediante cuadrantes CSS, también usado para el perfil activo.

## Prompt de escena

Use case: illustration-story. Create an original high-end Japanese anime key visual for a dark anime discovery web app named NextAnime. This is artwork, not a website mockup. Wide panoramic cinematic composition, about 3:2 landscape. On the RIGHT HALF, two original young adult anime adventurers in 3/4 portrait from waist up: a black-haired male with windswept angular hair wearing a dark urban jacket, and a silver-lilac-haired female with expressive violet eyes wearing a modern dark coat with pink accents, both looking toward a glowing distant city. LEFT HALF: atmospheric negative space with a quiet night sky, faint cherry blossom petals, magenta crescent moon, a torii gate silhouette and distant futuristic Japanese city rooftops. Detailed confident ink linework, expressive anime eyes, cel shading, painterly background, subtle film grain. Dramatic rim lighting in rose red, violet and muted teal. Elegant, mature, cinematic anime art direction, absolutely not flat corporate cartoon avatars, not chibi. Overall dark charcoal plum palette #101014 with pink light #f45c7c. Keep the left third dark and uncluttered for live HTML text overlay. No text, no letters, no logos, no watermarks. All characters and world original; do not depict any existing franchise character.

## Prompt de avatares

Use case: illustration-story. Asset type: four original anime profile avatar portraits packed into one square 2x2 atlas for NextAnime. Create a square image divided into exactly FOUR equal square quadrants, no borders or gutters, each containing one centered shoulders-up portrait of a different ORIGINAL young adult anime character with face fully contained inside its quadrant. TOP LEFT: charismatic male with messy black spiky hair and dark red jacket, burgundy-red background. TOP RIGHT: female with long lilac hair, big sharp expressive violet eyes, dark stylish collar, muted violet background. BOTTOM LEFT: male with short tousled silver hair, teal eyes and dark teal urban jacket, muted teal background. BOTTOM RIGHT: female with chestnut brown hair and amber eyes, warm rust-orange jacket, ochre background. High quality Japanese anime character design, detailed ink outlines, beautiful expressive anime eyes with highlights, confident delicate nose and mouth, cel shading with subtle gradients, atmospheric colored rim light, a touch of manga energy. Mature attractive anime art, not chibi, not corporate geometric vector cartoon, not 3D. Composition must ensure each of the four faces is exactly centered within its own equal square quadrant so the image can be displayed as four CSS background crops. No text, no logos, no watermark. Characters entirely original and not identifiable as any existing franchise.
