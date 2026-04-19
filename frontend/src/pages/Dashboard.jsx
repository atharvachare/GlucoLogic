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
import logo from '../assets/logo.png';

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
  const [pageLoading, setPageLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
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
    } finally {
      setPageLoading(false);
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

  if (pageLoading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        background: 'var(--background)',
        gap: '20px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div className="spin" style={{ 
          width: '50px', 
          height: '50px', 
          border: '4px solid var(--glass-border)', 
          borderTopColor: 'var(--primary)', 
          borderRadius: '50%' 
        }} />
        <div>
          <h2 style={{ marginBottom: '8px' }}>Waking up database...</h2>
          <p style={{ color: 'var(--text-dim)', maxWidth: '300px' }}>
            Our server is warming up on Render's free tier. This usually takes 30-40 seconds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={user.mode === 'kids' ? 'kids-mode' : ''} style={{ minHeight: '100vh', transition: 'all 0.5s ease' }}>
      <div className="container animate-fade-in" style={{ paddingBottom: '100px' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <img src={logo} alt="GlucoLogic" style={{ height: '60px', width: 'auto' }} />
            <div>
              <h1 style={{ fontSize: user.mode === 'kids' ? '2.5rem' : '2rem', lineHeight: '1.2' }}>
                {user.mode === 'kids' ? '🚀 Hero ' : 'Hello, '}{user.name}
              </h1>
              <p style={{ color: 'var(--text-dim)' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
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

            {/* Habit-Based Predictor */}
            {!suggestion && (
              <div style={{ marginTop: '5px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px' }}>Or use your typical intake:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {['breakfast', 'lunch', 'dinner'].map(type => {
                    const mealStats = stats?.meal_stats || { avg_carbs_breakfast: 30, avg_carbs_lunch: 50, avg_carbs_dinner: 60 };
                    const carbVal = mealStats[`avg_carbs_${type}`] || (type === 'breakfast' ? 30 : type === 'lunch' ? 50 : 60);

                    const getFoodEquivalent = (grams) => {
                      if (grams <= 15) return '≈ 1 Roti';
                      if (grams <= 30) return '≈ 2 Rotis';
                      if (grams <= 45) return '≈ 2 Rotis + Dal';
                      if (grams <= 60) return '≈ 2 Rotis + 1 Bowl Rice';
                      if (grams <= 80) return '≈ 3 Rotis + Rice + Dal';
                      return '≈ Large Meal';
                    };

                    return (
                      <button
                        key={type}
                        className="btn btn-outline"
                        style={{
                          fontSize: '0.8rem', padding: '10px', justifyContent: 'space-between', width: '100%',
                          borderColor: 'hsla(0,0%,100%,0.1)'
                        }}
                        onClick={() => setCurrentCarbs(carbVal)}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Zap size={14} className="text-primary" />
                          Usual {type.charAt(0).toUpperCase() + type.slice(1)}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <strong style={{ color: 'white' }}>{carbVal}g</strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{getFoodEquivalent(carbVal)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {suggestion && (
              <div className="animate-fade-in" style={{ padding: '20px', borderRadius: 'var(--radius)', background: 'hsla(210, 100%, 50%, 0.15)', border: '1px solid hsla(210, 100%, 50%, 0.3)' }}>
                {suggestion.alert ? (
                  <div style={{
                    background: 'var(--danger)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: 'var(--radius)',
                    textAlign: 'center',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', fontSize: '1.3rem', fontWeight: '900', marginBottom: '10px' }}>
                      <AlertTriangle size={28} /> {suggestion.alert}
                    </div>
                    <p style={{ fontSize: '1.05rem', fontWeight: '600', margin: '0 0 15px 0' }}>{suggestion.reason || 'Critical sugar level.'}</p>
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'left' }}>
                      <strong style={{ display: 'block', marginBottom: '5px' }}>🚑 Emergency 15-15 Rule Action:</strong>
                      1. Eat 15g of fast carbs NOW (e.g., 1/2 cup juice, 1 tbsp honey).<br />
                      2. DO NOT inject any insulin.<br />
                      3. Wait 15 minutes, then check sugar again.
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '5px' }}>Total Suggested Dose:</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '3.5rem', fontWeight: '800', lineHeight: '1', color: suggestion.isCapped ? '#ffb74d' : 'white' }}>{suggestion.suggestion}</span>
                        <span style={{ fontSize: '1.2rem', color: 'var(--text-dim)' }}>Units</span>
                      </div>
                      {suggestion.isCapped && (
                        <div style={{ marginTop: '8px', color: '#ffb74d', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                          <AlertTriangle size={16} /> Safety Cap Reached (Max 20 U per dose)
                        </div>
                      )}
                    </div>

                    {/* Insight Text */}
                    <div style={{
                      marginBottom: '20px', padding: '12px', borderRadius: '8px',
                      background: 'hsla(0,0%,100%,0.05)', borderLeft: '4px solid var(--primary)',
                      fontSize: '0.9rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <BrainCircuit size={16} className="text-primary" />
                        <span style={{ fontWeight: '700' }}>Smart Logic Insight</span>
                      </div>
                      <p style={{ color: 'var(--text-dim)', margin: 0, lineHeight: '1.4' }}>
                        Dose calculated to bring you toward your target of <strong style={{ color: 'white' }}>{suggestion.target || 110} mg/dL</strong>.
                      </p>

                      {/* Clinical Pre-Bolus Advice */}
                      {suggestion.doses?.meal > 0 && (
                        <div style={{
                          marginTop: '15px', padding: '12px', borderRadius: '8px',
                          background: 'hsla(140, 100%, 40%, 0.1)', borderLeft: '4px solid #4ade80',
                          fontSize: '0.85rem'
                        }}>
                          <div style={{ fontWeight: 'bold', color: 'white', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlarmClock size={16} className="text-success" />
                            Pre-Bolus Timing
                          </div>
                          <p style={{ margin: 0 }}>Inject **15-20 minutes BEFORE** eating. This stops the spike before it starts!</p>
                        </div>
                      )}

                      {!suggestion.doses?.meal && !suggestion.doses?.netCorrection && (
                        <p style={{ marginTop: '10px', color: '#ffb74d', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          💡 Tip: 100 is great! If you're about to eat, use the "Usual Meal" buttons above.
                        </p>
                      )}
                      {suggestion.iobAdjustment && (
                        <p style={{ color: '#ffb74d', marginTop: '6px', fontSize: '0.85rem', fontWeight: '500' }}>
                          • {suggestion.iobAdjustment}
                        </p>
                      )}
                    </div>

                    {/* Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      <div style={{ padding: '10px', background: 'hsla(0,0%,100%,0.03)', borderRadius: '8px' }}>
                        <span style={{ display: 'block', fontSize: '0.7rem' }}>CORRECTION</span>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{suggestion.doses?.netCorrection || 0} U</span>
                      </div>
                      <div style={{ padding: '10px', background: 'hsla(0,0%,100%,0.03)', borderRadius: '8px' }}>
                        <span style={{ display: 'block', fontSize: '0.7rem' }}>MEAL DOSE</span>
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{suggestion.doses?.meal || 0} U</span>
                      </div>
                    </div>
                  </>
                )}
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
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sensitivity (ISF)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.avg_isf > 0 ? stats.avg_isf.toFixed(1) : '--'}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>mg/dL per unit</div>
                </div>
                <div style={{ padding: '15px', background: 'hsla(222, 47%, 5%, 0.3)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Carb Ratio (CIR)</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                    1:{stats.avg_cir > 0 ? stats.avg_cir.toFixed(1) : '15.0'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    {stats.avg_cir > 0 ? 'grams per unit' : 'grams (Default)'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Brain Confidence</span>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: stats.confidence_score === 'High' ? 'var(--success)' : stats.confidence_score === 'Medium' ? 'var(--warning)' : 'var(--text-dim)'
                }}>
                  <Zap size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {stats.confidence_score}
                </span>
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
