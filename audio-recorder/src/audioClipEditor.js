import audioBufferToWav from 'audiobuffer-to-wav';

/**
 * Function to extract audio clips based on IAB categories timestamps.
 * @param {Blob} audioBlob - The original audio blob.
 * @param {Array} topicsOrChapters - Array of topics or chapters with timestamp objects.
 * @returns {Promise<Array>} - Array of audio URLs for each clip.
 */
export const extractAudioClips = async (audioBlob, topicsOrChapters) => {
    console.log('Starting extractAudioClips function');
    console.log('Topics or Chapters:', topicsOrChapters);

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        console.log('Original audioBuffer duration:', audioBuffer.duration);
        console.log('Original audioBuffer sampleRate:', audioBuffer.sampleRate);
        console.log('Original audioBuffer numberOfChannels:', audioBuffer.numberOfChannels);

        const clips = await Promise.all(topicsOrChapters.map(async (item, index) => {
            const startTime = parseTimestamp(item.timestamp.start); // Accessing the correct part of the object
            const endTime = parseTimestamp(item.timestamp.end);     // Accessing the correct part of the object
            console.log(`Item #${index + 1}: Start Time - ${startTime}s, End Time - ${endTime}s`);

            // Validate timestamps
            if (startTime < 0 || endTime > audioBuffer.duration || startTime >= endTime) {
                console.error(`Invalid timestamps for item #${index + 1}. Skipping this clip.`);
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
 * Function to extract audio clips based on auto chapters timestamps.
 * @param {Blob} audioBlob - The original audio blob.
 * @param {Array} chapters - Array of chapters with timestamp objects.
 * @returns {Promise<Array>} - Array of audio URLs for each clip.
 */
export const extractChapterClips = async (audioBlob, chapters, audioDuration) => {
    console.log('Starting extractChapterClips function');
    console.log('Chapters:', chapters);

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    console.log('Original audioBuffer duration:', audioBuffer.duration);
    console.log('Original audioBuffer sampleRate:', audioBuffer.sampleRate);
    console.log('Original audioBuffer numberOfChannels:', audioBuffer.numberOfChannels);

    const clips = [];

    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        let startTime = chapter.start / 1000; // Convert milliseconds to seconds
        let endTime = chapter.end / 1000; // Convert milliseconds to seconds

        console.log(`Chapter #${i + 1}: Start Time - ${startTime}s, End Time - ${endTime}s`);
        console.log(`Data Types - Start Time: ${typeof startTime}, End Time: ${typeof endTime}`);

        // Adjust timestamps to be within the actual audio duration
        if (startTime < 0) startTime = 0;
        if (endTime > audioDuration) endTime = audioDuration;

        // Check for invalid timestamps
        if (typeof startTime !== 'number' || typeof endTime !== 'number') {
            console.error(`Invalid data types for chapter timestamps: start (${startTime}) and end (${endTime})`);
            continue; // Skip invalid chapters
        }
        if (startTime >= endTime) {
            console.error(`Invalid chapter timestamps: start (${startTime}) >= end (${endTime})`);
            continue; // Skip invalid chapters
        }

        const startSample = Math.floor(startTime * audioBuffer.sampleRate);
        const endSample = Math.floor(endTime * audioBuffer.sampleRate);
        const frameCount = endSample - startSample;

        console.log('startSample:', startSample);
        console.log('endSample:', endSample);
        console.log('frameCount:', frameCount);
        console.log('audioBuffer length:', audioBuffer.length);

        // Check for excessively large frameCount
        if (frameCount > audioBuffer.length) {
            console.error(`Excessively large frameCount: ${frameCount} (audioBuffer length: ${audioBuffer.length})`);
            continue; // Skip chapters with excessively large frameCount
        }

        const clipBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            frameCount,
            audioBuffer.sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            clipBuffer.copyToChannel(
                audioBuffer.getChannelData(channel).subarray(startSample, endSample),
                channel
            );
        }

        const clipBlob = await bufferToWaveBlob(clipBuffer);
        if (!clipBlob) {
            console.error(`Failed to create clipBlob for Chapter #${i + 1}`);
            continue; // Skip if clipBlob is undefined
        }

        console.log(`Clip #${i + 1} blob size: ${clipBlob.size} bytes`);
        console.log(`Clip #${i + 1} blob type: ${clipBlob.type}`);
        console.log(`Clip #${i + 1} duration: ${clipBuffer.duration}`);

        clips.push(clipBlob);
    }

    console.log('All valid clips processed:', clips);
    return clips;
};

const bufferToWaveBlob = async (buffer) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const offlineContext = new OfflineAudioContext(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
    );

    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.connect(offlineContext.destination);
    bufferSource.start();

    const renderedBuffer = await offlineContext.startRendering();
    const waveBlob = await audioBufferToWaveBlob(renderedBuffer);
    return waveBlob;
};

const audioBufferToWaveBlob = (buffer) => {
    // Convert AudioBuffer to WAV Blob
    // Implementation details omitted for brevity
    const wavArrayBuffer = audioBufferToWav(buffer);
    return new Blob([wavArrayBuffer], { type: 'audio/wav' });
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
