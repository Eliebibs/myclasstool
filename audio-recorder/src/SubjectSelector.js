import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import './SubjectSelector.css';

function SubjectSelector({ onClose, onSave }) {
    const [selectedSubject, setSelectedSubject] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        const fetchSubjects = async () => {
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
                try {
                    const db = getFirestore();
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const subjectNames = userData.subjects || [];
                        setSubjects(subjectNames);
                        console.log('Fetched subjects:', subjectNames);
                    } else {
                        console.log('No user document found');
                        setSubjects([]);
                    }
                } catch (error) {
                    console.log('Error fetching subjects:', error);
                    setSubjects([]);
                }
            }
        };

        fetchSubjects();
    }, []);

    const handleSave = async () => {
        const subjectToSave = selectedSubject || newSubject;
        console.log('Attempting to save subject:', subjectToSave);
        if (subjectToSave && subjectToSave.trim() !== '') {
            const trimmedSubject = subjectToSave.trim();
            const auth = getAuth();
            const user = auth.currentUser;
            if (user) {
                const db = getFirestore();
                const userDocRef = doc(db, 'users', user.uid);
                if (!subjects.includes(trimmedSubject)) {
                    console.log('Saving new subject:', trimmedSubject);
                    await updateDoc(userDocRef, {
                        subjects: arrayUnion(trimmedSubject)
                    });
                    setSubjects([...subjects, trimmedSubject]);
                }
                onSave(trimmedSubject);
            }
        } else {
            console.error('Attempted to save empty subject');
            alert('Please select or create a valid subject');
        }
    };

    const handleSelectChange = (e) => {
        setSelectedSubject(e.target.value);
        setNewSubject(''); // Clear the new subject input when an existing subject is selected
    };

    return (
        <div className="subject-selector-overlay">
            <div className="subject-selector-content">
                <h2>Choose a Subject</h2>
                {subjects.length > 0 ? (
                    <select 
                        value={selectedSubject} 
                        onChange={handleSelectChange}
                    >
                        <option value="">Select a subject</option>
                        {subjects.map((subject, index) => (
                            <option key={index} value={subject}>{subject}</option>
                        ))}
                    </select>
                ) : (
                    <p>No existing subjects. Please create a new one.</p>
                )}
                <div className="new-subject-input">
                    <input 
                        type="text" 
                        placeholder="Create a new subject"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        disabled={selectedSubject !== ''} // Disable input if an existing subject is selected
                    />
                </div>
                <div className="button-container">
                    <button onClick={handleSave}>Done</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

export default SubjectSelector;
