import { useState, useEffect } from 'react';
import api from '../api';
import GlucoseChart from '../components/GlucoseChart';
import LogEntryModal from '../components/LogEntryModal';
import { 
  Plus, 
  TrendingDown, 
  BrainCircuit, 
  History, 
  LogOut, 
  Flame, 
  AlertTriangle,
  Info,
  User as UserIcon,
  Activity as ActivityIcon,
  ShieldCheck
} from 'lucide-react';
import Onboarding from '../components/Onboarding';
import { Link } from 'react-router-dom';

const Dashboard = ({ user, setUser }) => {
  const [stats, setStats] = useState({ avg_effectiveness: 0, confidence_score: 'Low', total_logs: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [healthInfo, setHealthInfo] = useState(null);
  const [lifestyle, setLifestyle] = useState({ activity_level: 'None' });
  const [risk, setRisk] = useState('Low');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentGlucose, setCurrentGlucose] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const resp = await api.get('/dashboard');
      setStats(resp.data.stats);
      setRecentLogs(resp.data.recentLogs);
      setHealthInfo(resp.data.health);
      setLifestyle(resp.data.lifestyle);
      setRisk(resp.data.risk);
      
      if (!resp.data.health) {
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  const handleGetSuggestion = async () => {
    if (!currentGlucose) return;
    setLoadingSuggestion(true);
    try {
      const resp = await api.get(`/suggestions?current_glucose=${currentGlucose}`);
      setSuggestion(resp.data);
    } catch (err) {
      console.error('Failed to get suggestion', err);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const toggleMode = async () => {
    const newMode = user.mode === 'kids' ? 'adult' : 'kids';
    try {
      await api.put('/auth/profile', { mode: newMode });
      const updatedUser = { ...user, mode: newMode };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      console.error('Failed to update mode', err);
    }
  };

  return (
    <div className={user.mode === 'kids' ? 'kids-mode' : ''} style={{ minHeight: '100vh', transition: 'all 0.5s ease' }}>
      <div className="container animate-fade-in" style={{ paddingBottom: '100px' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingTop: '20px' }}>
          <div>
            <h1 style={{ fontSize: user.mode === 'kids' ? '2.5rem' : '2rem' }}>
              {user.mode === 'kids' ? '🚀 Hero ' : 'Hello, '}{user.name}
            </h1>
            <p style={{ color: 'var(--text-dim)' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <Link to="/profile" className="btn btn-outline"><UserIcon size={18} /> Profile</Link>
            <button className="btn btn-outline" onClick={toggleMode}>
              {user.mode === 'kids' ? '🧒 Kids Mode On' : '🧑 Adult Mode'}
            </button>
            <button className="btn btn-outline" onClick={handleLogout}><LogOut size={18} /> Logout</button>
          </div>
        </header>

        {showOnboarding && <Onboarding onComplete={() => {
          setShowOnboarding(false);
          fetchDashboardData();
        }} />}

        {user.mode === 'kids' && (
          <div className="glass-card animate-fade-in" style={{ padding: '15px', marginBottom: '30px', background: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '1.2rem', fontWeight: 'bold' }}>
            <span>🌟 Points: {stats.total_logs * 10}</span>
            <span>🔥 Streak: 5 Days</span>
            <span>🏆 Badge: Super Tracker</span>
          </div>
        )}

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {/* Suggestion Card */}
        <div className="glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BrainCircuit className="text-primary" /> Insulin Suggestion
          </h3>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="number" 
              className="input-field" 
              placeholder="Current Glucose" 
              value={currentGlucose}
              onChange={(e) => setCurrentGlucose(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleGetSuggestion} disabled={loadingSuggestion}>
              {loadingSuggestion ? '...' : 'Suggest'}
            </button>
          </div>

          {suggestion && (
            <div className="animate-fade-in" style={{ padding: '15px', borderRadius: 'var(--radius)', background: 'hsla(210, 100%, 50%, 0.1)', border: '1px solid hsla(210, 100%, 50%, 0.2)' }}>
              {suggestion.alert ? (
                <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  <AlertTriangle size={20} /> {suggestion.alert}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '5px' }}>Suggested Dose:</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'Outfit' }}>
                    {suggestion.suggestion} <span style={{ fontSize: '1rem', fontWeight: '400' }}>Units</span>
                  </div>
                </>
              )}
              <p style={{ fontSize: '0.8rem', marginTop: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                {suggestion.reason || `Based on target 120 and your effectiveness (${suggestion.effectiveness} mg/dL drop per unit)`}
              </p>
            </div>
          )}
        </div>

        {/* Health Stats */}
        <div className="glass-card" style={{ padding: '25px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <TrendingDown className="text-success" /> Body Response
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ padding: '15px', background: 'hsla(222, 47%, 5%, 0.3)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Avg Effectiveness</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.avg_effectiveness ? stats.avg_effectiveness.toFixed(2) : '--'}</div>
              <div style={{ fontSize: '0.7rem' }}>mg/dL drop per unit</div>
            </div>
            <div style={{ padding: '15px', background: 'hsla(222, 47%, 5%, 0.3)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Confidence Score</div>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: '700',
                color: stats.confidence_score === 'High' ? 'var(--success)' : stats.confidence_score === 'Medium' ? 'var(--warning)' : 'var(--text-dim)'
              }}>
                {stats.confidence_score}
              </div>
              <div style={{ fontSize: '0.7rem' }}>{stats.total_logs} verified entries</div>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', padding: '10px', borderLeft: '3px solid var(--primary)', background: 'hsla(0,0%,100%,0.03)', fontSize: '0.8rem' }}>
            <Info size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
            Current Effectiveness is weighted towards recent data.
          </div>
        </div>

        {/* Profile Insights Card */}
        <div className="glass-card" style={{ padding: '25px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <ShieldCheck className="text-primary" /> Profile Insights
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <div style={{ padding: '12px', background: 'hsla(0,0%,100%,0.05)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-dim">BMI Status</span>
              <span style={{ 
                fontWeight: 'bold', 
                color: !healthInfo?.bmi ? 'white' : (healthInfo.bmi > 25 ? 'var(--warning)' : (healthInfo.bmi < 18.5 ? 'var(--warning)' : 'var(--success)'))
              }}>
                {healthInfo?.bmi ? `${healthInfo.bmi} (${healthInfo.bmi > 25 ? 'Overweight' : (healthInfo.bmi < 18.5 ? 'Underweight' : 'Normal')})` : 'Set in Profile'}
              </span>
            </div>
            <div style={{ padding: '12px', background: 'hsla(0,0%,100%,0.05)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-dim">Activity Impact</span>
              <span style={{ fontWeight: 'bold' }}>{lifestyle?.activity_level}</span>
            </div>
            <div style={{ padding: '12px', background: 'hsla(0,0%,100%,0.05)', borderRadius: 'var(--radius)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-dim">Log Risk Indicator</span>
              <span style={{ 
                fontWeight: 'bold', 
                color: risk === 'High' ? 'var(--danger)' : (risk === 'Medium' ? 'var(--warning)' : 'var(--success)')
              }}>{risk} Risk</span>
            </div>
          </div>
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
             <Link to="/profile" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Update profile for better accuracy →</Link>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="glass-card" style={{ padding: '25px', marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>Glucose Trends</h3>
        <GlucoseChart data={recentLogs} />
      </div>

      {/* Bottom Bar / Quick Actions */}
      <div style={{ 
        position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: '15px', zIndex: 100
      }}>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ height: '60px', padding: '0 30px', borderRadius: '30px', boxShadow: '0 10px 20px rgba(0,0,0,0.4)' }}>
          <Plus size={24} /> Log Data
        </button>
        <Link to="/history" className="btn btn-outline" style={{ height: '60px', padding: '0 30px', borderRadius: '30px', background: 'var(--background)' }}>
          <History size={24} /> History
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
        <p>⚠️ DISCLAIMER: This system is for educational purposes only. Not a medical device.</p>
        <p>Streak: <Flame size={14} color="orange" /> 5 Days</p>
      </div>

      <LogEntryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onLogAdded={() => {
          fetchDashboardData();
          setIsModalOpen(false);
        }}
      />
      </div>
    </div>
  );
};

export default Dashboard;
