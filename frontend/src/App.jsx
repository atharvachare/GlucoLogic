import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        background: 'var(--background)',
        gap: '40px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{ animation: 'zoomIn 1.5s ease-out forwards, float 3s ease-in-out infinite 1.5s' }}>
          <img src="/src/assets/logo.png" alt="GlucoLogic" style={{ height: '100px', width: 'auto' }} />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>GlucoLogic</h1>
          <p style={{ color: 'var(--text-dim)', maxWidth: '400px', margin: '0 auto' }}>
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register setUser={setUser} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/" element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" />} />
      <Route path="/history" element={user ? <History user={user} /> : <Navigate to="/login" />} />
      <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
