import { useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';
import { AuthContext } from './authContext';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initialize Auth listener
        const unsubscribe = firebaseService.onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => firebaseService.loginWithGoogle();

    const loginWithEmail = async (email, password) => firebaseService.loginWithEmail(email, password);

    const signupWithEmail = async (email, password) => firebaseService.signupWithEmail(email, password);

    const logout = async () => {
        await firebaseService.logout();
    };

    const value = {
        user,
        loading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
