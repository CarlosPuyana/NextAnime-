document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos HTML
    const inputUsername = document.getElementById('username');
    const fetchListButton = document.getElementById('fetchListButton');
    const animeImage = document.getElementById('animeImage');
    const sortButton = document.getElementById('sortButton');
    let username = '';
    let animeList = [];
    let randomAnimes = [];

    // Agregar un event listener para el botón de obtener la lista de animes
    fetchListButton.addEventListener('click', () => {
        username = inputUsername.value || 'sadpuyana';
        if (username) {
            fetchPlanToWatchList(username);
        }
    });

    // Función para obtener la lista de animes desde el servidor proxy
    async function fetchPlanToWatchList(username) {
        try {
            const response = await fetch(`http://localhost:3000/getPlanToWatch/${username}`);
            if (!response.ok) {
                throw new Error(`Error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            animeList = data.data;
            showAnimeCover();
        } catch (error) {
            console.error('Error fetching the Plan to Watch list:', error);
        }
    }

    // Mostrar la portada del primer anime y habilitar el botón de SORTEAR
    function showAnimeCover() {
        if (animeList.length > 0) {
            animeImage.src = animeList[0].node.main_picture.medium;
            animeImage.style.display = 'block'; // Mostrar la imagen
            sortButton.style.display = 'block'; // Mostrar el botón de SORTEAR
            randomAnimes = []; // Limpiar la lista de animes aleatorios
        } else {
            console.log('No hay animes en Plan to Watch.');
        }
    }

    // Lógica del botón de SORTEAR para seleccionar 32 animes únicos
    sortButton.addEventListener('click', () => {
        if (animeList.length >= 32) {
            // Seleccionar 32 animes únicos aleatoriamente
            randomAnimes = [];
            firstLoad = true;
            let selectedIndices = new Set();

            // Seleccionar 32 índices únicos
            while (selectedIndices.size < 32) {
                const randomIndex = Math.floor(Math.random() * animeList.length);
                selectedIndices.add(randomIndex);
            }

            // Obtener los animes usando los índices seleccionados
            selectedIndices.forEach(index => {
                randomAnimes.push(animeList[index].node);
            });

            // Mostrar los primeros brackets en pantalla
            displayBrackets(randomAnimes);


        } else {
            console.log('No hay suficientes animes en Plan to Watch para hacer un torneo.');
        }
    });

    function botonVS() {
        const VS = document.createElement('div');
        VS.style.display = 'flex';
        VS.style.alignItems = 'center';
        VS.style.flexDirection = 'column';
        VS.style.position = 'absolute';
        VS.style.top = '0'
        VS.style.cursor = 'pointer'; // Cambia el cursor al pasar sobre el div

        const buttonVS = document.createElement('button');

        // Crear la imagen
        const imgVS = document.createElement('img');
        imgVS.src = './VS.jfif';
        imgVS.alt = 'VS'; // Texto alternativo en caso de que la imagen no se cargue
        imgVS.style.width = '40px'; // Puedes ajustar el tamaño de la imagen si lo deseas
        imgVS.style.height = '40px';

        // Añadir la imagen dentro del botón
        buttonVS.appendChild(imgVS);

        buttonVS.addEventListener('click', llamadaVS);

        // const vsTitle = document.createElement('span');
        VS.appendChild(buttonVS);
        document.body.appendChild(VS);
    }

    // Función llamadaVS
    function llamadaVS() {
        console.log('¡El botón VS fue presionado!'); // Aquí puedes agregar la lógica que necesites

        const winnersAnime = [];

        console.log('$', randomAnimes);

        // Peleas animes
        for (let a = 0; a <= randomAnimes.length - 1; a += 2) {

            const numRandom = Math.floor(Math.random() * 2);
            const winnerAnime = randomAnimes[a + numRandom];

            winnersAnime.push(winnerAnime);
        }

        randomAnimes = winnersAnime;
        firstLoad = false;
        console.log(winnersAnime);
        //displaySecondBrackets(winnersAnime);
        displayBrackets(winnersAnime);

    }

    // Función para mostrar los brackets de 32 animes
    function displayBrackets(winnersAnime) {
        // Limpiar la pantalla
        document.body.innerHTML = ''; // Limpiar todo el contenido del body

        // Crear contenedor principal para los brackets
        const bracketsContainer = document.createElement('div');
        bracketsContainer.id = 'bracketsContainer'
        bracketsContainer.style.display = 'flex';
        bracketsContainer.style.justifyContent = 'space-between';
        // bracketsContainer.style.margin = '40px';
        bracketsContainer.style.width = '100vw';
        bracketsContainer.style.height = '100vh';

        if (winnersAnime.length > 1) {
            // Crear contenedor de cada lado
            const leftBracket = document.createElement('div');
            leftBracket.id = 'leftBracket';
            leftBracket.style.flex = '1';
            leftBracket.style.display = 'flex';
            leftBracket.style.flexDirection = 'column';
            leftBracket.style.alignItems = 'flex-start';
            leftBracket.style.marginLeft = '40px';

            const rightBracket = document.createElement('div');
            rightBracket.id = 'rightBracket';
            rightBracket.style.flex = '1';
            rightBracket.style.display = 'flex';
            rightBracket.style.flexDirection = 'column';
            rightBracket.style.alignItems = 'flex-end';
            rightBracket.style.marginRight = '40px';

            // Agregar los animes a cada lado
            for (let i = 0; i < winnersAnime.length / 2; i++) {
                const animeLeft = createAnimeBracketElement(randomAnimes[i]);
                const animeRight = createAnimeBracketElement(randomAnimes[i + winnersAnime.length / 2]);
                leftBracket.appendChild(animeLeft);
                rightBracket.appendChild(animeRight);
            }

            // Añadir los contenedores al contenedor principal
            bracketsContainer.appendChild(leftBracket);
            bracketsContainer.appendChild(rightBracket);

            botonVS();
        } else {
            /* randomAnimes[0].final = true; */
            const animeFinal = createAnimeBracketElement(randomAnimes[0]);
            bracketsContainer.appendChild(animeFinal);
            bracketsContainer.style.alignItems = 'center';
            bracketsContainer.style.justifyContent = 'center';
        }

        // Agregar el contenedor principal al cuerpo del documento
        document.body.appendChild(bracketsContainer);
    }

    // Función para crear un elemento visual para cada anime en el bracket
    function createAnimeBracketElement(anime) {
        const animeElement = document.createElement('div');
        animeElement.style.display = 'flex';
        animeElement.style.alignItems = 'center';
        animeElement.style.margin = '10px';
        animeElement.style.padding = '10px';
        animeElement.style.border = '1px solid #ddd';
        animeElement.style.borderRadius = '10px';
        animeElement.style.backgroundColor = '#fff';
        animeElement.style.width = '150px';
        animeElement.style.height = '20px';
        animeElement.style.boxShadow = '0px 4px 15px rgba(0, 0, 0, 0.2)';

        const animeImage = document.createElement('img');
        animeImage.src = anime.main_picture.medium;
        animeImage.alt = anime.title;
        animeImage.style.width = '40px';
        animeImage.style.height = '40px';
        animeImage.style.borderRadius = '50%';
        animeImage.style.marginRight = '10px';

        const animeTitle = document.createElement('span');
        const titulo = anime.title;
        animeTitle.textContent = titulo.substring(titulo, 35);
        animeTitle.style.fontSize = '14px';

        /* if (anime.final === true) {
            animeElement.style.alignContent = 'center';
            animeElement.style.alignContent = 'center';
            animeElement.style.justifyContent = 'center';
        } */

        animeElement.appendChild(animeImage);
        animeElement.appendChild(animeTitle);
        return animeElement;
    }
});
