import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import axios from 'axios';
import { extractAudioClips, extractChapterClips } from './audioClipEditor';
import './App.css';
import LoginSignup from './LoginSignup';
import MyClips from './MyClips'; // Import the new MyClips component
import { getAuth } from 'firebase/auth';
import { storage, db } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';

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
                console.log('Original audio MIME type:', audioBlob.type); // Log the MIME type of the original audio file
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
        console.log('Original audio MIME type:', audioBlob.type);

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

                if (chapterClips.length === 0) {
                    throw new Error('No valid audio clips extracted');
                }

                // Get the current user ID
                const auth = getAuth();
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('User not authenticated');
                }
                const userId = user.uid;

                // Upload each audio clip to Firebase Storage
                const uploadPromises = chapterClips.map(async (clip, index) => {
                    console.log(`Processing clip ${index + 1} of ${chapterClips.length}`);
                    console.log('Clip Blob:', clip);
                    console.log('Clip Blob Size:', clip.size);
                    return await uploadAudioClipToFirebase(clip, userId, chapters[index]);
                });

                const clipUrls = await Promise.all(uploadPromises);
                console.log('All audio clips uploaded:', clipUrls);

                // Set the audio clips for playback
                setAudioClips(clipUrls);

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

    const uploadAudioClipToFirebase = async (audioBlob, userId, chapter) => {
        if (!(audioBlob instanceof Blob) || audioBlob.size === 0) {
            throw new Error('Invalid audio blob');
        }
        const clipId = Math.random().toString(36).substring(2, 15);
        const storageRef = ref(storage, `${userId}/${clipId}.wav`);

        try {
            console.log('Uploading audio clip to Firebase Storage...');
            console.log('Audio Blob:', audioBlob);
            console.log('Audio Blob Size:', audioBlob.size);
            console.log('Audio Blob Type:', audioBlob.type);
            console.log('User ID:', userId);
            console.log('Clip ID:', clipId);

            const metadata = {
                contentType: 'audio/wav',
            };

            // Upload the audio blob with metadata
            const uploadResult = await uploadBytes(storageRef, audioBlob, metadata);
            console.log('Upload result:', uploadResult);

            const downloadURL = await getDownloadURL(uploadResult.ref);
            console.log('Download URL:', downloadURL);

            // Store clip metadata in Firestore
            const clipData = {
                gist: chapter.gist,
                headline: chapter.headline,
                summary: chapter.summary,
                linkToClip: downloadURL,
            };

            const userDocRef = doc(db, 'users', userId);
            const clipDocRef = doc(userDocRef, 'clips', clipId);
            await setDoc(clipDocRef, clipData);
            console.log('Clip metadata stored in Firestore:', clipData);

            return downloadURL;
        } catch (error) {
            console.error('Error uploading audio clip to Firebase:', error);
            if (error instanceof FirebaseError) {
                console.error('Firebase Error Code:', error.code);
                console.error('Firebase Error Message:', error.message);
            }
            throw error;
        }
    };

    const testUpload = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
            console.error('User not authenticated');
            return;
        }
        const userId = user.uid;
        const storageRef = ref(storage, `${userId}/testfile.txt`);
        const testBlob = new Blob(['Hello, world!'], { type: 'text/plain' });

        try {
            await uploadBytes(storageRef, testBlob);
            console.log('Test file uploaded successfully.');
        } catch (error) {
            console.error('Error uploading test file:', error);
        }
    };

    const testAudioPlayback = async (url) => {
        try {
            console.log('Testing audio playback for URL:', url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const contentType = response.headers.get('content-type');
            console.log('Content-Type:', contentType);

            const blob = await response.blob();
            console.log('Downloaded blob size:', blob.size);
            console.log('Downloaded blob type:', blob.type);

            if (!blob.type.startsWith('audio/')) {
                console.error('Invalid content type:', blob.type);
                const text = await blob.text();
                console.error('Response text:', text.substring(0, 200)); // Log first 200 characters
                throw new Error(`Invalid content type: ${blob.type}`);
            }

            const audio = new Audio(URL.createObjectURL(blob));
            audio.oncanplaythrough = () => {
                console.log('Test audio can be played');
                console.log('Audio duration:', audio.duration);
            };
            audio.onerror = (e) => {
                console.error('Audio playback error:', e);
                console.error('Audio error code:', audio.error.code);
                console.error('Audio error message:', audio.error.message);
            };
            // Don't actually play the audio, just test if it can be played
        } catch (error) {
            console.error('Error testing audio playback:', error);
        }
    };

    return (
        <Router>
            <Routes>
                <Route path="/" element={
                    <div className="App">
                        <header>ClassCut</header>
                        <button onClick={isRecording ? stopRecording : startRecording}>
                            {isRecording ? 'Stop' : 'Record'}
                        </button>
                        <Link to="/login-signup">
                            <button>Login / Sign Up</button>
                        </Link>
                        <Link to="/my-clips">
                            <button>My Clips</button>
                        </Link>
                        {isRecording && <div className="recording-timer">{formatTime(recordingTime)}</div>}
                        {audioURL && <audio controls src={audioURL}></audio>}
                        {isTranscribing && <div className="loading-spinner"></div>}
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
                } />
                <Route path="/login-signup" element={<LoginSignup />} />
                <Route path="/my-clips" element={<MyClips />} />
            </Routes>
        </Router>
    );
}

export default App;
