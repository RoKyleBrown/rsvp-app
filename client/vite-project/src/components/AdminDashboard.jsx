import React from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
const API = '/api';

export default function AdminDashboard({ onLogout }) {
  const [stats, setStats] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [newData, setNewData] = useState({
    first_name: '', last_name: '', response: 'yes',
    guest1: '', guest2: '', guest3: '', guest4: '', note: ''
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const [statsRes, responsesRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/responses`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setResponses(responsesRes.data);
    } catch (err) {
      alert('Session expired or error loading data.');
      onLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [onLogout]);

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditData({ ...r });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const saveEdit = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`${API}/admin/responses/${id}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      cancelEdit();
      fetchData();
    } catch (err) {
      alert('Update failed');
    }
  };

  const deleteResponse = async (id) => {
    if (!window.confirm('Delete this RSVP?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API}/admin/responses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleNewChange = (e) => {
    setNewData({ ...newData, [e.target.name]: e.target.value });
  };

  const createResponse = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${API}/admin/responses`, newData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreate(false);
      setNewData({
        first_name: '', last_name: '', response: 'yes',
        guest1: '', guest2: '', guest3: '', guest4: '', note: ''
      });
      fetchData();
    } catch (err) {
      alert('Create failed');
    }
  };

  const exportCSV = () => {
    window.location.href = `${API}/export-csv`;
  };

  if (loading) return <div className="admin-dash">Loading...</div>;

  return (
    <div className="admin-dash">
      <div className="header">
        <h2>RSVP Dashboard</h2>
        <div>
          <button onClick={() => setShowCreate(true)} className="add-btn">+ Add RSVP</button>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card yes">
          <h3>Attending</h3>
          <p className="big">{stats.totalAttending}</p>
          <small>{stats.yes} + {stats.guests} guests</small>
        </div>
        <div className="stat-card no">
          <h3>Cannot Attend</h3>
          <p className="big">{stats.no}</p>
        </div>
        <div className="stat-card maybe">
          <h3>Not Sure</h3>
          <p className="big">{stats.maybe}</p>
        </div>
      </div>

      {/* CREATE FORM */}
      {showCreate && (
        <div className="create-form">
          <h3>Add New RSVP</h3>
          <div className="input-row">
            <input name="first_name" placeholder="First" value={newData.first_name} onChange={handleNewChange} />
            <input name="last_name" placeholder="Last" value={newData.last_name} onChange={handleNewChange} />
          </div>
          <select name="response" value={newData.response} onChange={handleNewChange}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="maybe">Maybe</option>
          </select>
          <div className="guests-edit">
            {[1,2,3,4].map(i => (
              <input key={i} name={`guest${i}`} placeholder={`Guest ${i}`} value={newData[`guest${i}`]} onChange={handleNewChange} />
            ))}
          </div>
          <textarea name="note" placeholder="Notes" value={newData.note} onChange={handleNewChange} rows="2" />
          <div className="form-actions">
            <button onClick={createResponse} className="save-btn">Create</button>
            <button onClick={() => setShowCreate(false)} className="cancel-btn">Cancel</button>
          </div>
        </div>
      )}

      {/* RESPONSIVE TABLE */}
<div className="responses-section">
  <h3>RSVP List ({responses.length})</h3>
  
  {/* Desktop Table */}
  <div className="table-desktop">
    <table className="responses-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Response</th>
          <th>Guests</th>
          <th>Notes</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {responses.map((r) => (
          <tr key={r.id}>
            <td>
              {editingId === r.id ? (
                <>
                  <input name="first_name" value={editData.first_name || ''} onChange={handleEditChange} className="edit-input" />
                  <input name="last_name" value={editData.last_name || ''} onChange={handleEditChange} className="edit-input" />
                </>
              ) : (
                <span>{r.first_name} {r.last_name}</span>
              )}
            </td>
            <td>
              {editingId === r.id ? (
                <select name="response" value={editData.response} onChange={handleEditChange} className="edit-input">
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="maybe">Maybe</option>
                </select>
              ) : (
                <span className={`response-${r.response}`}>{r.response.toUpperCase()}</span>
              )}
            </td>
            <td>
              {editingId === r.id ? (
                <div className="guests-edit">
                  {[1,2,3,4].map(i => (
                    <input key={i} name={`guest${i}`} value={editData[`guest${i}`] || ''} onChange={handleEditChange} placeholder={`G${i}`} />
                  ))}
                </div>
              ) : (
                <div className="guest-list">
                  {r.guest1 && <div>{r.guest1}</div>}
                  {r.guest2 && <div>{r.guest2}</div>}
                  {r.guest3 && <div>{r.guest3}</div>}
                  {r.guest4 && <div>{r.guest4}</div>}
                </div>
              )}
            </td>
            <td>
              {editingId === r.id ? (
                <textarea name="note" value={editData.note || ''} onChange={handleEditChange} rows="2" className="edit-textarea" />
              ) : (
                <span className="note-text">{r.note}</span>
              )}
            </td>
            <td>
              {editingId === r.id ? (
                <>
                  <button onClick={() => saveEdit(r.id)} className="save-btn">Save</button>
                  <button onClick={cancelEdit} className="cancel-btn">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(r)} className="edit-btn">Edit</button>
                  <button onClick={() => deleteResponse(r.id)} className="delete-btn">Delete</button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Mobile Cards */}
  <div className="table-mobile">
    {responses.map((r) => (
      <div key={r.id} className="response-card">
        <div className="card-header">
          <strong>{r.first_name} {r.last_name}</strong>
          <span className={`response-badge response-${r.response}`}>
            {r.response.toUpperCase()}
          </span>
        </div>
        <div className="card-body">
          {r.guest1 && <div><strong>Guest 1:</strong> {r.guest1}</div>}
          {r.guest2 && <div><strong>Guest 2:</strong> {r.guest2}</div>}
          {r.guest3 && <div><strong>Guest 3:</strong> {r.guest3}</div>}
          {r.guest4 && <div><strong>Guest 4:</strong> {r.guest4}</div>}
          {r.note && <div><strong>Note:</strong> {r.note}</div>}
        </div>
        <div className="card-actions">
          {editingId === r.id ? (
            <>
              <button onClick={() => saveEdit(r.id)} className="save-btn">Save</button>
              <button onClick={cancelEdit} className="cancel-btn">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => startEdit(r)} className="edit-btn">Edit</button>
              <button onClick={() => deleteResponse(r.id)} className="delete-btn">Delete</button>
            </>
          )}
        </div>
      </div>
    ))}
  </div>
</div>

      <div className="dashboard-footer">
  <button onClick={exportCSV} className="export-btn">
    Download CSV
  </button>
</div>
    </div>
  );
}