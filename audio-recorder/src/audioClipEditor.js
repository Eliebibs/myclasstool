/**
 * Function to extract audio clips based on timestamps.
 * @param {Blob} audioBlob - The original audio blob.
 * @param {Array} topics - Array of topics with start and stop timestamps.
 * @returns {Promise<Array>} - Array of audio URLs for each clip.
 */
export const extractAudioClips = async (audioBlob, topics) => {
    console.log('Starting extractAudioClips function');
    console.log('Topics:', topics);

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const clips = await Promise.all(topics.map(async ({ start, stop }) => {
            console.log(`Processing clip from ${start} to ${stop}`);
            const startTime = parseTimestamp(start);
            const stopTime = parseTimestamp(stop);
            const duration = stopTime - startTime;

            const clipBuffer = audioContext.createBuffer(
                audioBuffer.numberOfChannels,
                duration * audioContext.sampleRate,
                audioContext.sampleRate
            );

            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                clipBuffer.copyToChannel(
                    audioBuffer.getChannelData(channel).slice(
                        startTime * audioContext.sampleRate,
                        stopTime * audioContext.sampleRate
                    ),
                    channel
                );
            }

            const clipBlob = await bufferToBlob(clipBuffer, audioContext);
            const clipUrl = URL.createObjectURL(clipBlob);
            console.log(`Clip URL created: ${clipUrl}`);
            return clipUrl;
        }));

        console.log('All clips processed:', clips);
        return clips;
    } catch (error) {
        console.error('Error extracting audio clips:', error);
        throw error;
    }
};

/**
 * Helper function to parse timestamp (e.g., "1:30" to seconds).
 * @param {string} timestamp - The timestamp string.
 * @returns {number} - The timestamp in seconds.
 */
const parseTimestamp = (timestamp) => {
    console.log(`Parsing timestamp: ${timestamp}`);
    const [minutes, seconds] = timestamp.split(':').map(Number);
    return minutes * 60 + seconds;
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
 * Helper function to convert AudioBuffer to WAV format.
 * @param {AudioBuffer} buffer - The audio buffer.
 * @returns {ArrayBuffer} - The resulting WAV ArrayBuffer.
 */
const audioBufferToWav = (buffer) => {
    let numOfChan = buffer.numberOfChannels,
        length = buffer.length * numOfChan * 2 + 44,
        bufferArray = new ArrayBuffer(length),
        view = new DataView(bufferArray),
        channels = [],
        sampleRate = buffer.sampleRate,
        offset = 0,
        pos = 0;

    // Write WAV container
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    // Write format chunk
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this demo)

    // Write data chunk
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Write interleaved data
    for (let i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            // interleave channels
            let sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
            sample = (0.5 + sample * 32767) | 0; // scale to 16-bit signed int
            view.setInt16(pos, sample, true); // write 16-bit sample
            pos += 2;
        }
        offset++; // next source sample
    }

    return bufferArray;

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
};
