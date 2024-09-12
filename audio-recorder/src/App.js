import React, { useState, useRef } from 'react';

/**
 * App component that provides the main functionality for recording and playing audio.
 */
function App() {
    // State to track if recording is in progress
    const [isRecording, setIsRecording] = useState(false);
    // State to store the URL of the recorded audio
    const [audioURL, setAudioURL] = useState('');
    // Ref to store the MediaRecorder instance
    const mediaRecorderRef = useRef(null);
    // Ref to store the audio data chunks
    const audioChunksRef = useRef([]);

    /**
     * Function to start recording audio.
     * It requests access to the user's microphone and initializes the MediaRecorder.
     */
    const startRecording = async () => {
        // Request access to the user's microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Initialize the MediaRecorder with the audio stream
        mediaRecorderRef.current = new MediaRecorder(stream);
        // Event handler for when audio data is available
        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };
        // Event handler for when recording stops
        mediaRecorderRef.current.onstop = () => {
            // Create a Blob from the audio data chunks
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            // Create a URL for the audio Blob
            const audioUrl = URL.createObjectURL(audioBlob);
            // Update the state with the audio URL
            setAudioURL(audioUrl);
            // Clear the audio data chunks
            audioChunksRef.current = [];
        };
        // Start recording
        mediaRecorderRef.current.start();
        // Update the state to indicate recording is in progress
        setIsRecording(true);
    };

    /**
     * Function to stop recording audio.
     * It stops the MediaRecorder and updates the state.
     */
    const stopRecording = () => {
        // Stop the MediaRecorder
        mediaRecorderRef.current.stop();
        // Update the state to indicate recording has stopped
        setIsRecording(false);
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
        </div>
    );
}

export default App;
