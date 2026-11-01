# Fuentes y límites

- [API oficial MAL v2](https://myanimelist.net/apiconfig/references/api/v2): listas, notas personales, géneros, sinopsis, imágenes, nota media, formato, duración, episodios, fechas y relaciones.
- [Catálogo MAL](https://myanimelist.net/anime.php): 78 géneros, temáticas y demografías verificados el 1 de noviembre de 2026. Independiente de las listas personales.
- Rankings oficiales `all`, `bypopularity` y `anime/season/{year}/{season}`: candidatos externos reales con MAL ID.
- [Jikan](https://docs.api.jikan.moe/): evaluado, pero no respondió desde el entorno de desarrollo. No es una dependencia necesaria y no se le atribuyen los datos obtenidos de MAL.
- [Responses y salida estructurada](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses): integración generativa opcional, sin llamadas reales al no haber credenciales configuradas.

Los datos ausentes se conservan como null. La nota personal es distinta de la nota media. Las portadas pertenecen al catálogo real; las ilustraciones de marca son originales y no se usan como portadas de resultados. Títulos y sinopsis conservan el idioma proporcionado por MAL.

Las listas se consultan en modo lectura. No se recogen contraseñas ni tokens OAuth de usuarios.
