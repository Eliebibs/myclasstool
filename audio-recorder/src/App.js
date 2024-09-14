import React, { useState, useRef } from 'react';
import axios from 'axios';

const ASSEMBLYAI_API_KEY = 'ae928180e355400cb40b89e3c69e3680'; // Replace with your AssemblyAI API key

/**
 * App component that provides the main functionality for recording and playing audio.
 */
function App() {
    // State to track if recording is in progress
    const [isRecording, setIsRecording] = useState(false);
    // State to store the URL of the recorded audio
    const [audioURL, setAudioURL] = useState('');
    // State to store the transcription text
    const [transcription, setTranscription] = useState('');
    // State to track if transcription is in progress
    const [isTranscribing, setIsTranscribing] = useState(false);
    // Ref to store the MediaRecorder instance
    const mediaRecorderRef = useRef(null);
    // Ref to store the audio data chunks
    const audioChunksRef = useRef([]);

    /**
     * Function to start recording audio.
     * It requests access to the user's microphone and initializes the MediaRecorder.
     */
    const startRecording = async () => {
        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted.');

        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = async () => {
            console.log('Recording stopped.');
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            setAudioURL(audioUrl);
            audioChunksRef.current = [];
            console.log('Audio URL created:', audioUrl);

            // Start transcription
            await transcribeAudio(audioBlob);
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        console.log('Recording started.');
    };

    /**
     * Function to stop recording audio.
     * It stops the MediaRecorder and updates the state.
     */
    const stopRecording = () => {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    };

    /**
     * Function to upload audio to AssemblyAI and get the transcription.
     * @param {Blob} audioBlob - The recorded audio blob.
     */
    const transcribeAudio = async (audioBlob) => {
        setIsTranscribing(true);
        setTranscription('');
        console.log('Uploading audio to AssemblyAI...');

        try {
            const uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload', audioBlob, {
                headers: {
                    'authorization': ASSEMBLYAI_API_KEY,
                    'content-type': 'application/octet-stream',
                },
            });

            const audioUrl = uploadResponse.data.upload_url;
            console.log('Audio uploaded. URL:', audioUrl);

            const transcriptionResponse = await axios.post('https://api.assemblyai.com/v2/transcript', {
                audio_url: audioUrl,
                auto_highlights: true, // Request timestamps for each sentence
            }, {
                headers: {
                    'authorization': ASSEMBLYAI_API_KEY,
                    'content-type': 'application/json',
                },
            });

            const transcriptId = transcriptionResponse.data.id;
            console.log('Transcription requested. ID:', transcriptId);

            let transcriptionResult;
            while (true) {
                const resultResponse = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                    headers: {
                        'authorization': ASSEMBLYAI_API_KEY,
                    },
                });

                transcriptionResult = resultResponse.data;

                if (transcriptionResult.status === 'completed') {
                    console.log('Transcription completed.');
                    break;
                } else if (transcriptionResult.status === 'failed') {
                    throw new Error('Transcription failed');
                }

                console.log('Transcription in progress...');
                await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before polling again
            }

            // Extract sentences with timestamps
            const sentencesWithTimestamps = transcriptionResult.words.map(word => {
                return `${word.start} - ${word.end}: ${word.text}`;
            }).join('\n');

            setTranscription(sentencesWithTimestamps);
            console.log('Transcription result:', sentencesWithTimestamps);
        } catch (error) {
            console.error('Error transcribing audio:', error);
        } finally {
            setIsTranscribing(false);
        }
    };

    return (
        <div>
            <h1>Audio Recorder</h1>
            {/* Button to start/stop recording */}
            <button onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? 'Stop' : 'Record'}
            </button>
            {/* Audio player to play the recorded audio */}
            {audioURL && <audio controls src={audioURL}></audio>}
            {/* Loading indicator */}
            {isTranscribing && <p>Transcribing...</p>}
            {/* Display transcription */}
            {transcription && <p>Transcription: {transcription}</p>}
        </div>
    );
}

export default App;
