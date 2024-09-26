import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import './MyClips.css'; // Import the CSS file

function MyClips() {
    const [clips, setClips] = useState({});
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
                const db = getFirestore();
                const userDocRef = doc(db, 'users', user.uid);
                console.log('User Doc Ref:', userDocRef.path);

                const userDoc = await getDoc(userDocRef);
                if (!userDoc.exists()) {
                    setError('User document does not exist');
                    setLoading(false);
                    return;
                }

                const userData = userDoc.data();
                const subjects = userData.subjects || [];
                console.log('Subjects:', subjects);

                const clipsBySubject = {};

                for (const subject of subjects) {
                    console.log('Processing subject:', subject);

                    const clipsCollectionRef = collection(userDocRef, subject);
                    console.log('Clips Collection Ref:', clipsCollectionRef.path);

                    const querySnapshot = await getDocs(clipsCollectionRef);
                    console.log('Query Snapshot for subject', subject, ':', querySnapshot.docs.map(doc => doc.id));

                    const subjectClips = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    console.log('Subject Clips:', subjectClips);

                    clipsBySubject[subject] = subjectClips;
                }

                console.log('Clips by Subject:', clipsBySubject);
                setClips(clipsBySubject);
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
            {Object.keys(clips).length === 0 ? (
                <p className="no-clips-message">No clips found. Start recording to create some!</p>
            ) : (
                Object.keys(clips).map(subject => (
                    <div key={subject} className="subject-section">
                        <h2>{subject}</h2>
                        <div className="clips-container">
                            {clips[subject].map((clip) => (
                                <div key={clip.id} className="clip-item">
                                    <h3 className="clip-gist">{clip.gist}</h3>
                                    <audio className="audio-player" controls src={clip.linkToClip}></audio>
                                    <p className="clip-headline"><strong>Headline:</strong> {clip.headline}</p>
                                    <p className="clip-summary"><strong>Summary:</strong> {clip.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default MyClips;
