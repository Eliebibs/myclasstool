import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { extractAudioClips, extractChapterClips } from './audioClipEditor'; // Ensure this path is correct
import './App.css'; // Import the CSS file

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
    // State to store the audio clips
    const [audioClips, setAudioClips] = useState([]);
    // State to store the auto chapters
    const [autoChapters, setAutoChapters] = useState([]);
    // State to track the display mode (IAB categories or auto chapters)
    const [displayMode, setDisplayMode] = useState('Chapters'); // Default to 'Chapters'
    // State to track the recording time
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingIntervalRef = useRef(null);

    const startRecording = async () => {
        console.log('Requesting microphone access...');
        try {
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
            setRecordingTime(0);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prevTime => prevTime + 1);
            }, 1000);
            console.log('Recording started.');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access your microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        console.log('Stopping recording...');
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        clearInterval(recordingIntervalRef.current);
    };

    const transcribeAudio = async (audioBlob) => {
        setIsTranscribing(true);
        setTranscription('');
        console.log('Uploading audio to AssemblyAI...');

        try {
            // Step 1: Upload Audio
            const uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload', audioBlob, {
                headers: {
                    'authorization': ASSEMBLYAI_API_KEY,
                    'content-type': 'application/octet-stream',
                },
            });

            const audioUrl = uploadResponse.data.upload_url;
            console.log('Audio uploaded. URL:', audioUrl);

            // Step 2: Request Transcription with IAB Categories and Auto Chapters
            const transcriptionResponse = await axios.post('https://api.assemblyai.com/v2/transcript', {
                audio_url: audioUrl,
                iab_categories: true,
                auto_chapters: true,
                auto_highlights: true,
            }, {
                headers: {
                    'authorization': ASSEMBLYAI_API_KEY,
                    'content-type': 'application/json',
                },
            });

            const transcriptId = transcriptionResponse.data.id;
            console.log('Transcription requested. ID:', transcriptId);

            // Step 3: Polling for Transcription Result
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

            // Log the full transcription result for debugging
            console.log('Full transcription result:', transcriptionResult);

            // Optionally, set the full transcription text
            if (transcriptionResult.text) {
                setTranscription(transcriptionResult.text);
            }

            // Step 5: Process the Auto Chapters Result
            if (transcriptionResult.chapters) {
                const chapters = transcriptionResult.chapters;
                console.log('Detected chapters:', chapters);
                setAutoChapters(chapters);

                // Extract audio clips based on timestamps
                const chapterClips = await extractChapterClips(audioBlob, chapters);
                setAudioClips(chapterClips);
                console.log('Chapter clips:', chapterClips);
            } else {
                throw new Error('Transcription result does not contain chapter detection results.');
            }
        } catch (error) {
            console.error('Error transcribing audio:', error);
            console.error('Error details:', error.response?.data);
            // Handle the error gracefully, e.g., show a message to the user
            alert('An error occurred while processing the transcription. Please try again.');
        } finally {
            setIsTranscribing(false);
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    return (
        <div className="App">
            <header>ClassCut</header>
            {/* Button to start/stop recording */}
            <button onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? 'Stop' : 'Record'}
            </button>
            {/* Display recording timer */}
            {isRecording && <div className="recording-timer">{formatTime(recordingTime)}</div>}
            {/* Audio player to play the recorded audio */}
            {audioURL && <audio controls src={audioURL}></audio>}
            {/* Loading indicator */}
            {isTranscribing && <div className="loading-spinner"></div>}
            {/* Display transcription */}
            {transcription && (
                <div>
                    <h2>Transcription</h2>
                    <p>{transcription}</p>
                    <button onClick={() => setDisplayMode('Chapters')}>Auto Chapters</button>
                </div>
            )}
            {displayMode === 'Chapters' && autoChapters.length > 0 && (
                <div className="topics-container">
                    {autoChapters.map((chapter, index) => (
                        <div key={index} className="topic">
                            <h3 className="gist">Gist: {chapter.gist}</h3>
                            <audio className="audio-player" controls src={audioClips[index]}></audio>
                            <p className="headline"><strong>Headline:</strong> {chapter.headline}</p>
                            <p className="summary"><strong>Summary:</strong> {chapter.summary}</p>
                            <hr />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;
