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
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `
Organize the following transcription by key topics. Each key topic should have:

- "title": The topic title.
- "start": The start timestamp in the format "mm:ss".
- "stop": The stop timestamp in the format "mm:ss".
- "content": The actual clean words within it.

Respond **only** with valid JSON format without any additional text, code block delimiters, or explanations. Do not include bullet points, numbers, or markdown formatting.

Ensure the JSON is properly formatted and parsable. Here is an example of the expected JSON format:

[
    {
        "title": "Definition of a Term for Baby Hawk",
        "start": "00:00",
        "stop": "00:16",
        "content": "Which doesn't really look like a real word, but I guess it's an obsolete term for a baby hawk."
    },
    {
        "title": "Analysis of Opening Guesses",
        "start": "00:17",
        "stop": "01:03",
        "content": "The top 15 openers by this metric happen to look like this, but these are not necessarily the best opening guesses because they're only looking one step in with a heuristic of expected information to try to estimate what the true score will be."
    }
]
                    `
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
            let responseContent = response.data.choices[0].message.content.trim();
            console.log('Response content before parsing:', responseContent);

            // Remove any code block delimiters or extra text
            responseContent = responseContent.replace(/```json/g, '').replace(/```/g, '').trim();

            // Parse the JSON response
            let organizedContent;
            try {
                organizedContent = JSON.parse(responseContent);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                console.error('Response content:', responseContent);
                throw new Error('Failed to parse JSON response from GPT');
            }

            console.log('Organized topics:', organizedContent);

            if (Array.isArray(organizedContent)) {
                return organizedContent;
            } else {
                console.error('Organized content is not an array:', organizedContent);
                throw new Error('Organized content is not an array');
            }
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
