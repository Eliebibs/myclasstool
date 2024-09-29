import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from './firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
import './LandingPage.css';

const LandingPage = ({ user }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToWaitlist = () => {
        const waitlistSection = document.getElementById('waitlist');
        waitlistSection.scrollIntoView({ behavior: 'smooth' });
    };

    const handleWaitlistSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            setMessage('Please enter a valid email address.');
            return;
        }

        try {
            const docRef = await addDoc(collection(db, 'waitlist'), {
                email: email
            });
            setMessage('Thank you for joining our waitlist!');
            setEmail('');
        } catch (error) {
            console.error('Error adding to waitlist: ', error);
            setMessage('An error occurred. Please try again later.');
        }
    };

    return (
        <div className="landing-page">
            <header className="header">
                <div className="header-content">
                    <Link to="/" className="logo">ClassCut</Link>
                    <nav className="nav">
                        {user ? (
                            <Link to="/home">Dashboard</Link>
                        ) : (
                            <a href="#" onClick={scrollToTop}>Home</a>
                        )}
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How It Works</a>
                    </nav>
                    <div className="signup-section">
                        {user ? (
                            <Link to="/account" className="nav-cta">Account</Link>
                        ) : (
                            <>
                                <span className="tester-code">Have a tester code?</span>
                                <Link to="/signup" className="nav-cta">Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <section className="hero">
                <div className="hero-content">
                    <h1>Revolutionize Your<br />Note-Taking Experience</h1>
                    <p>Transform lengthy lectures into organized, topic-focused notes effortlessly.</p>
                    <div className="hero-cta">
                        <button className="cta-button primary" onClick={scrollToWaitlist}>Get Started</button>
                    </div>
                </div>
            </section>

            <section id="features" className="features">
                <h2>Features</h2>
                <div className="feature-grid">
                    <div className="feature-card">
                        <i className="fas fa-clock"></i>
                        <h3>Time-Saving</h3>
                        <p>Automate note-taking and focus on what truly matters.</p>
                    </div>
                    <div className="feature-card">
                        <i className="fas fa-sitemap"></i>
                        <h3>Topic Organization</h3>
                        <p>Navigate through your notes with unparalleled ease.</p>
                    </div>
                    <div className="feature-card">
                        <i className="fas fa-headphones"></i>
                        <h3>Audio Integration</h3>
                        <p>Access summaries and key points instantly.</p>
                    </div>
                    <div className="feature-card">
                        <i className="fas fa-brain"></i>
                        <h3>Enhanced Learning</h3>
                        <p>Simplify study sessions and improve retention.</p>
                    </div>
                    <div className="feature-card">
                        <i className="fas fa-robot"></i>
                        <h3>AI-Powered</h3>
                        <p>Leverage cutting-edge AI technology for smarter notes.</p>
                    </div>
                    <div className="feature-card">
                        <i className="fas fa-bolt"></i>
                        <h3>Fast & Affordable</h3>
                        <p>Premium features without the premium price tag.</p>
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="how-it-works">
                <h2>How It Works</h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h3>Record</h3>
                        <p>Capture lectures or meetings with a single tap.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h3>Process</h3>
                        <p>Our AI transcribes and organizes your notes intelligently.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h3>Review</h3>
                        <p>Access concise, topic-based summaries anytime, anywhere.</p>
                    </div>
                </div>
            </section>

            <section id="waitlist" className="cta">
                <h2>Experience the Future of Note-Taking</h2>
                <p>Join thousands of students revolutionizing their study habits.</p>
                <form className="cta-form" onSubmit={handleWaitlistSubmit}>
                    <input 
                        type="email" 
                        placeholder="Enter your email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button type="submit">Join the Waiting List</button>
                </form>
                {message && <p className="message">{message}</p>}
            </section>

            <footer className="footer">
                <div className="footer-content">
                    <div className="social-media">
                        <a href="#" className="social-icon"><i className="fab fa-facebook"></i></a>
                        <a href="#" className="social-icon"><i className="fab fa-twitter"></i></a>
                        <a href="#" className="social-icon"><i className="fab fa-instagram"></i></a>
                    </div>
                </div>
                <div className="copyright">
                    © 2023 ClassCut. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
