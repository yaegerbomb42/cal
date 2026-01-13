import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { toastService } from '../../utils/toast';
import { Calendar, Mail, Lock, ArrowRight, Loader, Sparkles, Shield, Zap, CheckCircle } from 'lucide-react';
import './Login.css';

const Login = () => {
    const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showAuth, setShowAuth] = useState(false);

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
        <div className="landing-page">
            <div className="landing-bg">
                <div className="mesh-sphere sphere-1"></div>
                <div className="mesh-sphere sphere-2"></div>
            </div>

            <nav className="landing-nav">
                <div className="nav-logo">
                    <div className="logo-box">
                        <Calendar size={20} />
                    </div>
                    <span>CalAI</span>
                </div>
                <button onClick={() => setShowAuth(true)} className="nav-btn">Sign In</button>
            </nav>

            <main className="landing-content">
                <section className="hero-section">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hero-badge"
                    >
                        <Sparkles size={14} />
                        <span>Powered by Gemini 3.0</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        Master your schedule <br />
                        <span>with Ambient Intelligence</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="hero-desc"
                    >
                        CalAI is an intelligent productivity assistant that transforms natural language into perfectly
                        organized calendar events. Sync with Google Calendar, manage tasks with Gemini,
                        and reclaim your time.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="hero-actions"
                    >
                        <button onClick={() => setShowAuth(true)} className="cta-btn primary">
                            Get Started Free <ArrowRight size={18} />
                        </button>
                        <a href="#features" className="cta-btn secondary">Learn More</a>
                    </motion.div>
                </section>

                <section id="features" className="features-grid">
                    <div className="feature-card glass">
                        <Zap color="#6366f1" size={24} />
                        <h3>Smart Parsing</h3>
                        <p>Type "Dinner at 7 tomorrow" and let AI handle the date, time, and reminders automatically.</p>
                    </div>
                    <div className="feature-card glass">
                        <Shield color="#10b981" size={24} />
                        <h3>Google Sync</h3>
                        <p>Two-way synchronization with Google Calendar ensures your schedule is always up to date across devices.</p>
                    </div>
                    <div className="feature-card glass">
                        <Sparkles color="#8b5cf6" size={24} />
                        <h3>Gemini Core</h3>
                        <p>Utilizing Gemini 3.0 for deep natural language understanding and intelligent conflict detection.</p>
                    </div>
                </section>
            </main>

            <AnimatePresence>
                {showAuth && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="auth-overlay"
                        onClick={() => setShowAuth(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="auth-modal glass-card"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="login-header">
                                <h1>{isLogin ? 'Welcome Back' : 'Get Started'}</h1>
                                <p>Sign in to your CalAI workspace</p>
                            </div>

                            <button className="google-btn glass-card" onClick={handleGoogleLogin} disabled={isLoading}>
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" />
                                <span>Continue with Google</span>
                            </button>

                            <div className="divider"><span>or use email</span></div>

                            <form onSubmit={handleSubmit}>
                                <div className="input-group">
                                    <Mail size={18} className="input-icon" />
                                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                <div className="input-group">
                                    <Lock size={18} className="input-icon" />
                                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                                </div>
                                <button type="submit" className="submit-btn" disabled={isLoading}>
                                    {isLoading ? <Loader className="animate-spin" size={20} /> : (isLogin ? 'Sign In' : 'Sign Up')}
                                </button>
                            </form>

                            <button className="link-btn" onClick={() => setIsLogin(!isLogin)}>
                                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                            </button>

                            <button className="close-modal" onClick={() => setShowAuth(false)}><X size={20} /></button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <footer className="landing-footer">
                <div className="footer-content">
                    <p>&copy; 2026 CalAI. Created by yaegerbomb.</p>
                    <div className="footer-links">
                        <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                        <span className="dot">•</span>
                        <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

// Internal X icon component if not imported
const X = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

export default Login;
