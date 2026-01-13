import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { toastService } from '../../utils/toast';
import { Calendar, Mail, Lock, ArrowRight, Loader } from 'lucide-react';
import './Login.css';

const Login = () => {
    const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                await loginWithEmail(email, password);
                toastService.success('Welcome back!');
            } else {
                await signupWithEmail(email, password);
                toastService.success('Account created successfully!');
            }
        } catch (error) {
            console.error(error);
            toastService.error(error.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            await loginWithGoogle();
            toastService.success('Welcome!');
        } catch (error) {
            console.error(error);
            toastService.error('Google sign-in failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-background">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>

            <motion.div
                className="login-card glass-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="login-header">
                    <div className="logo-icon large">
                        <Calendar size={32} />
                    </div>
                    <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                    <p>Sign in to continue to CalAI</p>
                </div>

                <button
                    className="google-btn glass-card"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                    <span>Continue with Google</span>
                </button>

                <div className="divider">
                    <span>or details</span>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <Mail size={18} className="input-icon" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="input-field"
                        />
                    </div>

                    <div className="input-group">
                        <Lock size={18} className="input-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="input-field"
                        />
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader className="animate-spin" size={20} />
                        ) : (
                            <>
                                {isLogin ? 'Sign In' : 'Sign Up'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            className="link-btn"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                    <div className="legal-links">
                        <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy</a>
                        <span className="dot">•</span>
                        <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms</a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
