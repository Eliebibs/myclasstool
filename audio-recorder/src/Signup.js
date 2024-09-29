import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, storage } from './firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import './LoginSignup.css';

function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [testingCode, setTestingCode] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const createUserDocument = async (user, additionalData = {}) => {
        try {
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                name: additionalData.name || user.displayName || '',
                schoolName: additionalData.schoolName || '',
                ...additionalData
            });
            console.log("User document created");
        } catch (error) {
            console.error("Error creating user document: ", error);
        }
    };

    const createUserStorageFolder = async (user) => {
        try {
            const storageRef = ref(storage, user.uid + '/placeholder.txt');
            const placeholderFile = new Blob(['This is a placeholder file'], { type: 'text/plain' });
            await uploadBytes(storageRef, placeholderFile);
            console.log("User storage folder created");
        } catch (error) {
            console.error("Error creating user storage folder: ", error);
        }
    };

    const handleSignup = async () => {
        if (testingCode !== 'cutclass18') {
            setError('Invalid testing code');
            return;
        }

        const auth = getAuth();
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await createUserDocument(user, { name, schoolName });
            await createUserStorageFolder(user);
            navigate('/home'); // Redirect to the dashboard
        } catch (error) {
            setError(error.message);
        }
    };

    const handleGoogleSignUp = async () => {
        if (testingCode !== 'cutclass18') {
            setError('Invalid testing code');
            return;
        }

        const auth = getAuth();
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            await createUserDocument(user, { schoolName });
            await createUserStorageFolder(user);
            navigate('/home'); // Redirect to the dashboard
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="login-signup-container">
            <div className="how-it-works">
                <h2>How ClassCut Works</h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h3>Record Your Lecture</h3>
                            <p>Use our easy-to-use interface to record your class or lecture.</p>
                        </div>
                    </div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h3>AI-Powered Transcription</h3>
                            <p>Our advanced AI transcribes and analyzes your recording.</p>
                        </div>
                    </div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h3>Generate Smart Clips</h3>
                            <p>ClassCut automatically creates concise, topic-based clips from your lecture.</p>
                        </div>
                    </div>
                    <div className="step">
                        <div className="step-number">4</div>
                        <div className="step-content">
                            <h3>Review and Share</h3>
                            <p>Access your organized clips for easy review and sharing.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="auth-section">
                <h2>Sign Up</h2>
                <div className="input-container">
                    <input
                        type="text"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="School Name"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Beta Testing Code"
                        value={testingCode}
                        onChange={(e) => setTestingCode(e.target.value)}
                    />
                </div>
                {error && <p className="error-text">{error}</p>}
                <div className="button-container">
                    <button className="signup-button" onClick={handleSignup}>Sign Up</button>
                    <button className="google-signin-button" onClick={handleGoogleSignUp}>Sign Up with Google</button>
                </div>
                <p className="login-link">Already have an account? <Link to="/login">Login</Link></p>
                <Link to="/" className="back-link">
                    Back to Home
                </Link>
            </div>
        </div>
    );
}

export default Signup;
