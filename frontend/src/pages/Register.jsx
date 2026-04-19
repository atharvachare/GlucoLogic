import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { UserPlus, User, Mail, Lock, Activity, Scale, HeartPulse } from 'lucide-react';
import logo from '../assets/logo.png';

const Register = ({ setUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    weight: '',
    diabetes_type: 'Type 1'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resp = await api.post('/auth/register', formData);
      localStorage.setItem('token', resp.data.token);
      localStorage.setItem('user', JSON.stringify(resp.data.user));
      setUser(resp.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '40px 20px' }}>
      <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '600px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src={logo} alt="GlucoLogic" style={{ height: '70px', width: 'auto', marginBottom: '15px' }} />
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Join the Journey</h1>
          <p style={{ color: 'var(--text-dim)' }}>Personalized health monitoring starts here</p>
        </div>

        {error && <div className="text-danger" style={{ marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <input 
                  name="name"
                  className="input-field" 
                  style={{ paddingLeft: '40px' }}
                  placeholder="John Doe" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <input 
                  type="email" 
                  name="email"
                  className="input-field" 
                  style={{ paddingLeft: '40px' }}
                  placeholder="john@example.com" 
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <input 
                  type="password" 
                  name="password"
                  className="input-field" 
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Diabetes Type</label>
              <div style={{ position: 'relative' }}>
                <HeartPulse size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <select 
                  name="diabetes_type"
                  className="input-field" 
                  style={{ paddingLeft: '40px' }}
                  value={formData.diabetes_type}
                  onChange={handleChange}
                >
                  <option value="Type 1">Type 1</option>
                  <option value="Type 2">Type 2</option>
                  <option value="Gestational">Gestational</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Age</label>
              <div style={{ position: 'relative' }}>
                <Activity size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <input 
                  type="number"
                  name="age"
                  className="input-field" 
                  style={{ paddingLeft: '40px' }}
                  placeholder="25" 
                  value={formData.age}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Weight (kg)</label>
              <div style={{ position: 'relative' }}>
                <Scale size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <input 
                  type="number" 
                  name="weight"
                  className="input-field" 
                  style={{ paddingLeft: '40px' }}
                  placeholder="70" 
                  value={formData.weight}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Creating Account...' : <><UserPlus size={18} /> Create Account</>}
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center', color: 'var(--text-dim)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Log In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
