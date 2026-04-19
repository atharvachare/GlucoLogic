import { useState, useEffect } from 'react';
import api from '../api';
import { X, Send, Utensils, Activity, Droplets, BookOpen, Edit3 } from 'lucide-react';

const PORTION_DATA = [
  { id: 'roti', label: '🫓 Roti', grams: 20 },
  { id: 'rice', label: '🍚 Rice Bowl', grams: 45 },
  { id: 'dal', label: '🥣 Dal Bowl', grams: 15 },
  { id: 'sabzi', label: '🥗 Sabzi Bowl', grams: 12 },
  { id: 'curd', label: '🥣 Curd/Dahi', grams: 8 },
  { id: 'milk', label: '🥛 Milk', grams: 12 },
];

const LogEntryModal = ({ isOpen, onClose, onLogAdded, editData = null }) => {
  const [formData, setFormData] = useState({
    glucose_before: '',
    glucose_after: '',
    insulin_rapid: '',
    insulin_long: '',
    carbs: 0,
    meal_type: 'breakfast',
    food_description: '',
    activity_level: 'none'
  });
  const [portions, setPortions] = useState({ roti: 0, rice: 0, dal: 0, sabzi: 0, curd: 0, milk: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setFormData({
        glucose_before: editData.glucose_before || '',
        glucose_after: editData.glucose_after || '',
        insulin_rapid: editData.insulin_rapid || editData.insulin_units || '',
        insulin_long: editData.insulin_long || '',
        carbs: editData.carbs || 0,
        meal_type: editData.meal_type || 'breakfast',
        food_description: editData.food_description || '',
        activity_level: editData.activity_level || 'none'
      });
    } else {
      setFormData({
        glucose_before: '',
        glucose_after: '',
        insulin_rapid: '',
        insulin_long: '',
        carbs: 0,
        meal_type: 'breakfast',
        food_description: '',
        activity_level: 'none'
      });
      setPortions({ roti: 0, rice: 0, dal: 0, sabzi: 0, curd: 0, milk: 0 });
    }
  }, [editData, isOpen]);

  const updatePortion = (id, delta) => {
    // 1. Calculate new portion counts
    const newPortions = { ...portions, [id]: Math.max(0, portions[id] + delta) };
    setPortions(newPortions);
    
    // 2. Calculate total carbs
    const totalCarbs = PORTION_DATA.reduce((sum, item) => sum + (newPortions[item.id] * item.grams), 0);
    
    // 3. Generate Auto-Description (e.g. "2x 🫓 Roti, 1x 🥣 Dal Bowl")
    const descriptionArr = [];
    PORTION_DATA.forEach(item => {
      const count = newPortions[item.id];
      if (count > 0) {
        descriptionArr.push(`${count}x ${item.label}`);
      }
    });
    const finalDescription = descriptionArr.join(', ');

    // 4. Update the combined form data
    setFormData(prev => ({ 
      ...prev, 
      carbs: totalCarbs,
      food_description: finalDescription
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        glucose_before: formData.glucose_before ? parseFloat(formData.glucose_before) : null,
        glucose_after: formData.glucose_after ? parseFloat(formData.glucose_after) : null,
        insulin_rapid: formData.insulin_rapid ? parseFloat(formData.insulin_rapid) : 0,
        insulin_long: formData.insulin_long ? parseFloat(formData.insulin_long) : 0,
        // Combined field for backward compatibility
        insulin_units: (parseFloat(formData.insulin_rapid) || 0) + (parseFloat(formData.insulin_long) || 0),
        carbs: parseFloat(formData.carbs) || 0,
      };

      if (editData) {
        await api.put(`/logs/${editData.id}`, payload);
      } else {
        await api.post('/logs', payload);
        
        // Schedule reminder for 2 hours later...
        if (payload.insulin_units > 0 && !payload.glucose_after) {
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SCHEDULE_NOTIFICATION',
              delay: 2 * 60 * 60 * 1000,
              title: 'Check your sugar!',
              body: `It's been 2 hours since your ${formData.meal_type}. Check your glucose to help me learn!`
            });
          }
        }
      }
      
      onLogAdded();
      onClose();
    } catch (err) {
      console.error('Failed to save log', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
          {/* Indian Portion Selector */}
          <div style={{ marginBottom: '25px', padding: '15px', background: 'hsla(0,0%,100%,0.03)', borderRadius: 'var(--radius)', border: '1px dashed hsla(0,0%,100%,0.1)' }}>
            <label style={{ display: 'block', marginBottom: '15px', fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              Quick Indian Portion Picker (Auto-calculates Carbs)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {PORTION_DATA.map(item => (
                <div key={item.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '10px', background: 'hsla(0,0%,100%,0.05)', borderRadius: '12px' 
                }}>
                  <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button type="button" onClick={() => updatePortion(item.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'hsla(0,0%,100%,0.1)', color: 'white' }}>-</button>
                    <span style={{ minWidth: '15px', textAlign: 'center', fontWeight: 'bold' }}>{portions[item.id]}</span>
                    <button type="button" onClick={() => updatePortion(item.id, 1)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'var(--primary)', color: 'white' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="text-dim">Estimated Carbs:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="number" className="input-field" style={{ width: '100px', textAlign: 'center', fontWeight: 'bold' }} 
                  value={formData.carbs} onChange={(e) => setFormData({...formData, carbs: e.target.value})}
                />
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>grams</span>
              </div>
            </div>
          </div>

          <div className="res-grid" style={{ marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Glucose (Pre-Meal)</label>
              <div style={{ position: 'relative' }}>
                <Droplets size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                <input 
                  type="number" className="input-field" style={{ paddingLeft: '35px' }} placeholder="mg/dL"
                  value={formData.glucose_before} onChange={(e) => setFormData({...formData, glucose_before: e.target.value})}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
               <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Rapid Acting</label>
                  <input 
                    type="number" step="0.5" className="input-field" placeholder="Meal"
                    value={formData.insulin_rapid} onChange={(e) => setFormData({...formData, insulin_rapid: e.target.value})}
                  />
               </div>
               <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Long Acting</label>
                  <input 
                    type="number" step="0.5" className="input-field" placeholder="Basal"
                    value={formData.insulin_long} onChange={(e) => setFormData({...formData, insulin_long: e.target.value})}
                  />
               </div>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Glucose (2-3 Hours After)</label>
            <input 
              type="number" className="input-field" placeholder="mg/dL (Optional - Needed for learning ISF)"
              value={formData.glucose_after} onChange={(e) => setFormData({...formData, glucose_after: e.target.value})}
            />
          </div>

          <div className="res-grid" style={{ marginBottom: '15px' }}>
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
            Note: ISF is only calculated when both "before" and "after" readings are provided.
          </p>
        </form>
      </div>
    </div>
  );
};

export default LogEntryModal;
