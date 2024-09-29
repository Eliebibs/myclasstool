import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { googleProvider } from './firebaseConfig';
import './LoginSignup.css';

function LoginSignup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user);
                navigate('/home'); // Redirect to dashboard when user is authenticated
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleGoogleSignIn = async () => {
        const auth = getAuth();
        try {
            await signInWithPopup(auth, googleProvider);
            // No need for alert here, as useEffect will handle the redirection
        } catch (error) {
            setError(error.message);
        }
    };

    const handleLogin = async () => {
        const auth = getAuth();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // No need for alert here, as useEffect will handle the redirection
        } catch (error) {
            setError(error.message);
        }
    };

    const handleLogout = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            // No need for alert here, as useEffect will handle the state change
        } catch (error) {
            setError(error.message);
        }
    };

    // If user is already logged in, redirect to dashboard
    if (user) {
        return null; // or you could render a loading spinner here
    }

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
                <h2>Login</h2>
                <div className="input-container">
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
                </div>
                {error && <p className="error-text">{error}</p>}
                <div className="button-container">
                    <button className="login-button" onClick={handleLogin}>Login</button>
                    <button className="google-signin-button" onClick={handleGoogleSignIn}>Sign In with Google</button>
                    {user && <button className="logout-button" onClick={handleLogout}>Logout</button>}
                </div>
                {user && <p className="user-email">Logged in as: {user.email}</p>}
                <p className="signup-link">Don't have an account? <Link to="/signup">Sign Up</Link></p>
                <Link to="/" className="back-link">
                    Back to Home
                </Link>
            </div>
        </div>
    );
}

export default LoginSignup;
