import { useState, useEffect } from 'react';
import api from '../api';
import { 
  User, 
  HeartPulse, 
  Droplet, 
  Activity, 
  BadgeInfo, 
  Save, 
  CheckCircle,
  AlertCircle,
  Phone,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const [profile, setProfile] = useState({
    personal: { name: '', email: '', phone: '', age: '', gender: '', dob: '', address: '', emergency_contact_name: '', emergency_contact_phone: '' },
    medical: { diabetes_type: 'Type 1', diagnosis_date: '', treatment_type: 'Insulin', doctor_name: '', hospital: '', conditions: '' },
    insulin: { insulin_type: 'Rapid-acting', brand: '', daily_dose: '', carb_ratio: '', correction_factor: '' },
    lifestyle: { diet_type: 'Vegetarian', meal_pattern: '', activity_level: 'None', sleep_hours: '' },
    health: { weight: '', height: '', target_glucose_min: 80, target_glucose_max: 140, hba1c: '', blood_pressure: '', allergies: '', risk_history: '' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const resp = await api.get('/profile');
      setProfile(prevState => ({
        personal: { ...prevState.personal, ...resp.data.personal },
        medical: { ...prevState.medical, ...resp.data.medical },
        insulin: { ...prevState.insulin, ...resp.data.insulin },
        lifestyle: { ...prevState.lifestyle, ...resp.data.lifestyle },
        health: { ...prevState.health, ...resp.data.health }
      }));
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (section) => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      await api.put(`/profile/${section}`, profile[section]);
      setMessage({ text: `${section.charAt(0).toUpperCase() + section.slice(1)} info saved!`, type: 'success' });
      fetchProfile(); // Refresh to get recalculated values (like BMI)
    } catch (err) {
      setMessage({ text: `Failed to save ${section} info.`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const calculateCompletion = () => {
    let totalFields = 0;
    let filledFields = 0;
    Object.keys(profile).forEach(section => {
      Object.keys(profile[section]).forEach(field => {
        totalFields++;
        if (profile[section][field] && profile[section][field] !== '') filledFields++;
      });
    });
    return Math.round((filledFields / totalFields) * 100);
  };

  if (loading) return <div className="container" style={{ color: 'white' }}>Loading profile...</div>;

  const completion = calculateCompletion();

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '900px', paddingTop: '40px' }}>
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Link to="/" className="btn btn-outline" style={{ padding: '8px' }}><ArrowLeft /></Link>
          <h1 style={{ fontSize: '2rem' }}>Patient Profile</h1>
        </div>
        <div className="glass-card" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ fontSize: '0.85rem' }}>Profile Complete: <b>{completion}%</b></div>
          <div style={{ width: '100px', height: '8px', background: 'hsla(0,0%,100%,0.1)', borderRadius: '4px' }}>
            <div style={{ width: `${completion}%`, height: '100%', background: 'var(--success)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
          </div>
        </div>
      </header>

      {message.text && (
        <div className={message.type === 'success' ? 'text-success' : 'text-danger'} style={{ marginBottom: '20px', padding: '10px', background: 'hsla(0,0%,100%,0.05)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {message.text}
        </div>
      )}

      <div className="profile-layout">
        {/* Sidebar Nav */}
        <aside className="glass-card" style={{ padding: '10px', height: 'fit-content' }}>
          <button onClick={() => setActiveTab('personal')} className={`btn ${activeTab === 'personal' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '5px' }}>
            <User size={18} /> Personal Info
          </button>
          <button onClick={() => setActiveTab('medical')} className={`btn ${activeTab === 'medical' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '5px' }}>
            <HeartPulse size={18} /> Medical
          </button>
          <button onClick={() => setActiveTab('insulin')} className={`btn ${activeTab === 'insulin' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '5px' }}>
            <Droplet size={18} /> Insulin Profile
          </button>
          <button onClick={() => setActiveTab('lifestyle')} className={`btn ${activeTab === 'lifestyle' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '5px' }}>
            <Activity size={18} /> Lifestyle
          </button>
          <button onClick={() => setActiveTab('health')} className={`btn ${activeTab === 'health' ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%', justifyContent: 'flex-start' }}>
            <BadgeInfo size={18} /> Health Stats
          </button>
        </aside>

        {/* Tab Content */}
        <main className="glass-card" style={{ padding: '30px' }}>
          {activeTab === 'personal' && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '20px' }}>Personal Details</h3>
              <div className="res-grid">
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Full Name</label>
                  <input className="input-field" value={profile.personal.name} onChange={(e) => setProfile({...profile, personal: {...profile.personal, name: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Phone</label>
                  <input className="input-field" value={profile.personal.phone || ''} onChange={(e) => setProfile({...profile, personal: {...profile.personal, phone: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Date of Birth</label>
                  <input type="date" className="input-field" value={profile.personal.dob || ''} onChange={(e) => setProfile({...profile, personal: {...profile.personal, dob: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Gender</label>
                  <select className="input-field" value={profile.personal.gender || ''} onChange={(e) => setProfile({...profile, personal: {...profile.personal, gender: e.target.value}})}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Address</label>
                  <textarea className="input-field" value={profile.personal.address || ''} style={{ height: '60px' }} onChange={(e) => setProfile({...profile, personal: {...profile.personal, address: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Emergency Contact Name</label>
                  <input className="input-field" value={profile.personal.emergency_contact_name || ''} onChange={(e) => setProfile({...profile, personal: {...profile.personal, emergency_contact_name: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Emergency Contact Phone</label>
                  <input className="input-field" value={profile.personal.emergency_contact_phone || ''} onChange={(e) => setProfile({...profile, personal: {...profile.personal, emergency_contact_phone: e.target.value}})} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '20px' }}>Medical Information</h3>
              <div className="res-grid">
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Diabetes Type</label>
                  <select className="input-field" value={profile.medical.diabetes_type} onChange={(e) => setProfile({...profile, medical: {...profile.medical, diabetes_type: e.target.value}})}>
                    <option value="Type 1">Type 1</option>
                    <option value="Type 2">Type 2</option>
                    <option value="Pre-diabetic">Pre-diabetic</option>
                  </select>
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Diagnosis Date</label>
                  <input type="date" className="input-field" value={profile.medical.diagnosis_date || ''} onChange={(e) => setProfile({...profile, medical: {...profile.medical, diagnosis_date: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Treatment Type</label>
                  <select className="input-field" value={profile.medical.treatment_type} onChange={(e) => setProfile({...profile, medical: {...profile.medical, treatment_type: e.target.value}})}>
                    <option value="Insulin">Insulin Only</option>
                    <option value="Oral">Oral Medication</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Doctor Name</label>
                  <input className="input-field" value={profile.medical.doctor_name || ''} onChange={(e) => setProfile({...profile, medical: {...profile.medical, doctor_name: e.target.value}})} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Hospital/Clinic</label>
                  <input className="input-field" value={profile.medical.hospital || ''} onChange={(e) => setProfile({...profile, medical: {...profile.medical, hospital: e.target.value}})} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Known Conditions (Hypertension, PCOS, etc.)</label>
                  <input className="input-field" value={profile.medical.conditions || ''} onChange={(e) => setProfile({...profile, medical: {...profile.medical, conditions: e.target.value}})} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'insulin' && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '20px' }}>Insulin Profile</h3>
              <div className="res-grid">
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Insulin Type Used</label>
                  <select className="input-field" value={profile.insulin.insulin_type} onChange={(e) => setProfile({...profile, insulin: {...profile.insulin, insulin_type: e.target.value}})}>
                    <option value="Rapid-acting">Rapid-acting</option>
                    <option value="Long-acting">Long-acting</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Brand Name</label>
                  <input className="input-field" value={profile.insulin.brand || ''} placeholder="e.g. Humalog" onChange={(e) => setProfile({...profile, insulin: {...profile.insulin, brand: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Typical Daily Dose (U)</label>
                  <input type="number" className="input-field" value={profile.insulin.daily_dose || ''} onChange={(e) => setProfile({...profile, insulin: {...profile.insulin, daily_dose: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Insulin-to-Carb Ratio</label>
                  <input type="number" className="input-field" value={profile.insulin.carb_ratio || ''} placeholder="e.g. 15" onChange={(e) => setProfile({...profile, insulin: {...profile.insulin, carb_ratio: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Correction Factor</label>
                  <input type="number" className="input-field" value={profile.insulin.correction_factor || ''} placeholder="e.g. 50" onChange={(e) => setProfile({...profile, insulin: {...profile.insulin, correction_factor: e.target.value}})} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lifestyle' && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '20px' }}>Lifestyle Data</h3>
              <div className="res-grid">
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Diet Type</label>
                  <select className="input-field" value={profile.lifestyle.diet_type} onChange={(e) => setProfile({...profile, lifestyle: {...profile.lifestyle, diet_type: e.target.value}})}>
                    <option value="Vegetarian">Vegetarian</option>
                    <option value="Non-Vegetarian">Non-Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Activity Level</label>
                  <select className="input-field" value={profile.lifestyle.activity_level} onChange={(e) => setProfile({...profile, lifestyle: {...profile.lifestyle, activity_level: e.target.value}})}>
                    <option value="None">None</option>
                    <option value="Light">Light</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Heavy">Heavy</option>
                  </select>
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Average Sleep (Hours)</label>
                  <input type="number" className="input-field" value={profile.lifestyle.sleep_hours || ''} onChange={(e) => setProfile({...profile, lifestyle: {...profile.lifestyle, sleep_hours: e.target.value}})} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Typical Meal Pattern</label>
                  <textarea className="input-field" placeholder="e.g. Breakfast 8 AM, Lunch 1 PM..." style={{ height: '60px' }} value={profile.lifestyle.meal_pattern || ''} onChange={(e) => setProfile({...profile, lifestyle: {...profile.lifestyle, meal_pattern: e.target.value}})} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="animate-fade-in">
              <h3 style={{ marginBottom: '20px' }}>Health Baseline</h3>
              <div className="res-grid form-grid-3" style={{ marginBottom: '30px' }}>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Weight (kg)</label>
                  <input type="number" className="input-field" value={profile.health.weight || ''} onChange={(e) => setProfile({...profile, health: {...profile.health, weight: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>Height (cm)</label>
                  <input type="number" className="input-field" value={profile.health.height || ''} onChange={(e) => setProfile({...profile, health: {...profile.health, height: e.target.value}})} />
                </div>
                <div>
                  <label className="text-dim" style={{ fontSize: '0.8rem' }}>BMI (calculated)</label>
                  <div className="input-field" style={{ background: 'hsla(0,0%,100%,0.05)', color: 'var(--primary)', fontWeight: 'bold' }}>{profile.health.bmi || '--'}</div>
                </div>
                <div style={{ gridColumn: 'span 3', padding: '10px', background: 'hsla(0,0%,100%,0.03)', borderRadius: 'var(--radius)' }}>
                  <label className="text-dim" style={{ fontSize: '0.8rem', display: 'block', marginBottom: '10px' }}>Target Glucose Range (mg/dL)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="number" className="input-field" placeholder="Min" value={profile.health.target_glucose_min} onChange={(e) => setProfile({...profile, health: {...profile.health, target_glucose_min: e.target.value}})} />
                    <span>to</span>
                    <input type="number" className="input-field" placeholder="Max" value={profile.health.target_glucose_max} onChange={(e) => setProfile({...profile, health: {...profile.health, target_glucose_max: e.target.value}})} />
                  </div>
                </div>
              </div>

              {/* Advanced Analytics */}
              <div style={{ padding: '20px', background: 'hsla(210, 100%, 50%, 0.1)', borderRadius: 'var(--radius)', border: '1px solid hsla(210, 100%, 50%, 0.2)' }}>
                <h4 style={{ marginBottom: '15px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} /> Learned Clinical Ratios
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ padding: '10px', background: 'hsla(0,0%,100%,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Personal ISF</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{profile.stats?.avg_isf?.toFixed(1) || '--'}</div>
                  </div>
                  <div style={{ padding: '10px', background: 'hsla(0,0%,100%,0.03)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Learned CIR</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>1:{profile.stats?.avg_cir?.toFixed(1) || '--'}</div>
                  </div>
                </div>
                
                <button 
                  className="btn btn-outline" 
                  style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed', fontSize: '0.85rem' }}
                  onClick={async (e) => {
                    const originalText = e.target.innerText;
                    try {
                      e.target.innerText = 'Syncing Brain...';
                      e.target.disabled = true;
                      await api.post('/logs/migrate-isf');
                      alert('Success: All historical data analyzed. Ratios updated.');
                      window.location.reload();
                    } catch (err) {
                      alert('Sync failed. Please try again.');
                      e.target.innerText = originalText;
                      e.target.disabled = false;
                    }
                  }}
                >
                  <Save size={16} /> Sync Brain with History
                </button>
              </div>
            </div>
          )}

          <hr style={{ margin: '30px 0', border: 'none', height: '1px', background: 'var(--glass-border)' }} />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => handleUpdate(activeTab)} disabled={saving}>
              {saving ? 'Saving...' : <><Save size={18} /> Save {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Info</>}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
