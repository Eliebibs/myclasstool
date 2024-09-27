const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 5001;

app.use(bodyParser.json());
app.use(cors());

const ASSEMBLYAI_API_KEY = 'ae928180e355400cb40b89e3c69e3680';

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

app.post('/api/lemur', async (req, res) => {
    try {
        const { audio_url, prompt } = req.body;
        console.log('Received request:', { audio_url, prompt });
        const response = await axios.post('https://api.assemblyai.com/v2/transcript', { // Update the endpoint here
            audio_url,
            prompt
        }, {
            headers: {
                'Authorization': ASSEMBLYAI_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        console.log('AssemblyAI response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error in /api/lemur:', error.response ? error.response.data : error.message);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});