document.addEventListener('DOMContentLoaded', () => {
    const inputUsername = document.getElementById('username');
    const fetchListButton = document.getElementById('fetchListButton');
    const animeImage = document.getElementById('animeImage');
    const sortButton = document.getElementById('sortButton');
    hideSort();

    let username = '';
    let animeList = [];
    let randomAnimes = [];
    let selectedAnimes = [];
    let currentRound = [];
    let lockSelection = false;

    fetchListButton.addEventListener('click', () => {
        username = inputUsername.value || 'sadpuyana';
        if (username) {
            fetchPlanToWatchList(username);
        }
    });

    async function fetchPlanToWatchList(username) {
        try {
            const response = await fetch(`https://nextanime-server.up.railway.app/getPlanToWatch/${username}`); // fetch(`http://localhost:3000/getPlanToWatch/${username}`); //  // 
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            const data = await response.json();
            animeList = data.data.map(item => item.node);
            showAnimeCover();
        } catch (error) {
            console.error('Error fetching anime list:', error);
        }
    }

    function showAnimeCover() {
        if (animeList.length > 0) {
            animeImage.src = animeList[0].main_picture.medium;
            animeImage.style.display = 'block';
            sortButton.style.display = 'block';
            randomAnimes = [];
        }
    }

    sortButton.addEventListener('click', () => {
        if (animeList.length >= 16) {
            randomAnimes = [];
            let selectedIndices = new Set();
            while (selectedIndices.size < 16) {
                const index = Math.floor(Math.random() * animeList.length);
                selectedIndices.add(index);
            }
            selectedIndices.forEach(i => randomAnimes.push(animeList[i]));
            displayBrackets(randomAnimes);
        } else {
            console.log('No hay suficientes animes.');
        }
    });

    function hideSort() {
        sortButton.style.display = 'none';
    }

    function displayBrackets(animeList) {
        document.body.innerHTML = '';
        currentRound = [...animeList];
        renderCards(currentRound);
    }

    function renderCards(animes) {
        const container = document.createElement('div');
        container.classList.add('card-container');

        shuffleArray(animes);

        animes.forEach((anime, index) => {
            const card = document.createElement('div');
            card.classList.add('anime-card');
            card.dataset.index = index;

            card.innerHTML = `
                <div class="card-front">
                    <img src="${anime.main_picture.medium}" alt="${anime.title}">
                    <p>${anime.title}</p>
                </div>
                <div class="card-back"></div>
            `;

            card.addEventListener('click', () => {
                if (lockSelection || !card.classList.contains('flipped')) return;
                selectCard(card, anime);
            });

            container.appendChild(card);
        });

        const button = document.createElement('button');
        button.textContent = 'Barajar y Girar';
        button.classList.add('shuffle-button');

        button.addEventListener('click', () => {
            const cards = Array.from(container.children);
            shuffleArray(cards);
            cards.forEach(c => container.appendChild(c));
            cards.forEach(c => c.classList.add('flipped'));
        });

        document.body.appendChild(container);
        document.body.appendChild(button);
    }

    function selectCard(cardElement, anime) {
        if (lockSelection) return;

        if (selectedAnimes.includes(anime)) {
            cardElement.classList.remove('selected');
            selectedAnimes = selectedAnimes.filter(a => a !== anime);
        } else if (selectedAnimes.length < currentRound.length / 2) {
            selectedAnimes.push(anime);
            cardElement.classList.add('selected');
        }

        if (selectedAnimes.length === currentRound.length / 2) {
            lockSelection = true;
            setTimeout(() => {
                lockSelection = false;
                nextRound();
            }, 1000);
        }
    }

    function nextRound() {
        document.body.innerHTML = '';

        if (selectedAnimes.length === 1) {
            const winner = selectedAnimes[0];

            const winnerContainer = document.createElement('div');
            winnerContainer.classList.add('card-container');

            const winnerCard = document.createElement('div');
            winnerCard.classList.add('anime-card');

            const winnerLabel = document.createElement('h2');
            winnerLabel.textContent = 'GANADOR';
            winnerLabel.style.color = 'gold';
            winnerLabel.style.textAlign = 'center';

            winnerCard.innerHTML = `
                <div class="card-front">
                    <img src="${winner.main_picture.medium}" alt="${winner.title}">
                    <p>${winner.title}</p>
                </div>
            `;

            winnerContainer.appendChild(winnerLabel);
            winnerContainer.appendChild(winnerCard);
            document.body.appendChild(winnerContainer);

        } else {
            currentRound = [...selectedAnimes];
            selectedAnimes = [];
            renderCards(currentRound);
        }
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
});