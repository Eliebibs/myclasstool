import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { googleProvider } from './firebaseConfig';
import './LoginSignup.css'; // Import the CSS file for styling

function LoginSignup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user);
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleSignup = async () => {
        const auth = getAuth();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            alert('Sign up successful!');
        } catch (error) {
            setError(error.message);
        }
    };

    const handleLogin = async () => {
        const auth = getAuth();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            alert('Login successful!');
        } catch (error) {
            setError(error.message);
        }
    };

    const handleGoogleSignIn = async () => {
        const auth = getAuth();
        try {
            await signInWithPopup(auth, googleProvider);
            alert('Google Sign-In successful!');
        } catch (error) {
            setError(error.message);
        }
    };

    const handleLogout = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            alert('Logout successful!');
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="login-signup-container">
            <h2>Login / Sign Up</h2>
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
                <button className="signup-button" onClick={handleSignup}>Sign Up</button>
                <button className="google-signin-button" onClick={handleGoogleSignIn}>Sign In with Google</button>
                {user && <button className="logout-button" onClick={handleLogout}>Logout</button>}
            </div>
            {user && <p className="user-email">Logged in as: {user.email}</p>}
            <Link to="/">
                <button className="back-button">Back to Home</button>
            </Link>
        </div>
    );
}

export default LoginSignup;
