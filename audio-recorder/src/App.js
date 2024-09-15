import React, { useState, useRef } from 'react';
import axios from 'axios';
import { organizeTranscription } from './gptIntegration';
import { extractAudioClips } from './audioClipEditor'; // Ensure this path is correct

const ASSEMBLYAI_API_KEY = 'ae928180e355400cb40b89e3c69e3680'; // Replace with your AssemblyAI API key

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
    // State to store the organized topics
    const [organizedTopics, setOrganizedTopics] = useState([]);
    // State to track if summarizing is in progress
    const [isSummarizing, setIsSummarizing] = useState(false);
    // State to store the audio clips
    const [audioClips, setAudioClips] = useState([]);

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

    const stopRecording = () => {
        console.log('Stopping recording...');
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    };

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
                console.log('Polling for transcription result...');
                const resultResponse = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                    headers: {
                        'authorization': ASSEMBLYAI_API_KEY,
                    },
                });

                transcriptionResult = resultResponse.data;

                console.log('Transcription result status:', transcriptionResult.status);

                if (transcriptionResult.status === 'completed') {
                    console.log('Transcription completed.');
                    break;
                } else if (transcriptionResult.status === 'failed') {
                    throw new Error('Transcription failed');
                }

                console.log('Transcription in progress...');
                await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before polling again
            }

            setTranscription(transcriptionResult.text);
            console.log('Transcription result:', transcriptionResult.text);

            // Start summarizing and organizing
            setIsSummarizing(true);
            console.log('Starting to organize transcription...');
            const organizedResult = await organizeTranscription(transcriptionResult.text);
            console.log('Organized result:', organizedResult);

            if (Array.isArray(organizedResult)) {
                setOrganizedTopics(organizedResult);
                console.log('Organized topics:', organizedResult);

                // Extract audio clips based on timestamps
                const clips = await extractAudioClips(audioBlob, organizedResult);
                setAudioClips(clips);
                console.log('Audio clips:', clips);
            } else {
                console.error('Organized result is not an array:', organizedResult);
                // Handle the error gracefully, e.g., show a message to the user
                alert('Failed to organize transcription. Please try again.');
            }
        } catch (error) {
            console.error('Error transcribing audio:', error);
            console.log('Error details:', error.response?.data);
            // Handle the error gracefully, e.g., show a message to the user
            alert('An error occurred while processing the transcription. Please try again.');
        } finally {
            setIsTranscribing(false);
            setIsSummarizing(false);
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
            {isSummarizing && <p>Summarizing & Organizing...</p>}
            {/* Display transcription */}
            {transcription && (
                <div>
                    <h2>Transcription</h2>
                    <p>{transcription}</p>
                </div>
            )}
            {/* Display organized topics and clips */}
            {organizedTopics.length > 0 && (
                <div>
                    <h2>Organized Topics</h2>
                    {organizedTopics.map((topic, index) => (
                        <div key={index}>
                            <h3>{topic.title}</h3>
                            <p>Start: {topic.start}</p>
                            <p>Stop: {topic.stop}</p>
                            <p>{topic.content}</p>
                            {audioClips[index] && (
                                <audio controls src={audioClips[index]}></audio>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;
