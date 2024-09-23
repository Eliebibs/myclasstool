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
export const extractChapterClips = async (audioBlob, chapters) => {
    console.log('Starting extractChapterClips function');
    console.log('Chapters:', chapters);

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    console.log('Original audioBuffer duration:', audioBuffer.duration);
    console.log('Original audioBuffer sampleRate:', audioBuffer.sampleRate);
    console.log('Original audioBuffer numberOfChannels:', audioBuffer.numberOfChannels);

    // If there's only one chapter and it's longer than the audio, use the whole audio
    if (chapters.length === 1 && chapters[0].end > audioBuffer.duration) {
        chapters[0].start = 0;
        chapters[0].end = audioBuffer.duration;
    }

    const clips = await Promise.all(chapters.map(async (chapter, index) => {
        console.log(`Chapter #${index + 1}: Start Time - ${chapter.start}s, End Time - ${chapter.end}s`);

        const startSample = Math.max(0, Math.floor(chapter.start * audioBuffer.sampleRate));
        const endSample = Math.min(audioBuffer.length, Math.floor(chapter.end * audioBuffer.sampleRate));
        
        // Ensure startSample is less than endSample
        if (startSample >= endSample) {
            console.error(`Invalid chapter timestamps: start (${chapter.start}) >= end (${chapter.end})`);
            return null; // Skip this chapter
        }

        const frameCount = endSample - startSample;

        console.log('startSample:', startSample);
        console.log('endSample:', endSample);
        console.log('frameCount:', frameCount);

        const chapterBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            frameCount,
            audioBuffer.sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            chapterBuffer.copyToChannel(channelData.subarray(startSample, endSample), channel);
        }

        const wavArrayBuffer = audioBufferToWav(chapterBuffer);
        const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
        console.log(`Clip #${index + 1} blob size:`, wavBlob.size, 'bytes');
        console.log(`Clip #${index + 1} blob type:`, wavBlob.type);
        console.log(`Clip #${index + 1} duration:`, chapterBuffer.duration);

        return wavBlob;
    }));

    // Filter out null clips (invalid chapters)
    const validClips = clips.filter(clip => clip !== null);

    console.log('All valid clips processed:', validClips);
    return validClips;
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
