import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Route, Link, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { extractChapterClips } from './audioClipEditor';
import './App.css';
import LoginSignup from './LoginSignup';
import Signup from './Signup';
import MyClips from './MyClips';
import LandingPage from './LandingPage';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, doc, setDoc, collection, serverTimestamp, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import SubjectSelector from './SubjectSelector';
import Account from './Account'; // New Account component (you'll need to create this)

const ASSEMBLYAI_API_KEY = 'ae928180e355400cb40b89e3c69e3680';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
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
    // State to store the auto chapters
    const [autoChapters, setAutoChapters] = useState([]);
    // State to track the display mode (IAB categories or auto chapters)
    const [displayMode, setDisplayMode] = useState('Chapters'); // Default to 'Chapters'
    // State to track the recording time
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingIntervalRef = useRef(null);
    const [showSubjectSelector, setShowSubjectSelector] = useState(false);
    const [lastRecordedAudioBlob, setLastRecordedAudioBlob] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Authenticated route component
    const PrivateRoute = ({ children }) => {
        if (loading) return <div>Loading...</div>;
        return user ? children : <Navigate to="/login" />;
    };

    // Redirect component for authenticated users
    const AuthRedirect = () => {
        const location = useLocation();
        
        useEffect(() => {
            if (user && location.pathname === '/') {
                window.history.replaceState(null, '', '/home');
            }
        }, [user, location]);

        return null;
    };

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
        mediaRecorderRef.current.onstop = async (event) => {
            console.log('Recording stopped.');
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            setLastRecordedAudioBlob(audioBlob);
            setShowSubjectSelector(true);
        };
    };

    const handleSubjectSave = async (subject) => {
        console.log('handleSubjectSave called with subject:', subject);
        setShowSubjectSelector(false);

        if (!subject || subject.trim() === '') {
            console.error('Invalid subject name');
            alert('Please enter a valid subject name');
            return;
        }

        const db = getFirestore();
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
            console.log('User authenticated, UID:', user.uid);
            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const subjects = userData.subjects || [];
                    if (!subjects.includes(subject.trim())) {
                        await updateDoc(userDocRef, {
                            subjects: arrayUnion(subject.trim())
                        });
                    }
                } else {
                    await setDoc(userDocRef, {
                        subjects: [subject.trim()]
                    });
                }
                // Start transcription with the selected subject
                await transcribeAudio(lastRecordedAudioBlob, subject.trim());
            } catch (error) {
                console.error('Error in handleSubjectSave:', error);
                alert('An error occurred while saving the recording. Please try again.');
            }
        } else {
            console.error('User not authenticated');
            alert('You must be logged in to save recordings');
        }
    };

    const transcribeAudio = async (audioBlob, subject) => {
        console.log('transcribeAudio called with subject:', subject);
        setIsTranscribing(true);
        setTranscription('');
        console.log('Starting transcription process...');

        try {
            // Check if user is authenticated
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated');
            }
            const userId = user.uid;

            // Step 1: Upload the audio file to AssemblyAI
            const uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload',
                audioBlob,
                {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Authorization': ASSEMBLYAI_API_KEY
                    }
                }
            );

            const audioUrl = uploadResponse.data.upload_url;

            // Step 2: Start the transcription
            const transcriptionResponse = await axios.post('https://api.assemblyai.com/v2/transcript',
                {
                    audio_url: audioUrl,
                    auto_chapters: true
                },
                {
                    headers: {
                        'Authorization': ASSEMBLYAI_API_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const transcriptId = transcriptionResponse.data.id;

            // Step 3: Poll for the transcription result
            let transcriptResult;
            while (true) {
                const pollingResponse = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                    headers: {
                        'Authorization': ASSEMBLYAI_API_KEY
                    }
                });

                transcriptResult = pollingResponse.data;

                if (transcriptResult.status === 'completed') {
                    break;
                } else if (transcriptResult.status === 'error') {
                    throw new Error(`Transcription error: ${transcriptResult.error}`);
                }

                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for 3 seconds before polling again
            }

            // Log the full transcription result
            console.log('Full transcription result:', transcriptResult);

            // Set the transcription
            setTranscription(transcriptResult.text);

            // Extract chapters
            const chapters = transcriptResult.chapters || [];
            setAutoChapters(chapters);

            // Extract audio clips
            const audioElement = new Audio(URL.createObjectURL(audioBlob));
            await new Promise((resolve) => {
                audioElement.onloadedmetadata = resolve;
            });
            const audioDuration = audioElement.duration;

            const chapterClips = await extractChapterClips(audioBlob, chapters, audioDuration);

            // Upload clips
            const uploadPromises = chapterClips.map(async (clip, index) => {
                console.log(`Processing clip ${index + 1} of ${chapterClips.length}`);
                const chapterData = chapters[index] || {
                    gist: 'No gist available',
                    headline: 'No headline available',
                    summary: 'No summary available'
                };
                const clipUrl = await uploadAudioClipToFirebase(clip, userId, chapterData, subject);
                chapterData.audioClipUrl = clipUrl; // Add this line
                return clipUrl;
            });

            const clipUrls = await Promise.all(uploadPromises);
            console.log('All audio clips uploaded:', clipUrls);

            setIsTranscribing(false);
        } catch (error) {
            console.error('Error in transcribeAudio:', error);
            setIsTranscribing(false);
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    const uploadAudioClipToFirebase = async (audioBlob, userId, chapter, subject) => {
        console.log('uploadAudioClipToFirebase called with:', { userId, subject, chapter });
        if (!(audioBlob instanceof Blob) || audioBlob.size === 0) {
            throw new Error('Invalid audio blob');
        }
        if (!subject || subject.trim() === '') {
            console.error('Invalid subject in uploadAudioClipToFirebase:', subject);
            throw new Error('Invalid subject name');
        }
        const clipId = Math.random().toString(36).substring(2, 15);
        const storage = getStorage();
        const db = getFirestore();

        try {
            console.log('Starting upload process...');
            console.log('User ID:', userId);
            console.log('Subject:', subject);
            console.log('Clip ID:', clipId);

            // Create the full path for the audio file
            const filePath = `${userId}/${subject}/${clipId}.wav`;
            const storageRef = ref(storage, filePath);

            console.log('Uploading to Storage...');
            const metadata = { contentType: 'audio/wav' };
            const uploadResult = await uploadBytes(storageRef, audioBlob, metadata);
            console.log('Upload to Storage successful:', uploadResult);

            console.log('Getting download URL...');
            const downloadURL = await getDownloadURL(uploadResult.ref);
            console.log('Download URL obtained:', downloadURL);

            // Prepare clip data with fallback values
            const clipData = {
                gist: chapter?.gist || 'No gist available',
                headline: chapter?.headline || 'No headline available',
                summary: chapter?.summary || 'No summary available',
                linkToClip: downloadURL,
                timestamp: serverTimestamp(),
            };

            // Store in Firestore
            console.log('Storing metadata in Firestore...');
            const userDocRef = doc(db, 'users', userId);
            const subjectCollectionRef = collection(userDocRef, subject);
            const clipDocRef = doc(subjectCollectionRef, clipId);
            await setDoc(clipDocRef, clipData);
            console.log('Metadata stored in Firestore successfully');

            return downloadURL;
        } catch (error) {
            console.error('Error in uploadAudioClipToFirebase:', error);
            if (error instanceof FirebaseError) {
                console.error('Firebase Error Code:', error.code);
                console.error('Firebase Error Message:', error.message);
            }
            throw error;
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <AuthRedirect />
            <Routes>
                <Route path="/" element={user ? <Navigate to="/home" /> : <LandingPage />} />
                <Route path="/login" element={user ? <Navigate to="/home" /> : <LoginSignup />} />
                <Route path="/signup" element={user ? <Navigate to="/home" /> : <Signup />} />
                <Route path="/home" element={
                    <PrivateRoute>
                        <div className="App">
                            <header className="app-header">
                                <Link to="/" className="logo">ClassCut</Link>
                                <div className="header-buttons">
                                    <Link to="/account" className="header-button">Account</Link>
                                    <Link to="/my-clips" className="header-button">My Clips</Link>
                                </div>
                            </header>
                            <div className="sub-header-buttons">
                                <a href="https://forms.gle/43TWyFBE1YQ8JZ8M7" target="_blank" rel="noopener noreferrer" className="sub-header-button">Report a Bug</a>
                                <a href="https://forms.gle/F9Wf94RfaXmRpRC9A" target="_blank" rel="noopener noreferrer" className="sub-header-button">Give Feedback</a>
                            </div>
                            <div className="record-container">
                                <button className="record-button" onClick={isRecording ? stopRecording : startRecording}>
                                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                                </button>
                                {isRecording && <div className="recording-timer">{formatTime(recordingTime)}</div>}
                            </div>
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
                                            <audio controls src={chapter.audioClipUrl}></audio>
                                            <p className="headline"><strong>Headline:</strong> {chapter.headline}</p>
                                            <p className="summary"><strong>Summary:</strong> {chapter.summary}</p>
                                            <hr />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {showSubjectSelector && (
                                <SubjectSelector 
                                    onClose={() => setShowSubjectSelector(false)}
                                    onSave={handleSubjectSave}
                                />
                            )}
                        </div>
                    </PrivateRoute>
                } />
                <Route path="/my-clips" element={
                    <PrivateRoute>
                        <MyClips />
                    </PrivateRoute>
                } />
                <Route path="/account" element={
                    <PrivateRoute>
                        <Account />
                    </PrivateRoute>
                } />
            </Routes>
        </Router>
    );
}

export default App;