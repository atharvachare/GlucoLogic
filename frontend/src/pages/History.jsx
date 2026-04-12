import { useState, useEffect } from 'react';
import api from '../api';
import { 
  ArrowLeft, 
  Filter, 
  Droplets, 
  Utensils, 
  Edit2, 
  Trash2, 
  AlertCircle,
  X,
  Check,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LogEntryModal from '../components/LogEntryModal';

const DeleteModal = ({ isOpen, onConfirm, onCancel, itemName }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1100, backdropFilter: 'blur(8px)'
    }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '30px', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '30px', background: 'rgba(255,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <AlertCircle size={30} color="var(--danger)" />
        </div>
        <h3 style={{ marginBottom: '10px' }}>Delete Entry?</h3>
        <p className="text-dim" style={{ marginBottom: '30px', fontSize: '0.9rem' }}>
          This action cannot be undone. Your local ISF statistics will be updated immediately.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--danger)' }} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
};

const History = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const resp = await api.get('/logs');
      setLogs(resp.data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (log) => {
    setSelectedLog(log);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/logs/${selectedLog.id}`);
      setShowDeleteModal(false);
      fetchLogs();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleEditClick = (log) => {
    setSelectedLog(log);
    setShowEditModal(true);
  };

  const handleMigrateISF = async () => {
    setMigrating(true);
    setMigrateMsg('');
    try {
      const resp = await api.post('/logs/migrate-isf');
      setMigrateMsg(`✅ ${resp.data.message}`);
      fetchLogs(); // Refresh the table to show computed ISF values
    } catch (err) {
      setMigrateMsg('❌ Migration failed. Please try again.');
      console.error('Migrate ISF failed', err);
    } finally {
      setMigrating(false);
    }
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.meal_type === filter);

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '40px' }}>
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Link to="/" className="btn btn-outline" style={{ padding: '8px' }}><ArrowLeft /></Link>
          <h1 style={{ fontSize: '2rem' }}>Entry History</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <button
            className="btn btn-outline"
            onClick={handleMigrateISF}
            disabled={migrating}
            title="Recalculate ISF for all old log entries"
            style={{ fontSize: '0.8rem', gap: '6px' }}
          >
            <RefreshCw size={14} className={migrating ? 'spin' : ''} />
            {migrating ? 'Calculating...' : 'Recalculate ISF'}
          </button>
          <Filter size={18} className="text-dim" />
          <select 
            className="input-field" 
            style={{ width: '150px', padding: '8px' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Meals</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>
      </header>

      {migrateMsg && (
        <div style={{
          padding: '12px 20px', marginBottom: '20px', borderRadius: 'var(--radius)',
          background: migrateMsg.startsWith('✅') ? 'hsla(145, 65%, 45%, 0.15)' : 'hsla(0, 65%, 45%, 0.15)',
          border: `1px solid ${migrateMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)'}`,
          fontSize: '0.9rem', fontWeight: '500'
        }}>
          {migrateMsg}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-dim)' }}>Loading history...</div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'hsla(0,0%,100%,0.05)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '15px' }}>Date & Time</th>
                  <th style={{ padding: '15px' }}>Glucose (Pre)</th>
                  <th style={{ padding: '15px' }}>Insulin</th>
                  <th style={{ padding: '15px' }}>Meal & Food</th>
                  <th style={{ padding: '15px' }}>Glucose (Post)</th>
                  <th style={{ padding: '15px' }}>ISF (drop/U)</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontSize: '0.9rem' }}>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Droplets size={14} className="text-primary" />
                        {log.glucose_before} <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>mg/dL</span>
                      </div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ fontWeight: 'bold' }}>{log.insulin_units} U</div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'capitalize' }}>
                        <Utensils size={14} className="text-warning" />
                        {log.meal_type}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.food_description || 'No description'}
                      </div>
                    </td>
                    <td style={{ padding: '15px' }}>
                      {log.glucose_after ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Droplets size={14} className="text-success" />
                          {log.glucose_after}
                        </div>
                      ) : '--'}
                    </td>
                    <td style={{ padding: '15px' }}>
                      {(() => {
                        // Support both new 'isf' field and old 'effectiveness' field
                        const isfVal = log.isf > 0 ? log.isf : (log.effectiveness > 0 ? log.effectiveness : null);
                        return isfVal ? (
                          <div className="text-success" style={{ fontWeight: '600' }}>
                            {isfVal.toFixed(1)} <span style={{ fontSize: '0.7rem' }}>drop/U</span>
                          </div>
                        ) : '--';
                      })()}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button 
                          onClick={() => handleEditClick(log)}
                          className="btn btn-outline" 
                          style={{ padding: '6px', minWidth: 'auto', border: 'none' }} title="Edit"
                        >
                          <Edit2 size={16} className="text-primary" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(log)}
                          className="btn btn-outline" 
                          style={{ padding: '6px', minWidth: 'auto', border: 'none' }} title="Delete"
                        >
                          <Trash2 size={16} className="text-danger" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredLogs.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
              No entries found. Start logging to see your history!
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <LogEntryModal 
        isOpen={showEditModal} 
        onClose={() => {
          setShowEditModal(false);
          setSelectedLog(null);
        }} 
        onLogAdded={() => {
          fetchLogs();
          setShowEditModal(false);
        }}
        editData={selectedLog}
      />

      <DeleteModal 
        isOpen={showDeleteModal}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
};

export default History;
