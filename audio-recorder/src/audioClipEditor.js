import audioBufferToWav from 'audiobuffer-to-wav';

/**
 * Function to extract audio clips based on timestamps.
 * @param {Blob} audioBlob - The original audio blob.
 * @param {Array} topics - Array of topics with timestamp objects.
 * @returns {Promise<Array>} - Array of audio URLs for each clip.
 */
export const extractAudioClips = async (audioBlob, topics) => {
    console.log('Starting extractAudioClips function');
    console.log('Topics:', topics);

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        console.log('Original audioBuffer duration:', audioBuffer.duration);
        console.log('Original audioBuffer sampleRate:', audioBuffer.sampleRate);
        console.log('Original audioBuffer numberOfChannels:', audioBuffer.numberOfChannels);

        const clips = await Promise.all(topics.map(async (topic, index) => {
            const startTime = parseTimestamp(topic.timestamp.start); // milliseconds to seconds
            const endTime = parseTimestamp(topic.timestamp.end);     // milliseconds to seconds
            console.log(`Topic #${index + 1}: Start Time - ${startTime}s, End Time - ${endTime}s`);

            // Validate timestamps
            if (startTime < 0 || endTime > audioBuffer.duration || startTime >= endTime) {
                console.error(`Invalid timestamps for topic #${index + 1}. Skipping this clip.`);
                return null;
            }

            // Calculate sample indices
            const startSample = Math.floor(startTime * audioBuffer.sampleRate);
            const endSample = Math.floor(endTime * audioBuffer.sampleRate);
            const frameCount = endSample - startSample;
            console.log(`startSample: ${startSample}`);
            console.log(`endSample: ${endSample}`);
            console.log(`frameCount: ${frameCount}`);

            // Create a new AudioBuffer for the clip
            const clipBuffer = audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                frameCount,
                audioBuffer.sampleRate
            );

            // Copy channel data
            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const channelData = audioBuffer.getChannelData(channel).subarray(startSample, endSample);
                clipBuffer.copyToChannel(channelData, channel, 0);
            }

            // Convert AudioBuffer to Blob
            const clipBlob = await bufferToBlob(clipBuffer, audioContext);
            console.log(`Clip #${index + 1} blob size: ${clipBlob.size} bytes`);

            // Create Object URL
            const clipUrl = URL.createObjectURL(clipBlob);
            console.log(`Clip #${index + 1} URL created: ${clipUrl}`);

            return clipUrl;
        }));

        // Filter out any null values (invalid clips)
        const validClips = clips.filter(clip => clip !== null);
        console.log('All clips processed:', validClips);
        return validClips;
    } catch (error) {
        console.error('Error extracting audio clips:', error);
        throw error;
    }
};

/**
 * Parses a timestamp in milliseconds to seconds.
 * @param {number} timestamp - Timestamp in milliseconds.
 * @returns {number} - Timestamp in seconds.
 */
const parseTimestamp = (timestamp) => {
    if (typeof timestamp !== 'number') {
        throw new TypeError('Expected timestamp to be a number');
    }
    return timestamp / 1000; // Convert milliseconds to seconds
};

/**
 * Helper function to convert AudioBuffer to Blob.
 * @param {AudioBuffer} audioBuffer - The audio buffer.
 * @param {AudioContext} audioContext - The audio context.
 * @returns {Promise<Blob>} - The resulting Blob.
 */
const bufferToBlob = async (audioBuffer, audioContext) => {
    const wavArrayBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavArrayBuffer], { type: 'audio/wav' });
};

/**
 * Formats seconds into "mm:ss" format.
 * @param {number} seconds - Time in seconds.
 * @returns {string} - Formatted timestamp.
 */
export const formatTimestamp = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
