import { useState } from 'react';
import api from '../api';
import { User, HeartPulse, Droplet, Activity, BadgeInfo, ArrowRight, Check } from 'lucide-react';

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    personal: { name: '', age: '', gender: '' },
    medical: { diabetes_type: 'Type 1', treatment_type: 'Insulin' },
    insulin: { insulin_type: 'Rapid-acting', daily_dose: '' },
    lifestyle: { activity_level: 'None' },
    health: { weight: '', height: '', target_glucose_min: 80, target_glucose_max: 140 }
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      setSaving(true);
      setError('');
      try {
        // Save all sections concurrently for speed and reliability
        await Promise.all([
          api.put('/profile/personal', formData.personal),
          api.put('/profile/medical', formData.medical),
          api.put('/profile/insulin', formData.insulin),
          api.put('/profile/lifestyle', formData.lifestyle),
          api.put('/profile/health', formData.health)
        ]);
        
        // Final success check
        onComplete();
      } catch (err) {
        console.error('Failed to complete onboarding', err);
        setError('Something went wrong while saving your profile. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'var(--background)', zIndex: 2000, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px',
      backgroundImage: 'radial-gradient(circle at top right, hsla(210, 100%, 50%, 0.15), transparent), radial-gradient(circle at bottom left, hsla(145, 65%, 45%, 0.1), transparent)',
      backdropFilter: 'blur(20px)'
    }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '30px' }}>
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} style={{
              width: step === s ? '24px' : '12px', height: '12px', borderRadius: '6px',
              background: step >= s ? 'var(--primary)' : 'hsla(0,0%,100%,0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}></div>
          ))}
        </div>

        {error && (
          <div className="text-danger" style={{ marginBottom: '20px', textAlign: 'center', padding: '10px', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '10px', fontSize: '1.8rem' }}>Welcome! 👋</h2>
            <p className="text-dim" style={{ marginBottom: '25px' }}>Let's personalize your health journey.</p>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Full Name</label>
            <input className="input-field" style={{ marginBottom: '20px' }} placeholder="How should we call you?" value={formData.personal.name} onChange={e => setFormData({...formData, personal: {...formData.personal, name: e.target.value}})} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Age</label>
                <input type="number" className="input-field" placeholder="Years" value={formData.personal.age} onChange={e => setFormData({...formData, personal: {...formData.personal, age: e.target.value}})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Gender</label>
                <select className="input-field" value={formData.personal.gender} onChange={e => setFormData({...formData, personal: {...formData.personal, gender: e.target.value}})}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '10px', fontSize: '1.8rem' }}>Medical Profile 🩺</h2>
            <p className="text-dim" style={{ marginBottom: '25px' }}>This helps us set accurate targets.</p>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Diabetes Type</label>
            <select className="input-field" style={{ marginBottom: '20px' }} value={formData.medical.diabetes_type} onChange={e => setFormData({...formData, medical: {...formData.medical, diabetes_type: e.target.value}})}>
              <option value="Type 1">Type 1</option>
              <option value="Type 2">Type 2</option>
              <option value="Pre-diabetic">Pre-diabetic</option>
            </select>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Treatment Method</label>
            <select className="input-field" value={formData.medical.treatment_type} onChange={e => setFormData({...formData, medical: {...formData.medical, treatment_type: e.target.value}})}>
              <option value="Insulin">Insulin Only</option>
              <option value="Oral">Oral Medication</option>
              <option value="Both">Both</option>
            </select>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '10px', fontSize: '1.8rem' }}>Insulin Data 💉</h2>
            <p className="text-dim" style={{ marginBottom: '25px' }}>Essential for the learning engine.</p>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Primary Insulin Type</label>
            <select className="input-field" style={{ marginBottom: '20px' }} value={formData.insulin.insulin_type} onChange={e => setFormData({...formData, insulin: {...formData.insulin, insulin_type: e.target.value}})}>
              <option value="Rapid-acting">Rapid-acting</option>
              <option value="Long-acting">Long-acting</option>
              <option value="Mixed">Mixed</option>
            </select>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Approx. Daily Dose (Units)</label>
            <input type="number" className="input-field" placeholder="Total U per day" value={formData.insulin.daily_dose} onChange={e => setFormData({...formData, insulin: {...formData.insulin, daily_dose: e.target.value}})} />
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '10px', fontSize: '1.8rem' }}>Lifestyle 🏃‍♂️</h2>
            <p className="text-dim" style={{ marginBottom: '25px' }}>Activity impacts insulin needs.</p>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Your Typical Routine</label>
            <select className="input-field" value={formData.lifestyle.activity_level} onChange={e => setFormData({...formData, lifestyle: {...formData.lifestyle, activity_level: e.target.value}})}>
              <option value="None">Sedentary (No Exercise)</option>
              <option value="Light">Light (Active daily)</option>
              <option value="Moderate">Moderate (Gym 3-4x week)</option>
              <option value="Heavy">Heavy (Highly active)</option>
            </select>
          </div>
        )}

        {step === 5 && (
          <div className="animate-fade-in">
            <h2 style={{ marginBottom: '10px', fontSize: '1.8rem' }}>Body Metrics ⚖️</h2>
            <p className="text-dim" style={{ marginBottom: '25px' }}>Almost there! Let's calculate your baseline.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Weight (kg)</label>
                <input type="number" className="input-field" placeholder="kg" value={formData.health.weight} onChange={e => setFormData({...formData, health: {...formData.health, weight: e.target.value}})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Height (cm)</label>
                <input type="number" className="input-field" placeholder="cm" value={formData.health.height} onChange={e => setFormData({...formData, health: {...formData.health, height: e.target.value}})} />
              </div>
            </div>
            <div style={{ padding: '20px', background: 'hsla(0,0%,100%,0.05)', borderRadius: 'var(--radius)', border: '1px solid var(--glass-border)' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '0.9rem', fontWeight: '600' }}>Goal Glucose Range (mg/dL)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <input type="number" className="input-field" placeholder="Min" value={formData.health.target_glucose_min} onChange={e => setFormData({...formData, health: {...formData.health, target_glucose_min: e.target.value}})} />
                <span className="text-dim">to</span>
                <input type="number" className="input-field" placeholder="Max" value={formData.health.target_glucose_max} onChange={e => setFormData({...formData, health: {...formData.health, target_glucose_max: e.target.value}})} />
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 1 ? (
            <button className="btn btn-outline" onClick={() => setStep(step - 1)} disabled={saving}>Back</button>
          ) : <div></div>}
          <button className="btn btn-primary" onClick={handleNext} disabled={saving}>
            {saving ? 'Completing...' : (step === 5 ? <><Check size={18} /> Finish Setup</> : <><ArrowRight size={18} /> Next</>)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
