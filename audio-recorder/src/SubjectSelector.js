import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc } from 'firebase/firestore';
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
                    const subjectsCollectionRef = collection(userDocRef, 'subjects');
                    const subjectsSnapshot = await getDocs(subjectsCollectionRef);
                    const subjectsList = subjectsSnapshot.docs.map(doc => doc.id);
                    setSubjects(subjectsList);
                    console.log('Fetched subjects:', subjectsList);
                } catch (error) {
                    console.log('No subjects found or error fetching subjects:', error);
                    setSubjects([]);
                }
            }
        };

        fetchSubjects();
    }, []);

    const handleSave = () => {
        const subjectToSave = selectedSubject || newSubject;
        console.log('Attempting to save subject:', subjectToSave);
        if (subjectToSave && subjectToSave.trim() !== '') {
            console.log('Saving subject:', subjectToSave.trim());
            onSave(subjectToSave.trim());
        } else {
            console.error('Attempted to save empty subject');
            alert('Please select or create a valid subject');
        }
    };

    return (
        <div className="subject-selector-overlay">
            <div className="subject-selector-content">
                <h2>Choose a Subject</h2>
                {subjects.length > 0 ? (
                    <select 
                        value={selectedSubject} 
                        onChange={(e) => setSelectedSubject(e.target.value)}
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
