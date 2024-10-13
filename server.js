import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = 3000;
const CLIENT_ID = '78ae09421827e726a1f49137303cba80';

// Permitir CORS para todas las solicitudes
app.use(cors());

app.get('/getPlanToWatch/:username', async (req, res) => {
    const username = req.params.username;
    const url = `https://api.myanimelist.net/v2/users/${username}/animelist?status=plan_to_watch&limit=100`;

    try {
        const response = await fetch(url, {
            headers: { 'X-MAL-CLIENT-ID': CLIENT_ID }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: response.statusText });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).send('Error fetching data from MyAnimeList');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
