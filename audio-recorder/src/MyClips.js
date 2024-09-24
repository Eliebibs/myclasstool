import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { db } from './firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import './MyClips.css'; // Import the CSS file

function MyClips() {
    const [clips, setClips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClips = async () => {
            const auth = getAuth();
            const user = auth.currentUser;

            if (!user) {
                setError('User not authenticated');
                setLoading(false);
                return;
            }

            try {
                const userId = user.uid;
                const clipsCollectionRef = collection(db, 'users', userId, 'clips');
                const querySnapshot = await getDocs(clipsCollectionRef);

                const userClips = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setClips(userClips);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching clips:', err);
                setError('Error fetching clips. Please try again.');
                setLoading(false);
            }
        };

        fetchClips();
    }, []);

    if (loading) {
        return (
            <div className="my-clips">
                <div className="loading-spinner"></div>
                <p className="loading-message">Loading your clips...</p>
            </div>
        );
    }

    if (error) {
        return <div className="my-clips"><p className="error-message">Error: {error}</p></div>;
    }

    return (
        <div className="my-clips">
            <h1>My Clips</h1>
            <Link to="/">
                <button>Back to Home</button>
            </Link>
            {clips.length === 0 ? (
                <p className="no-clips-message">No clips found. Start recording to create some!</p>
            ) : (
                <div className="clips-container">
                    {clips.map((clip) => (
                        <div key={clip.id} className="clip-item">
                            <h3 className="clip-gist">{clip.gist}</h3>
                            <audio className="audio-player" controls src={clip.linkToClip}></audio>
                            <p className="clip-headline"><strong>Headline:</strong> {clip.headline}</p>
                            <p className="clip-summary"><strong>Summary:</strong> {clip.summary}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyClips;
