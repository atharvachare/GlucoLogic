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
  ShieldCheck,
  AlarmClock,
  Zap
} from 'lucide-react';
import Onboarding from '../components/Onboarding';
import { Link } from 'react-router-dom';

const HypoTimer = ({ lastLogTime }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const logTime = new Date(lastLogTime);
      const diffMs = now - logTime;
      const fifteenMins = 15 * 60 * 1000;
      const remaining = Math.max(0, fifteenMins - diffMs);
      setTimeLeft(Math.floor(remaining / 1000));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [lastLogTime]);

  if (timeLeft <= 0) {
    return (
      <div className="glass-card animate-pulse" style={{ padding: '20px', background: 'var(--success)', color: 'white', marginBottom: '30px', border: 'none' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlarmClock /> 15 Minutes Up!
        </h3>
        <p>Please RE-CHECK your sugar now. If it is still under 80, consume another 15g of sugar.</p>
      </div>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="glass-card" style={{ padding: '20px', background: 'var(--danger)', color: 'white', marginBottom: '30px', border: 'none' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ActivityIcon /> Hypo Recovery (15-15 Rule)
      </h3>
      <p style={{ marginBottom: '10px' }}>Eat 15g sugar and wait. Re-check in:</p>
      <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'monospace' }}>
        {mins}:{secs < 10 ? '0' : ''}{secs}
      </div>
    </div>
  );
};

const Dashboard = ({ user, setUser }) => {
  const [stats, setStats] = useState({ avg_isf: 0, confidence_score: 'Low', total_logs: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [healthInfo, setHealthInfo] = useState(null);
  const [lifestyle, setLifestyle] = useState({ activity_level: 'None' });
  const [risk, setRisk] = useState('Low');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentGlucose, setCurrentGlucose] = useState('');
  const [currentCarbs, setCurrentCarbs] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  };

  useEffect(() => {
    fetchDashboardData();
    if ("Notification" in window && Notification.permission === "default") {
      requestNotificationPermission();
    }
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
      const resp = await api.get(`/suggestions?current_glucose=${currentGlucose}&carbs=${currentCarbs || 0}`);
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

        {/* Hypo Alert Timer */}
        {recentLogs[0] && recentLogs[0].glucose_before < 70 && (new Date() - new Date(recentLogs[0].timestamp)) < 60 * 60 * 1000 && (
          <HypoTimer lastLogTime={recentLogs[0].timestamp} />
        )}

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
            <BrainCircuit className="text-primary" /> Multi-Dose Suggestion
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="number" 
                className="input-field" 
                placeholder="Glucose (mg/dL)" 
                value={currentGlucose}
                onChange={(e) => {
                  setCurrentGlucose(e.target.value);
                  setSuggestion(null);
                }}
              />
              <input 
                type="number" 
                className="input-field" 
                placeholder="Carbs (grams)" 
                value={currentCarbs}
                onChange={(e) => {
                  setCurrentCarbs(e.target.value);
                  setSuggestion(null);
                }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleGetSuggestion} disabled={loadingSuggestion} style={{ width: '100%', justifyContent: 'center' }}>
              {loadingSuggestion ? 'Thinking...' : 'Calculate Safe Dose'}
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
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '5px' }}>Total Suggested Dose:</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'Outfit', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    {suggestion.suggestion} <span style={{ fontSize: '1rem', fontWeight: '400' }}>Units</span>
                  </div>
                  
                  {/* Detailed Breakdown */}
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid hsla(0,0%,100%,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                    <div>
                      <span className="text-dim">Correction:</span> {suggestion.doses?.netCorrection} U
                    </div>
                    <div>
                      <span className="text-dim">Meal Dose:</span> {suggestion.doses?.meal} U
                    </div>
                  </div>

                  {suggestion.iob > 0 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600' }}>
                      <ActivityIcon size={14} /> IOB: {suggestion.iob} units active
                    </div>
                  )}
                </>
              )}
              <div style={{ fontSize: '0.8rem', marginTop: '12px', color: 'var(--text-dim)', fontStyle: 'italic', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {suggestion.iobAdjustment && <span>• {suggestion.iobAdjustment}</span>}
                {suggestion.activityAdjustment && <span>• {suggestion.activityAdjustment}</span>}
                {!suggestion.iobAdjustment && !suggestion.activityAdjustment && (
                  <span>{suggestion.reason || `Using CIR ${suggestion.cir} and ISF ${suggestion.isf}`}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Health Stats */}
        <div className="glass-card" style={{ padding: '25px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <TrendingDown className="text-success" /> Body Response
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ padding: '15px', background: 'hsla(222, 47%, 5%, 0.3)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Personal ISF</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.avg_isf > 0 ? stats.avg_isf.toFixed(2) : '--'}</div>
                <div style={{ fontSize: '0.7rem' }}>mg/dL drop per unit</div>
              </div>
              <div style={{ padding: '15px', background: 'hsla(222, 47%, 5%, 0.3)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Confidence Score</div>
                <div style={{ 
                  fontSize: '1.2rem', 
                  fontWeight: '700',
                  color: stats.confidence_score === 'High' ? 'var(--success)' : stats.confidence_score === 'Medium' ? 'var(--warning)' : 'var(--text-dim)'
                }}>
                  <Zap size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {stats.confidence_score}
                </div>
                <div style={{ fontSize: '0.7rem' }}>{stats.total_logs} verified entries</div>
              </div>
            </div>

            {/* Learning Progress Bar */}
            <div style={{ padding: '15px', background: 'hsla(0,0%,100%,0.03)', borderRadius: 'var(--radius)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span>🧬 Learning Progress</span>
                <span className="text-primary">{Math.min(100, Math.floor((stats.total_logs / 20) * 100))}%</span>
              </div>
              <div style={{ height: '8px', background: 'hsla(0,0%,100%,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: 'var(--primary)', 
                  width: `${Math.min(100, (stats.total_logs / 20) * 100)}%`,
                  transition: 'width 1s ease-out',
                  boxShadow: '0 0 10px var(--primary)'
                }}></div>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                {stats.total_logs >= 20 
                  ? "Max accuracy reached! System knows your body well." 
                  : `Log ${20 - stats.total_logs} more meals to unlock High Precision mode.`}
              </p>
            </div>
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

      {/* Disclaimer and Streak */}
      <div style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '120px', color: 'var(--text-dim)', fontSize: '0.8rem', lineHeight: '1.4' }}>
        <p>⚠️ DISCLAIMER: This system is for educational purposes only. Not a medical device.</p>
        <p style={{ marginTop: '5px' }}>Streak: <Flame size={14} color="orange" style={{ verticalAlign: 'middle' }} /> 5 Days</p>
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
