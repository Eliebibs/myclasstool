import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing-page">
            <header className="header">
                <div className="header-content">
                    <div className="logo">ClassCut</div>
                    <nav className="nav">
                        <Link to="/">Home</Link>
                        <Link to="/login-signup">Login</Link>
                        <Link to="/my-clips">My Clips</Link>
                        <a href="#features">Features</a>
                        <a href="#how-it-works">How It Works</a>
                        <a href="#contact">Contact</a>
                    </nav>
                    <button className="nav-cta">Try for Free</button>
                </div>
            </header>

            <section className="hero">
                <div className="hero-content">
                    <h1>Revolutionize Your<br />Note-Taking Experience</h1>
                    <p>Transform lengthy lectures into organized, topic-focused notes effortlessly.</p>
                    <div className="hero-cta">
                        <button className="cta-button primary">Get Started</button>
                        <button className="cta-button secondary">Learn More</button>
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

            <section className="cta">
                <h2>Experience the Future of Note-Taking</h2>
                <p>Join thousands of students revolutionizing their study habits.</p>
                <form className="cta-form">
                    <input type="email" placeholder="Enter your email" required />
                    <button type="submit">Join the Waiting List</button>
                </form>
            </section>

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-links">
                        <a href="#privacy-policy">Privacy Policy</a>
                        <a href="#terms-of-service">Terms of Service</a>
                        <a href="#contact">Contact Us</a>
                    </div>
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
