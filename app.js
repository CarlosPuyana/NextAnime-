document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos HTML
    const inputUsername = document.getElementById('username');
    const fetchListButton = document.getElementById('fetchListButton');
    const animeImage = document.getElementById('animeImage');
    const sortButton = document.getElementById('sortButton');
    hideSort();
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
            const response = await fetch(`https://nextanime-server.up.railway.app/getPlanToWatch/${username}`); // fetch(`http://localhost:3000/getPlanToWatch/${username}`);
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

    function hideSort() {
        sortButton.style.display = 'none';
    }

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
        console.log('¡El botón VS fue presionado!');

        const winnersAnime = [];

        console.log('$', randomAnimes);

        if (randomAnimes.length > 8) {
            // Peleas animes
            for (let a = 0; a <= randomAnimes.length - 1; a += 2) {

                const numRandom = Math.floor(Math.random() * 2);
                const winnerAnime = randomAnimes[a + numRandom];

                winnersAnime.push(winnerAnime);
            }

            randomAnimes = winnersAnime;
            firstLoad = false;
            console.log(winnersAnime);
            // displayFightAnimation(winnersAnime);
            displayBrackets(winnersAnime);
            // <<-->> //
        } else {
            fightAnimes(randomAnimes);
        }
    }

    let currentFightIndex = 0;
    let animeWin = [];

    function fightAnimes(animes) {
    
        // Mostrar la primera pelea
        const ganador1Pelea = siguienteFight(animes);
        animeWin.push(ganador1Pelea.ganador);
        // animes = animes.filter((anime) => anime.id !== ganador1Pelea.ganador.id && anime.id !== ganador1Pelea.perdedor.id );
    
        // Añadir el evento al botón
        const buttonFight = document.getElementById('buttonFight');
        buttonFight.addEventListener('click', () => {
            console.log('¡El botón PELEA fue presionado!');
    
            // Continuar si hay más peleas disponibles
            if (currentFightIndex < animes.length - 1) {
                const animResults = siguienteFight(animes); // Ejecutar la función cuando se haga clic
                animeWin.push(animResults.ganador); // Guardar el ganador
                console.log('Ganadores actuales:', animeWin);
                const animRestantes = animes.filter((anime) => anime.id !== animResults.ganador.id && anime.id !== animResults.perdedor.id );
                funcSiguientePelea(animes);
            } else {
                console.log('Todas las peleas han terminado');
                buttonFight.removeEventListener('click', siguienteFight); // Desactivar el botón


                displayBrackets(animeWin);
            }
        });
    }

    function funcSiguientePelea(animesRestantes) {
        // Añadir el evento al botón
        const buttonFight = document.getElementById('buttonFight');
        buttonFight.addEventListener('click', () => {
            console.log('¡El botón PELEA fue presionado!');
    
            // Continuar si hay más peleas disponibles
            if (currentFightIndex < animesRestantes.length) {
                const animResults = siguienteFight(animesRestantes); // Ejecutar la función cuando se haga clic
                if (animResults === null) {
                    randomAnimes = randomAnimes.filter(anime =>
                        animeWin.some(removeItem => removeItem.id === anime.id)
                    );
                    currentFightIndex = 0;
                    displayBrackets(animeWin)
                    animeWin = [];
                } else {
                    animeWin.push(animResults.ganador); // Guardar el ganador
                    console.log('Ganadores actuales:', animeWin);
                    funcSiguientePelea(animesRestantes);
                }
                
            } else {
                console.log('Todas las peleas han terminado');
                buttonFight.removeEventListener('click', siguienteFight); // Desactivar el botón
            }
        });
    }

    // Función que se ejecuta cuando se pulse el botón
    function siguienteFight(animes) {
        if (currentFightIndex < animes.length / 2) {
            const animeTotales = animes.length / 2;
            const anime1 = animes[currentFightIndex];
            const anime2 = animes[currentFightIndex + animeTotales];
    
            // Mostrar la pelea actual
            displayPopUpFightAnimation(anime1, anime2);
    
            // Decidir y guardar el ganador
            const animResults = animeWinnerFight(anime1, anime2);
            currentFightIndex++; // Pasar al siguiente par de animes
            return animResults;
        } else {
            console.log('No quedan más peleas');
            return null;
        }
    }

    function displayPopUpFightAnimation(anime1, anime2) {
        // Creamos y mostramos un pop-up
        let popup = document.getElementById('popup');
        if (document.getElementById('popup') != null) {
            popup.remove();
        }

        popup = document.createElement('div');
        popup.id = 'popup';
        popup.style.backgroundColor = 'white';
        popup.style.display = 'flex';
        popup.style.width = '40vw';
        popup.style.height = '80vh';
        popup.style.position = 'absolute';
        popup.style.top = '0'

        // Creamos el botón Pelea
        const peleaButton = document.createElement('button');
        peleaButton.id = 'buttonFight';
        peleaButton.textContent = 'PELEA';
        peleaButton.style.width = '10vw';
        peleaButton.style.height = '10vh';
        peleaButton.style.position = 'absolute';
        peleaButton.style.bottom = '0';
        peleaButton.style.alignItems = 'center'
        popup.appendChild(peleaButton);

        displayAnimes(anime1, anime2, popup);
        document.body.appendChild(popup);
    }

    // Función para enseñar los animes que pelearán
    function displayAnimes(anime1, anime2, popup) {
        const divPelea = document.createElement('div');
        divPelea.id = 'divPelea';
        divPelea.style.display = 'flex'; // Para mostrar los animes uno al lado del otro

        // Crear div para anime1
        const divAnime1 = document.createElement('div');
        divAnime1.id = 'divAnime1';
        divAnime1.style.display = 'flex';
        divAnime1.style.flexDirection = 'column';
        divAnime1.style.alignItems = 'center'; // Centrar horizontalmente
        divAnime1.style.justifyContent = 'center'; // Centrar verticalmente
        divAnime1.style.textAlign = 'center'; // Centrar el texto
        divAnime1.style.width = '20vw';

        // Añadir portada y nombre para anime1
        const imgAnime1 = document.createElement('img');
        imgAnime1.src = anime1.main_picture.medium; // La URL de la portada del anime
        imgAnime1.alt = anime1.title;
        imgAnime1.style.width = '100px'; // Tamaño de la imagen (puedes ajustar esto)
        imgAnime1.style.height = '150px'; // Tamaño de la imagen

        const nameAnime1 = document.createElement('span');
        nameAnime1.textContent = anime1.title;
        nameAnime1.style.width = '50%'

        divAnime1.appendChild(imgAnime1);
        divAnime1.appendChild(nameAnime1);

        // Crear div para anime2
        const divAnime2 = document.createElement('div');
        divAnime2.id = 'divAnime2';
        divAnime2.style.display = 'flex';
        divAnime2.style.flexDirection = 'column';
        divAnime2.style.alignItems = 'center'; // Centrar horizontalmente
        divAnime2.style.justifyContent = 'center'; // Centrar verticalmente
        divAnime2.style.textAlign = 'center'; // Centrar el texto
        divAnime2.style.width = '20vw';

        // Añadir portada y nombre para anime2
        const imgAnime2 = document.createElement('img');
        imgAnime2.src = anime2.main_picture.medium; // La URL de la portada del anime
        imgAnime2.alt = anime2.title;
        imgAnime2.style.width = '100px'; // Tamaño de la imagen (puedes ajustar esto)
        imgAnime2.style.height = '150px'; // Tamaño de la imagen

        const nameAnime2 = document.createElement('span');
        nameAnime2.textContent = anime2.title;
        nameAnime2.style.width = '50%'

        divAnime2.appendChild(imgAnime2);
        divAnime2.appendChild(nameAnime2);

        // Añadir los divs de animes al divPelea
        divPelea.appendChild(divAnime1);
        divPelea.appendChild(divAnime2);

        // Añadir el divPelea al body o a otro contenedor
        popup.appendChild(divPelea);
    }


    // Función que saca el ganador de la pelea
    function animeWinnerFight(anime1, anime2) {
        const numRandom = Math.floor(Math.random() * 2);
        return numRandom === 0 ? ({ ganador: anime1, perdedor: anime2 }) : ({ ganador: anime2, perdedor: anime1 });
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
