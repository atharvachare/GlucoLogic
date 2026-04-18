import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/forgot-password', { email });
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '450px', textAlign: 'center' }}>
                    <div style={{ marginBottom: '20px', color: 'var(--success)' }}>
                        <CheckCircle size={60} style={{ margin: '0 auto' }} />
                    </div>
                    <h2 style={{ marginBottom: '15px' }}>Reset Link Sent!</h2>
                    <p style={{ color: 'var(--text-dim)', marginBottom: '30px' }}>
                        If an account exists for {email}, we have sent a password reset link to that address.
                    </p>
                    <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '450px' }}>
                <div style={{ marginBottom: '25px' }}>
                    <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-dim)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '20px' }}>
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                    <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Reset Password</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                {error && <div className="text-danger" style={{ marginBottom: '20px' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                            <input 
                                type="email" 
                                className="input-field" 
                                style={{ paddingLeft: '40px' }}
                                placeholder="name@example.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
