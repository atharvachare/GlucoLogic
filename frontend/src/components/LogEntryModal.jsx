import { useState, useEffect } from 'react';
import api from '../api';
import { X, Send, Utensils, Activity, Droplets, BookOpen, Edit3 } from 'lucide-react';

const LogEntryModal = ({ isOpen, onClose, onLogAdded, editData = null }) => {
  const [formData, setFormData] = useState({
    glucose_before: '',
    glucose_after: '',
    insulin_units: '',
    meal_type: 'breakfast',
    food_description: '',
    activity_level: 'none'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        glucose_before: editData.glucose_before || '',
        glucose_after: editData.glucose_after || '',
        insulin_units: editData.insulin_units || '',
        meal_type: editData.meal_type || 'breakfast',
        food_description: editData.food_description || '',
        activity_level: editData.activity_level || 'none'
      });
    } else {
      setFormData({
        glucose_before: '',
        glucose_after: '',
        insulin_units: '',
        meal_type: 'breakfast',
        food_description: '',
        activity_level: 'none'
      });
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        glucose_before: formData.glucose_before ? parseFloat(formData.glucose_before) : null,
        glucose_after: formData.glucose_after ? parseFloat(formData.glucose_after) : null,
        insulin_units: formData.insulin_units ? parseFloat(formData.insulin_units) : 0,
      };

      if (editData) {
        await api.put(`/logs/${editData.id}`, payload);
      } else {
        await api.post('/logs', payload);
      }
      
      onLogAdded();
      onClose();
    } catch (err) {
      console.error('Failed to save log', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)'
    }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: '30px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {editData ? <Edit3 className="text-primary" /> : <BookOpen className="text-primary" />} 
          {editData ? 'Edit Entry' : 'New Entry'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Glucose (Before Meal)</label>
              <div style={{ position: 'relative' }}>
                <Droplets size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <input 
                  type="number" className="input-field" style={{ paddingLeft: '35px' }} placeholder="mg/dL"
                  value={formData.glucose_before} onChange={(e) => setFormData({...formData, glucose_before: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Insulin Units</label>
              <input 
                type="number" step="0.5" className="input-field" placeholder="Units"
                value={formData.insulin_units} onChange={(e) => setFormData({...formData, insulin_units: e.target.value})}
              />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Glucose (2-3 Hours After)</label>
            <input 
              type="number" className="input-field" placeholder="mg/dL (Optional - Needed for learning effectiveness)"
              value={formData.glucose_after} onChange={(e) => setFormData({...formData, glucose_after: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Meal Type</label>
              <div style={{ position: 'relative' }}>
                <Utensils size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <select 
                  className="input-field" style={{ paddingLeft: '35px' }}
                  value={formData.meal_type} onChange={(e) => setFormData({...formData, meal_type: e.target.value})}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Activity Level</label>
              <div style={{ position: 'relative' }}>
                <Activity size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <select 
                  className="input-field" style={{ paddingLeft: '35px' }}
                  value={formData.activity_level} onChange={(e) => setFormData({...formData, activity_level: e.target.value})}
                >
                  <option value="none">None</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>What did you eat?</label>
            <textarea 
              className="input-field" style={{ height: '80px', resize: 'none' }} placeholder="Description..."
              value={formData.food_description} onChange={(e) => setFormData({...formData, food_description: e.target.value})}
            ></textarea>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Saving...' : (editData ? 'Update Entry' : <><Send size={18} /> Save Entry</>)}
          </button>
          
          <p style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '15px', color: 'var(--text-dim)' }}>
            Note: Effectiveness is only calculated when both "before" and "after" readings are provided.
          </p>
        </form>
      </div>
    </div>
  );
};

export default LogEntryModal;
