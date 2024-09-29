import React from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Account() {
    const auth = getAuth();
    const user = auth.currentUser;
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error('Error signing out: ', error);
        }
    };

    return (
        <div className="account-page">
            <h1>Account</h1>
            {user && (
                <div>
                    <p>Email: {user.email}</p>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            )}
        </div>
    );
}

export default Account;
