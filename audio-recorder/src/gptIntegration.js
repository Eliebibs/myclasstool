import axios from 'axios';
import { parseTimestamp, formatTimestamp } from './audioClipEditor'; // Ensure this path is correct

const GPT_API_KEY = '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'; // Replace with your GPT API key

export const organizeTranscription = async (sentences) => {
    try {
        console.log('Starting organizeTranscription function');
        console.log('Sentences:', sentences);

        // Validate that sentences is an array
        if (!Array.isArray(sentences)) {
            throw new TypeError('Expected sentences to be an array');
        }

        // Format sentences with timestamps
        const transcriptionWithTimestamps = sentences.map((sentence, index) => {
            const startTime = formatTimestamp(sentence.start / 1000); // Convert ms to seconds
            const endTime = formatTimestamp(sentence.end / 1000);
            return `[${startTime} - ${endTime}] ${sentence.text}`;
        }).join('\n');

        const requestData = {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `
You are given a transcription of an audio recording, where each sentence includes its start and end timestamps.

Organize the transcription into key topics by grouping sentences together. Each key topic should have:
- "title": The topic title.
- "start": The start timestamp of the first sentence in the topic (in "mm:ss" format).
- "stop": The end timestamp of the last sentence in the topic (in "mm:ss" format).
- "content": The combined text of the sentences in the topic.

**Important Instructions:**
- **Use the provided timestamps exactly as they are**. Do not create or modify any timestamps.
- Ensure that the "start" and "stop" timestamps correspond to the first and last sentences in each topic.
- Do not generate timestamps that exceed the maximum timestamp provided.
- Respond **only** with valid JSON format without any additional text, code block delimiters, or explanations.

Here is an example of the transcription format:
[00:00 - 00:05] This is the first sentence.
[00:05 - 00:10] This is the second sentence.

And here is an example of the expected JSON format:
[
    {
        "title": "Introduction",
        "start": "00:00",
        "stop": "00:10",
        "content": "This is the first sentence. This is the second sentence."
    },
    ...
]
                    `
                },
                {
                    role: 'user',
                    content: transcriptionWithTimestamps
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

            // Validate and adjust timestamps
            const maxTimestamp = Math.max(...sentences.map(s => s.end / 1000));

            organizedContent.forEach((topic, index) => {
                const startTime = parseTimestamp(topic.start);
                const stopTime = parseTimestamp(topic.stop);

                // Adjust timestamps if they exceed audio duration
                if (startTime > maxTimestamp) {
                    console.warn(`Start time of topic #${index + 1} exceeds audio duration. Adjusting to max timestamp.`);
                    topic.start = formatTimestamp(maxTimestamp);
                }
                if (stopTime > maxTimestamp) {
                    console.warn(`Stop time of topic #${index + 1} exceeds audio duration. Adjusting to max timestamp.`);
                    topic.stop = formatTimestamp(maxTimestamp);
                }
            });

            return organizedContent;
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
