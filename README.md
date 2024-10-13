# NextAnime!

NextAnime! es una aplicación que te ayuda a elegir qué anime ver a continuación a partir de tu lista de "Plan to Watch" de MyAnimeList, utilizando un sorteo aleatorio. La aplicación también muestra brackets de eliminatoria con los animes seleccionados para hacer la elección más divertida.

## Características

- Conexión con la API de MyAnimeList.
- Visualización de los animes pendientes por ver junto con sus portadas.
- Sorteo aleatorio entre los animes de la lista.
- Brackets de eliminatoria de 32 animes para decidir cuál ver.

## Requisitos

- Node.js (v14.0 o superior)
- Una cuenta de MyAnimeList.
- Claves de la API de MyAnimeList (Client ID y Client Secret).
- Servidor proxy para evitar el error CORS.

## Instalación

1. Clona este repositorio en tu máquina local:
    git clone https://github.com/tuusuario/NextAnime.git
    cd NextAnime
2. Instala las dependencias necesarias
    npm install
3. Asegúrate de tener las claves de la API de MyAnimeList en tu proyecto (Client ID y Client Secret).
4. Inicia el servidor proxy para evitar el error CORS:
    node server.js
5. Abre el archivo index.html en tu navegador para comenzar a usar la aplicación.

## Uso
1. Introduce el nombre de usuario de MyAnimeList en el campo correspondiente.
2. Haz clic en el botón fetchListButton para obtener tu lista de animes pendientes por ver.
3. Presiona el botón SORTEAR para iniciar el sorteo y elegir entre 32 animes de manera aleatoria.
4. Después de 7 segundos, se mostrarán los brackets de eliminatoria con los animes seleccionados.

## Tecnologías Utilizadas
- HTML, CSS y JavaScript para la interfaz.
- Node.js para el servidor proxy.
- MyAnimeList API para acceder a los datos de los animes.

## Nota
El servidor proxy es necesario para evitar problemas de CORS al hacer solicitudes a la API de MyAnimeList. Asegúrate de tenerlo corriendo antes de usar la aplicación.

## Contribución
Si deseas contribuir, puedes crear un pull request con tus mejoras o sugerencias. ¡Las contribuciones son bienvenidas!

## Licencia
Este proyecto está licenciado bajo la MIT License - mira el archivo LICENSE para más detalles.