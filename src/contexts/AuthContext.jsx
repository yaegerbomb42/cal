import { createContext, useContext, useState, useEffect } from 'react';
import { firebaseService } from '../services/firebaseService';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

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

    const loginWithGoogle = async () => {
        try {
            return await firebaseService.loginWithGoogle();
        } catch (error) {
            throw error;
        }
    };

    const loginWithEmail = async (email, password) => {
        try {
            return await firebaseService.loginWithEmail(email, password);
        } catch (error) {
            throw error;
        }
    };

    const signupWithEmail = async (email, password) => {
        try {
            return await firebaseService.signupWithEmail(email, password);
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            await firebaseService.logout();
        } catch (error) {
            throw error;
        }
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
