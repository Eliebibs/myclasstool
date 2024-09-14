import axios from 'axios';

const GPT_API_KEY = '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'; // Replace with your GPT API key

/**
 * Function to send transcription to GPT and get organized topics.
 * @param {string} transcription - The transcription text with timestamps.
 * @returns {Promise<Object>} - The organized topics with titles, start and stop timestamps, and clean words.
 */
export const organizeTranscription = async (transcription) => {
    try {
        console.log('Starting organizeTranscription function');
        console.log('Transcription:', transcription);

        const requestData = {
            model: 'gpt-3.5-turbo', // Updated model
            messages: [
                {
                    role: 'system',
                    content: 'Organize the following transcription by key topics. Each key topic should have a title, start and stop timestamp, and the actual clean words within it.'
                },
                {
                    role: 'user',
                    content: transcription
                }
            ],
            max_tokens: 1500,
            temperature: 0.7,
        };

        console.log('Request Data:', JSON.stringify(requestData, null, 2));

        const response = await axios.post('https://api.openai.com/v1/chat/completions', requestData, {
            headers: {
                'Authorization': `Bearer ${GPT_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('Response:', response);

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            console.log('Organized topics:', response.data.choices[0].message.content);
            return response.data.choices[0].message.content;
        } else {
            console.error('Unexpected response structure:', response.data);
            throw new Error('Unexpected response structure');
        }
    } catch (error) {
        console.error('Error organizing transcription:', error);
        if (error.response) {
            console.error('Error response data:', error.response.data);
        }
        throw error;
    }
};
